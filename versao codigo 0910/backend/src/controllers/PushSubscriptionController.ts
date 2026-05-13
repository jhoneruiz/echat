import { Request, Response } from "express";

import SaveUserPushSubscriptionService from "../services/PushSubscriptionServices/SaveUserPushSubscriptionService";
import ListUserPushSubscriptionsService from "../services/PushSubscriptionServices/ListUserPushSubscriptionsService";
import RemoveUserPushSubscriptionService from "../services/PushSubscriptionServices/RemoveUserPushSubscriptionService";
import logger from "../utils/logger";

export const list = async (req: Request, res: Response): Promise<Response> => {
  const { id, companyId } = req.user;
  const userId = Number(id);

  if (Number.isNaN(userId)) {
    return res.status(400).json({ error: "Invalid user identifier" });
  }

  const subscriptions = await ListUserPushSubscriptionsService({
    userId,
    companyId
  });

  return res.json(subscriptions);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { id, companyId } = req.user;
  const userId = Number(id);

  if (Number.isNaN(userId)) {
    return res.status(400).json({ error: "Invalid user identifier" });
  }
  const { subscription, platform, deviceInfo, oldEndpoint } = req.body;

  if (!subscription || !subscription.endpoint || !subscription.keys) {
    return res.status(400).json({ error: "Invalid subscription payload" });
  }

  const saved = await SaveUserPushSubscriptionService({
    userId,
    companyId,
    endpoint: subscription.endpoint,
    expirationTime: subscription.expirationTime,
    keys: subscription.keys,
    platform,
    deviceInfo
  });

  if (oldEndpoint && oldEndpoint !== subscription.endpoint) {
    try {
      await RemoveUserPushSubscriptionService({
        userId,
        companyId,
        endpoint: oldEndpoint
      });
    } catch (err) {
      logger.warn("[MobilePush] Failed to clean old push subscription endpoint", {
        userId,
        companyId,
        err
      });
    }
  }

  return res.status(201).json(saved);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { id, companyId } = req.user;
  const userId = Number(id);

  if (Number.isNaN(userId)) {
    return res.status(400).json({ error: "Invalid user identifier" });
  }
  const { subscriptionId } = req.params;
  const { endpoint } = req.body;

  await RemoveUserPushSubscriptionService({
    userId,
    companyId,
    subscriptionId: subscriptionId ? Number(subscriptionId) : undefined,
    endpoint
  });

  return res.status(204).send();
};

export const publicKey = async (_req: Request, res: Response): Promise<Response> => {
  const publicKey = process.env.WEB_PUSH_PUBLIC_KEY;
  if (!publicKey) {
    logger.warn("[MobilePush] WEB_PUSH_PUBLIC_KEY is not configured.");
    return res.status(204).send();
  }

  return res.json({ publicKey });
};
