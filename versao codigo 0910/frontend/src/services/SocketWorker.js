import io from "socket.io-client";
import api from "../services/api";

/**
 * SocketWorker
 *
 * Singleton que mantiene UNA conexión socket.io por (companyId, userId).
 *
 * Diseño:
 * - El token se lee siempre fresco desde localStorage en cada (re)conexión
 *   vía `getFreshToken()`, en lugar de cachearlo al construir. Eso evita que
 *   el socket se quede con un token expirado tras un refresh del API.
 * - Si el handshake del backend rechaza la conexión (`connect_error`), se
 *   intenta UNA vez `POST /auth/refresh_token` y se reconecta con el token
 *   nuevo. Si esa renovación también falla, se rompe el loop infinito de
 *   reintentos para no martillar al backend.
 * - `updateToken()` se llama desde el interceptor de axios cuando éste
 *   renueva el access token tras un 403, para sincronizar el socket sin
 *   esperar a una desconexión.
 */
class SocketWorker {
  constructor(companyId, userId) {
    if (!SocketWorker.instance) {
      this.companyId = companyId;
      this.userId = userId;
      this.socket = null;
      this.eventListeners = {};
      this._refreshing = false; // mutex para evitar refresh paralelos
      this._refreshFailed = false; // si refresh falla, no reintentar más
      this.configureSocket();
      SocketWorker.instance = this;
    }
    return SocketWorker.instance;
  }

  getFreshToken() {
    try {
      const raw = localStorage.getItem("token");
      if (!raw) return null;
      // Token se guarda como JSON.stringify(string) — desserializar
      const parsed = JSON.parse(raw);
      return typeof parsed === "string" ? parsed : null;
    } catch {
      return null;
    }
  }

  configureSocket() {
    const token = this.getFreshToken();

    this.socket = io(
      `${process.env.REACT_APP_BACKEND_URL}/${this?.companyId}`,
      {
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10000,
        reconnectionAttempts: Infinity,
        query: {
          userId: this.userId,
          // Backend espera "Bearer <token>" (split por espacio en handshake)
          token: token ? `Bearer ${token}` : "",
        },
      }
    );

    this.socket.on("connect", () => {
      console.log("Socket.IO conectado");
      this._refreshFailed = false; // limpiar flag al conectar OK
    });

    this.socket.on("disconnect", reason => {
      console.log("Socket.IO desconectado:", reason);
      // socket.io reintentará solo. No forzamos reconnect manual aquí.
    });

    this.socket.on("connect_error", err => {
      console.warn("Socket connect_error:", err?.message);
      // Si el handshake fue rechazado por token, intentar refresh UNA vez
      this.tryRefreshAndReconnect();
    });
  }

  async tryRefreshAndReconnect() {
    if (this._refreshing || this._refreshFailed) return;
    this._refreshing = true;
    try {
      const { data } = await api.post("/auth/refresh_token");
      if (data?.token) {
        localStorage.setItem("token", JSON.stringify(data.token));
        api.defaults.headers.Authorization = `Bearer ${data.token}`;
        // Reconectar el socket con el nuevo token: rebuild query auth
        if (this.socket) {
          this.socket.io.opts.query = {
            userId: this.userId,
            token: `Bearer ${data.token}`,
          };
          // Forzar reconexión inmediata
          this.socket.disconnect();
          this.socket.connect();
        }
      } else {
        this._refreshFailed = true;
      }
    } catch (err) {
      console.error("Socket refresh fallido:", err?.message);
      this._refreshFailed = true;
      // Detener bucle de reintentos
      if (this.socket) {
        try {
          this.socket.io.opts.reconnection = false;
        } catch {}
      }
    } finally {
      this._refreshing = false;
    }
  }

  /**
   * Llamado desde el interceptor de axios cuando renueva el access token.
   * Actualiza el token del socket y fuerza reconexión para que el backend
   * vea el token nuevo en el próximo handshake.
   */
  updateToken(newToken) {
    if (!newToken) return;
    this._refreshFailed = false;
    if (!this.socket) {
      this.configureSocket();
      return;
    }
    try {
      this.socket.io.opts.query = {
        userId: this.userId,
        token: `Bearer ${newToken}`,
      };
      this.socket.io.opts.reconnection = true;
      // Reconectar solo si está caído; si está vivo, dejarlo (no necesita
      // re-handshake hasta la próxima desconexión y ya tendrá token fresco).
      if (!this.socket.connected) {
        this.socket.connect();
      }
    } catch (err) {
      console.warn("updateToken: error actualizando socket", err);
    }
  }

  on(event, callback) {
    this.connect();
    this.socket.on(event, callback);
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }

  emit(event, data) {
    this.connect();
    this.socket.emit(event, data);
  }

  off(event, callback) {
    this.connect();
    if (this.eventListeners[event]) {
      if (callback) {
        this.socket.off(event, callback);
        this.eventListeners[event] = this.eventListeners[event].filter(
          cb => cb !== callback
        );
      } else {
        this.eventListeners[event].forEach(cb => this.socket.off(event, cb));
        delete this.eventListeners[event];
      }
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      SocketWorker.instance = null;
      console.log("Socket desconectado manualmente");
    }
  }

  // Garante que o socket esteja conectado
  connect() {
    if (!this.socket) {
      this.configureSocket();
    }
  }

  forceReconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
    this.configureSocket();
  }
}

const instance = (companyId, userId) => new SocketWorker(companyId, userId);

export default instance;
