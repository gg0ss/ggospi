import { config } from '../config.js';
import { LLMMessage } from '../types/index.js';
import { LLMAdapter } from './interface.js';
import fetch from 'node-fetch';

export class OllamaAdapter implements LLMAdapter {
    readonly name: string;
    private readonly model: string;
    private available = true;

    constructor(modelName: string) {
        this.model = modelName;
        this.name = `ollama-${modelName}`;
    }

    isAvailable(): boolean {
        return this.available;
    }

    async chat(messages: LLMMessage[], tools?: any[]): Promise<LLMMessage> {
        const body: any = {
            model: this.model,
            messages,
            stream: false
        };

        if (tools && tools.length > 0) {
            body.tools = tools;
        }

        const res = await fetch(`${config.ollama.url}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Ollama API error (${res.status}): ${text}`);
        }

        const data = await res.json() as any;
        return data.message;
    }
}
