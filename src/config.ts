import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

function env(key: string, fallback = ''): string {
    return process.env[key] || fallback;
}

function envRequired(key: string): string {
    const val = process.env[key];
    if (!val) {
        console.error(`[FATAL] Variable de entorno requerida no encontrada: ${key}`);
        process.exit(1);
    }
    return val;
}

export const config = {
    telegram: {
        token: envRequired('TELEGRAM_BOT_TOKEN'),
        allowedUsers: env('TELEGRAM_ALLOWED_USER_IDS')
            .split(',')
            .map(s => parseInt(s.trim()))
            .filter(n => !isNaN(n))
    },

    // ─── Proveedores LLM ─────────────────────────────────────────────────
    providers: {
        groq: {
            name: 'groq',
            apiKey: env('GROQ_API_KEY'),
            baseUrl: env('GROQ_URL', 'https://api.groq.com/openai/v1'),
            model: env('GROQ_MODEL', 'llama-3.3-70b-versatile'),
            timeout: 20000
        },
        openrouter: {
            name: 'openrouter',
            apiKey: env('OPENROUTER_API_KEY'),
            baseUrl: env('OPENROUTER_URL', 'https://openrouter.ai/api/v1'),
            model: env('OPENROUTER_MODEL', 'google/gemini-2.0-flash-lite:free'),
            timeout: 20000
        },
        deepseek: {
            name: 'deepseek',
            apiKey: env('DEEPSEEK_API_KEY'),
            baseUrl: env('DEEPSEEK_URL', 'https://api.deepseek.com/v1'),
            model: env('DEEPSEEK_MODEL', 'deepseek-chat'),
            timeout: 20000
        },
        openai: {
            name: 'openai',
            apiKey: env('OPENAI_API_KEY'),
            baseUrl: env('OPENAI_URL', 'https://api.openai.com/v1'),
            model: env('OPENAI_MODEL', 'gpt-4o-mini'),
            timeout: 20000
        },
        gemini: {
            name: 'gemini',
            apiKey: env('GEMINI_API_KEY'),
            baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
            model: env('GEMINI_MODEL', 'gemini-2.0-flash'),
            timeout: 20000
        }
    },

    // ─── Ollama (local) ───────────────────────────────────────────────────
    ollama: {
        url: env('OLLAMA_URL', 'http://localhost:11434'),
        kaliModel: env('OLLAMA_MODEL_KALI', 'kali-ggos'),
        kaliBase: env('OLLAMA_BASE_MODEL', 'dolphin3'),
        fallback: env('OLLAMA_FALLBACK_MODEL', 'llama3.2:3b')
    },

    // ─── Base de datos y rutas ────────────────────────────────────────────
    db: {
        path: env('DB_PATH', './memory.db')
    },
    dirs: {
        tmp: path.resolve(env('TMP_DIR', './tmp')),
        modelfiles: path.resolve(env('MODELFILES_DIR', './modelfiles'))
    },

    // ─── Límites operacionales ────────────────────────────────────────────
    limits: {
        maxIterations: parseInt(env('MAX_AGENT_ITERATIONS', '5')),
        maxHistory: parseInt(env('MAX_HISTORY_MESSAGES', '10')),
        maxFileSizeMb: parseInt(env('MAX_FILE_SIZE_MB', '50')),
        confirmationTimeout: parseInt(env('CONFIRMATION_TIMEOUT_SECONDS', '120'))
    }
};
