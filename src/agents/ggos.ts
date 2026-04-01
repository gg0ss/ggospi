import { BaseAgent } from './base.js';
import { MessageContext, AgentResponse, LLMMessage } from '../types/index.js';
import { LLMRouter } from '../llm/router.js';
import { saveMessage } from '../memory/store.js';
import { agentRegistry } from './registry.js';
import { config } from '../config.js';

export class GGOSAgent extends BaseAgent {
    readonly name = 'ggos';
    readonly description = 'Maestro. Deriva tareas a especialistas o responde directamente.';
    private llm: LLMRouter;

    constructor() {
        super();
        this.llm = new LLMRouter();
    }

    async process(message: string, context: MessageContext): Promise<AgentResponse> {
        saveMessage(context.userId, this.name, 'user', message);

        let systemPrompt = `Eres GGOS, asistente maestro. Recibes mensajes y decides si responder tú o delegar.\n`+
            `- Si el mensaje empieza con "@kali": delega a Kali inmediatamente.\n`+
            `- Si contiene términos de seguridad ofensiva: delega a Kali.\n`+
            `- Si hay texto extraído de un archivo en el contexto: analízalo y responde.\n`+
            `- Para todo lo demás: responde directamente.\n`+
            `Sé conciso. No expliques tu razonamiento interno. Solo responde o delega.\n\n`;

        if (context.fileAnalysis) {
            systemPrompt += `[ARCHIVO RECIENTE: ${context.fileAnalysis.metadata.fileName}]\n${context.fileAnalysis.text}\n\n`;
        }

        const messages: LLMMessage[] = [
            { role: 'system', content: systemPrompt },
            ...context.history,
            { role: 'user', content: message }
        ];

        const tools = [
            {
                type: 'function',
                function: {
                    name: 'get_current_time',
                    description: 'Obtiene la hora actual del servidor.',
                    parameters: { type: 'object', properties: {} }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'list_agents',
                    description: 'Lista los nombres de los agentes disponibles.',
                    parameters: { type: 'object', properties: {} }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'delegate_to_agent',
                    description: 'Delega el mensaje a otro agente especializado (ej. kali).',
                    parameters: {
                        type: 'object',
                        properties: {
                            agentName: { type: 'string' },
                            message: { type: 'string' }
                        },
                        required: ['agentName', 'message']
                    }
                }
            }
        ];

        for (let i = 0; i < config.limits.maxAgentIterations; i++) {
            const response = await this.llm.chat(messages, tools);

            if (response.tool_calls && response.tool_calls.length > 0) {
                messages.push(response);

                for (const tc of response.tool_calls) {
                    const name = tc.function.name;
                    const args = tc.function.arguments;

                    if (name === 'delegate_to_agent') {
                        const parsed = typeof args === 'string' ? JSON.parse(args) : (args || {});
                        return { success: true, handled: false, delegatedTo: parsed.agentName };
                    } else if (name === 'list_agents') {
                        messages.push({ role: 'tool', tool_call_id: tc.id, name, content: agentRegistry.getAll().map(a => a.name).join(', ') });
                    } else if (name === 'get_current_time') {
                        messages.push({ role: 'tool', tool_call_id: tc.id, name, content: new Date().toISOString() });
                    }
                }
            } else {
                const text = response.content || 'Sin respuesta.';
                saveMessage(context.userId, this.name, 'assistant', text);
                return { success: true, handled: true, response: text };
            }
        }
        
        return { success: false, handled: false, response: 'GGOS alcanzó el máximo de iteraciones.' };
    }
}
