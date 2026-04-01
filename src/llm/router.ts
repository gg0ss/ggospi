import { LLMMessage } from '../types/index.js';
import { LLMAdapter } from './interface.js';
import { OpenAiCompatibleAdapter } from './provider.js';
import { OllamaAdapter } from './ollama.js';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

export class LLMRouter implements LLMAdapter {
    readonly name = 'router';
    private providers: LLMAdapter[] = [];

    constructor() {
        this.addIfAvailable(new OpenAiCompatibleAdapter('groq', config.providers.groq));
        this.addIfAvailable(new OpenAiCompatibleAdapter('openrouter', config.providers.openrouter));
        this.addIfAvailable(new OpenAiCompatibleAdapter('deepseek', config.providers.deepseek));
        this.addIfAvailable(new OpenAiCompatibleAdapter('openai', config.providers.openai));
        this.addIfAvailable(new OllamaAdapter(config.ollama.fallbackModel));
    }

    private addIfAvailable(adapter: LLMAdapter) {
        if (adapter.isAvailable()) {
            this.providers.push(adapter);
        }
    }

    isAvailable(): boolean {
        return this.providers.length > 0;
    }

    async chat(messages: LLMMessage[], tools?: any[]): Promise<LLMMessage> {
        if (this.providers.length === 0) throw new Error('No hay proveedores LLM disponibles.');

        let lastError = '';

        for (const provider of this.providers) {
            try {
                return await provider.chat(messages, tools);
            } catch (err: any) {
                logger.warn(`[Router] ${provider.name} falló: ${err.message}. Intentando siguiente...`);
                lastError = err.message;
            }
        }

        throw new Error(`Todos los LLMs fallaron. Último error: ${lastError}`);
    }
}
