import { LLMAdapter, LLMMessage } from './interface.js';
import { OpenAICompatAdapter } from './provider.js';
import { OllamaAdapter } from './ollama.js';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

/**
 * Devuelve un adaptador concreto según nombre de proveedor.
 * El agente puede elegir el suyo o se usa en cascada.
 */
export function getProvider(name: string): LLMAdapter {
    const p = config.providers;
    switch (name) {
        case 'groq':       return new OpenAICompatAdapter(p.groq);
        case 'openrouter': return new OpenAICompatAdapter(p.openrouter);
        case 'deepseek':   return new OpenAICompatAdapter(p.deepseek);
        case 'openai':     return new OpenAICompatAdapter(p.openai);
        case 'ollama':     return new OllamaAdapter(config.ollama.fallback);
        default:
            logger.warn(`Proveedor '${name}' desconocido. Usando cascada.`);
            return getCascadeProvider();
    }
}

/**
 * Cascada de proveedores: toma el primero con API key disponible.
 * Orden: Groq (más rápido/barato) → OpenRouter → DeepSeek → OpenAI → Ollama
 */
export function getCascadeProvider(): LLMAdapter {
    const candidates: LLMAdapter[] = [
        new OpenAICompatAdapter(config.providers.groq),
        new OpenAICompatAdapter(config.providers.openrouter),
        new OpenAICompatAdapter(config.providers.deepseek),
        new OpenAICompatAdapter(config.providers.openai),
        new OllamaAdapter(config.ollama.fallback)
    ];

    // Devolver wrapper que intente en orden
    return {
        providerName: 'cascade',
        isAvailable: () => true,
        async chat(messages: LLMMessage[], tools?: any[]): Promise<LLMMessage> {
            let lastErr = '';
            for (const provider of candidates) {
                if (!provider.isAvailable()) continue;
                try {
                    return await provider.chat(messages, tools);
                } catch (e: any) {
                    lastErr = `[${provider.providerName}] ${e.message}`;
                    logger.warn(`LLM cascada: ${lastErr}`);
                }
            }
            throw new Error(`Todos los LLMs fallaron. Último: ${lastErr}`);
        }
    };
}
