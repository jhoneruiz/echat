/**
 * MonitoringService/checks.ts
 *
 * Funciones aisladas de salud para el panel de monitoreo super-admin.
 * Cada check tiene su propio try/catch y timeout — nunca debe propagar
 * un error que tumbe el endpoint agregador.
 */

import axios from "axios";
import { Op } from "sequelize";
import sequelize from "../../database";
import cache from "../../libs/cache";
import Ticket from "../../models/Ticket";
import Message from "../../models/Message";
import Whatsapp from "../../models/Whatsapp";
import UserPushSubscription from "../../models/UserPushSubscription";
import { getAllJobs } from "../../utils/jobTracker";
import { getIO } from "../../libs/socket";

const DEFAULT_TIMEOUT = 3000;

export type HealthStatus = "ok" | "down" | "slow" | "unknown";

export interface HealthCheck {
  status: HealthStatus;
  latencyMs: number | null;
  error?: string | null;
  detail?: string | null;
}

/** Ping a Postgres vía sequelize.authenticate(). */
export const checkDatabase = async (): Promise<HealthCheck> => {
  const start = Date.now();
  try {
    await Promise.race([
      sequelize.authenticate(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("DB timeout")), 5000)
      ),
    ]);
    const latencyMs = Date.now() - start;
    return {
      status: latencyMs > 1000 ? "slow" : "ok",
      latencyMs,
      error: null,
    };
  } catch (err: any) {
    return {
      status: "down",
      latencyMs: Date.now() - start,
      error: err?.message || String(err),
    };
  }
};

/** Ping a Redis usando el cliente ioredis del singleton. */
export const checkRedis = async (): Promise<HealthCheck> => {
  const start = Date.now();
  try {
    const redis = cache.getRedisInstance();
    const pong = await Promise.race([
      redis.ping(),
      new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error("Redis timeout")), 3000)
      ),
    ]);
    const latencyMs = Date.now() - start;
    return {
      status: pong === "PONG" ? (latencyMs > 500 ? "slow" : "ok") : "down",
      latencyMs,
      detail: String(pong),
    };
  } catch (err: any) {
    return {
      status: "down",
      latencyMs: Date.now() - start,
      error: err?.message || String(err),
    };
  }
};

/** Ping al microservicio api_oficial (NestJS). */
export const checkApiOficial = async (): Promise<HealthCheck> => {
  const start = Date.now();
  const url = process.env.URL_API_OFICIAL;
  if (!url) {
    return {
      status: "unknown",
      latencyMs: null,
      detail: "URL_API_OFICIAL no configurada",
    };
  }
  try {
    const resp = await axios.get(url, { timeout: DEFAULT_TIMEOUT });
    const latencyMs = Date.now() - start;
    return {
      status: resp.status < 500 ? (latencyMs > 1500 ? "slow" : "ok") : "down",
      latencyMs,
      detail: `HTTP ${resp.status}`,
    };
  } catch (err: any) {
    return {
      status: "down",
      latencyMs: Date.now() - start,
      error: err?.message || String(err),
    };
  }
};

/** Ping al microservicio transcribe (Python). */
export const checkTranscribe = async (): Promise<HealthCheck> => {
  const start = Date.now();
  const url = process.env.TRANSCRIBE_URL;
  if (!url) {
    return {
      status: "unknown",
      latencyMs: null,
      detail: "TRANSCRIBE_URL no configurada",
    };
  }
  try {
    const resp = await axios.get(url, { timeout: DEFAULT_TIMEOUT });
    const latencyMs = Date.now() - start;
    return {
      status: resp.status < 500 ? (latencyMs > 1500 ? "slow" : "ok") : "down",
      latencyMs,
      detail: `HTTP ${resp.status}`,
    };
  } catch (err: any) {
    return {
      status: "down",
      latencyMs: Date.now() - start,
      error: err?.message || String(err),
    };
  }
};

/** Snapshot del registry de jobs cron. */
export const getJobStatuses = () => {
  return getAllJobs().map(j => ({
    name: j.name,
    lastRunAt: j.lastRunAt,
    lastStatus: j.lastStatus,
    lastError: j.lastError,
    lastDurationMs: j.lastDurationMs,
    runCount: j.runCount,
    startedAt: j.startedAt,
  }));
};

/** Stats de Bull queues — lee el módulo libs/queue de forma lazy para evitar ciclos. */
export const getQueueStats = async () => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const queueModule = require("../../libs/queue").default;
    const queues = queueModule?.queues || [];
    const stats = await Promise.all(
      queues.map(async (q: any) => {
        try {
          const counts = await q.bull.getJobCounts();
          return { name: q.name, ...counts };
        } catch (err: any) {
          return { name: q.name, error: err?.message || String(err) };
        }
      })
    );
    return stats;
  } catch (err: any) {
    return [{ error: err?.message || String(err) }];
  }
};

/** Lista todas las conexiones WhatsApp y su estado. */
export const getWhatsappsStatus = async () => {
  const list = await Whatsapp.findAll({
    attributes: [
      "id",
      "name",
      "status",
      "battery",
      "plugged",
      "channel",
      "updatedAt",
      "companyId",
      "isDefault",
    ],
    order: [["name", "ASC"]],
  });
  return list.map(w => ({
    id: w.id,
    name: w.name,
    status: w.status,
    battery: w.battery,
    plugged: w.plugged,
    channel: w.channel,
    isDefault: w.isDefault,
    companyId: w.companyId,
    lastSeen: w.updatedAt,
  }));
};

/** Métricas de actividad: tickets del día, mensajes 24h, agentes online, push subs. */
export const getActivityMetrics = async () => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [pending, open, closed, msgsIn, msgsOut, pushSubs] = await Promise.all([
    Ticket.count({ where: { status: "pending" } }),
    Ticket.count({ where: { status: "open" } }),
    Ticket.count({
      where: { status: "closed", updatedAt: { [Op.gte]: startOfDay } as any },
    }),
    Message.count({
      where: { fromMe: false, createdAt: { [Op.gte]: last24h } as any },
    }),
    Message.count({
      where: { fromMe: true, createdAt: { [Op.gte]: last24h } as any },
    }),
    UserPushSubscription.count(),
  ]);

  // Agentes online: contar sockets de namespaces de companies
  let onlineAgents = 0;
  try {
    const io = getIO();
    const namespaces = (io as any)._nsps || io.sockets;
    if (namespaces && typeof namespaces.forEach === "function") {
      namespaces.forEach((ns: any) => {
        if (ns?.sockets?.size) onlineAgents += ns.sockets.size;
      });
    }
  } catch {
    // socket aún no disponible
  }

  return {
    tickets: { pending, open, closedToday: closed },
    messages24h: { in: msgsIn, out: msgsOut },
    onlineAgents,
    pushSubscriptions: pushSubs,
  };
};

/** Recursos del proceso Node + pool de conexiones DB. */
export const getResources = () => {
  const mem = process.memoryUsage();
  const pool: any = (sequelize as any)?.connectionManager?.pool || {};
  return {
    memory: {
      rssMB: Math.round(mem.rss / 1024 / 1024),
      heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
      externalMB: Math.round(mem.external / 1024 / 1024),
    },
    uptimeSec: Math.round(process.uptime()),
    nodeVersion: process.version,
    pid: process.pid,
    dbPool: {
      size: pool.size ?? null,
      available: pool.available ?? null,
      using: pool.using ?? null,
      waiting: pool.pending ?? null,
      max: pool.max ?? null,
      min: pool.min ?? null,
    },
  };
};
