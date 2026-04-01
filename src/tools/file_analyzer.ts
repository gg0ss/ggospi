import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import * as xlsx from 'xlsx';
import { FileAnalysisResult } from '../types/index.js';

const execAsync = promisify(exec);

export const fileAnalyzer = {
    async analyze(buffer: Buffer, mimeType: string, fileName: string): Promise<FileAnalysisResult> {
        let text = '';
        let truncated = false;
        let pageCount, sheetNames;

        try {
            const ext = path.extname(fileName).toLowerCase();
            
            if (ext === '.pdf') {
                const data = await pdfParse(buffer);
                text = data.text;
                pageCount = data.numpages;
            } else if (ext === '.docx' || ext === '.doc') {
                const result = await mammoth.extractRawText({ buffer });
                text = result.value;
            } else if (ext === '.xlsx' || ext === '.xls' || ext === '.csv') {
                const workbook = xlsx.read(buffer, { type: 'buffer' });
                sheetNames = workbook.SheetNames;
                if (sheetNames.length > 0) {
                    const firstSheet = workbook.Sheets[sheetNames[0]];
                    // Extract first 200 rows as tab-separated
                    const csv = xlsx.utils.sheet_to_csv(firstSheet, { FS: '\t' });
                    const lines = csv.split('\n');
                    if (lines.length > 200) {
                        text = lines.slice(0, 200).join('\n');
                        truncated = true;
                    } else {
                        text = csv;
                    }
                }
            } else if (['.txt', '.md', '.js', '.ts', '.py', '.json', '.sh', '.yaml', '.yml', '.env'].includes(ext)) {
                text = buffer.toString('utf8');
            } else if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext) || mimeType.startsWith('image/')) {
                text = "Imagen recibida. OCR no disponible en Fase 1.";
            } else if (ext === '.zip') {
                // Escribir temporal y listar
                const tmpPath = `/tmp/_ggos_${Date.now()}.zip`;
                fs.writeFileSync(tmpPath, buffer);
                try {
                    const { stdout } = await execAsync(`unzip -l ${tmpPath} | head -n 25`);
                    text = stdout;
                } finally {
                    if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
                }
            } else {
                text = `Tipo de archivo no soportado o binario genérico: ${mimeType}`;
            }

            // Truncar texto si excede 50,000 caracteres
            if (text.length > 50000) {
                text = text.substring(0, 50000) + '\n\n...[TEXTO TRUNCADO POR LÍMITE DE 50000 CARACTERES]';
                truncated = true;
            }

        } catch (e: any) {
            text = `Error al analizar archivo: ${e.message}`;
        }

        return {
            text,
            metadata: {
                fileName,
                mimeType,
                sizeBytes: buffer.length,
                pageCount,
                sheetNames,
                truncated
            }
        };
    }
};
