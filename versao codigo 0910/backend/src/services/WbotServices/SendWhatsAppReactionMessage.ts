import AppError from "../../errors/AppError";
import GetTicketWbot from "../../helpers/GetTicketWbot";
import Contact from "../../models/Contact";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import logger from "../../utils/logger";
import { normalizeJid } from "../../utils";

interface Request {
  ticket: Ticket;
  targetMessage: Message;
  reaction: string;
}

const SendWhatsAppReactionMessage = async ({
  ticket,
  targetMessage,
  reaction
}: Request): Promise<void> => {
  const wbot = await GetTicketWbot(ticket);
  const contact = await Contact.findByPk(ticket.contactId);

  if (!contact) {
    throw new AppError("Contato do ticket não encontrado");
  }

  const jid = normalizeJid(
    `${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`
  );

  let key: any = null;

  if (targetMessage.dataJson) {
    try {
      const parsed = JSON.parse(targetMessage.dataJson);
      key = parsed?.key ?? null;

      if (key && !key.remoteJid) {
        key.remoteJid = targetMessage.remoteJid || jid;
      }

      if (key && ticket.isGroup && targetMessage.participant && !key.participant) {
        key.participant = targetMessage.participant;
      }
    } catch (err) {
      logger.warn(
        `Erro ao analisar dataJson para reação na mensagem ${targetMessage.id}: ${err}`
      );
    }
  }

  if (!key) {
    key = {
      remoteJid: targetMessage.remoteJid || jid,
      id: targetMessage.wid,
      fromMe: targetMessage.fromMe,
      participant: targetMessage.participant || undefined
    };
  }

  if (!key?.remoteJid || !key?.id) {
    throw new AppError("Não foi possível determinar a mensagem para reagir");
  }

  const sentMessage = await wbot.sendMessage(jid, {
    react: {
      text: reaction || "",
      key
    }
  });

  if (sentMessage) {
    wbot.store(sentMessage);
  }
};

export default SendWhatsAppReactionMessage;
