import { Tool } from '../types/index.js';
import { logger } from '../utils/logger.js';

export class ToolRegistry {
    private tools = new Map<string, Tool>();

    register(tool: Tool): this {
        if (this.tools.has(tool.name)) {
            logger.warn(`Herramienta '${tool.name}' ya registrada. Sobreescribiendo.`);
        }
        this.tools.set(tool.name, tool);
        logger.debug(`Herramienta registrada: ${tool.name}`);
        return this;
    }

    get(name: string): Tool | undefined {
        return this.tools.get(name);
    }

    getAllForLLM(): any[] {
        return Array.from(this.tools.values()).map(tool => ({
            type: 'function',
            function: {
                name: tool.name,
                description: tool.description,
                parameters: tool.parameters
            }
        }));
    }

    getNames(): string[] {
        return Array.from(this.tools.keys());
    }
}

export const tools = new ToolRegistry();
