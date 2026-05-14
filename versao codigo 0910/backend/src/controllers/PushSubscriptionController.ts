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
  logger.info({ userId: req.user?.id, companyId: req.user?.companyId, hasSub: !!req.body?.subscription, platform: req.body?.platform }, "[MobilePush][store] POST received");

  const { id, companyId } = req.user;
  const userId = Number(id);

  if (Number.isNaN(userId)) {
    logger.warn({ rawId: req.user?.id }, "[MobilePush][store] invalid user identifier");
    return res.status(400).json({ error: "Invalid user identifier" });
  }
  const { subscription, platform, deviceInfo, oldEndpoint } = req.body;

  if (!subscription || !subscription.endpoint || !subscription.keys) {
    logger.warn({ userId, body: req.body }, "[MobilePush][store] invalid subscription payload");
    return res.status(400).json({ error: "Invalid subscription payload" });
  }

  try {
    const saved = await SaveUserPushSubscriptionService({
      userId,
      companyId,
      endpoint: subscription.endpoint,
      expirationTime: subscription.expirationTime,
      keys: subscription.keys,
      platform,
      deviceInfo
    });

    logger.info({ userId, companyId, subscriptionId: saved.id, endpoint: subscription.endpoint?.slice(0, 60) }, "[MobilePush][store] subscription saved");

    if (oldEndpoint && oldEndpoint !== subscription.endpoint) {
      try {
        await RemoveUserPushSubscriptionService({
          userId,
          companyId,
          endpoint: oldEndpoint
        });
      } catch (err) {
        logger.warn({ userId, companyId, err }, "[MobilePush] Failed to clean old push subscription endpoint");
      }
    }

    return res.status(201).json(saved);
  } catch (err: any) {
    logger.error({ err, userId, companyId, endpoint: subscription.endpoint?.slice(0, 60) }, "[MobilePush][store] failed to save subscription");
    return res.status(500).json({ error: err?.message || "Failed to save subscription" });
  }
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
