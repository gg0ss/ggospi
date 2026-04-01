import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from './logger.js';

const execAsync = promisify(exec);

export async function checkGpu(): Promise<boolean> {
    try {
        const { stdout } = await execAsync('nvidia-smi --query-gpu=name,memory.total --format=csv,noheader');
        logger.info(`✅ GPU detectada: ${stdout.trim()}`);
        return true;
    } catch {
        logger.warn('AVISO: GPU NVIDIA no detectada. Ollama usará CPU (más lento).');
        return false;
    }
}
