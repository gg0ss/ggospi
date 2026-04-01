import { Context } from 'grammy';
import { tools } from './registry.js';
import { ToolResult } from '../types/index.js';
import { logger } from '../utils/logger.js';

export async function executeTool(name: string, argsInput: string | Record<string, unknown>, ctx?: Context): Promise<ToolResult> {
    const tool = tools.get(name);
    if (!tool) {
        return { success: false, output: '', error: `Herramienta desconocida: ${name}` };
    }

    let args: Record<string, unknown> = {};
    try {
        if (typeof argsInput === 'string' && argsInput.trim()) {
            args = JSON.parse(argsInput);
        } else if (typeof argsInput === 'object' && argsInput !== null) {
            args = argsInput;
        }
    } catch (e) {
        return { success: false, output: '', error: `Argumentos JSON inválidos: ${argsInput}` };
    }

    logger.debug(`Ejecutando herramienta: ${name} con args:`, args);

    if (tool.needsConfirmation) {
        logger.debug(`La herramienta ${name} requiere confirmación (se asume ya procesada en ejecución directa)`);
    }

    try {
        return await tool.execute(args, ctx);
    } catch (err: any) {
        logger.error(`Error en herramienta ${name}:`, err.message);
        return { success: false, output: '', error: err.message };
    }
}
