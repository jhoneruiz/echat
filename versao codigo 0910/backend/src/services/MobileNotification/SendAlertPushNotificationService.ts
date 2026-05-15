import webpush, { PushSubscription as WebPushSubscription } from "web-push";

import UserPushSubscription from "../../models/UserPushSubscription";
import logger from "../../utils/logger";
import RemoveUserPushSubscriptionService from "../PushSubscriptionServices/RemoveUserPushSubscriptionService";

let configured = false;

const configureWebPush = () => {
  if (configured) return;

  const publicKey = process.env.WEB_PUSH_PUBLIC_KEY;
  const privateKey = process.env.WEB_PUSH_PRIVATE_KEY;
  const contactEmail =
    process.env.WEB_PUSH_CONTACT_EMAIL ||
    process.env.MAIL_FROM ||
    "no-reply@whaticket.app";

  if (!publicKey || !privateKey) {
    logger.warn(
      "[AlertPush] WEB_PUSH_PUBLIC_KEY or WEB_PUSH_PRIVATE_KEY not configured. Skipping."
    );
    return;
  }

  webpush.setVapidDetails(`mailto:${contactEmail}`, publicKey, privateKey);
  configured = true;
};

const mapSubscription = (
  subscription: UserPushSubscription
): WebPushSubscription => ({
  endpoint: subscription.endpoint,
  expirationTime: subscription.expirationTime,
  keys: {
    auth: subscription.keysAuth,
    p256dh: subscription.keysP256dh,
  },
});

interface AlertPushParams {
  userIds: number[];
  companyId: number;
  title: string;
  body: string;
  url?: string;
  data?: Record<string, any>;
  tag?: string;
}

/**
 * Envía notificación push genérica a una lista de usuarios.
 * No requiere un Message asociado (a diferencia de SendMobileNotificationService).
 * Usado por jobs de alerta como recordatorio de tickets pendientes.
 */
const SendAlertPushNotificationService = async ({
  userIds,
  companyId,
  title,
  body,
  url,
  data = {},
  tag,
}: AlertPushParams): Promise<void> => {
  try {
    if (!Array.isArray(userIds) || userIds.length === 0) return;

    configureWebPush();
    if (!configured) return;

    const subscriptions = await UserPushSubscription.findAll({
      where: { userId: userIds, companyId } as any,
    });

    if (subscriptions.length === 0) return;

    const payload = {
      title,
      body,
      icon: "/logo192.png",
      badge: "/logo192.png",
      tag: tag || `alert-${Date.now()}`,
      renotify: true,
      data: {
        url: url || "/",
        ...data,
      },
    };

    const payloadStr = JSON.stringify(payload);

    for (const subscription of subscriptions) {
      const webPushSubscription = mapSubscription(subscription);
      try {
        await webpush.sendNotification(webPushSubscription, payloadStr, {
          TTL: 86400,
        });
      } catch (err: any) {
        const statusCode = err?.statusCode || err?.status || err?.code;
        logger.error(
          { err, statusCode, body: err?.body },
          "[AlertPush] Error sending notification"
        );

        if ([404, 410].includes(statusCode)) {
          await RemoveUserPushSubscriptionService({
            userId: subscription.userId,
            companyId,
            subscriptionId: subscription.id,
          });
        }
      }
    }
  } catch (err) {
    logger.error({ err }, "[AlertPush] Unexpected error");
  }
};

export default SendAlertPushNotificationService;
