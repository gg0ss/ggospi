import Database from 'better-sqlite3';
import { config } from '../config.js';
import { LLMMessage } from '../llm/interface.js';
import path from 'path';
import fs from 'fs';

let db: ReturnType<typeof Database>;

export function initDatabase() {
    const dir = path.dirname(config.db.path);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    db = new Database(config.db.path);
    db.pragma('journal_mode = WAL');

    db.exec(`
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            agent_name TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at INTEGER NOT NULL DEFAULT (unixepoch())
        );

        CREATE TABLE IF NOT EXISTS agents (
            name TEXT PRIMARY KEY,
            description TEXT NOT NULL,
            system_prompt TEXT NOT NULL,
            model_provider TEXT NOT NULL,
            created_at INTEGER NOT NULL DEFAULT (unixepoch())
        );

        CREATE TABLE IF NOT EXISTS action_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            agent_name TEXT NOT NULL,
            action_type TEXT NOT NULL,
            description TEXT NOT NULL,
            result TEXT,
            confirmed INTEGER NOT NULL DEFAULT 0,
            executed_at INTEGER NOT NULL DEFAULT (unixepoch())
        );

        CREATE TABLE IF NOT EXISTS pending (
            user_id INTEGER PRIMARY KEY,
            data TEXT NOT NULL,
            expires_at INTEGER NOT NULL
        );
    `);
}

export function getDb() {
    if (!db) initDatabase();
    return db;
}

// ─── Mensajes / Historial ────────────────────────────────────────────────────

export function saveMessage(userId: number, agentName: string, role: string, content: string) {
    getDb().prepare(
        'INSERT INTO messages (user_id, agent_name, role, content) VALUES (?, ?, ?, ?)'
    ).run(userId, agentName, role, content);
}

export function getHistory(userId: number, agentName: string, limit = 10): LLMMessage[] {
    const rows = getDb().prepare(`
        SELECT role, content FROM messages
        WHERE user_id = ? AND agent_name = ?
        ORDER BY id DESC LIMIT ?
    `).all(userId, agentName, limit) as { role: any; content: string }[];
    return rows.reverse().map(r => ({ role: r.role, content: r.content }));
}

// ─── Agentes dinámicos ────────────────────────────────────────────────────────

export function saveAgent(name: string, description: string, systemPrompt: string, modelProvider: string) {
    getDb().prepare(`
        INSERT OR REPLACE INTO agents (name, description, system_prompt, model_provider)
        VALUES (?, ?, ?, ?)
    `).run(name, description, systemPrompt, modelProvider);
}

export function getStoredAgents(): any[] {
    return getDb().prepare('SELECT * FROM agents').all();
}

// ─── Action log ────────────────────────────────────────────────────────────────

export function logAction(
    userId: number, agentName: string, type: string,
    description: string, result: string | null, confirmed: boolean
) {
    getDb().prepare(`
        INSERT INTO action_log (user_id, agent_name, action_type, description, result, confirmed)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(userId, agentName, type, description, result, confirmed ? 1 : 0);
}
