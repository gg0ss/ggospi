import { MessageContext, AgentResponse } from '../types/index.js';

export abstract class BaseAgent {
    abstract readonly name: string;
    abstract readonly description: string;

    abstract process(message: string, context: MessageContext): Promise<AgentResponse>;
}
