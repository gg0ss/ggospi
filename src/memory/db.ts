import Database from 'better-sqlite3';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import fs from 'fs';
import path from 'path';

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
            role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
            content TEXT NOT NULL,
            created_at INTEGER NOT NULL DEFAULT (unixepoch())
        );

        CREATE TABLE IF NOT EXISTS capabilities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            packages TEXT NOT NULL,
            installed_at INTEGER NOT NULL DEFAULT (unixepoch()),
            status TEXT NOT NULL DEFAULT 'installed'
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

        CREATE TABLE IF NOT EXISTS user_state (
            user_id INTEGER PRIMARY KEY,
            active_agent TEXT NOT NULL DEFAULT 'ggos',
            last_activity INTEGER NOT NULL DEFAULT (unixepoch())
        );
    `);

    logger.info('✅ Base de datos SQLite inicializada');
}

export function getDb() {
    if (!db) initDatabase();
    return db;
}
