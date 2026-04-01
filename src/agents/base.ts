import { LLMMessage } from '../llm/interface.js';

export interface AgentContext {
    userId: number;
    history: LLMMessage[];
    telegramCtx: any; // El ctx de grammY
    fileAnalysis?: { text: string; metadata: { fileName: string } };
}

export interface AgentResponse {
    success: boolean;
    handled: boolean;
    response?: string;          // Texto para enviar al usuario
    delegatedTo?: string;       // Si GGOS quiere delegar
}

export abstract class BaseAgent {
    abstract readonly name: string;
    abstract readonly description: string;
    abstract process(message: string, ctx: AgentContext): Promise<AgentResponse>;
}
