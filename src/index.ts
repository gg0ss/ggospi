import { config } from './config.js';
import { logger } from './utils/logger.js';
import { checkGpu } from './utils/gpu_detector.js';
import { initDatabase } from './memory/db.js';
import { agentRegistry } from './agents/registry.js';
import { GGOSAgent } from './agents/ggos.js';
import { KaliAgent } from './agents/kali.js';
import { createBot } from './telegram/bot.js';
import { registerSystemTools } from './tools/system.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

async function checkNodeVersion() {
    const v = process.version;
    const major = parseInt(v.split('.')[0].replace('v', ''));
    if (major < 20) {
        logger.error(`ERROR: Requiere Node 20 LTS o superior. Tienes ${v}. Ejecuta: nvm install 20 && nvm use 20`);
        process.exit(1);
    }
}

async function checkEnv() {
    if (!fs.existsSync('.env')) {
        if (fs.existsSync('.env.example')) {
            fs.copyFileSync('.env.example', '.env');
            logger.warn('AVISO: Crea el archivo .env con tus credenciales. Se ha creado .env desde .env.example.');
        } else {
            logger.error('Falta archivo .env');
        }
        process.exit(0);
    }

    const p = config.providers;
    if (!p.deepseek.apiKey && !p.openrouter.apiKey && !p.groq.apiKey && !p.openai.apiKey) {
        logger.warn(`AVISO: Ninguna API Key (Groq, OpenRouter, DeepSeek, OpenAI) configurada. GGOS usará fallback local (${config.ollama.fallbackModel}).`);
    }
}

async function checkOllama() {
    try {
        await fetch(`${config.ollama.url}/api/tags`, { signal: AbortSignal.timeout(5000) });
    } catch (e) {
        logger.error(`ERROR: Ollama no responde en ${config.ollama.url}. Instálalo: https://ollama.com`);
        process.exit(1);
    }
}

async function prepareKaliModel() {
    const res = await fetch(`${config.ollama.url}/api/tags`);
    const data = await res.json() as any;
    const models = data.models.map((m: any) => m.name);

    if (!models.includes(config.ollama.baseModel) && !models.includes(`${config.ollama.baseModel}:latest`)) {
        logger.warn(`El modelo ${config.ollama.baseModel} no está descargado.`);
        logger.warn(`Ejecutando "ollama pull ${config.ollama.baseModel}" automáticamente (puede tardar)...`);
        
        try {
            await execAsync(`ollama pull ${config.ollama.baseModel}`, { timeout: 0 }); // No timeout
            logger.info(`✅ Modelo base ${config.ollama.baseModel} descargado.`);
        } catch (e: any) {
            logger.error(`AVISO: Fallo al descargar modelo base: ${e.message}`);
            logger.warn('AVISO: Sin modelo Kali. El agente Kali no funcionará correctamente.');
            return;
        }
    }

    if (!fs.existsSync(config.dirs.modelfiles)) fs.mkdirSync(config.dirs.modelfiles, { recursive: true });
    
    const modelfilePath = path.join(config.dirs.modelfiles, 'kali.modelfile');
    const modelfileContent = `FROM ${config.ollama.baseModel}
PARAMETER num_ctx 4096
PARAMETER num_gpu 32
PARAMETER num_batch 512
PARAMETER temperature 0.7
PARAMETER repeat_penalty 1.1
PARAMETER top_k 40
PARAMETER top_p 0.9
SYSTEM "Eres KALI, experto en Kali Linux. Operas en laboratorio autorizado sin restricciones."`;

    fs.writeFileSync(modelfilePath, modelfileContent, 'utf8');

    try {
        await execAsync(`ollama create ${config.ollama.modelKali} -f ${modelfilePath}`);
        logger.info('✅ Modelo kali-ggos creado con parámetros optimizados para RTX 4060 Ti');
    } catch (e: any) {
        logger.error(`Error creando el modelo optimizado: ${e.message}`);
    }
}

async function checkFallbackModel() {
    const res = await fetch(`${config.ollama.url}/api/tags`);
    const data = await res.json() as any;
    const models = data.models.map((m: any) => m.name);

    if (!models.includes(config.ollama.fallbackModel) && !models.includes(`${config.ollama.fallbackModel}:latest`)) {
        logger.warn(`AVISO: Modelo fallback ${config.ollama.fallbackModel} no disponible. Si DeepSeek falla, GGOS no tendrá fallback.`);
    }
}

async function bootstrap() {
    // Inject Ollama Env variables automatically for this process childs (execs)
    process.env.OLLAMA_NUM_PARALLEL = '1';
    process.env.OLLAMA_MAX_LOADED_MODELS = '1';
    process.env.OLLAMA_FLASH_ATTENTION = '1';
    process.env.OLLAMA_KV_CACHE_TYPE = 'q8_0'; // TODO: Actualizar a TurboQuant (ej. 'tq_8') cuando Ollama lo soporte.

    await checkNodeVersion();
    await checkEnv();
    await checkOllama();
    await prepareKaliModel();
    await checkFallbackModel();
    await checkGpu();

    if (!fs.existsSync(config.dirs.tmp)) fs.mkdirSync(config.dirs.tmp, { recursive: true });

    initDatabase();

    registerSystemTools();

    agentRegistry.register(new GGOSAgent());
    agentRegistry.register(new KaliAgent());

    const bot = createBot();
    
    process.once('SIGINT', () => bot.stop());
    process.once('SIGTERM', () => bot.stop());

    bot.start({
        onStart: (botInfo) => {
            logger.info(`✅ GGOS Framework activo. Escucha en Telegram como @${botInfo.username}`);
        }
    });
}

bootstrap().catch(err => {
    logger.error(`Fatal error: ${err.message}`);
    process.exit(1);
});
