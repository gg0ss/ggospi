import { BaseAgent, AgentContext, AgentResponse } from './base.js';
import { LLMMessage } from '../llm/interface.js';
import { getProvider } from '../llm/router.js';
import { saveMessage } from '../memory/store.js';
import { config } from '../config.js';

/**
 * Agente genérico creado on-demand.
 * Recibe un system prompt especializado y un proveedor LLM concreto.
 */
export class DynamicAgent extends BaseAgent {
    readonly name: string;
    readonly description: string;
    private systemPrompt: string;
    private llm: ReturnType<typeof getProvider>;

    constructor(name: string, description: string, systemPrompt: string, modelProvider: string) {
        super();
        this.name = name.toLowerCase().replace(/[^a-z0-9_]/g, '');
        this.description = description;
        this.systemPrompt = systemPrompt;
        this.llm = getProvider(modelProvider);
    }

    async process(message: string, ctx: AgentContext): Promise<AgentResponse> {
        saveMessage(ctx.userId, this.name, 'user', message);

        const messages: LLMMessage[] = [
            { role: 'system', content: this.systemPrompt },
            ...ctx.history.filter(m => m.role !== 'system'),
            { role: 'user', content: message }
        ];

        try {
            const response = await this.llm.chat(messages);
            const text = response.content?.trim() || 'Sin respuesta.';
            saveMessage(ctx.userId, this.name, 'assistant', text);
            return { success: true, handled: true, response: text };
        } catch (e: any) {
            return { success: false, handled: true, response: `❌ Error en agente "${this.name}": ${e.message}` };
        }
    }
}
