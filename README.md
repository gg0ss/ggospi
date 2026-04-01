# GGOS Framework – Fase 1 MVP

Sistema multiagente en TypeScript para gestionar un agente maestro (GGOS) con DeepSeek V3 y un agente especialista en Kali Linux con un modelo local optimizado para RTX 4060 Ti.

## Pre-requisitos
- **Node.js**: >= 20.0.0 y < 21.0.0 (LTS recomendado). Se requiere para la compatibilidad con el módulo better-sqlite3.
- **Ollama**: Instalado localmente (`curl -fsSL https://ollama.com/install.sh | sh`)
- **NVIDIA GPU**: RTX 4060 Ti con 8GB VRAM (optimizado para este entorno)

## Instalación
1. Clona el repositorio u obtén los archivos fuente.
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Copia el archivo `.env.example` a `.env` y rellena tus credenciales (Token de Telegram y DeepSeek API Key):
   ```bash
   cp .env.example .env
   ```

## Configuración y Arranque
El sistema se auto-configura la primera vez que arranca. Solo necesitas ejecutar:
```bash
npm run dev
```

El proceso de arranque (bootstrap) se encargará de:
1. Validar la versión de Node.
2. Validar tu `.env` (te avisará de fallback si falta DeepSeek).
3. Verificar si Ollama responde.
4. Ayudarte a descargar el modelo base `dolphin3` de forma interactiva.
5. Crear automáticamente un `Modelfile` optimizado para la RTX 4060 Ti y generar el modelo final `kali-ggos`.
6. Configurar SQLite y todos los agentes.

## Uso
Una vez el bot indique que está en línea, háblale por Telegram.
- **GGOS (Maestro)**: Responde a tus mensajes normales usando DeepSeek (o llama3.2:3b de fallback).
- **Kali (Especialista)**: Para delegar comandos de pentesting o sistemas, escribe `@kali ...` al inicio del mensaje, o simplemente solicita un comando de seguridad (nmap, hydra, etc.) para que GGOS lo autodelegue.
