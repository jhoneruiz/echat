#!/bin/bash
# =============================================================
#   WHATIKECT — Instalador / Actualizador
#   Compatible: Ubuntu 20.04 / 22.04  |  x86_64 / aarch64
# =============================================================

# ── Colores ──────────────────────────────────────────────────
VERDE='\033[1;32m'
AZUL='\033[1;34m'
BLANCO='\033[1;37m'
ROJO='\033[1;31m'
AMARILLO='\033[1;33m'
CYAN='\033[1;36m'
NC='\033[0m'

# ── Variables del sistema ─────────────────────────────────────
ARCH=$(uname -m)
UBUNTU_VERSION=$(lsb_release -sr 2>/dev/null || echo "22.04")
ARCHIVO_VARS="VARS_INSTALACION"
ARCHIVO_ETAPA="ETAPA_INSTALACION"
ip_actual=$(curl -s http://checkip.amazonaws.com 2>/dev/null || echo "desconocida")
jwt_secret=$(openssl rand -base64 32)
jwt_refresh_secret=$(openssl rand -base64 32)

# Subcarpeta donde vive el código dentro del repositorio clonado
CODIGO_DIR="versao codigo 0910"

# ── Solo root ─────────────────────────────────────────────────
if [ "$EUID" -ne 0 ]; then
  echo
  echo -e "${ROJO} >> Este instalador debe ejecutarse como root (sudo bash instalador_whatikect.sh)${NC}"
  echo
  exit 1
fi

# =============================================================
#   BANNER
# =============================================================
banner() {
  clear
  echo -e "${AZUL}"
  echo "  ██╗    ██╗██╗  ██╗ █████╗ ████████╗██╗██╗  ██╗███████╗ ██████╗████████╗"
  echo "  ██║    ██║██║  ██║██╔══██╗╚══██╔══╝██║██║ ██╔╝██╔════╝██╔════╝╚══██╔══╝"
  echo "  ██║ █╗ ██║███████║███████║   ██║   ██║█████╔╝ █████╗  ██║        ██║   "
  echo "  ██║███╗██║██╔══██║██╔══██║   ██║   ██║██╔═██╗ ██╔══╝  ██║        ██║   "
  echo "  ╚███╔███╔╝██║  ██║██║  ██║   ██║   ██║██║  ██╗███████╗╚██████╗   ██║   "
  echo "   ╚══╝╚══╝ ╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝ ╚═════╝   ╚═╝   "
  echo -e "${BLANCO}                        Instalador v2.0 — es-MX${NC}"
  echo
  echo -e "${CYAN}  IP del servidor: ${AMARILLO}${ip_actual}${NC}"
  echo
}

# =============================================================
#   UTILIDADES
# =============================================================
error() {
  echo -e "${ROJO} >> ERROR en la etapa: $1 — revisa el log arriba.${NC}"
  echo -e "${AMARILLO} >> Puedes volver a ejecutar el instalador y continuará desde este punto.${NC}"
  guardar_etapa "$1"
  exit 1
}

guardar_vars() {
  cat > "$ARCHIVO_VARS" <<VARSEOF
dominio_backend=${dominio_backend}
dominio_frontend=${dominio_frontend}
dominio_api_oficial=${dominio_api_oficial}
email=${email}
empresa=${empresa}
clave=${clave}
clave_master=${clave_master}
titulo_app=${titulo_app}
telefono_soporte=${telefono_soporte}
github_token=${github_token}
repo_url=${repo_url}
rama_repo=${rama_repo}
backend_port=${backend_port}
frontend_port=${frontend_port}
instalar_api_oficial=${instalar_api_oficial}
VARSEOF
}

cargar_vars() {
  [ -f "$ARCHIVO_VARS" ] && source "$ARCHIVO_VARS"
  empresa="${empresa:-whatikect}"
  titulo_app="${titulo_app:-Whatikect}"
  rama_repo="${rama_repo:-main}"
}

guardar_etapa() { echo "$1" > "$ARCHIVO_ETAPA"; }

cargar_etapa() {
  etapa="0"
  [ -f "$ARCHIVO_ETAPA" ] && etapa=$(cat "$ARCHIVO_ETAPA")
  [ -z "$etapa" ] && etapa="0"
}

pausa() { echo; read -p " Presiona ENTER para continuar..." _; echo; }

confirmar() {
  # Uso: confirmar "¿Texto?" → devuelve 0=Sí / 1=No
  local resp
  echo -e "${BLANCO} $1 ${VERDE}(s/n)${BLANCO}:${NC}"
  read -p " > " resp
  [[ "${resp,,}" == "s" ]]
}

# =============================================================
#   MENÚ PRINCIPAL
# =============================================================
menu() {
  cargar_vars
  while true; do
    banner
    echo -e "${BLANCO}  Selecciona una opción:${NC}"
    echo
    echo -e "   ${AZUL}[1]${NC} Instalar ${titulo_app}"
    echo -e "   ${AZUL}[2]${NC} Actualizar ${titulo_app}"
    echo -e "   ${AZUL}[3]${NC} Instalar / Reinstalar API Oficial (WhatsApp Cloud)"
    echo -e "   ${AZUL}[4]${NC} Ver estado de los servicios"
    echo -e "   ${AZUL}[0]${NC} Salir"
    echo
    read -p " > " opcion
    case "$opcion" in
      1) verificar_instalacion_previa ;;
      2) flujo_actualizar ;;
      3) flujo_api_oficial ;;
      4) ver_estado ;;
      0) exit 0 ;;
      *) echo -e "${ROJO} Opción inválida.${NC}"; sleep 1 ;;
    esac
  done
}

# =============================================================
#   VERIFICAR SI YA HAY INSTALACIÓN PREVIA
# =============================================================
verificar_instalacion_previa() {
  if [ -f "$ARCHIVO_VARS" ] && [ -f "$ARCHIVO_ETAPA" ]; then
    banner
    cargar_etapa
    if [ "$etapa" -ge "20" ]; then
      echo -e "${VERDE} >> La instalación ya fue completada.${NC}"
      echo
      confirmar "¿Deseas resetear e instalar desde cero?" && {
        rm -f "$ARCHIVO_VARS" "$ARCHIVO_ETAPA"
        flujo_instalar
      } || menu
    else
      echo -e "${AMARILLO} >> Se detectó una instalación incompleta (etapa $etapa de 20).${NC}"
      echo
      confirmar "¿Deseas continuar desde donde se quedó?" && flujo_instalar || menu
    fi
  else
    flujo_instalar
  fi
}

# =============================================================
#   FLUJO DE INSTALACIÓN
# =============================================================
flujo_instalar() {
  cargar_etapa

  [ "$etapa" == "0" ] && {
    preguntas_dominio    || error "preguntas_dominio"
    preguntas_datos      || error "preguntas_datos"
    preguntas_repo       || error "preguntas_repo"
    confirmar_datos      || error "confirmar_datos"
    guardar_vars         || error "guardar_vars"
    guardar_etapa 1
  }

  [ "$etapa" -le "1" ]  && { actualizar_vps         || error "actualizar_vps";        guardar_etapa 2;  }
  [ "$etapa" -le "2" ]  && { crear_usuario_deploy    || error "crear_usuario_deploy";  guardar_etapa 3;  }
  [ "$etapa" -le "3" ]  && { config_timezone         || error "config_timezone";       guardar_etapa 4;  }
  [ "$etapa" -le "4" ]  && { config_firewall         || error "config_firewall";       guardar_etapa 5;  }
  [ "$etapa" -le "5" ]  && { instalar_dependencias   || error "instalar_dependencias"; guardar_etapa 6;  }
  [ "$etapa" -le "6" ]  && { instalar_ffmpeg         || error "instalar_ffmpeg";       guardar_etapa 7;  }
  [ "$etapa" -le "7" ]  && { instalar_postgres       || error "instalar_postgres";     guardar_etapa 8;  }
  [ "$etapa" -le "8" ]  && { instalar_nodejs         || error "instalar_nodejs";       guardar_etapa 9;  }
  [ "$etapa" -le "9" ]  && { instalar_redis          || error "instalar_redis";        guardar_etapa 10; }
  [ "$etapa" -le "10" ] && { instalar_pm2            || error "instalar_pm2";          guardar_etapa 11; }
  [ "$etapa" -le "11" ] && { instalar_nginx          || error "instalar_nginx";        guardar_etapa 12; }
  [ "$etapa" -le "12" ] && { crear_base_datos        || error "crear_base_datos";      guardar_etapa 13; }
  [ "$etapa" -le "13" ] && { clonar_codigo           || error "clonar_codigo";         guardar_etapa 14; }
  [ "$etapa" -le "14" ] && { instalar_backend        || error "instalar_backend";      guardar_etapa 15; }
  [ "$etapa" -le "15" ] && { instalar_frontend       || error "instalar_frontend";     guardar_etapa 16; }
  [ "$etapa" -le "16" ] && { config_nginx            || error "config_nginx";          guardar_etapa 17; }
  [ "$etapa" -le "17" ] && { config_cron             || error "config_cron";           guardar_etapa 18; }
  [ "$etapa" -le "18" ] && { config_latencia         || error "config_latencia";       guardar_etapa 19; }
  [ "$etapa" -le "19" ] && { fin_instalacion         || error "fin_instalacion";       guardar_etapa 20; }

  [ "$instalar_api_oficial" == "si" ] && flujo_api_oficial

  menu
}

# =============================================================
#   PREGUNTAS AL USUARIO
# =============================================================
preguntas_dominio() {
  banner
  echo -e "${BLANCO} PASO 1 de 3 — Dominios${NC}"
  echo -e "${CYAN} Necesitas 2 subdominios apuntando a la IP de tu VPS (${AMARILLO}${ip_actual}${CYAN}).${NC}"
  echo -e "${CYAN} Ejemplo: api.tudominio.com  y  app.tudominio.com${NC}"
  echo
  echo -e "${BLANCO} URL del Backend (API) — Ejemplo: api.tudominio.com${NC}"
  read -p " > " dominio_backend
  echo
  echo -e "${BLANCO} URL del Frontend (Panel) — Ejemplo: app.tudominio.com${NC}"
  read -p " > " dominio_frontend
  echo
  echo -e "${BLANCO} ¿Deseas instalar la API Oficial de WhatsApp (Meta Cloud)? ${VERDE}(s/n)${NC}"
  read -p " > " resp_api
  instalar_api_oficial="no"
  if [[ "${resp_api,,}" == "s" ]]; then
    instalar_api_oficial="si"
    echo
    echo -e "${BLANCO} URL de la API Oficial — Ejemplo: oficial.tudominio.com${NC}"
    read -p " > " dominio_api_oficial
  fi
  echo
}

preguntas_datos() {
  banner
  echo -e "${BLANCO} PASO 2 de 3 — Datos de la instalación${NC}"
  echo

  echo -e "${BLANCO} Tu correo electrónico (para el certificado SSL):${NC}"
  read -p " > " email; echo

  echo -e "${BLANCO} Nombre de tu empresa (sin espacios, minúsculas — ej: miempresa):${NC}"
  read -p " > " empresa; echo

  echo -e "${BLANCO} Contraseña general (para base de datos y Redis — sin caracteres especiales):${NC}"
  read -p " > " clave; echo

  echo -e "${BLANCO} Contraseña MASTER (para el usuario administrador del sistema):${NC}"
  read -p " > " clave_master; echo

  echo -e "${BLANCO} Nombre del sistema en el navegador (ej: Mi CRM):${NC}"
  read -p " > " titulo_app; echo

  echo -e "${BLANCO} Número de teléfono de soporte (con código de país — ej: 521234567890):${NC}"
  read -p " > " telefono_soporte; echo

  # Puertos (opción rápida)
  backend_port=8080
  frontend_port=3000
  confirmar "¿Usar puertos por defecto? Backend=8080 / Frontend=3000" || {
    echo -e "${BLANCO} Puerto para el Backend:${NC}"
    read -p " > " backend_port
    echo -e "${BLANCO} Puerto para el Frontend:${NC}"
    read -p " > " frontend_port
  }
  echo
}

preguntas_repo() {
  banner
  echo -e "${BLANCO} PASO 3 de 3 — Repositorio de código${NC}"
  echo
  echo -e "${CYAN} Necesitas el Token de acceso personal de GitHub y la URL de tu repositorio privado.${NC}"
  echo -e "${CYAN} Cómo crear un token: ${AZUL}https://bit.ly/token-github${NC}"
  echo

  echo -e "${BLANCO} Token de GitHub (ghp_...):${NC}"
  read -p " > " github_token; echo

  echo -e "${BLANCO} URL del repositorio (https://github.com/usuario/repositorio):${NC}"
  read -p " > " repo_url; echo

  echo -e "${BLANCO} Rama a instalar (deja vacío para usar 'main'):${NC}"
  read -p " > " rama_repo
  [ -z "$rama_repo" ] && rama_repo="main"
  echo
}

confirmar_datos() {
  banner
  echo -e "${BLANCO} ── Resumen de la instalación ──────────────────────────${NC}"
  echo
  printf "   ${BLANCO}Backend (API):       ${AMARILLO}%s\n${NC}" "$dominio_backend"
  printf "   ${BLANCO}Frontend (Panel):    ${AMARILLO}%s\n${NC}" "$dominio_frontend"
  [ "$instalar_api_oficial" == "si" ] && \
  printf "   ${BLANCO}API Oficial:         ${AMARILLO}%s\n${NC}" "$dominio_api_oficial"
  printf "   ${BLANCO}Correo:              ${AMARILLO}%s\n${NC}" "$email"
  printf "   ${BLANCO}Empresa:             ${AMARILLO}%s\n${NC}" "$empresa"
  printf "   ${BLANCO}Contraseña general:  ${AMARILLO}%s\n${NC}" "$clave"
  printf "   ${BLANCO}Clave master:        ${AMARILLO}%s\n${NC}" "$clave_master"
  printf "   ${BLANCO}Nombre del sistema:  ${AMARILLO}%s\n${NC}" "$titulo_app"
  printf "   ${BLANCO}Soporte:             ${AMARILLO}%s\n${NC}" "$telefono_soporte"
  printf "   ${BLANCO}Repo:                ${AMARILLO}%s\n${NC}" "$repo_url"
  printf "   ${BLANCO}Rama:                ${AMARILLO}%s\n${NC}" "$rama_repo"
  printf "   ${BLANCO}Puerto Backend:      ${AMARILLO}%s\n${NC}" "$backend_port"
  printf "   ${BLANCO}Puerto Frontend:     ${AMARILLO}%s\n${NC}" "$frontend_port"
  echo
  confirmar "¿Los datos son correctos? ¿Iniciar instalación?" || {
    rm -f "$ARCHIVO_VARS" "$ARCHIVO_ETAPA"
    flujo_instalar
  }
}

# =============================================================
#   ETAPAS DE INSTALACIÓN
# =============================================================
actualizar_vps() {
  banner; echo -e "${BLANCO} >> Actualizando el servidor...${NC}"; echo
  DEBIAN_FRONTEND=noninteractive apt update -y && \
  DEBIAN_FRONTEND=noninteractive apt upgrade -y \
    -o Dpkg::Options::="--force-confdef" \
    -o Dpkg::Options::="--force-confold" && \
  DEBIAN_FRONTEND=noninteractive apt-get install -y build-essential apparmor-utils curl wget git dnsutils
}

crear_usuario_deploy() {
  banner; echo -e "${BLANCO} >> Creando usuario 'deploy'...${NC}"; echo
  id deploy &>/dev/null && return 0
  useradd -m -p "$(openssl passwd -1 "${clave}")" -s /bin/bash -G sudo deploy
  usermod -aG sudo deploy
}

config_timezone() {
  banner; echo -e "${BLANCO} >> Configurando zona horaria (America/Mexico_City)...${NC}"; echo
  timedatectl set-timezone America/Mexico_City
}

config_firewall() {
  banner; echo -e "${BLANCO} >> Configurando firewall (puertos 22, 80, 443)...${NC}"; echo
  ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp && ufw --force enable || true
}

instalar_dependencias() {
  banner; echo -e "${BLANCO} >> Instalando dependencias del sistema...${NC}"; echo
  apt-get install -y \
    libaom-dev libass-dev libfreetype6-dev libfribidi-dev libharfbuzz-dev \
    libmp3lame-dev libopus-dev libvorbis-dev libvpx-dev libwebp-dev \
    libx264-dev libx265-dev libzmq3-dev build-essential yasm cmake \
    libtool libc6 libc6-dev unzip pkg-config zlib1g-dev \
    libgcc1 libgbm-dev fontconfig locales gconf-service libasound2 \
    libatk1.0-0 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 \
    libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 \
    libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 \
    libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 \
    libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates \
    fonts-liberation libnss3 lsb-release xdg-utils
}

instalar_ffmpeg() {
  banner; echo -e "${BLANCO} >> Instalando FFMPEG...${NC}"; echo
  apt install -y ffmpeg
  # Binario estático de mayor versión
  local arch_str="linux64"
  [ "${ARCH}" = "aarch64" ] && arch_str="linuxarm64"
  local fname="ffmpeg-n6.1-latest-${arch_str}-gpl-6.1.tar.xz"
  wget -q "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/${fname}" && \
  mkdir -p /tmp/ffmpeg_build && \
  tar -xf "${fname}" -C /tmp/ffmpeg_build >/dev/null 2>&1 && \
  cp /tmp/ffmpeg_build/*/bin/ff* /usr/bin/ 2>/dev/null || true
  rm -rf /tmp/ffmpeg_build "${fname}" 2>/dev/null || true
}

instalar_postgres() {
  banner; echo -e "${BLANCO} >> Instalando PostgreSQL 17...${NC}"; echo
  apt-get install -y gnupg
  sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
  wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
  apt-get update -y && apt-get install -y postgresql-17
}

instalar_nodejs() {
  banner; echo -e "${BLANCO} >> Instalando Node.js 20...${NC}"; echo
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
  npm install -g n
  n 20.19.4
  ln -sf /usr/local/n/versions/node/20.19.4/bin/node /usr/bin/node
  ln -sf /usr/local/n/versions/node/20.19.4/bin/npm /usr/bin/npm
}

instalar_redis() {
  banner; echo -e "${BLANCO} >> Instalando Redis...${NC}"; echo
  apt install -y redis-server
  systemctl enable redis-server.service
  sed -i "s/# requirepass foobared/requirepass ${clave}/g" /etc/redis/redis.conf
  sed -i 's/^appendonly no/appendonly yes/g' /etc/redis/redis.conf
  systemctl restart redis-server.service
}

instalar_pm2() {
  banner; echo -e "${BLANCO} >> Instalando PM2 (gestor de procesos)...${NC}"; echo
  npm install -g pm2
  env PATH="${PATH}:/usr/bin" pm2 startup ubuntu -u deploy --hp /home/deploy
}

instalar_nginx() {
  banner; echo -e "${BLANCO} >> Instalando Nginx y Certbot (SSL)...${NC}"; echo
  apt install -y nginx
  rm -f /etc/nginx/sites-enabled/default
  echo "client_max_body_size 100M;" > "/etc/nginx/conf.d/${empresa}.conf"
  service nginx restart

  apt install -y snapd
  snap install core && snap refresh core
  apt-get remove -y certbot 2>/dev/null || true
  snap install --classic certbot
  ln -sf /snap/bin/certbot /usr/bin/certbot
}

crear_base_datos() {
  banner; echo -e "${BLANCO} >> Creando base de datos PostgreSQL '${empresa}'...${NC}"; echo
  sudo -u postgres psql <<SQLEOF
CREATE USER ${empresa} SUPERUSER INHERIT CREATEDB CREATEROLE;
ALTER USER ${empresa} PASSWORD '${clave}';
CREATE DATABASE ${empresa} OWNER ${empresa};
SQLEOF
}

clonar_codigo() {
  banner; echo -e "${BLANCO} >> Descargando el código desde GitHub...${NC}"; echo
  local token_enc
  token_enc=$(python3 -c "import urllib.parse; print(urllib.parse.quote('${github_token}'))" 2>/dev/null || echo "${github_token}")
  local url_con_token
  url_con_token=$(echo "${repo_url}" | sed "s|https://|https://${token_enc}@|")
  local destino="/home/deploy/${empresa}"

  rm -rf "${destino}"
  git clone "${url_con_token}" "${destino}"
  git -C "${destino}" checkout "${rama_repo}"

  mkdir -p "${destino}/${CODIGO_DIR}/backend/public/"
  chown deploy:deploy -R "${destino}"
  chmod 775 -R "${destino}/${CODIGO_DIR}/backend/public/"
}

instalar_backend() {
  banner; echo -e "${BLANCO} >> Configurando e instalando el backend...${NC}"; echo

  local url_backend="https://${dominio_backend##https://}"
  local url_frontend="https://${dominio_frontend##https://}"
  local url_api_oficial=""
  [ "$instalar_api_oficial" == "si" ] && url_api_oficial="https://${dominio_api_oficial##https://}"

  sudo -u deploy bash <<EOF
cat > "/home/deploy/${empresa}/${CODIGO_DIR}/backend/.env" <<ENVEOF
NODE_ENV=
BACKEND_URL=${url_backend}
FRONTEND_URL=${url_frontend}
PROXY_PORT=443
PORT=${backend_port}

DB_HOST=localhost
DB_DIALECT=postgres
DB_PORT=5432
DB_USER=${empresa}
DB_PASS=${clave}
DB_NAME=${empresa}

REDIS_URI=redis://:${clave}@127.0.0.1:6379
REDIS_OPT_LIMITER_MAX=1
REDIS_OPT_LIMITER_DURATION=3000

JWT_SECRET=${jwt_secret}
JWT_REFRESH_SECRET=${jwt_refresh_secret}
MASTER_KEY=${clave_master}

VERIFY_TOKEN=whaticket
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=

USE_WHATSAPP_OFICIAL=true
URL_API_OFICIAL=${url_api_oficial:-http://localhost:6000}
TOKEN_API_OFICIAL=adminpro

MAIL_HOST=smtp.gmail.com
MAIL_USER=
MAIL_PASS=
MAIL_FROM=Recuperación de Contraseña
MAIL_PORT=465

TRANSCRIBE_URL=http://localhost:4002
ENVEOF
EOF

  local codigo_dir="${CODIGO_DIR}"
  sudo -u deploy bash <<EOF
cd "/home/deploy/${empresa}/${codigo_dir}/backend"
export PUPPETEER_SKIP_DOWNLOAD=true
rm -rf node_modules package-lock.json
npm install --force
npm install puppeteer-core --force
npm i glob
npm run build
npx sequelize db:migrate
npx sequelize db:seed:all
pm2 start dist/server.js --name ${empresa}-backend
EOF
  # Arreglo de ffmpeg en node_modules
  local ffmpeg_idx="/home/deploy/${empresa}/${CODIGO_DIR}/backend/node_modules/@ffmpeg-installer/ffmpeg/index.js"
  [ -f "$ffmpeg_idx" ] && sed -i 's|npm3Binary = .*|npm3Binary = "/usr/bin/ffmpeg";|' "$ffmpeg_idx"
  mkdir -p "/home/deploy/${empresa}/${CODIGO_DIR}/backend/node_modules/@ffmpeg-installer/linux-x64/"
  echo '{"version":"1.1.0","name":"@ffmpeg-installer/linux-x64"}' \
    > "/home/deploy/${empresa}/${CODIGO_DIR}/backend/node_modules/@ffmpeg-installer/linux-x64/package.json"
}

instalar_frontend() {
  banner; echo -e "${BLANCO} >> Configurando e instalando el frontend...${NC}"; echo

  local url_backend="https://${dominio_backend##https://}"

  sudo -u deploy bash <<EOF
cat > "/home/deploy/${empresa}/${CODIGO_DIR}/frontend/.env" <<ENVEOF
REACT_APP_BACKEND_URL=${url_backend}
REACT_APP_FACEBOOK_APP_ID=
REACT_APP_REQUIRE_BUSINESS_MANAGEMENT=TRUE
REACT_APP_NAME_SYSTEM=${titulo_app}
REACT_APP_NUMBER_SUPPORT=${telefono_soporte}
SERVER_PORT=${frontend_port}
GENERATE_SOURCEMAP=false
CI=false
ENVEOF
EOF

  local codigo_dir="${CODIGO_DIR}"
  sudo -u deploy bash <<EOF
cd "/home/deploy/${empresa}/${codigo_dir}/frontend"
npm install --force
npx browserslist@latest --update-db --yes 2>/dev/null || true
sed -i 's/3000/${frontend_port}/g' server.js
NODE_OPTIONS="--max-old-space-size=4096 --openssl-legacy-provider" npm run build
pm2 start server.js --name ${empresa}-frontend
pm2 save
EOF
}

config_nginx() {
  banner; echo -e "${BLANCO} >> Configurando Nginx y generando certificados SSL...${NC}"; echo

  local be="${dominio_backend##https://}"
  local fe="${dominio_frontend##https://}"

  # Config backend
  cat > "/etc/nginx/sites-available/${empresa}-backend" <<NGINXEOF
upstream ${empresa}_backend { server 127.0.0.1:${backend_port}; keepalive 32; }
server {
  server_name ${be};
  location / {
    proxy_pass http://${empresa}_backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_cache_bypass \$http_upgrade;
    proxy_buffering on;
  }
}
NGINXEOF
  ln -sf "/etc/nginx/sites-available/${empresa}-backend" /etc/nginx/sites-enabled/

  # Config frontend
  cat > "/etc/nginx/sites-available/${empresa}-frontend" <<NGINXEOF
server {
  server_name ${fe};
  location / {
    proxy_pass http://127.0.0.1:${frontend_port};
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_cache_bypass \$http_upgrade;
  }
}
NGINXEOF
  ln -sf "/etc/nginx/sites-available/${empresa}-frontend" /etc/nginx/sites-enabled/

  nginx -t && service nginx reload

  # SSL con Certbot
  certbot --nginx --agree-tos -n -m "${email}" -d "${be}" || \
    echo -e "${AMARILLO} >> Advertencia: SSL del backend falló (¿DNS apuntado?). Configúralo después.${NC}"
  certbot --nginx --agree-tos -n -m "${email}" -d "${fe}" || \
    echo -e "${AMARILLO} >> Advertencia: SSL del frontend falló (¿DNS apuntado?). Configúralo después.${NC}"

  service nginx restart
}

config_cron() {
  banner; echo -e "${BLANCO} >> Configurando tareas programadas...${NC}"; echo
  apt-get install -y cron
  sudo -u deploy bash <<'EOF'
  CRON1="0 3 * * * bash /home/deploy/atualiza_public.sh >> /home/deploy/cron.log 2>&1"
  CRON2="0 1 * * * pm2 restart all >> /home/deploy/cron.log 2>&1"
  (crontab -l 2>/dev/null; echo "$CRON1"; echo "$CRON2") | sort -u | crontab -
EOF
}

config_latencia() {
  banner; echo -e "${BLANCO} >> Optimizando latencia interna...${NC}"; echo
  local be="${dominio_backend##https://}"
  local fe="${dominio_frontend##https://}"
  grep -qF "${be}" /etc/hosts || echo "127.0.0.1   ${be}" >> /etc/hosts
  grep -qF "${fe}" /etc/hosts || echo "127.0.0.1   ${fe}" >> /etc/hosts
  sudo -u deploy bash -c 'pm2 restart all'
}

fin_instalacion() {
  banner
  echo -e "${VERDE} ╔══════════════════════════════════════════════════╗"
  echo -e " ║         ✅  INSTALACIÓN COMPLETADA               ║"
  echo -e " ╚══════════════════════════════════════════════════╝${NC}"
  echo
  echo -e "${BLANCO} Panel:    ${AZUL}https://${dominio_frontend##https://}${NC}"
  echo -e "${BLANCO} API:      ${AZUL}https://${dominio_backend##https://}${NC}"
  echo
  echo -e "${BLANCO} Usuario:  ${AMARILLO}admin@multi100.com.br${NC}"
  echo -e "${BLANCO} Contraseña: ${AMARILLO}adminpro${NC}  ${ROJO}← ¡Cámbiala inmediatamente!${NC}"
  echo
  pausa
}

# =============================================================
#   ACTUALIZADOR — muestra cambios antes de aplicar
# =============================================================
flujo_actualizar() {
  cargar_vars
  source "/home/deploy/${empresa}/${CODIGO_DIR}/backend/.env" 2>/dev/null || true

  banner
  echo -e "${BLANCO} ── Actualizador de ${titulo_app} ──────────────────────${NC}"
  echo

  # ── 1. Mostrar qué cambios hay en el repositorio ──────────
  banner
  echo -e "${BLANCO} >> Consultando cambios disponibles en GitHub...${NC}"
  echo

  local token_enc
  token_enc=$(python3 -c "import urllib.parse; print(urllib.parse.quote('${github_token}'))" 2>/dev/null || echo "${github_token}")
  local url_con_token
  url_con_token=$(echo "${repo_url}" | sed "s|https://|https://${token_enc}@|")

  sudo -u deploy bash <<EOF
cd /home/deploy/${empresa}
git remote set-url origin ${url_con_token}
git fetch origin ${rama_repo} --quiet
EOF

  echo
  echo -e "${CYAN} ┌─────────────────────────────────────────────────────────┐${NC}"
  echo -e "${CYAN} │         CAMBIOS QUE SE VAN A APLICAR                    │${NC}"
  echo -e "${CYAN} └─────────────────────────────────────────────────────────┘${NC}"
  echo

  local cambios
  cambios=$(sudo -u deploy git -C "/home/deploy/${empresa}" \
    log HEAD..origin/${rama_repo} --oneline --no-merges 2>/dev/null)

  if [ -z "$cambios" ]; then
    echo -e "${VERDE} ✔ El sistema ya está actualizado. No hay cambios nuevos.${NC}"
    echo
    pausa; menu; return
  fi

  local total
  total=$(echo "$cambios" | wc -l)
  echo -e "${BLANCO} Se encontraron ${AMARILLO}${total}${BLANCO} cambio(s) nuevos:${NC}"
  echo
  echo "$cambios" | while IFS= read -r linea; do
    local hash="${linea%% *}"
    local mensaje="${linea#* }"
    echo -e "   ${AZUL}●${NC} ${mensaje}  ${CYAN}[${hash}]${NC}"
  done
  echo

  # ── 2. Confirmar ──────────────────────────────────────────
  confirmar "¿Deseas aplicar estos cambios ahora?" || { menu; return; }

  # ── 3. Backup opcional ────────────────────────────────────
  confirmar "¿Hacer un backup de la base de datos antes de actualizar (recomendado)?" && {
    banner; echo -e "${BLANCO} >> Haciendo backup de la base de datos...${NC}"; echo
    local db_pass
    db_pass=$(grep "DB_PASS=" "/home/deploy/${empresa}/${CODIGO_DIR}/backend/.env" | cut -d'=' -f2)
    mkdir -p /home/deploy/backups
    local bfile="/home/deploy/backups/${empresa}_$(date +%d-%m-%Y_%Hh%M).sql"
    PGPASSWORD="${db_pass}" pg_dump -U "${empresa}" -h localhost "${empresa}" > "${bfile}"
    echo -e "${VERDE} >> Backup guardado en: ${bfile}${NC}"
    sleep 2
  }

  # ── 4. Mantenimiento de la BD ─────────────────────────────
  banner; echo -e "${BLANCO} >> Mantenimiento de la base de datos...${NC}"; echo
  local db_pass
  db_pass=$(grep "DB_PASS=" "/home/deploy/${empresa}/${CODIGO_DIR}/backend/.env" | cut -d'=' -f2)
  PGPASSWORD="$db_pass" vacuumdb -U "${empresa}" -h localhost -d "${empresa}" --analyze || true

  # ── 5. Detener servicios ──────────────────────────────────
  banner; echo -e "${BLANCO} >> Deteniendo servicios...${NC}"; echo
  sudo -u deploy bash -c 'pm2 stop all'

  # ── 6. Descargar código nuevo ─────────────────────────────
  banner; echo -e "${BLANCO} >> Descargando código actualizado...${NC}"; echo
  sudo -u deploy bash <<EOF
cd /home/deploy/${empresa}
git fetch origin ${rama_repo}
git checkout ${rama_repo}
git reset --hard origin/${rama_repo}
EOF

  # ── 7. Reinstalar dependencias Backend ───────────────────
  banner; echo -e "${BLANCO} >> Instalando dependencias del backend...${NC}"
  echo -e "${CYAN}   (esto incluye npm install — puede tardar 2-5 minutos)${NC}"; echo
  local codigo_dir="${CODIGO_DIR}"
  sudo -u deploy bash <<EOF
cd "/home/deploy/${empresa}/${codigo_dir}/backend"
export PUPPETEER_SKIP_DOWNLOAD=true
rm -rf node_modules package-lock.json
npm install --force
npm install puppeteer-core --force
npm i glob
npm run build
npx sequelize db:migrate
EOF

  # ── 8. Reinstalar dependencias Frontend ──────────────────
  banner; echo -e "${BLANCO} >> Instalando dependencias del frontend y compilando...${NC}"
  echo -e "${CYAN}   (puede tardar 5-10 minutos)${NC}"; echo
  local fe_port="${frontend_port:-3000}"
  sudo -u deploy bash <<EOF
cd "/home/deploy/${empresa}/${codigo_dir}/frontend"
npm prune --force >/dev/null 2>&1 || true
npm install --force
sed -i 's/3000/${fe_port}/g' server.js
NODE_OPTIONS="--max-old-space-size=4096 --openssl-legacy-provider" npm run build
EOF

  # ── 9. Reiniciar servicios ────────────────────────────────
  banner; echo -e "${BLANCO} >> Reiniciando servicios...${NC}"; echo
  sudo -u deploy bash -c 'pm2 flush; pm2 start all; pm2 save'
  systemctl is-active --quiet nginx && systemctl restart nginx || true

  # ── 10. Resultado ─────────────────────────────────────────
  banner
  echo -e "${VERDE} ╔══════════════════════════════════════════════════╗"
  echo -e " ║        ✅  ACTUALIZACIÓN COMPLETADA              ║"
  echo -e " ╚══════════════════════════════════════════════════╝${NC}"
  echo
  echo -e "${BLANCO} Cambios aplicados:${NC}"
  echo "$cambios" | while IFS= read -r linea; do
    echo -e "   ${VERDE}✔${NC} ${linea#* }"
  done
  echo
  pausa; menu
}

# =============================================================
#   INSTALADOR API OFICIAL (WhatsApp Cloud / Meta)
# =============================================================
flujo_api_oficial() {
  cargar_vars

  banner
  echo -e "${BLANCO} ── Instalación de la API Oficial (WhatsApp Cloud API) ─${NC}"
  echo

  if [ -z "$dominio_api_oficial" ]; then
    echo -e "${BLANCO} URL/subdominio para la API Oficial — Ejemplo: oficial.tudominio.com${NC}"
    read -p " > " dominio_api_oficial
    guardar_vars
  fi

  local ofs="https://${dominio_api_oficial##https://}"
  local db_api="api_oficial"
  local api_port=6000

  banner; echo -e "${BLANCO} >> Creando base de datos '${db_api}'...${NC}"; echo
  sudo -u postgres psql -c "CREATE USER ${db_api} SUPERUSER INHERIT CREATEDB CREATEROLE;" 2>/dev/null || true
  sudo -u postgres psql -c "ALTER USER ${db_api} PASSWORD '${clave}';" 2>/dev/null || true
  sudo -u postgres psql -c "CREATE DATABASE ${db_api} OWNER ${db_api};" 2>/dev/null || true

  banner; echo -e "${BLANCO} >> Configurando variables de entorno de la API Oficial...${NC}"; echo
  cat > "/home/deploy/${empresa}/${CODIGO_DIR}/api_oficial/.env" <<ENVEOF
DATABASE_LINK=postgresql://${db_api}:${clave}@localhost:5432/${db_api}?schema=public
JWT_SECRET=$(openssl rand -base64 32)
REDIS_URI=redis://:${clave}@127.0.0.1:6379
URL_BACKEND_MULT100=https://${dominio_backend##https://}
TOKEN_ADMIN=adminpro
PORT=${api_port}
RABBITMQ_ENABLED_GLOBAL=false
ENVEOF
  chown deploy:deploy "/home/deploy/${empresa}/${CODIGO_DIR}/api_oficial/.env"

  local codigo_dir="${CODIGO_DIR}"
  banner; echo -e "${BLANCO} >> Instalando dependencias de la API Oficial...${NC}"; echo
  sudo -u deploy bash <<EOF
cd "/home/deploy/${empresa}/${codigo_dir}/api_oficial"
npm install --force
npm run build
npx prisma migrate deploy
pm2 start dist/main.js --name ${empresa}-api-oficial
pm2 save
EOF

  # Nginx para api_oficial
  banner; echo -e "${BLANCO} >> Configurando Nginx para la API Oficial...${NC}"; echo
  local be="${dominio_api_oficial##https://}"
  cat > "/etc/nginx/sites-available/${empresa}-api-oficial" <<NGINXEOF
server {
  server_name ${be};
  location / {
    proxy_pass http://127.0.0.1:${api_port};
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_cache_bypass \$http_upgrade;
  }
}
NGINXEOF
  ln -sf "/etc/nginx/sites-available/${empresa}-api-oficial" /etc/nginx/sites-enabled/
  nginx -t && service nginx reload
  certbot --nginx --agree-tos -n -m "${email}" -d "${be}" || \
    echo -e "${AMARILLO} >> Advertencia: SSL falló. Configúralo manualmente.${NC}"
  service nginx restart

  # Actualizar URL_API_OFICIAL en backend
  sed -i "s|^URL_API_OFICIAL=.*|URL_API_OFICIAL=${ofs}|" \
    "/home/deploy/${empresa}/${CODIGO_DIR}/backend/.env"
  sudo -u deploy bash -c "cd \"/home/deploy/${empresa}/${CODIGO_DIR}/backend\" && pm2 restart ${empresa}-backend"

  banner
  echo -e "${VERDE} ╔══════════════════════════════════════════════════╗"
  echo -e " ║      ✅  API OFICIAL INSTALADA                   ║"
  echo -e " ╚══════════════════════════════════════════════════╝${NC}"
  echo
  echo -e "${BLANCO} URL:    ${AZUL}${ofs}${NC}"
  echo -e "${BLANCO} Token:  ${AMARILLO}adminpro${NC}"
  echo
  echo -e "${CYAN} Próximos pasos para activar WhatsApp Cloud API:${NC}"
  echo -e "   1. Ve a Meta Business Manager y configura tu app"
  echo -e "   2. Webhook URL: ${AZUL}${ofs}/v1/webhook/{companyId}/{conexionId}${NC}"
  echo -e "   3. Token de verificación: ${AMARILLO}whaticket${NC}"
  echo
  pausa; menu
}

# =============================================================
#   VER ESTADO DE SERVICIOS
# =============================================================
ver_estado() {
  cargar_vars
  banner
  echo -e "${BLANCO} ── Estado de los servicios ───────────────────────────${NC}"
  echo
  echo -e "${CYAN} PM2 (aplicaciones Node):${NC}"
  sudo -u deploy bash -c 'pm2 list' 2>/dev/null || echo "  PM2 no disponible"
  echo
  echo -e "${CYAN} Nginx:${NC}"
  systemctl is-active nginx &>/dev/null && \
    echo -e "  ${VERDE}● activo${NC}" || echo -e "  ${ROJO}● inactivo${NC}"
  echo
  echo -e "${CYAN} PostgreSQL:${NC}"
  systemctl is-active postgresql &>/dev/null && \
    echo -e "  ${VERDE}● activo${NC}" || echo -e "  ${ROJO}● inactivo${NC}"
  echo
  echo -e "${CYAN} Redis:${NC}"
  systemctl is-active redis-server &>/dev/null && \
    echo -e "  ${VERDE}● activo${NC}" || echo -e "  ${ROJO}● inactivo${NC}"
  echo
  pausa; menu
}

# =============================================================
#   INICIO
# =============================================================
cargar_vars
menu
