import { Context } from 'grammy';
import { exec } from 'child_process';
import { promisify } from 'util';
import { saveCapability, isCapabilityInstalled } from '../memory/store.js';
import { logger } from '../utils/logger.js';
import { setPending } from '../telegram/state.js';

const execAsync = promisify(exec);

const CAPABILITIES: Record<string, {
  npmPackages?: string[]
  aptPackages?: string[]
  description: string
}> = {
  'ocr': {
    npmPackages: ['tesseract.js'],
    aptPackages: ['tesseract-ocr'],
    description: 'OCR para imágenes y PDFs escaneados'
  },
  'audio': {
    npmPackages: ['whisper-node'],
    aptPackages: ['ffmpeg'],
    description: 'Transcripción de audio a texto'
  },
  'pdf-advanced': {
    npmPackages: ['pdf-lib', 'pdfjs-dist'],
    description: 'Procesamiento avanzado de PDFs (merge, split, edit)'
  },
  'scraping': {
    npmPackages: ['puppeteer', 'cheerio'],
    description: 'Web scraping y automatización de navegador'
  },
  'vision': {
    description: 'Análisis de imágenes con LLM (requiere modelo llava)'
  }
};

export const capabilityInstaller = {
    async checkAndInstall(capabilityName: string, userId: number, ctx: Context) {
        if (!CAPABILITIES[capabilityName]) {
            await ctx.reply(`❌ Capacidad desconocida: ${capabilityName}`);
            return;
        }

        if (isCapabilityInstalled(capabilityName)) {
            await ctx.reply(`ℹ️ La capacidad **${capabilityName}** ya está instalada.`, { parse_mode: 'Markdown' });
            return;
        }

        const cap = CAPABILITIES[capabilityName];
        let desc = `Se instalará la capacidad: **${capabilityName}**\n* ${cap.description}\n`;
        if (cap.aptPackages) desc += `* APT: \`${cap.aptPackages.join(' ')}\`\n`;
        if (cap.npmPackages) desc += `* NPM: \`${cap.npmPackages.join(' ')}\`\n`;

        setPending(userId, {
            description: desc,
            expiresAt: Date.now() + 60000,
            agentName: 'ggos',
            action: async () => {
                let log = '';
                try {
                    if (cap.aptPackages && cap.aptPackages.length > 0) {
                        log += `Ejecutando apt install...\n`;
                        const { stdout } = await execAsync(`sudo apt-get install -y ${cap.aptPackages.join(' ')}`, { timeout: 120000 });
                        log += stdout + '\n';
                    }
                    if (cap.npmPackages && cap.npmPackages.length > 0) {
                        log += `Ejecutando npm install...\n`;
                        const { stdout } = await execAsync(`npm install ${cap.npmPackages.join(' ')}`, { timeout: 120000 });
                        log += stdout + '\n';
                    }
                    
                    saveCapability(capabilityName, JSON.stringify(cap), 'installed');
                    return `✅ Capacidad **${capabilityName}** instalada correctamente.\n\nLogs:\n${log.substring(0, 1000)}`;
                } catch (err: any) {
                    logger.error(`Error instalando capacidad ${capabilityName}`, err.message);
                    return `❌ Error instalando capacidad: ${err.message}`;
                }
            }
        });

        const keyboard = {
            inline_keyboard: [
                [
                    { text: '✅ Confirmar', callback_data: 'confirm' },
                    { text: '❌ Cancelar', callback_data: 'cancel' }
                ]
            ]
        };

        await ctx.reply(`⚠️ **Confirmación requerida**\n\n${desc}`, { parse_mode: 'Markdown', reply_markup: keyboard });
    }
};
