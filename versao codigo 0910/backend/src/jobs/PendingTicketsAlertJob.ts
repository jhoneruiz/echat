import { Op } from "sequelize";
import Ticket from "../models/Ticket";
import TicketTraking from "../models/TicketTraking";
import Queue from "../models/Queue";
import Contact from "../models/Contact";
import User from "../models/User";
import logger from "../utils/logger";
import SendAlertPushNotificationService from "../services/MobileNotification/SendAlertPushNotificationService";
import { getIO } from "../libs/socket";

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
    // PASO 1: Encontrar colas con timeout activo (cache pequeño)
    const activeQueues = await Queue.findAll({
      where: { pendingTimeoutMinutes: { [Op.gt]: 0 } as any },
      include: [
        {
          model: User,
          as: "users",
          attributes: ["id"],
          through: { attributes: [] },
        },
      ],
    });

    if (activeQueues.length === 0) return;

    const queueMap = new Map<number, any>();
    for (const q of activeQueues) {
      queueMap.set(q.id, q);
    }

    // PASO 2: Trackings candidatos: queuedAt definido, alerta no enviada,
    // ticket en pending, y cola activa.
    const candidates = await TicketTraking.findAll({
      where: {
        queuedAt: { [Op.ne]: null } as any,
        pendingAlertSentAt: null as any,
      },
      include: [
        {
          model: Ticket,
          where: {
            status: "pending",
            queueId: { [Op.in]: Array.from(queueMap.keys()) } as any,
          },
          required: true,
        },
      ],
      limit: 200,
    });

    if (candidates.length === 0) return;

    const now = Date.now();
    let alertsSent = 0;

    for (const tracking of candidates) {
      const ticket: any = tracking.ticket;
      if (!ticket || !ticket.queueId) continue;

      const queue: any = queueMap.get(ticket.queueId);
      if (!queue) continue;

      const queueTimeoutMs = queue.pendingTimeoutMinutes * 60 * 1000;
      const queuedAtTime = new Date(tracking.queuedAt).getTime();
      const elapsedMs = now - queuedAtTime;

      if (elapsedMs < queueTimeoutMs) continue;

      const elapsedMin = Math.floor(elapsedMs / 60000);
      const userIds = (queue.users || []).map((u: any) => u.id);
      if (userIds.length === 0) continue;

      // PASO 3: Cargar el contacto del ticket (separado para evitar JOIN complejo)
      let contactName = "Cliente";
      try {
        const contact = await Contact.findByPk(ticket.contactId, {
          attributes: ["id", "name", "number"],
        });
        if (contact?.name) contactName = contact.name;
      } catch {
        // ignorar, usar fallback
      }

      const alertPayload = {
        ticketId: ticket.id,
        ticketUuid: (ticket as any).uuid,
        queueId: ticket.queueId,
        queueName: queue.name,
        contactName,
        elapsedMinutes: elapsedMin,
        userIds, // qué usuarios deben verla
        url: `/tickets/${(ticket as any).uuid || ticket.id}`,
      };

      try {
        // 1) Push mobile (PWA) — solo llega si el user tiene UserPushSubscription
        await SendAlertPushNotificationService({
          userIds,
          companyId: tracking.companyId,
          title: "⚠️ Ticket pendiente sin atender",
          body: `${contactName} lleva ${elapsedMin} min esperando en la cola ${queue.name}`,
          url: alertPayload.url,
          tag: `pending-alert-${ticket.id}`,
          data: alertPayload,
        });

        // 2) Socket event in-app — llega al navegador/PWA abierto aunque
        //    no tenga push subscription. El frontend lo escucha y muestra toast.
        try {
          const io = getIO();
          io.of(String(tracking.companyId)).emit(
            `company-${tracking.companyId}-pendingTicketAlert`,
            alertPayload
          );
        } catch (sockErr) {
          logger.warn(
            { sockErr, ticketId: ticket.id },
            "[PendingTicketsAlertJob] Socket emit failed (continuing)"
          );
        }

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
