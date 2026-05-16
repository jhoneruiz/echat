import { Request, Response } from "express";
import path from "path";
import fs from "fs";
import PromptKnowledge from "../models/PromptKnowledge";
import Prompt from "../models/Prompt";
import QuickMessage from "../models/QuickMessage";
import AppError from "../errors/AppError";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { promptId } = req.params;
  const { companyId } = req.user;

  // Verifica que el prompt pertenezca a la empresa
  const prompt = await Prompt.findOne({ where: { id: promptId, companyId } });
  if (!prompt) throw new AppError("Prompt no encontrado", 404);

  const items = await PromptKnowledge.findAll({
    where: { promptId, companyId },
    order: [["createdAt", "DESC"]],
  });

  return res.status(200).json(items);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { promptId } = req.params;
  const { companyId } = req.user;
  const { name, type, content, url } = req.body;

  if (!name) throw new AppError("El nombre del item es requerido", 400);

  const prompt = await Prompt.findOne({ where: { id: promptId, companyId } });
  if (!prompt) throw new AppError("Prompt no encontrado", 404);

  // Si vino archivo (via multer)
  const file = req.file as Express.Multer.File | undefined;

  const item = await PromptKnowledge.create({
    promptId: Number(promptId),
    companyId,
    name,
    type: type || (file ? inferType(file.mimetype) : "text"),
    content: content || null,
    url: url || null,
    mediaPath: file ? file.filename : null,
    mediaType: file ? file.mimetype : null,
    fileName: file ? file.originalname : null,
  } as any);

  return res.status(201).json(item);
};

/**
 * Edita un item de conocimiento existente. Solo campos de texto
 * (name, content, url). Para reemplazar un archivo, elimine el item
 * y vuelva a crearlo.
 */
export const update = async (req: Request, res: Response): Promise<Response> => {
  const { promptId, itemId } = req.params;
  const { companyId } = req.user;
  const { name, content, url, type } = req.body;

  const item = await PromptKnowledge.findOne({
    where: { id: itemId, promptId, companyId },
  });
  if (!item) throw new AppError("Item no encontrado", 404);

  if (name !== undefined) item.name = name;
  if (content !== undefined) item.content = content || null;
  if (url !== undefined) item.url = url || null;
  if (type !== undefined) item.type = type;
  await item.save();

  return res.status(200).json(item);
};

/**
 * Importa una QuickMessage como item de conocimiento.
 * Copia el archivo (si existe) desde public/companyX/quickMessage/
 * a public/companyX/knowledge/ para no compartir el archivo.
 */
export const importFromQuickMessage = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { promptId } = req.params;
  const { companyId } = req.user;
  const { quickMessageId } = req.body;

  if (!quickMessageId) {
    throw new AppError("quickMessageId es requerido", 400);
  }

  const prompt = await Prompt.findOne({ where: { id: promptId, companyId } });
  if (!prompt) throw new AppError("Prompt no encontrado", 404);

  const qm = await QuickMessage.findOne({
    where: { id: quickMessageId, companyId },
  });
  if (!qm) throw new AppError("Respuesta rápida no encontrada", 404);

  // mediaPath del modelo QM tiene getter que devuelve la URL completa;
  // necesitamos el filename raw para copiar el archivo.
  const rawMediaPath = qm.getDataValue("mediaPath");
  let newMediaPath: string | null = null;
  let newMediaType: string | null = null;
  let newFileName: string | null = null;
  let itemType = "text";

  if (rawMediaPath) {
    try {
      const publicFolder = path.resolve(__dirname, "..", "..", "public");
      const srcFile = path.resolve(
        publicFolder,
        `company${companyId}`,
        "quickMessage",
        rawMediaPath
      );
      const dstFolder = path.resolve(
        publicFolder,
        `company${companyId}`,
        "knowledge"
      );
      if (!fs.existsSync(dstFolder)) {
        fs.mkdirSync(dstFolder, { recursive: true });
      }
      const ext = path.extname(rawMediaPath);
      const base = path.basename(rawMediaPath, ext);
      const dstFilename = `${base}_qm${Date.now()}${ext}`;
      const dstFile = path.resolve(dstFolder, dstFilename);
      if (fs.existsSync(srcFile)) {
        fs.copyFileSync(srcFile, dstFile);
        newMediaPath = dstFilename;
        newFileName = qm.mediaName || rawMediaPath;
        // Inferir tipo desde mediaType de QM o desde extensión
        if (qm.mediaType) {
          newMediaType = qm.mediaType;
          itemType = mapQmTypeToKnowledge(qm.mediaType);
        } else {
          itemType = inferTypeFromExt(ext);
        }
      }
    } catch (err) {
      // Si falla la copia del archivo, igualmente creamos el item de texto
      // para no perder el contenido.
    }
  }

  const item = await PromptKnowledge.create({
    promptId: Number(promptId),
    companyId,
    name: qm.shortcode || `Respuesta rápida ${qm.id}`,
    type: itemType,
    content: qm.message || null,
    mediaPath: newMediaPath,
    mediaType: newMediaType,
    fileName: newFileName,
  } as any);

  return res.status(201).json(item);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { promptId, itemId } = req.params;
  const { companyId } = req.user;

  const item = await PromptKnowledge.findOne({
    where: { id: itemId, promptId, companyId },
  });
  if (!item) throw new AppError("Item no encontrado", 404);

  // Borrar archivo físico si existía
  if (item.mediaPath) {
    const publicFolder = path.resolve(__dirname, "..", "..", "public");
    const filePath = path.resolve(
      publicFolder,
      `company${companyId}`,
      "knowledge",
      item.mediaPath
    );
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (err) {
      // log silencioso, no bloqueamos la eliminación del registro
    }
  }

  await item.destroy();
  return res.status(200).json({ message: "Item eliminado" });
};

function inferType(mime: string): string {
  if (!mime) return "text";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.startsWith("video/")) return "video";
  if (mime === "application/pdf") return "pdf";
  return "text";
}

function inferTypeFromExt(ext: string): string {
  const e = (ext || "").toLowerCase().replace(".", "");
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(e)) return "image";
  if (["mp3", "ogg", "wav", "m4a", "aac"].includes(e)) return "audio";
  if (["mp4", "mov", "avi", "webm", "mkv"].includes(e)) return "video";
  if (e === "pdf") return "pdf";
  return "text";
}

function mapQmTypeToKnowledge(qmType: string): string {
  const t = (qmType || "").toLowerCase();
  if (t.includes("image")) return "image";
  if (t.includes("audio")) return "audio";
  if (t.includes("video")) return "video";
  if (t.includes("pdf") || t.includes("document")) return "pdf";
  return "text";
}
