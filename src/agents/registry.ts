import { BaseAgent } from './base.js';
import { DynamicAgent } from './dynamic.js';
import { getStoredAgents } from '../memory/store.js';
import { logger } from '../utils/logger.js';

class AgentRegistry {
    private map = new Map<string, BaseAgent>();

    register(agent: BaseAgent) {
        this.map.set(agent.name, agent);
        logger.info(`Agent registered: ${agent.name}`);
    }

    get(name: string): BaseAgent | undefined {
        return this.map.get(name);
    }

    getAll(): BaseAgent[] {
        return Array.from(this.map.values());
    }

    /** Carga agentes dinámicos guardados en BD al arrancar */
    async loadDynamic() {
        const stored = getStoredAgents();
        for (const s of stored) {
            if (!this.map.has(s.name)) {
                this.register(new DynamicAgent(s.name, s.description, s.system_prompt, s.model_provider));
                logger.info(`Agent reloaded from DB: ${s.name}`);
            }
        }
    }
}

export const registry = new AgentRegistry();
