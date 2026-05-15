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
- Revisa los archivos de internacionalización (i18n) en el frontend. Si no existen, créalos o extrae los textos "hardcodeados" a un archivo de idioma centralizado.
- Traduce todos los términos del portugués al español de México de forma profesional (ej. "Atendimentos" -> "Chats" o "Atenciones", "Fila" -> "Cola", "Configurações" -> "Configuración").
- Asegúrate de traducir también los mensajes de error, respuestas del bot en el backend y logs de la consola.

## Metodología de Trabajo
- Antes de modificar archivos grandes, explícame la estrategia que vas a utilizar.
- Trabaja de forma incremental: primero la base de datos de conexiones, luego los Webhooks de recepción, después el envío de mensajes, y finalmente la traducción.
- Proporciona comandos de npm o yarn para instalar nuevas dependencias necesarias (como librerías para manejar Meta API) y desinstalar las obsoletas (como `@adiwajshing/baileys`).

# Gotchas frecuentes
- Frontend usa Material-UI v4 (no v5): `SmartToy` no existe → usar `Android`. Verificar exports antes de importar de `@material-ui/icons`.
- VPS path con espacios: `/home/deploy/Equipechat/"versao codigo 0910"/` — siempre quotear; para `pm2 start` hacer `cd` primero (path como argumento se rompe).
- PM2 puede tener daemons duplicados (root + deploy). Si un proceso "se respawnea solo" tras `pm2 delete`: `ps -ef | grep "PM2.*Daemon"` y matar el otro daemon (`sudo -u deploy pm2 kill`).
- Plantilla Meta `hello_world` solo funciona desde Public Test Numbers — siempre devuelve `(#131058)` en números reales. Usar plantillas propias aprobadas.
- Si cambios en `api_oficial` no reflejan tras `npm run build`: `rm -rf dist/` antes de rebuildar; verificar con `grep` el archivo compilado, no solo el source.
- Para ver el error real de Meta (no el genérico "Erro ao enviar a mensagem"): buscar `[MetaService] sendMessage - ` en `pm2 logs Equipechat-api-oficial`.
- Hay DOS instancias de `TemplateMetaModal` (en `TicketActionButtonsCustom` y `MessageInput`). Cualquier cambio de props debe aplicarse en ambas.

# WhatsApp Cloud API — Webhooks (configuración Meta)
- HAY DOS niveles de suscripción de webhook que se necesitan AMBOS:
  1. App level — `webhook_configuration.application` apunta a la URL de api_oficial. Se configura en Meta Developer Portal.
  2. WABA level — la WABA debe tener tu app suscrita. Sin esto NO llegan los mensajes reales aunque el "Test" del UI funcione.
- Suscribir WABA a la app: `POST /:waba_id/subscribed_apps` con Bearer del System User Token. Devuelve `{"success":true}`.
- Verificar suscripciones actuales: `GET /:waba_id/subscribed_apps` — si `{"data":[]}` no hay nada subscribed.
- Verify token de api_oficial NO es global — es el `token_mult100` por conexión (visible en el CRM como "Token para integración externa", mismo que se usa en URL de send-message).
- Botón "Test" de Meta envía datos fake (`display_phone_number: "16505551111"`); solo prueba la URL, no que vayan a llegar mensajes reales.
- Para debug remoto sin entrar a la UI: `GET /:phone_number_id?fields=verified_name,quality_rating,webhook_configuration` muestra a dónde apuntan los webhooks.