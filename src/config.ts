import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

function getEnv(key: string, required = false, defaultVal = ''): string {
    const val = process.env[key];
    if (!val && required && !defaultVal) {
        console.error(`ERROR: Variable de entorno obligatoria faltante: ${key}`);
        process.exit(1);
    }
    return val || defaultVal;
}

export const config = {
    telegram: {
        botToken: getEnv('TELEGRAM_BOT_TOKEN', true),
        allowedUserIds: getEnv('TELEGRAM_ALLOWED_USER_IDS').split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n))
    },
    providers: {
        deepseek: {
            apiKey: getEnv('DEEPSEEK_API_KEY'),
            url: getEnv('DEEPSEEK_API_URL', false, 'https://api.deepseek.com/v1'),
            model: getEnv('DEEPSEEK_MODEL', false, 'deepseek-chat'),
            timeoutMs: parseInt(getEnv('DEEPSEEK_TIMEOUT_MS', false, '15000'))
        },
        openrouter: {
            apiKey: getEnv('OPENROUTER_API_KEY'),
            url: getEnv('OPENROUTER_URL', false, 'https://openrouter.ai/api/v1'),
            model: getEnv('OPENROUTER_MODEL', false, 'google/gemini-2.5-flash'), // Ejemplo de modelo barato
            timeoutMs: parseInt(getEnv('OPENROUTER_TIMEOUT_MS', false, '15000'))
        },
        groq: {
            apiKey: getEnv('GROQ_API_KEY'),
            url: getEnv('GROQ_URL', false, 'https://api.groq.com/openai/v1'),
            model: getEnv('GROQ_MODEL', false, 'llama-3.3-70b-versatile'),
            timeoutMs: parseInt(getEnv('GROQ_TIMEOUT_MS', false, '15000'))
        },
        openai: {
            apiKey: getEnv('OPENAI_API_KEY'),
            url: getEnv('OPENAI_URL', false, 'https://api.openai.com/v1'),
            model: getEnv('OPENAI_MODEL', false, 'gpt-4o-mini'),
            timeoutMs: parseInt(getEnv('OPENAI_TIMEOUT_MS', false, '15000'))
        }
    },
    // Mantengo compatibilidad anterior para index.ts checkEnv
    deepseek: {
        apiKey: getEnv('DEEPSEEK_API_KEY')
    },
    ollama: {
        url: getEnv('OLLAMA_URL', false, 'http://localhost:11434'),
        modelKali: getEnv('OLLAMA_MODEL_KALI', false, 'kali-ggos'),
        baseModel: getEnv('OLLAMA_BASE_MODEL', false, 'dolphin3'),
        fallbackModel: getEnv('OLLAMA_FALLBACK_MODEL', false, 'llama3.2:3b')
    },
    db: {
        path: getEnv('DB_PATH', false, './memory.db')
    },
    limits: {
        confirmationTimeoutSeconds: parseInt(getEnv('CONFIRMATION_TIMEOUT_SECONDS', false, '60')),
        maxFileSizeMb: parseInt(getEnv('MAX_FILE_SIZE_MB', false, '50')),
        maxAgentIterations: parseInt(getEnv('MAX_AGENT_ITERATIONS', false, '3')),
        maxHistoryMessages: parseInt(getEnv('MAX_HISTORY_MESSAGES', false, '20'))
    },
    dirs: {
        tmp: path.resolve(getEnv('TMP_DIR', false, './tmp')),
        modelfiles: path.resolve(getEnv('MODELFILES_DIR', false, './modelfiles'))
    }
};
