import fetch from 'node-fetch';
import { LLMAdapter, LLMMessage } from './interface.js';

interface ProviderConfig {
    name: string;
    apiKey: string;
    baseUrl: string;
    model: string;
    timeout: number;
}

export class OpenAICompatAdapter implements LLMAdapter {
    readonly providerName: string;
    private cfg: ProviderConfig;

    constructor(cfg: ProviderConfig) {
        this.providerName = cfg.name;
        this.cfg = cfg;
    }

    isAvailable(): boolean {
        return !!this.cfg.apiKey;
    }

    async chat(messages: LLMMessage[], tools?: any[]): Promise<LLMMessage> {
        if (!this.isAvailable()) throw new Error(`${this.providerName}: no API key configurada.`);

        const body: any = { model: this.cfg.model, messages, temperature: 0.7 };
        if (tools?.length) body.tools = tools;

        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), this.cfg.timeout);

        try {
            const res = await fetch(`${this.cfg.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.cfg.apiKey}`
                },
                body: JSON.stringify(body),
                signal: ctrl.signal as any
            });

            if (!res.ok) {
                const txt = await res.text();
                throw new Error(`${this.providerName} API error (${res.status}): ${txt.substring(0, 200)}`);
            }

            const data = await res.json() as any;
            return data.choices[0].message;
        } finally {
            clearTimeout(timer);
        }
    }
}
