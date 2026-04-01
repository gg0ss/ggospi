import { getDb } from './db.js';
import { LLMMessage } from '../types/index.js';

export function saveMessage(userId: number, agentName: string, role: string, content: string): void {
    const db = getDb();
    db.prepare('INSERT INTO messages (user_id, agent_name, role, content) VALUES (?, ?, ?, ?)')
      .run(userId, agentName, role, content);
}

export function getHistory(userId: number, agentName: string, limit: number = 20): LLMMessage[] {
    const db = getDb();
    const rows = db.prepare(`
        SELECT role, content FROM messages 
        WHERE user_id = ? AND agent_name = ?
        ORDER BY id DESC LIMIT ?
    `).all(userId, agentName, limit) as {role: 'user'|'assistant'|'system', content: string}[];
    
    return rows.reverse().map(r => ({ role: r.role, content: r.content }));
}

export function logAction(userId: number, agentName: string, type: string, description: string, result: string | null, confirmed: boolean): void {
    const db = getDb();
    db.prepare(`
        INSERT INTO action_log (user_id, agent_name, action_type, description, result, confirmed) 
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, agentName, type, description, result, confirmed ? 1 : 0);
}

export function isCapabilityInstalled(name: string): boolean {
    const db = getDb();
    const row = db.prepare('SELECT 1 FROM capabilities WHERE name = ? AND status = "installed"').get(name);
    return !!row;
}

export function saveCapability(name: string, packages: string, status: string): void {
    const db = getDb();
    db.prepare('INSERT OR REPLACE INTO capabilities (name, packages, status) VALUES (?, ?, ?)')
      .run(name, packages, status);
}

export function setActiveAgent(userId: number, agentName: string): void {
    const db = getDb();
    db.prepare(`
        INSERT INTO user_state (user_id, active_agent, last_activity) 
        VALUES (?, ?, unixepoch())
        ON CONFLICT(user_id) DO UPDATE SET active_agent = excluded.active_agent, last_activity = unixepoch()
    `).run(userId, agentName);
}

export function getActiveAgent(userId: number): string {
    const db = getDb();
    const row = db.prepare('SELECT active_agent FROM user_state WHERE user_id = ?').get(userId) as {active_agent: string} | undefined;
    return row ? row.active_agent : 'ggos';
}
