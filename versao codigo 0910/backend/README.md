# Backend

## Actualizar cambios en plantillas de mensajes

Cuando edites archivos TypeScript como `src/helpers/Mustache.ts` necesitas volver a compilar el backend para que los cambios se reflejen en el código JavaScript que se ejecuta en producción.

### Ambiente de desarrollo

Si levantas el servidor con `npm run dev:server`, el proceso usa `ts-node-dev` y recarga automáticamente cada vez que guardas un archivo. No es necesario ejecutar pasos extra.

### Ambiente de producción

1. Dentro de la carpeta `backend` instala las dependencias si aún no lo has hecho:
   ```bash
   npm install
   ```
2. Compila los archivos TypeScript y genera la carpeta `dist/`:
   ```bash
   npm run build
   ```
3. Reinicia el servicio que está ejecutando el backend para que lea el nuevo archivo compilado `dist/server.js`. Por ejemplo, si lo ejecutas manualmente:
   ```bash
   npm run start
   ```
   Si usas un manejador de procesos (PM2, systemd, Docker, etc.), reinícialo según corresponda.

> **Idioma por defecto:** si necesitas cambiar el saludo horario a español u otro idioma, define `MUSTACHE_DEFAULT_LOCALE` en el archivo `.env` del backend antes de recompilar. Ejemplo: `MUSTACHE_DEFAULT_LOCALE=es`.

Siguiendo estos pasos tus cambios en `Mustache.ts` y otros archivos del backend quedarán disponibles en tu aplicación.

Para más recomendaciones sobre traducción y cómo mantener tus personalizaciones cuando recibas nuevas versiones del código, revisa el documento [`../LOCALIZATION.md`](../LOCALIZATION.md).

## Configurar notificaciones push móviles

Para que el backend pueda enviar Web Push a los dispositivos iOS/Android necesitas definir las siguientes variables de entorno antes de iniciar el servidor:

```
WEB_PUSH_PUBLIC_KEY=clave_publica_vapid
WEB_PUSH_PRIVATE_KEY=clave_privada_vapid
WEB_PUSH_CONTACT_EMAIL=soporte@tu-dominio.com
```

Puedes generar el par de llaves VAPID con cualquier herramienta compatible con [web-push](https://github.com/web-push-libs/web-push). El correo configurado se utiliza como contacto en la cabecera `VAPID`.
