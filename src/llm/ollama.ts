import fetch from 'node-fetch';
import { LLMAdapter, LLMMessage } from './interface.js';
import { config } from '../config.js';

export class OllamaAdapter implements LLMAdapter {
    readonly providerName: string;
    private model: string;

    constructor(model: string) {
        this.model = model;
        this.providerName = `ollama(${model})`;
    }

    isAvailable(): boolean {
        return true; // Siempre intentamos aunque falle al llamar
    }

    async chat(messages: LLMMessage[], _tools?: any[]): Promise<LLMMessage> {
        const res = await fetch(`${config.ollama.url}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: this.model, messages, stream: false })
        });

        if (!res.ok) {
            const txt = await res.text();
            throw new Error(`Ollama error (${res.status}): ${txt.substring(0, 200)}`);
        }

        const data = await res.json() as any;
        return data.message;
    }
}
