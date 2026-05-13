# Guía para traducir y mantener personalizaciones

Esta guía reúne los pasos prácticos para adaptar la aplicación a español y conservar tus cambios cuando recibes nuevas versiones del código de los desarrolladores originales.

## 1. Traducir la interfaz web

1. Ingresa a `frontend/src/translate/languages/`.
2. Abre el archivo del idioma base (por ejemplo `pt.js`) y el de español `es.js`.
3. Copia las claves que falten del archivo base al archivo en español y actualiza los textos.
   * Los nombres de las variables del selector de mensajes (`messageVariablesPicker.vars.*`) ya existen en `es.js`. Solo tienes que modificar los textos si quieres otro término.
4. Guarda los cambios y reinicia el servidor de desarrollo (`npm run start`) si no se refresca solo.
5. Verifica en la interfaz que las etiquetas aparezcan en español.

> Consejo: si la UI muestra un texto en portugués, usa la búsqueda del editor para localizar la cadena en `frontend/src/translate/languages/pt.js` y copia la clave en `es.js` con tu traducción.

## 2. Localizar mensajes automáticos del backend

Los mensajes dinámicos que se envían desde el backend (por ejemplo el saludo según la hora) viven en `backend/src/helpers/Mustache.ts`.

1. Edita las funciones que devuelven textos (`msgsd`, `date`, etc.) y reemplaza las cadenas por sus equivalentes en español.
2. Define el idioma por defecto del backend mediante la variable de entorno `MUSTACHE_DEFAULT_LOCALE`. Por ejemplo, en tu `.env`:
   ```env
   MUSTACHE_DEFAULT_LOCALE=es
   ```
   El helper selecciona automáticamente las traducciones basadas en este valor (acepta códigos como `es`, `es-MX`, `pt-BR`, etc., utilizando la parte antes del guion si no encuentra una coincidencia exacta). Si la variable no está definida, continuará usando portugués.
3. Después de guardar, recompila el backend:
   ```bash
   cd backend
   npm install # solo la primera vez
   npm run build
   ```
4. Reinicia el servicio que ejecuta el backend para que cargue el nuevo `dist/server.js`.

Si quieres manejar varios idiomas al mismo tiempo, puedes exportar diferentes funciones (p. ej. `msgsdEs`, `msgsdPt`) y seleccionar la que corresponda según la configuración de cada empresa/cliente.

### Ejemplo: saludo dinámico (`{{ms}}`)

1. **Frontend (selector de variables):** abre `frontend/src/translate/languages/es.js`, busca la sección `messageVariablesPicker.vars` y ajusta la etiqueta de `greeting` para que describa el saludo automático en español. Por ejemplo:

   ```js
   greeting: "Saludo según horario",
   ```

   Repite el mismo texto en los demás idiomas que utilices (p. ej. `pt.js`, `en.js`) si quieres que la opción aparezca coherente en todos los lenguajes disponibles.

2. **Backend (valor de la variable):** en `backend/src/helpers/Mustache.ts` confirma que la función `msgsd` contenga las traducciones en español dentro del objeto `LOCALE_MESSAGES`. Asegúrate también de que el conector de fecha y hora (`dateTimeConnector`) tenga la frase apropiada (`" a las "` en español).

3. **Prueba la plantilla:** crea un mensaje en el módulo de respuestas rápidas que incluya `{{ms}}` y envíalo a un contacto de prueba en distintos horarios (mañana, tarde, noche) para confirmar que el saludo cambia correctamente.

## 3. Mantener tus cambios frente a nuevas versiones

Para no perder tus personalizaciones cuando recibes una actualización de los desarrolladores brasileños:

1. **Trabaja en una rama propia.** Crea una rama basada en la versión que recibiste y guarda tus traducciones allí.
   ```bash
   git checkout -b feature/es-localization
   git add .
   git commit -m "Ajusta textos al español"
   ```
2. **Agrega el repositorio original como `upstream`.**
   ```bash
   git remote add upstream <url-del-repo-original>
   ```
3. **Cada vez que llegue una nueva versión:**
   ```bash
   git fetch upstream
   git checkout work        # o la rama principal de tu fork
   git merge upstream/work  # o upstream/main según el nombre
   ```
4. **Resuelve conflictos** en los archivos que personalizaste. Git te mostrará qué partes del archivo cambiaron.
5. **Integra tus cambios personalizados** volviendo a tu rama y combinándola con la versión actualizada:
   ```bash
   git checkout feature/es-localization
   git rebase work          # o git merge work
   ```

De esta manera conservas un historial claro de tus traducciones y, al mismo tiempo, puedes incorporar las mejoras que envíen los desarrolladores originales sin sobrescribir tu trabajo.

## 4. Consejos adicionales

- Realiza commits pequeños y descriptivos para que sea sencillo identificar qué cambiaste.
- Considera crear archivos de configuración (por ejemplo `config/default.json`) donde puedas guardar ajustes regionales. Así solo tienes que revisar un archivo cuando actualices.
- Documenta los pasos en tu equipo para que todos sigan el mismo flujo de trabajo al aplicar traducciones o actualizaciones.

Siguiendo esta rutina podrás mantener la aplicación en español y al mismo tiempo integrar con seguridad las mejoras que recibas del equipo original.
