import { Op } from "sequelize";
import Ticket from "../models/Ticket";
import TicketTraking from "../models/TicketTraking";
import Queue from "../models/Queue";
import Contact from "../models/Contact";
import User from "../models/User";
import logger from "../utils/logger";
import SendAlertPushNotificationService from "../services/MobileNotification/SendAlertPushNotificationService";

const CronJob = require("cron").CronJob;

/**
 * Job de escalado de tickets pendientes.
 *
 * Cada 3 minutos busca tickets en estado 'pending' cuya cola tenga
 * pendingTimeoutMinutes > 0 y que lleven más de N minutos en cola sin
 * haber sido aceptados (TicketTraking.queuedAt antiguo).
 *
 * Para cada ticket encontrado:
 *   1. Calcula los minutos de espera.
 *   2. Notifica vía push a TODOS los agentes asignados a la cola.
 *   3. Marca TicketTraking.pendingAlertSentAt para no re-enviar.
 *
 * Cuando el ticket pasa a 'open', UpdateTicketService limpia
 * pendingAlertSentAt para que pueda volver a alertar si re-cae a pending.
 */
const processPendingTicketsAlerts = async (): Promise<void> => {
  try {
    // Buscar tickets pending con cola que tenga timeout configurado
    const candidates = await TicketTraking.findAll({
      where: {
        queuedAt: { [Op.ne]: null } as any,
        pendingAlertSentAt: null as any,
      },
      include: [
        {
          model: Ticket,
          where: { status: "pending" },
          required: true,
          include: [
            {
              model: Contact,
              attributes: ["id", "name", "number"],
            },
            {
              model: Queue,
              where: { pendingTimeoutMinutes: { [Op.gt]: 0 } },
              required: true,
              include: [
                {
                  model: User,
                  as: "users",
                  attributes: ["id"],
                  through: { attributes: [] },
                },
              ],
            },
          ],
        },
      ],
      limit: 200,
    });

    if (candidates.length === 0) return;

    const now = Date.now();
    let alertsSent = 0;

    for (const tracking of candidates) {
      const ticket: any = tracking.ticket;
      if (!ticket || !ticket.queue) continue;

      const queueTimeoutMs = ticket.queue.pendingTimeoutMinutes * 60 * 1000;
      const queuedAtTime = new Date(tracking.queuedAt).getTime();
      const elapsedMs = now - queuedAtTime;

      if (elapsedMs < queueTimeoutMs) continue;

      const elapsedMin = Math.floor(elapsedMs / 60000);
      const userIds = (ticket.queue.users || []).map((u: any) => u.id);
      if (userIds.length === 0) continue;

      const contactName = ticket.contact?.name || "Cliente";
      const queueName = ticket.queue.name;

      try {
        await SendAlertPushNotificationService({
          userIds,
          companyId: tracking.companyId,
          title: "⚠️ Ticket pendiente sin atender",
          body: `${contactName} lleva ${elapsedMin} min esperando en la cola ${queueName}`,
          url: `/tickets/${ticket.uuid || ticket.id}`,
          tag: `pending-alert-${ticket.id}`,
          data: {
            ticketId: ticket.id,
            queueId: ticket.queueId,
            elapsedMinutes: elapsedMin,
          },
        });

        await tracking.update({ pendingAlertSentAt: new Date() });
        alertsSent += 1;
      } catch (err) {
        logger.error(
          { err, ticketId: ticket.id },
          "[PendingTicketsAlertJob] Error sending alert"
        );
      }
    }

    if (alertsSent > 0) {
      logger.info(
        `[PendingTicketsAlertJob] Sent ${alertsSent} pending-ticket alerts`
      );
    }
  } catch (err) {
    logger.error({ err }, "[PendingTicketsAlertJob] Unexpected error");
  }
};

export const startPendingTicketsAlertJob = () => {
  const job = new CronJob(
    "0 */3 * * * *", // cada 3 minutos
    processPendingTicketsAlerts,
    null,
    true,
    "America/Sao_Paulo"
  );

  logger.info(
    "[PendingTicketsAlertJob] Initialized — runs every 3 minutes to alert agents about unattended pending tickets"
  );

  return job;
};
