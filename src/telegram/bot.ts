import { Bot, Context } from 'grammy';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import { registry } from '../agents/registry.js';
import { getHistory } from '../memory/store.js';
import { getKaliPending, clearKaliPending } from '../agents/kali.js';
import { handleFile } from './file_handler.js';

export function createBot(): Bot {
    const bot = new Bot(config.telegram.token);

    // ─── Auth middleware ────────────────────────────────────────────────────
    bot.use(async (ctx, next) => {
        const userId = ctx.from?.id;
        if (!userId) return;
        if (config.telegram.allowedUsers.length > 0 && !config.telegram.allowedUsers.includes(userId)) {
            logger.warn(`Access denied: userId=${userId}`);
            return;
        }
        await next();
    });

    // ─── /start ─────────────────────────────────────────────────────────────
    bot.command('start', async (ctx) => {
        const agents = registry.getAll().map(a => `• @${a.name} — ${a.description}`).join('\n');
        await ctx.reply(
            `🤖 *GGOS Multi-Agente Activo*\n\n` +
            `*Agentes disponibles:*\n${agents}\n\n` +
            `*Uso:*\n` +
            `• Escribe normalmente → GGOS responde\n` +
            `• \`@kali <mensaje>\` → Agente Kali Linux\n` +
            `• \`@nombre <mensaje>\` → Agente dinámico\n\n` +
            `Pide a GGOS que _"cree un agente experto en X"_ para expandir el equipo.`,
            { parse_mode: 'Markdown' }
        );
    });

    // ─── /agents ─────────────────────────────────────────────────────────────
    bot.command('agents', async (ctx) => {
        const agents = registry.getAll().map(a => `• \`@${a.name}\` — ${a.description}`).join('\n');
        await ctx.reply(`*Agentes disponibles:*\n${agents}`, { parse_mode: 'Markdown' });
    });

    // ─── Confirmaciones de Kali ─────────────────────────────────────────────
    bot.on('callback_query:data', async (ctx) => {
        const userId = ctx.from.id;
        const data = ctx.callbackQuery.data;

        if (data === 'kali_confirm') {
            const pending = getKaliPending(userId);
            if (!pending) {
                await ctx.answerCallbackQuery({ text: 'Acción expirada.', show_alert: true });
                await ctx.editMessageText('Acción expirada.', { reply_markup: { inline_keyboard: [] } }).catch(() => {});
                return;
            }
            await ctx.answerCallbackQuery({ text: 'Ejecutando...' });
            await ctx.editMessageText('⚙️ Ejecutando...', { reply_markup: { inline_keyboard: [] } }).catch(() => {});
            clearKaliPending(userId);
            try {
                const result = await pending.action();
                await sendSafe(ctx, result);
            } catch (e: any) {
                await ctx.reply(`❌ Error en ejecución: ${e.message}`);
            }
        } else if (data === 'kali_cancel') {
            await ctx.answerCallbackQuery({ text: 'Cancelado' });
            clearKaliPending(userId);
            await ctx.editMessageText('❌ Acción cancelada.', { reply_markup: { inline_keyboard: [] } }).catch(() => {});
        }
    });

    // ─── Archivos ────────────────────────────────────────────────────────────
    bot.on(['message:document', 'message:photo'], async (ctx) => {
        await ctx.replyWithChatAction('typing');
        await handleFile(ctx, bot);
    });

    // ─── Mensajes de texto ───────────────────────────────────────────────────
    bot.on('message:text', async (ctx) => {
        const userId = ctx.from.id;
        let text = ctx.message.text.trim();
        if (!text) return;

        await ctx.replyWithChatAction('typing');

        // Detectar prefijo de agente: @nombre mensaje
        let targetName = 'ggos';
        const prefixMatch = text.match(/^@([a-z0-9_]+)\s+([\s\S]+)$/i);
        if (prefixMatch) {
            targetName = prefixMatch[1].toLowerCase();
            text = prefixMatch[2].trim();
        }

        const agent = registry.get(targetName);
        if (!agent) {
            await ctx.reply(`⚠️ Agente "@${targetName}" no encontrado. Usa /agents para ver los disponibles.`);
            return;
        }

        try {
            const response = await agent.process(text, {
                userId,
                telegramCtx: ctx,
                history: getHistory(userId, targetName, config.limits.maxHistory)
            });

            if (response.response) {
                await sendSafe(ctx, response.response);
            }
        } catch (e: any) {
            logger.error(`Error en agente ${targetName}:`, e.message);
            await ctx.reply(`❌ Error: ${e.message}`);
        }
    });

    // ─── Error handler ───────────────────────────────────────────────────────
    bot.catch((err) => {
        logger.error(`Bot error [update ${err.ctx.update.update_id}]:`, err.error);
    });

    return bot;
}

async function sendSafe(ctx: Context, text: string) {
    const MAX = 3800;
    for (let i = 0; i < text.length; i += MAX) {
        await ctx.reply(text.substring(i, i + MAX)).catch(() => {});
    }
}
