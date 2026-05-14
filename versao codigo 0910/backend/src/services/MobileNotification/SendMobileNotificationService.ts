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
  const ctx = { userId: user.id, ticketId: ticket?.id, ticketStatus: ticket?.status, ticketUserId: ticket?.userId, ticketQueueId: ticket?.queueId };

  if (!ticket) {
    logger.info(ctx, "[MobilePush] skip: ticket missing on message");
    return false;
  }

  if (!user.mobileNotifications) {
    logger.info(ctx, "[MobilePush] skip: user.mobileNotifications=false");
    return false;
  }

  const hasSubscriptions = Array.isArray(user.pushSubscriptions) && user.pushSubscriptions.length > 0;
  if (!hasSubscriptions) {
    logger.info(ctx, "[MobilePush] skip: user has no pushSubscriptions");
    return false;
  }

  const assignmentMatch = ticket.userId ? ticket.userId === user.id : true;
  if (!assignmentMatch) {
    logger.info(ctx, "[MobilePush] skip: ticket assigned to another user");
    return false;
  }

  let queueMatch = false;
  if (ticket.queueId) {
    queueMatch = user.queues?.some(queue => queue.id === ticket.queueId) ?? false;
  } else {
    queueMatch = user.allTicket === "enable";
  }

  if (!queueMatch) {
    logger.info({ ...ctx, userQueues: user.queues?.map(q => q.id), userAllTicket: user.allTicket }, "[MobilePush] skip: queue mismatch");
    return false;
  }

  if (["lgpd", "nps"].includes(ticket.status)) {
    logger.info(ctx, "[MobilePush] skip: ticket status is lgpd/nps");
    return false;
  }

  if (ticket.status === "pending" && !showNotificationPending) {
    logger.info(ctx, "[MobilePush] skip: pending ticket and showNotificationPending disabled");
    return false;
  }

  if (ticket.status === "group") {
    const isGroupTicketEnabled = ticket.whatsapp?.groupAsTicket === "enabled";
    if (!isGroupTicketEnabled || user.allowGroup !== true) {
      logger.info(ctx, "[MobilePush] skip: group ticket and group notifications disabled");
      return false;
    }
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

    logger.info({ messageId: message.id, fromMe: message.fromMe, isPrivate: message.isPrivate }, "[MobilePush] invoked");

    if (message.fromMe || message.isPrivate) {
      logger.info("[MobilePush] skip: message fromMe or isPrivate");
      return;
    }

    configureWebPush();

    if (!configured) {
      logger.warn("[MobilePush] skip: webpush not configured (missing VAPID keys?)");
      return;
    }

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
    if (!ticket) {
      logger.warn({ messageId: message.id }, "[MobilePush] skip: no ticket after reload");
      return;
    }

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

    logger.info({
      ticketId: ticket.id,
      ticketStatus: ticket.status,
      ticketUserId: ticket.userId,
      ticketQueueId: ticket.queueId,
      companyId: ticket.companyId,
      candidateUsers: users.length,
      userIds: users.map(u => u.id),
      subscriptionCounts: users.map(u => ({ id: u.id, subs: u.pushSubscriptions?.length || 0 }))
    }, "[MobilePush] candidate users loaded");

    let dispatched = 0;
    for (const user of users) {
      const shouldNotify = await shouldNotifyUser(user, message, showNotificationPending);
      if (!shouldNotify) {
        continue;
      }

      const shouldBlur = ticket.status === "pending" && user.allowSeeMessagesInPendingTickets === "disabled";
      const payload = buildNotificationPayload(message, shouldBlur);

      for (const subscription of user.pushSubscriptions || []) {
        const webPushSubscription = mapSubscription(subscription);
        try {
          await webpush.sendNotification(webPushSubscription, JSON.stringify(payload), {
            TTL: 86400
          });
          dispatched += 1;
          logger.info({ userId: user.id, subscriptionId: subscription.id, endpoint: subscription.endpoint?.slice(0, 60) }, "[MobilePush] sent OK");
        } catch (err: any) {
          const statusCode = err?.statusCode || err?.status || err?.code;
          logger.error({ err, statusCode, body: err?.body, endpoint: subscription.endpoint?.slice(0, 60) }, "[MobilePush] Error sending notification");

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

    logger.info({ ticketId: ticket.id, dispatched }, "[MobilePush] finished");
  } catch (err) {
    logger.error({ err }, "[MobilePush] Unexpected error while sending push notification");
  }
};

export default SendMobileNotificationService;
