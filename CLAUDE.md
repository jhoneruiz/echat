# Contexto del Proyecto
Eres un desarrollador Full Stack Senior experto en Node.js, React, PostgreSQL y arquitecturas CRM (específicamente Whaticket). 
El objetivo principal de este proyecto es actualizar el código fuente de un fork de Whaticket para lograr dos metas críticas:
1. **AÑADIR** el canal WhatsApp Cloud API oficial de Meta como segundo canal, manteniendo Baileys como canal alternativo permanente ("no oficial").
2. Traducir completamente el sistema (Backend y Frontend) del portugués brasileño (pt-BR) al español de México (es-MX).

# Arquitectura Multi-Canal (decisión 2026-05-13)
- `channel = "whatsapp"` → Baileys (librería no oficial, canal permanente, **NUNCA eliminar**)
- `channel = "whatsapp_oficial"` → Meta Cloud API (WhatsApp Business API oficial)
- `api_oficial` (NestJS + Prisma) es un **microservicio separado** que maneja TODA la comunicación con `graph.facebook.com`. El backend Express **NO** habla directo con Meta; consume `api_oficial` por HTTP.
- La URL base de `api_oficial` se configura con `URL_API_OFICIAL` y `TOKEN_API_OFICIAL` en `.env`.
- Los webhooks de Meta los recibe `api_oficial` (`POST /v1/webhook/:companyId/:conexaoId`) y los reenvía al backend por socket.io.

# Canal Baileys — Notas importantes
- Baileys (`channel="whatsapp"`) es **no oficial** — usa el protocolo de WhatsApp Web sin SLA ni garantías.
- La versión actual es `npm:whaileys@^6.4.10` (fork estable, actualizado al 2026-05-13).
- NO actualizar a `baileys@7.x` (mainline RC, breaking changes) sin revisar la guía de migración.
- Los archivos clave son: `src/libs/wbot.ts`, `src/helpers/useMultiFileAuthState.ts`, `src/services/BaileysServices/`, `src/services/WbotServices/`.

# Canal Meta Oficial — Notas importantes
- Las plantillas Meta se gestionan mediante CRUD completo: `POST/PUT/DELETE /meta-templates/:whatsappId` (backend) → `api_oficial` → `graph.facebook.com`.
- Las plantillas se almacenan localmente como `QuickMessage` con `isOficial=true`.
- El estado de aprobación llega por webhook (`field: message_template_status_update`) → `api_oficial` → socket `updateTemplateStatusWhatsAppOficial` → `SyncTemplateStatus.ts`.
- El envío de plantillas desde el chat usa `POST /messages-template/:ticketId`.
- Las pruebas E2E contra Meta requieren credenciales: Phone Number ID, Access Token, App Secret (pendientes al 2026-05-13).

# Estructura del Directorio
El código base principal se encuentra en la subcarpeta `versao codigo 0910`.
- `/backend`: Lógica del servidor (Node.js/Express + Sequelize). Maneja ambos canales: Baileys y Meta (vía `api_oficial`).
- `/frontend`: Interfaz de usuario (React). Traducción en curso a es-MX.
- `/api_oficial`: Microservicio NestJS + Prisma que intermedia con `graph.facebook.com`. NO modificar su arquitectura.
- Directorio raíz: Scripts de bash (`.sh`) para instalación y actualización.

# Reglas de Ejecución (Skills & Directrices)

## Canal Meta API (Backend)
- El backend NO habla directo con Meta. Toda la lógica Meta vive en `api_oficial`.
- Para ampliar funcionalidad Meta: modificar `api_oficial` primero, luego el cliente HTTP en `src/libs/whatsAppOficial/`.
- NO elimines la estructura de la base de datos sin crear las migraciones de Sequelize correspondientes.

## Tarea 2: Traducción a Español de México (es-MX)
- **Frontend COMPLETADO (2026-05-13):** `i18n.js` ya tiene `fallbackLng: "es"` y `lng: "es"`. `es.js` está totalmente traducido al español. Si aparece texto en portugués es que falta la clave en `es.js`.
- Términos estándar: "Fila" → "Cola", "Atendimento" → "Atención/Chat", "Excluir" → "Eliminar", "Historico" → "Historial".
- Pendiente: mensajes de error del backend (AppError, console.log en servicios).
- Nuevas claves de UI deben agregarse directamente en español (no en portugués).

## Metodología de Trabajo
- Antes de modificar archivos grandes, explícame la estrategia que vas a utilizar.
- Trabaja de forma incremental: primero la base de datos de conexiones, luego los Webhooks de recepción, después el envío de mensajes, y finalmente la traducción.
- Proporciona comandos de npm o yarn para instalar nuevas dependencias necesarias (como librerías para manejar Meta API) y desinstalar las obsoletas (como `@adiwajshing/baileys`).

## Entorno de Desarrollo y VPS
- **Directorio de trabajo local:** `g:\Mi unidad\whatikect desarrollo\echat\` (aquí se editan los archivos).
- **Repositorio git:** `C:\Users\ruiz_\echat-fix\` — copiar archivos modificados aquí antes de `git commit && git push`.
- **VPS (Ubuntu 24.04):** proyecto en `/home/deploy/Equipechat/`. Procesos PM2: `Equipechat-backend` y `Equipechat-frontend`.
- **Rebuild frontend en VPS:** `cd /home/deploy/Equipechat && git pull origin main && cd "versao codigo 0910/frontend" && npm run build && pm2 restart Equipechat-frontend`
- **Rebuild backend en VPS:** `cd /home/deploy/Equipechat/"versao codigo 0910/backend" && npm install --legacy-peer-deps && npm run build && pm2 restart Equipechat-backend`
- **Git ownership en VPS:** si `git pull` falla con "dubious ownership", ejecutar `git config --global --add safe.directory /home/deploy/Equipechat`.