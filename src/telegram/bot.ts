import { Bot, Context } from 'grammy';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import { agentRegistry } from '../agents/registry.js';
import { getPending, clearPending } from './state.js';
import { setActiveAgent, logAction, getHistory } from '../memory/store.js';
import { handleFile } from './file_handler.js';

const SECURITY_KEYWORDS = [
    'nmap', 'exploit', 'pentest', 'hydra', 'sqlmap', 'metasploit', 'payload',
    'cve', 'crack', 'aircrack', 'gobuster', 'ffuf', 'nikto', 'burp', 'port scan',
    'reverse shell', 'john', 'hashcat', 'wireshark', 'netcat', 'responder'
];

export function createBot(): Bot {
    const bot = new Bot(config.telegram.botToken);

    // ── Middleware de autenticación ────────────────────────────────────────────
    bot.use(async (ctx, next) => {
        const userId = ctx.from?.id;
        if (!userId) return;
        if (config.telegram.allowedUserIds.length > 0 && !config.telegram.allowedUserIds.includes(userId)) {
            logger.warn(`Acceso denegado a userId=${userId}`);
            return;
        }
        await next();
    });

    // ── /start ─────────────────────────────────────────────────────────────────
    bot.command('start', async (ctx) => {
        const userId = ctx.from!.id;
        setActiveAgent(userId, 'ggos');
        await ctx.reply(
            '🚀 GGOS Framework Iniciado\n\n' +
            '• Maestro: DeepSeek V3\n' +
            '• Especialista Kali: dolphin3 (local, sin censura)\n\n' +
            'Escribe normalmente para hablar con GGOS.\n' +
            'Usa @kali <consulta> para el agente especializado en Kali.\n\n' +
            'Nota: el modelo Kali es local (CPU), puede tardar 20-60s.'
        );
    });

    // ── Confirmaciones inline ──────────────────────────────────────────────────
    bot.on('callback_query:data', async (ctx) => {
        const userId = ctx.from.id;
        const data = ctx.callbackQuery.data;
        const pending = getPending(userId);

        if (!pending) {
            await ctx.answerCallbackQuery({ text: 'Accion expirada. Repite el comando.', show_alert: true });
            // Editar sin markdown para evitar errores de parseo
            await ctx.editMessageText('Accion expirada. Repite el comando.', {
                reply_markup: { inline_keyboard: [] }
            }).catch(() => {});
            return;
        }

        if (data === 'confirm') {
            await ctx.answerCallbackQuery({ text: 'Ejecutando...' });

            // 1. Primero quitar los botones (sin markdown, sin exclamaciones raras)
            await ctx.editMessageText(
                'Ejecutando... espera un momento.',
                { reply_markup: { inline_keyboard: [] } }
            ).catch(() => {});

            // 2. Limpiar DESPUÉS de quitar botones (no antes)
            const captured = pending;
            clearPending(userId);

            try {
                const result = await captured.action();
                // Enviar resultado como mensaje nuevo (evita límites de edición)
                const truncated = result.length > 3800
                    ? result.substring(0, 3800) + '\n...[output truncado]'
                    : result;
                await ctx.reply(truncated);
            } catch (err: any) {
                logger.error('Error ejecutando accion:', err.message);
                await ctx.reply('Error en ejecucion: ' + err.message);
            }

        } else if (data === 'cancel') {
            await ctx.answerCallbackQuery({ text: 'Cancelado' });
            const captured = pending;
            clearPending(userId);
            await ctx.editMessageText('Accion cancelada.', {
                reply_markup: { inline_keyboard: [] }
            }).catch(() => {});
            logAction(userId, captured.agentName, 'cancel_action', 'Cancelado por usuario', null, false);
        }
    });

    // ── Archivos ───────────────────────────────────────────────────────────────
    bot.on(['message:document', 'message:photo'], async (ctx) => {
        await ctx.replyWithChatAction('typing');
        await handleFile(ctx, bot);
    });

    // ── Mensajes de texto ─────────────────────────────────────────────────────
    bot.on('message:text', async (ctx) => {
        const userId = ctx.from.id;
        let text = ctx.message.text.trim();

        if (!text) return;

        if (getPending(userId)) {
            await ctx.reply('Tienes una confirmacion pendiente. Usa los botones o espera a que expire.');
            return;
        }

        await ctx.replyWithChatAction('typing');

        // Determinar el agente destino
        let targetAgentName = 'ggos';

        if (text.toLowerCase().startsWith('@kali ')) {
            targetAgentName = 'kali';
            text = text.substring(6).trim();
        } else if (SECURITY_KEYWORDS.some(w => text.toLowerCase().includes(w))) {
            targetAgentName = 'kali';
        }

        const agent = agentRegistry.get(targetAgentName);
        if (!agent) {
            await ctx.reply('Agente no encontrado.');
            return;
        }

        try {
            const response = await agent.process(text, {
                userId,
                telegramCtx: ctx,
                history: getHistory(userId, targetAgentName, config.limits.maxHistoryMessages)
            });

            // Delegación GGOS → otro agente
            if (response.delegatedTo) {
                const delegated = agentRegistry.get(response.delegatedTo);
                if (delegated) {
                    await ctx.reply('GGOS delega a ' + response.delegatedTo.toUpperCase() + '... (puede tardar)');
                    const res2 = await delegated.process(text, {
                        userId,
                        telegramCtx: ctx,
                        history: getHistory(userId, response.delegatedTo, config.limits.maxHistoryMessages)
                    });
                    if (res2.response) await sendSafe(ctx, res2.response);
                }
                return;
            }

            // Respuesta de texto normal
            if (response.response) {
                await sendSafe(ctx, response.response);
            }
            // Si handled=true sin response → Kali ya envió el inline keyboard directamente

        } catch (e: any) {
            logger.error('Error procesando mensaje:', e.message);
            await ctx.reply('Error: ' + e.message);
        }
    });

    // ── Error handler ─────────────────────────────────────────────────────────
    bot.catch((err) => {
        logger.error('Error en update ' + err.ctx.update.update_id + ':', err.error);
    });

    return bot;
}

async function sendSafe(ctx: Context, text: string) {
    const MAX = 3800;
    for (let i = 0; i < text.length; i += MAX) {
        await ctx.reply(text.substring(i, i + MAX)).catch(() => {});
    }
}
