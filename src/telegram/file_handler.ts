import { Bot, Context } from 'grammy';
import { config } from '../config.js';
import fetch from 'node-fetch';
import { fileAnalyzer } from '../tools/file_analyzer.js';
import { agentRegistry } from '../agents/registry.js';
import { logger } from '../utils/logger.js';
import { getHistory } from '../memory/store.js';

export async function handleFile(ctx: Context, bot: Bot) {
    const userId = ctx.from!.id;
    let fileId: string | undefined;
    let fileName = 'archivo_desconocido';
    let mimeType = 'application/octet-stream';
    let fileSize = 0;

    if (ctx.message?.document) {
        fileId = ctx.message.document.file_id;
        fileName = ctx.message.document.file_name || 'doc';
        mimeType = ctx.message.document.mime_type || mimeType;
        fileSize = ctx.message.document.file_size || 0;
    } else if (ctx.message?.photo) {
        const photo = ctx.message.photo[ctx.message.photo.length - 1];
        fileId = photo.file_id;
        fileName = `foto_${photo.file_unique_id}.jpg`;
        mimeType = 'image/jpeg';
        fileSize = photo.file_size || 0;
    }

    if (!fileId) return;

    if (fileSize > config.limits.maxFileSizeMb * 1024 * 1024) {
        await ctx.reply(`❌ El archivo supera el límite de ${config.limits.maxFileSizeMb} MB.`);
        return;
    }

    try {
        const file = await bot.api.getFile(fileId);
        const url = `https://api.telegram.org/file/bot${config.telegram.botToken}/${file.file_path}`;
        
        const res = await fetch(url);
        if (!res.ok) throw new Error('Error descargando el archivo de Telegram');
        
        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const analysis = await fileAnalyzer.analyze(buffer, mimeType, fileName);

        const ggos = agentRegistry.get('ggos');
        if (ggos) {
            const response = await ggos.process(
                ctx.message?.caption || 'He recibido este archivo. Analízalo.', 
                {
                    userId,
                    telegramCtx: ctx,
                    history: getHistory(userId, 'ggos', config.limits.maxHistoryMessages),
                    fileAnalysis: analysis
                }
            );

            if (response.response) {
                 await ctx.reply(response.response.substring(0, 4000), { parse_mode: 'Markdown' }).catch(() => ctx.reply(response.response!.substring(0, 4000)));
            }
        }
    } catch (e: any) {
        logger.error('Error procesando archivo:', e.message);
        await ctx.reply(`❌ Error procesando el archivo: ${e.message}`);
    }
}
