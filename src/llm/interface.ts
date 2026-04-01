export interface LLMMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content?: string;
    tool_calls?: any[];
    tool_call_id?: string;
    name?: string;
}

export interface LLMAdapter {
    readonly providerName: string;
    isAvailable(): boolean;
    chat(messages: LLMMessage[], tools?: any[]): Promise<LLMMessage>;
}
