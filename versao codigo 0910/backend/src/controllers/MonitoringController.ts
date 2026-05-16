import { Request, Response } from "express";
import {
  checkDatabase,
  checkRedis,
  checkApiOficial,
  checkTranscribe,
  getJobStatuses,
  getQueueStats,
  getWhatsappsStatus,
  getActivityMetrics,
  getResources,
} from "../services/MonitoringService/checks";

export const health = async (_req: Request, res: Response): Promise<Response> => {
  const [db, redis, apiOficial, transcribe] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkApiOficial(),
    checkTranscribe(),
  ]);
  return res.json({ db, redis, apiOficial, transcribe });
};

export const jobs = async (_req: Request, res: Response): Promise<Response> => {
  return res.json(getJobStatuses());
};

export const queues = async (_req: Request, res: Response): Promise<Response> => {
  return res.json(await getQueueStats());
};

export const whatsapps = async (_req: Request, res: Response): Promise<Response> => {
  return res.json(await getWhatsappsStatus());
};

export const activity = async (_req: Request, res: Response): Promise<Response> => {
  return res.json(await getActivityMetrics());
};

export const resources = async (_req: Request, res: Response): Promise<Response> => {
  return res.json(getResources());
};

/** Endpoint agregador — todo en una sola request para minimizar polling del frontend. */
export const all = async (_req: Request, res: Response): Promise<Response> => {
  const [db, redis, apiOficial, transcribe, jobList, queueList, wpps, act] =
    await Promise.all([
      checkDatabase(),
      checkRedis(),
      checkApiOficial(),
      checkTranscribe(),
      Promise.resolve(getJobStatuses()),
      getQueueStats(),
      getWhatsappsStatus(),
      getActivityMetrics(),
    ]);

  return res.json({
    timestamp: new Date(),
    health: { db, redis, apiOficial, transcribe },
    jobs: jobList,
    queues: queueList,
    whatsapps: wpps,
    activity: act,
    resources: getResources(),
  });
};
