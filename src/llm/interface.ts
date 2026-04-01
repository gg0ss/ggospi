import { LLMMessage } from '../types/index.js';

export interface LLMAdapter {
    readonly name: string;
    isAvailable(): boolean;
    chat(messages: LLMMessage[], tools?: any[]): Promise<LLMMessage>;
}
