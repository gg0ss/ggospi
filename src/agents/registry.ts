import { BaseAgent } from './base.js';

class AgentRegistry {
    private agents = new Map<string, BaseAgent>();

    register(agent: BaseAgent) {
        this.agents.set(agent.name, agent);
    }

    get(name: string): BaseAgent | undefined {
        return this.agents.get(name);
    }

    getAll(): BaseAgent[] {
        return Array.from(this.agents.values());
    }
}

export const agentRegistry = new AgentRegistry();
