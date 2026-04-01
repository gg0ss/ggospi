import { BaseAgent, AgentContext, AgentResponse } from './base.js';
import { LLMMessage } from '../llm/interface.js';
import { getCascadeProvider } from '../llm/router.js';
import { saveMessage, saveAgent, getStoredAgents } from '../memory/store.js';
import { registry } from './registry.js';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

const SYSTEM_PROMPT = `Eres GGOS, orquestador principal de un sistema multi-agente.

AGENTES DISPONIBLES:
- kali: Experto en Kali Linux. Se activa EXCLUSIVAMENTE con "@kali <mensaje>".
- Agentes dinámicos creados por el usuario (los puedes listar con list_agents).

CÓMO FUNCIONAR:
- Responde directamente cuando puedas resolver la petición.
- Usa create_agent si el usuario pide un nuevo especialista.
- Usa list_agents para listar qué agentes existen.
- Usa la herramienta get_time para obtener la hora actual.
- Si un mensaje empieza con @nombre, el bot ya lo habrá enrutado; no necesitas hacer nada especial.
- Sé conciso, útil y en español.`;

export class GGOSAgent extends BaseAgent {
    readonly name = 'ggos';
    readonly description = 'Orquestador principal. Responde y crea especialistas.';
    private llm = getCascadeProvider();

    async process(message: string, ctx: AgentContext): Promise<AgentResponse> {
        saveMessage(ctx.userId, this.name, 'user', message);

        let sysPrompt = SYSTEM_PROMPT;
        if (ctx.fileAnalysis) {
            sysPrompt += `\n\n[ARCHIVO: ${ctx.fileAnalysis.metadata.fileName}]\n${ctx.fileAnalysis.text}`;
        }

        const messages: LLMMessage[] = [
            { role: 'system', content: sysPrompt },
            ...ctx.history,
            { role: 'user', content: message }
        ];

        const tools = [
            {
                type: 'function',
                function: {
                    name: 'list_agents',
                    description: 'Lista los agentes actualmente disponibles.',
                    parameters: { type: 'object', properties: {} }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'get_time',
                    description: 'Devuelve la hora actual del servidor.',
                    parameters: { type: 'object', properties: {} }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'create_agent',
                    description: 'Crea un agente especialista con un cerebro/LLM específico. La próxima vez se puede usar con @nombre.',
                    parameters: {
                        type: 'object',
                        properties: {
                            name: { type: 'string', description: 'Nombre sin espacios, ej: ai_expert, impresion_3d, seguridad' },
                            description: { type: 'string', description: 'Qué hace este agente (una línea)' },
                            systemPrompt: { type: 'string', description: 'Instrucciones completas del experto, muy detalladas' },
                            modelProvider: {
                                type: 'string',
                                enum: ['groq', 'openrouter', 'deepseek', 'openai', 'ollama'],
                                description: 'groq=rápido/gratis, openrouter=variado/barato, deepseek=complejo, openai=potente, ollama=local'
                            }
                        },
                        required: ['name', 'description', 'systemPrompt', 'modelProvider']
                    }
                }
            }
        ];

        for (let i = 0; i < config.limits.maxIterations; i++) {
            const response = await this.llm.chat(messages, tools);

            if (response.tool_calls?.length) {
                messages.push(response);
                for (const tc of response.tool_calls) {
                    const args = typeof tc.function.arguments === 'string'
                        ? JSON.parse(tc.function.arguments)
                        : tc.function.arguments ?? {};

                    let result = '';
                    if (tc.function.name === 'list_agents') {
                        result = registry.getAll().map(a => `@${a.name} — ${a.description}`).join('\n');
                    } else if (tc.function.name === 'get_time') {
                        result = new Date().toISOString();
                    } else if (tc.function.name === 'create_agent') {
                        const { DynamicAgent } = await import('./dynamic.js');
                        const agent = new DynamicAgent(args.name, args.description, args.systemPrompt, args.modelProvider);
                        registry.register(agent);
                        saveAgent(args.name, args.description, args.systemPrompt, args.modelProvider);
                        result = `✅ Agente "@${args.name}" creado y registrado. El usuario puede usarlo con "@${args.name} <mensaje>".`;
                        logger.info(`Dynamic agent created: ${args.name}`);
                    }
                    messages.push({ role: 'tool', tool_call_id: tc.id, name: tc.function.name, content: result });
                }
            } else {
                const text = response.content?.trim() || 'Sin respuesta.';
                saveMessage(ctx.userId, this.name, 'assistant', text);
                return { success: true, handled: true, response: text };
            }
        }

        return { success: false, handled: true, response: '⚠️ Alcancé el límite de iteraciones.' };
    }
}
