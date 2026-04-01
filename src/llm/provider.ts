import { LLMMessage } from '../types/index.js';
import { LLMAdapter } from './interface.js';
import fetch from 'node-fetch';

export class OpenAiCompatibleAdapter implements LLMAdapter {
    readonly name: string;
    private apiKey: string;
    private url: string;
    private model: string;
    private timeoutMs: number;

    constructor(name: string, configObj: { apiKey?: string; url: string; model: string; timeoutMs: number }) {
        this.name = name;
        this.apiKey = configObj.apiKey || '';
        this.url = configObj.url;
        this.model = configObj.model;
        this.timeoutMs = configObj.timeoutMs;
    }

    isAvailable(): boolean {
        return !!this.apiKey;
    }

    async chat(messages: LLMMessage[], tools?: any[]): Promise<LLMMessage> {
        if (!this.isAvailable()) throw new Error(`${this.name} NO configurado.`);

        const body: any = {
            model: this.model,
            messages,
            temperature: 0.7
        };

        if (tools && tools.length > 0) {
            body.tools = tools;
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

        try {
            const res = await fetch(`${this.url}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify(body),
                signal: controller.signal as any
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(`Error API (${res.status}): ${text}`);
            }

            const data = await res.json() as any;
            return data.choices[0].message;
        } finally {
            clearTimeout(timeout);
        }
    }
}
