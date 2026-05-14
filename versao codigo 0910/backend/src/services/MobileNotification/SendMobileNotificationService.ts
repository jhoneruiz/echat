import webpush, { PushSubscription as WebPushSubscription } from "web-push";

import Message from "../../models/Message";
import User from "../../models/User";
import Queue from "../../models/Queue";
import UserPushSubscription from "../../models/UserPushSubscription";
import FindCompanySettingOneService from "../CompaniesSettings/FindCompanySettingOneService";
import logger from "../../utils/logger";
import RemoveUserPushSubscriptionService from "../PushSubscriptionServices/RemoveUserPushSubscriptionService";

let configured = false;

const configureWebPush = () => {
  if (configured) return;

  const publicKey = process.env.WEB_PUSH_PUBLIC_KEY;
  const privateKey = process.env.WEB_PUSH_PRIVATE_KEY;
  const contactEmail = process.env.WEB_PUSH_CONTACT_EMAIL || process.env.MAIL_FROM || "no-reply@whaticket.app";

  if (!publicKey || !privateKey) {
    logger.warn("[MobilePush] WEB_PUSH_PUBLIC_KEY or WEB_PUSH_PRIVATE_KEY not configured. Skipping push notification setup.");
    return;
  }

  webpush.setVapidDetails(`mailto:${contactEmail}`, publicKey, privateKey);
  configured = true;
};

const mapSubscription = (subscription: UserPushSubscription): WebPushSubscription => ({
  endpoint: subscription.endpoint,
  expirationTime: subscription.expirationTime,
  keys: {
    auth: subscription.keysAuth,
    p256dh: subscription.keysP256dh
  }
});

const getMessagePreview = (message: Message): string => {
  if (!message) return "Tienes un mensaje nuevo";

  if (message.mediaType && message.mediaType !== "chat") {
    const mediaLabels: Record<string, string> = {
      image: "📷 Imagen",
      audio: "🎧 Audio",
      video: "🎬 Video",
      document: "📎 Archivo",
      sticker: "💬 Sticker",
      location: "📍 Ubicación"
    };

    return mediaLabels[message.mediaType] || "Nuevo mensaje";
  }

  if (!message.body || message.body.trim() === "") {
    return "Nuevo mensaje";
  }

  return message.body.substring(0, 120);
};

const shouldNotifyUser = async (
  user: User,
  message: Message,
  showNotificationPending: boolean
): Promise<boolean> => {
  const ticket = message.ticket;

  if (!ticket) return false;
  if (!user.mobileNotifications) return false;

  const hasSubscriptions = Array.isArray(user.pushSubscriptions) && user.pushSubscriptions.length > 0;
  if (!hasSubscriptions) return false;

  const assignmentMatch = ticket.userId ? ticket.userId === user.id : true;
  if (!assignmentMatch) return false;

  let queueMatch = false;
  if (ticket.queueId) {
    queueMatch = user.queues?.some(queue => queue.id === ticket.queueId) ?? false;
  } else {
    queueMatch = user.allTicket === "enable";
  }
  if (!queueMatch) return false;

  if (["lgpd", "nps"].includes(ticket.status)) return false;
  if (ticket.status === "pending" && !showNotificationPending) return false;

  if (ticket.status === "group") {
    const isGroupTicketEnabled = ticket.whatsapp?.groupAsTicket === "enabled";
    if (!isGroupTicketEnabled || user.allowGroup !== true) return false;
  }

  return true;
};

const buildNotificationPayload = (
  message: Message,
  shouldBlur: boolean
) => {
  const ticket = message.ticket;
  const contactName = ticket?.contact?.name || "Cliente";
  const queueName = ticket?.queue?.name || ticket?.whatsapp?.name || "Whaticket";

  const title = `${contactName} · ${queueName}`;
  const body = shouldBlur ? "Tienes un mensaje nuevo" : getMessagePreview(message);
  const urlBase = process.env.FRONTEND_URL || "https://app.whaticket.app";
  const targetUrl = `${urlBase.replace(/\/$/, "")}/tickets/${ticket?.id ?? ""}`;

  return {
    title,
    body,
    data: {
      url: targetUrl,
      ticketId: ticket?.id,
      contactId: ticket?.contactId
    }
  };
};

const SendMobileNotificationService = async (message: Message): Promise<void> => {
  try {
    if (!message) return;
    if (message.fromMe || message.isPrivate) return;

    configureWebPush();
    if (!configured) return;

    await message.reload({
      include: [
        {
          model: Queue,
          as: "queue",
          attributes: ["id", "name", "color"]
        },
        {
          association: "ticket",
          include: ["contact", "queue", "whatsapp"]
        }
      ]
    });

    const ticket = message.ticket;
    if (!ticket) return;

    const companySettings = await FindCompanySettingOneService({
      companyId: ticket.companyId,
      column: "showNotificationPending"
    });

    const showNotificationPending = Boolean(companySettings?.[0]?.showNotificationPending);

    const users = await User.findAll({
      where: {
        companyId: ticket.companyId,
        mobileNotifications: true
      },
      include: [
        { model: Queue, as: "queues", attributes: ["id"] },
        { model: UserPushSubscription, as: "pushSubscriptions" }
      ]
    });

    for (const user of users) {
      const shouldNotify = await shouldNotifyUser(user, message, showNotificationPending);
      if (!shouldNotify) continue;

      const shouldBlur = ticket.status === "pending" && user.allowSeeMessagesInPendingTickets === "disabled";
      const payload = buildNotificationPayload(message, shouldBlur);

      for (const subscription of user.pushSubscriptions || []) {
        const webPushSubscription = mapSubscription(subscription);
        try {
          await webpush.sendNotification(webPushSubscription, JSON.stringify(payload), {
            TTL: 86400
          });
        } catch (err: any) {
          const statusCode = err?.statusCode || err?.status || err?.code;
          logger.error({ err, statusCode, body: err?.body }, "[MobilePush] Error sending notification");

          if ([404, 410].includes(statusCode)) {
            await RemoveUserPushSubscriptionService({
              userId: user.id,
              companyId: ticket.companyId,
              subscriptionId: subscription.id
            });
          }
        }
      }
    }
  } catch (err) {
    logger.error({ err }, "[MobilePush] Unexpected error while sending push notification");
  }
};

export default SendMobileNotificationService;
