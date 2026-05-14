# API de Transcripción de Audio a Texto

Microservicio Flask que transcribe archivos/URLs de audio usando Google Speech Recognition. El backend de Equipechat lo consume desde `TranscribeAudioMessageService.ts`.

## Variables de entorno (.env)

```
PORT=4002
TRANSCRIBE_LANGUAGE=es-MX
API_KEY=token-largo-y-aleatorio
```

- `API_KEY`: si está definida, se exige header `Authorization: Bearer <API_KEY>`. Si está vacía, el endpoint queda abierto (no recomendado en producción).
- `TRANSCRIBE_LANGUAGE`: código BCP-47 (`es-MX`, `es-ES`, `pt-BR`, `en-US`, etc.).

## Endpoint

`POST /transcrever` — multipart/form-data con uno de estos campos:
- `audio`: archivo (WAV, OGG, MP3, MP4, M4A, AAC o FLAC).
- `url`: URL HTTP a un audio remoto (se descarga y procesa).

Responde texto plano (200) con la transcripción, o JSON `{ "error": "..." }` con código de error.

## Despliegue en VPS Ubuntu (PM2 + gunicorn)

```bash
# 1. Dependencias del sistema
sudo apt-get update && sudo apt-get install -y python3 python3-pip ffmpeg

# 2. Instalar dependencias Python
cd /home/deploy/Equipechat/"versao codigo 0910/api_transcricao"
pip3 install -r requirements.txt
pip3 install gunicorn

# 3. Configurar .env
cp .env.example .env
nano .env  # editar API_KEY con un valor largo y aleatorio

# 4. Lanzar con PM2
pm2 start "gunicorn --bind 0.0.0.0:4002 --workers 4 --timeout 150 main:app" --name Equipechat-transcribe
pm2 save
pm2 startup  # seguir las instrucciones que imprime
```

## Configurar el backend de Equipechat

Editar `backend/.env` y agregar:

```
TRANSCRIBE_URL=http://localhost:4002
TRANSCRIBE_API_KEY=el-mismo-valor-de-API_KEY-de-arriba
```

Reiniciar PM2: `pm2 restart Equipechat-backend`.

## Probar

```bash
curl -X POST http://localhost:4002/transcrever \
  -H "Authorization: Bearer <API_KEY>" \
  -F 'audio=@/tmp/test.ogg'
```

Debe responder con el texto transcrito.

## Notas

- Procesa el audio en chunks de 12 s en paralelo (ThreadPoolExecutor).
- Convierte cualquier formato a WAV 16 kHz mono usando ffmpeg.
- Usa `recognize_google` (servicio gratuito con cuota razonable, sin necesidad de API key de Google).
- Para producción intensiva, considera Google Cloud Speech-to-Text o Whisper (cambios en `process_chunk`).
