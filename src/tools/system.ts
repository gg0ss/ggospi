import { exec } from 'child_process';
import { promisify } from 'util';
import { Tool } from '../types/index.js';
import { tools } from './registry.js';
import fs from 'fs';

const execAsync = promisify(exec);

export const executeCommandTool: Tool = {
    name: 'execute_command',
    description: 'Ejecuta un comando en la terminal de Kali Linux.',
    parameters: {
        type: 'object',
        properties: {
            command: { type: 'string', description: 'El comando de Linux a ejecutar. Ejemplo: "nmap -sV 192.168.1.1"' }
        },
        required: ['command']
    },
    needsConfirmation: true,
    async execute({ command }: { command: string }) {
        try {
            const { stdout, stderr } = await execAsync(command, { timeout: 60000 });
            let out = stdout.trim();
            if (out.length > 4000) out = out.substring(0, 4000) + '\n...[truncado]';
            let err = stderr.trim();
            if (err.length > 4000) err = err.substring(0, 4000) + '\n...[truncado]';
            
            let result = '';
            if (out) result += `STDOUT:\n${out}\n`;
            if (err) result += `STDERR:\n${err}\n`;
            if (!result) result = 'Comando ejecutado sin salida (éxito).';
            
            return { success: true, output: result };
        } catch (e: any) {
            return { success: false, output: '', error: e.message };
        }
    }
};

export const readFileTool: Tool = {
    name: 'read_file',
    description: 'Lee el contenido de un archivo del sistema.',
    parameters: {
        type: 'object',
        properties: {
            path: { type: 'string', description: 'Ruta absoluta o relativa del archivo' }
        },
        required: ['path']
    },
    async execute({ path }: { path: string }) {
        try {
            const content = fs.readFileSync(path, 'utf8');
            return { success: true, output: content.substring(0, 5000) + (content.length > 5000 ? '\n...[truncado 5000 chars]' : '') };
        } catch (e: any) {
            return { success: false, output: '', error: e.message };
        }
    }
};

export const writeFileTool: Tool = {
    name: 'write_file',
    description: 'Escribe contenido de texto en un archivo.',
    parameters: {
        type: 'object',
        properties: {
            path: { type: 'string', description: 'Ruta del archivo' },
            content: { type: 'string', description: 'Contenido a escribir' }
        },
        required: ['path', 'content']
    },
    async execute({ path, content }: { path: string, content: string }) {
        try {
            fs.writeFileSync(path, content, 'utf8');
            return { success: true, output: `Archivo ${path} escrito correctamente.` };
        } catch (e: any) {
            return { success: false, output: '', error: e.message };
        }
    }
};

export const installKaliToolTool: Tool = {
    name: 'install_kali_tool',
    description: 'Instala una herramienta de Kali Linux usando apt-get.',
    parameters: {
        type: 'object',
        properties: {
            toolName: { type: 'string', description: 'Nombre del paquete apt a instalar' }
        },
        required: ['toolName']
    },
    needsConfirmation: true,
    async execute({ toolName }: { toolName: string }) {
        try {
            const { stdout, stderr } = await execAsync(`sudo apt-get install -y ${toolName}`, { timeout: 120000 });
            return { success: true, output: stdout.substring(0, 2000) || `Paquete ${toolName} instalado.` };
        } catch (e: any) {
            return { success: false, output: '', error: e.message };
        }
    }
};

export const installOllamaModelTool: Tool = {
    name: 'install_ollama_model',
    description: 'Descarga un modelo de IA local en Ollama (ollama pull).',
    parameters: {
        type: 'object',
        properties: {
            modelName: { type: 'string', description: 'Nombre del modelo en Ollama (ej: qwen2.5, mistral)' }
        },
        required: ['modelName']
    },
    needsConfirmation: true,
    async execute({ modelName }: { modelName: string }) {
        try {
            // El pull tarda tiempo, incrementamos timeout a algo seguro como 5 mins
            const { stdout } = await execAsync(`ollama pull ${modelName}`, { timeout: 300000 });
            return { success: true, output: `Modelo ${modelName} descargado correctamente.\n${stdout}` };
        } catch (e: any) {
            return { success: false, output: '', error: e.message };
        }
    }
};

export function registerSystemTools() {
    tools.register(executeCommandTool);
    tools.register(readFileTool);
    tools.register(writeFileTool);
    tools.register(installKaliToolTool);
    tools.register(installOllamaModelTool);
}
