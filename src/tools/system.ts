import { exec } from 'child_process';
import { promisify } from 'util';
import { Tool } from '../types/index.js';
import { tools } from './registry.js';
import { logger } from '../utils/logger.js';
import fs from 'fs';

const execAsync = promisify(exec);

// Comandos de lectura/info que NUNCA necesitan confirmación
const SAFE_PATTERNS = [
    /^(ls|ll|la|cat|head|tail|echo|pwd|whoami|id|hostname|uname|date|df|du|free|ps|top|htop|ifconfig|ip |netstat|ss |ping|curl|wget|which|find|grep|awk|sed|cut|sort|wc|file|strings|xxd|hexdump|nmap|whois|dig|host|traceroute|nslookup|nikto|gobuster|ffuf|hydra|sqlmap|aircrack|john|hashcat|wpscan|enum4linux|smbclient|rpcclient|nbtscan|masscan|tcpdump|wireshark|tshark|arp|route|ss -|lsof|strace|ltrace|objdump|readelf|gdb|python3|python|perl|ruby|bash|sh|zsh|nc |ncat |socat|openssl|ssh|scp|rsync)/,
    /^(apt-cache|dpkg -l|which |type |locate |updatedb|man |help |--help|-h$)/
];

function needsConfirm(cmd: string): boolean {
    const lower = cmd.trim().toLowerCase();
    // Auto-ejecutar si es un patrón conocido de lectura/herramienta
    if (SAFE_PATTERNS.some(p => p.test(lower))) return false;
    // Pedir confirmación sólo para destructivos reales
    return /\b(rm |rmdir|mkfs|fdisk|dd |format|shred|wipefs|shutdown|reboot|halt|poweroff|init 0|kill -9|pkill -9|userdel|usermod|passwd|chmod 777|chown root)\b/.test(lower);
}

export const executeCommandTool: Tool = {
    name: 'execute_command',
    description: 'Ejecuta un comando en el sistema Linux. Devuelve stdout y stderr.',
    parameters: {
        type: 'object',
        properties: {
            command: { type: 'string', description: 'Comando Linux a ejecutar.' }
        },
        required: ['command']
    },
    get needsConfirmation() { return false; }, // Kali decide por sí mismo basado en needsConfirm()
    async execute({ command }: { command: string }) {
        logger.info(`[execute_command] ${command}`);
        try {
            const { stdout, stderr } = await execAsync(command, {
                timeout: 120000,
                maxBuffer: 1024 * 1024 * 5,
                env: { ...process.env, PATH: '/usr/bin:/bin:/usr/local/bin:/usr/sbin:/sbin:/usr/share/metasploit-framework/:/usr/share/sqlmap' }
            });
            let out = stdout.trim();
            let err = stderr.trim();
            // Truncar si es muy largo (ahorro de tokens)
            if (out.length > 3000) out = out.substring(0, 3000) + '\n...[truncado, muestra parcial]';
            if (err.length > 1000) err = err.substring(0, 1000) + '\n...[stderr truncado]';
            let result = '';
            if (out) result += out;
            if (err) result += (out ? '\n---STDERR---\n' : '') + err;
            if (!result) result = '[OK - sin salida]';
            return { success: true, output: result };
        } catch (e: any) {
            const msg = (e.stdout || '') + (e.stderr ? '\nSTDERR: ' + e.stderr : '') || e.message;
            return { success: false, output: msg.substring(0, 2000), error: e.message };
        }
    }
};

export const readFileTool: Tool = {
    name: 'read_file',
    description: 'Lee un archivo del sistema.',
    parameters: {
        type: 'object',
        properties: {
            path: { type: 'string' }
        },
        required: ['path']
    },
    async execute({ path }: { path: string }) {
        try {
            const content = fs.readFileSync(path, 'utf8');
            const out = content.length > 4000 ? content.substring(0, 4000) + '\n...[truncado]' : content;
            return { success: true, output: out };
        } catch (e: any) {
            return { success: false, output: '', error: e.message };
        }
    }
};

export const writeFileTool: Tool = {
    name: 'write_file',
    description: 'Escribe un archivo en el sistema.',
    parameters: {
        type: 'object',
        properties: {
            path: { type: 'string' },
            content: { type: 'string' },
            append: { type: 'boolean', description: 'Si true, añade al final en vez de sobreescribir' }
        },
        required: ['path', 'content']
    },
    async execute({ path, content, append }: { path: string; content: string; append?: boolean }) {
        try {
            if (append) {
                fs.appendFileSync(path, content, 'utf8');
            } else {
                fs.writeFileSync(path, content, 'utf8');
            }
            return { success: true, output: `${append ? 'Añadido' : 'Escrito'}: ${path}` };
        } catch (e: any) {
            return { success: false, output: '', error: e.message };
        }
    }
};

export const installKaliToolTool: Tool = {
    name: 'install_kali_tool',
    description: 'Instala un paquete con apt-get.',
    parameters: {
        type: 'object',
        properties: {
            toolName: { type: 'string' }
        },
        required: ['toolName']
    },
    needsConfirmation: true,
    async execute({ toolName }: { toolName: string }) {
        try {
            const { stdout } = await execAsync(`sudo apt-get install -y ${toolName}`, { timeout: 180000 });
            return { success: true, output: stdout.substring(0, 1500) || `${toolName} instalado.` };
        } catch (e: any) {
            return { success: false, output: '', error: e.message };
        }
    }
};

// Exportar helper para que KaliAgent decida sin preguntar al middleware
export { needsConfirm };

export function registerSystemTools() {
    tools.register(executeCommandTool);
    tools.register(readFileTool);
    tools.register(writeFileTool);
    tools.register(installKaliToolTool);
}
