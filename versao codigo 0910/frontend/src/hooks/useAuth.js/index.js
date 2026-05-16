import { useState, useEffect, useRef } from "react";
import { useHistory } from "react-router-dom";
import { has, isArray } from "lodash";

import { toast } from "react-toastify";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { socketConnection } from "../../services/socket";
import SocketWorker from "../../services/SocketWorker";
import moment from "moment";

// Throttle del refresh proactivo en visibilitychange/online: no llamar más
// de una vez cada 2 minutos para evitar martillar al backend al cambiar
// rápido entre pestañas.
const PROACTIVE_REFRESH_MIN_INTERVAL_MS = 2 * 60 * 1000;
let lastProactiveRefresh = 0;

const useAuth = () => {
  const history = useHistory();
  const [isAuth, setIsAuth] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState({});
  const [socket, setSocket] = useState(null);
  
  // Ref para manter referência dos listeners ativos
  const listenersRef = useRef(new Set());

  // Interceptors do API (mantém como estava)
  api.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem("token");
      if (token) {
        config.headers["Authorization"] = `Bearer ${JSON.parse(token)}`;
        setIsAuth(true);
      }
      return config;
    },
    (error) => {
      Promise.reject(error);
    }
  );

  api.interceptors.response.use(
    (response) => {
      return response;
    },
    async (error) => {
      const originalRequest = error.config;
      if (error?.response?.status === 403 && !originalRequest._retry) {
        originalRequest._retry = true;

        const { data } = await api.post("/auth/refresh_token");
        if (data) {
          localStorage.setItem("token", JSON.stringify(data.token));
          api.defaults.headers.Authorization = `Bearer ${data.token}`;
          // Sincronizar el socket con el nuevo token para que no se quede
          // con un token expirado en la próxima reconexión.
          try {
            const u = data.user || {};
            if (u.companyId && u.id) {
              SocketWorker(u.companyId, u.id).updateToken(data.token);
            }
          } catch (e) {
            // no bloquear el flujo del request original
          }
        }
        return api(originalRequest);
      }
      if (error?.response?.status === 401) {
        localStorage.removeItem("token");
        api.defaults.headers.Authorization = undefined;
        setIsAuth(false);
      }
      return Promise.reject(error);
    }
  );

  // Effect para inicialização do token
  useEffect(() => {
    const token = localStorage.getItem("token");
    (async () => {
      if (token) {
        try {
          const { data } = await api.post("/auth/refresh_token");
          api.defaults.headers.Authorization = `Bearer ${data.token}`;
          setIsAuth(true);
          setUser(data.user || data);
        } catch (err) {
          toastError(err);
        }
      }
      setLoading(false);
    })();
  }, []);

  // Effect para configuração do socket + heartbeat + recuperación al volver
  useEffect(() => {
    let heartbeatInterval = null;
    let visibilityHandler = null;
    let onlineHandler = null;

    if (Object.keys(user).length && user.id > 0) {
      console.log("Configurando socket para user", user.id, "company", user.companyId);

      // Limpar listeners anteriores
      if (socket) {
        listenersRef.current.forEach(eventName => {
          if (socket.off) {
            socket.off(eventName);
          }
        });
        listenersRef.current.clear();
      }

      // Criar nova conexão socket
      const socketInstance = socketConnection({ user: {
        companyId: user.companyId,
        id: user.id }
      });

      if (socketInstance) {
        setSocket(socketInstance);

        // Aguardar um pouco para garantir que o socket está configurado
        setTimeout(() => {
          const eventName = `company-${user.companyId}-user`;

          const handleUserUpdate = (data) => {
            if (data.action === "update" && data.user.id === user.id) {
              setUser(data.user);
            }
          };

          // Verificar se o socket tem o método 'on'
          if (socketInstance && typeof socketInstance.on === 'function') {
            socketInstance.on(eventName, handleUserUpdate);
            listenersRef.current.add(eventName);
            console.log(`Listener adicionado para: ${eventName}`);
          } else {
            console.error("Socket instance não tem método 'on'", socketInstance);
          }
        }, 100);

        // Heartbeat cada 25s: el backend espera < 30s para marcar offline.
        // Mantiene presencia online y detecta sockets muertos pronto.
        heartbeatInterval = setInterval(() => {
          try {
            if (typeof socketInstance.emit === "function") {
              socketInstance.emit("heartbeat");
            }
          } catch (err) {
            // silencioso
          }
        }, 25000);

        // Refresh proactivo al volver al foco / recuperar red.
        // Caso típico: laptop suspendido → al despertar el access token venció
        // pero la cookie de refresh aún es válida. Renovamos antes de que
        // axios o el socket disparen un connect_error / 403.
        const tryProactiveRefresh = async () => {
          const now = Date.now();
          if (now - lastProactiveRefresh < PROACTIVE_REFRESH_MIN_INTERVAL_MS) {
            return;
          }
          lastProactiveRefresh = now;
          try {
            const { data } = await api.post("/auth/refresh_token");
            if (data?.token) {
              localStorage.setItem("token", JSON.stringify(data.token));
              api.defaults.headers.Authorization = `Bearer ${data.token}`;
              if (typeof socketInstance.updateToken === "function") {
                socketInstance.updateToken(data.token);
              }
            }
          } catch (err) {
            // El interceptor 401 se encarga del logout si el refresh
            // también está vencido.
          }
        };

        visibilityHandler = () => {
          if (document.visibilityState === "visible") {
            tryProactiveRefresh();
          }
        };
        onlineHandler = () => tryProactiveRefresh();

        document.addEventListener("visibilitychange", visibilityHandler);
        window.addEventListener("online", onlineHandler);
      }
    }

    // Cleanup function
    return () => {
      if (socket && listenersRef.current.size > 0) {
        console.log("Limpando listeners do socket para user", user.id);
        listenersRef.current.forEach(eventName => {
          if (socket.off) {
            socket.off(eventName);
          }
        });
        listenersRef.current.clear();
      }
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      if (visibilityHandler) {
        document.removeEventListener("visibilitychange", visibilityHandler);
      }
      if (onlineHandler) {
        window.removeEventListener("online", onlineHandler);
      }
    };
  }, [user.id, user.companyId]); // Dependências específicas

  // Effect para buscar dados do usuário atual
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const { data } = await api.get("/auth/me");
        setUser(data.user || data);
      } catch (err) {
        console.log("Erro ao buscar usuário atual:", err);
      }
    };
    
    if (isAuth) {
      fetchCurrentUser();
    }
  }, [isAuth]);

  const handleLogin = async (userData) => {
    setLoading(true);

    try {
      const { data } = await api.post("/auth/login", userData);
      const {
        user: { company },
      } = data;

      // Lógica de configurações da empresa (mantém como estava)
      if (
        has(company, "companieSettings") &&
        isArray(company.companieSettings[0])
      ) {
        const setting = company.companieSettings[0].find(
          (s) => s.key === "campaignsEnabled"
        );
        if (setting && setting.value === "true") {
          localStorage.setItem("cshow", null);
        }
      }

      if (
        has(company, "companieSettings") &&
        isArray(company.companieSettings[0])
      ) {
        const setting = company.companieSettings[0].find(
          (s) => s.key === "sendSignMessage"
        );

        const signEnable = setting.value === "enable";

        if (setting && setting.value === "enabled") {
          localStorage.setItem("sendSignMessage", signEnable);
        }
      }
      
      localStorage.setItem("profileImage", data.user.profileImage);

      moment.locale("es-mx");
      let dueDate;
      if (data.user.company.id === 1) {
        dueDate = "2999-12-31T00:00:00.000Z";
      } else {
        dueDate = data.user.company.dueDate;
      }
      
      const hoje = moment(moment()).format("DD/MM/yyyy");
      const vencimento = moment(dueDate).format("DD/MM/yyyy");

      var diff = moment(dueDate).diff(moment(moment()).format());
      var before = moment(moment().format()).isBefore(dueDate);
      var dias = moment.duration(diff).asDays();

      if (before === true) {
        localStorage.setItem("token", JSON.stringify(data.token));
        localStorage.setItem("companyDueDate", vencimento);
        api.defaults.headers.Authorization = `Bearer ${data.token}`;
        setUser(data.user || data);
        setIsAuth(true);
        toast.success(i18n.t("auth.toasts.success"));
        
        if (Math.round(dias) < 5) {
          toast.warn(
            `Sua assinatura vence em ${Math.round(dias)} ${
              Math.round(dias) === 1 ? "dia" : "dias"
            } `
          );
        }

        history.push("/tickets");
        setLoading(false);
      } else {
        api.defaults.headers.Authorization = `Bearer ${data.token}`;
        setIsAuth(true);
        toastError(`Opss! Sua assinatura venceu ${vencimento}.
Entre em contato com o Suporte para mais informações! `);
        history.push("/financeiro-aberto");
        setLoading(false);
      }
    } catch (err) {
      toastError(err);
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);

    try {
      // Limpar socket antes do logout
      if (socket) {
        listenersRef.current.forEach(eventName => {
          if (socket.off) {
            socket.off(eventName);
          }
        });
        listenersRef.current.clear();
        
        if (typeof socket.disconnect === 'function') {
          socket.disconnect();
        }
      }

      await api.delete("/auth/logout");
      setIsAuth(false);
      setUser({});
      setSocket(null);
      localStorage.removeItem("token");
      localStorage.removeItem("cshow");
      api.defaults.headers.Authorization = undefined;
      setLoading(false);
      history.push("/login");
    } catch (err) {
      toastError(err);
      setLoading(false);
    }
  };

  const getCurrentUserInfo = async () => {
    try {
      const { data } = await api.get("/auth/me");
      console.log(data);
      return data;
    } catch (_) {
      return null;
    }
  };

  return {
    isAuth,
    user,
    loading,
    handleLogin,
    handleLogout,
    getCurrentUserInfo,
    socket,
  };
};

export default useAuth;