import { Context } from 'grammy';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../utils/logger.js';

const execAsync = promisify(exec);

const CAPABILITIES: Record<string, { npmPackages?: string[]; aptPackages?: string[]; description: string }> = {
    'ocr': { npmPackages: ['tesseract.js'], aptPackages: ['tesseract-ocr'], description: 'OCR para imágenes' },
    'audio': { npmPackages: ['whisper-node'], aptPackages: ['ffmpeg'], description: 'Transcripción de audio' },
    'scraping': { npmPackages: ['puppeteer', 'cheerio'], description: 'Web scraping' }
};

export const capabilityInstaller = {
    async checkAndInstall(capabilityName: string, _userId: number, ctx: Context) {
        const cap = CAPABILITIES[capabilityName];
        if (!cap) {
            await ctx.reply(`❌ Capacidad desconocida: ${capabilityName}`);
            return;
        }

        await ctx.reply(`⚙️ Instalando capacidad: ${capabilityName}...`);
        try {
            if (cap.aptPackages?.length) {
                await execAsync(`sudo apt-get install -y ${cap.aptPackages.join(' ')}`, { timeout: 120000 });
            }
            if (cap.npmPackages?.length) {
                await execAsync(`npm install ${cap.npmPackages.join(' ')}`, { timeout: 120000 });
            }
            await ctx.reply(`✅ Capacidad "${capabilityName}" instalada.`);
        } catch (e: any) {
            logger.error(`Error instalando ${capabilityName}:`, e.message);
            await ctx.reply(`❌ Error: ${e.message}`);
        }
    }
};
