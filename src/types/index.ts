import { Context } from 'grammy';

export interface LLMMessage {
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string | null;
    tool_calls?: any[];
    tool_call_id?: string;
    name?: string;
}

export interface FileAnalysisResult {
    text: string;
    metadata: {
        fileName: string;
        mimeType: string;
        sizeBytes: number;
        pageCount?: number;
        sheetNames?: string[];
        truncated: boolean;
    };
}

export interface MessageContext {
    userId: number;
    telegramCtx: Context;
    fileAnalysis?: FileAnalysisResult;
    history: LLMMessage[];
}

export interface AgentResponse {
    success: boolean;
    handled: boolean; // if the agent handled the response directly to user
    response?: string;
    delegatedTo?: string; // if it routed to another agent
}

export interface LLMClient {
    chat(messages: LLMMessage[], tools?: any[]): Promise<LLMMessage>;
}

export interface ToolResult {
    success: boolean;
    output: string;
    error?: string;
}

export interface Tool {
    name: string;
    description: string;
    parameters: object;
    needsConfirmation?: boolean;
    execute(args: any, ctx?: Context): Promise<ToolResult>;
}
