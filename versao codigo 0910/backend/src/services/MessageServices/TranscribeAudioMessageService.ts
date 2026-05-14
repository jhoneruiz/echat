import path from "path";
import fs from "fs";
import axios from "axios";
import FormData from "form-data";

import Message from "../../models/Message";
import logger from "../../utils/logger";

const TranscribeAudioMessageToText = async (wid: string, companyId: string): Promise<string> => {
  const transcribeUrl = process.env.TRANSCRIBE_URL;
  const transcribeApiKey = process.env.TRANSCRIBE_API_KEY;

  if (!transcribeUrl || !transcribeApiKey) {
    logger.warn("[Transcribe] TRANSCRIBE_URL o TRANSCRIBE_API_KEY no configurados.");
    return "El servicio de transcripción no está configurado.";
  }

  try {
    const msg = await Message.findOne({ where: { wid, companyId } });

    if (!msg) {
      throw new Error("Mensaje no encontrado");
    }

    const data = new FormData();

    if (msg.mediaUrl.startsWith("http")) {
      data.append("url", msg.mediaUrl);
    } else {
      const urlParts = new URL(msg.mediaUrl);
      const pathParts = urlParts.pathname.split("/");
      const fileName = pathParts[pathParts.length - 1];
      const publicFolder = path.resolve(__dirname, "..", "..", "..", "public");
      const filePath = path.join(publicFolder, `company${companyId}`, fileName);

      if (!fs.existsSync(filePath)) {
        throw new Error(`Archivo no encontrado: ${filePath}`);
      }

      data.append("audio", fs.createReadStream(filePath));
    }

    const res = await axios.request({
      method: "post",
      maxBodyLength: Infinity,
      url: `${transcribeUrl.replace(/\/$/, "")}/transcrever`,
      headers: {
        Authorization: `Bearer ${transcribeApiKey}`,
        ...data.getHeaders()
      },
      data
    });

    await msg.update({ body: res.data, transcrito: true });

    return res.data;
  } catch (err) {
    logger.error({ err }, "[Transcribe] failed");
    return "La conversión a texto falló.";
  }
};

export default TranscribeAudioMessageToText;
