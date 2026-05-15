import { Request, Response } from "express";
import path from "path";
import fs from "fs";
import PromptKnowledge from "../models/PromptKnowledge";
import Prompt from "../models/Prompt";
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
