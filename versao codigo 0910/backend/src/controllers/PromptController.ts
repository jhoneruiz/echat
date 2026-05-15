import { Request, Response } from "express";
import OpenAI from "openai";
import { getIO } from "../libs/socket";
import CreatePromptService from "../services/PromptServices/CreatePromptService";
import DeletePromptService from "../services/PromptServices/DeletePromptService";
import ListPromptsService from "../services/PromptServices/ListPromptsService";
import ShowPromptService from "../services/PromptServices/ShowPromptService";
import UpdatePromptService from "../services/PromptServices/UpdatePromptService";
import Whatsapp from "../models/Whatsapp";
import { verify } from "jsonwebtoken";
import authConfig from "../config/auth";
import AppError from "../errors/AppError";

interface TokenPayload {
  id: string;
  username: string;
  profile: string;
  companyId: number;
  iat: number;
  exp: number;
}

type IndexQuery = {
  searchParam?: string;
  pageNumber?: string | number;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { pageNumber, searchParam } = req.query as IndexQuery;
  const authHeader = req.headers.authorization;
  const [, token] = authHeader.split(" ");
  const decoded = verify(token, authConfig.secret);
  const { companyId } = decoded as TokenPayload;
  const { prompts, count, hasMore } = await ListPromptsService({ searchParam, pageNumber, companyId });

  return res.status(200).json({ prompts, count, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const authHeader = req.headers.authorization;
  const [, token] = authHeader.split(" ");
  const decoded = verify(token, authConfig.secret);
  const { companyId } = decoded as TokenPayload;
  // Acepta todos los campos del agente directamente del body, incluyendo los nuevos
  // (model, agentFunction, tone, languages, isActive, initialMessage, responseRules,
  // allowTransfer, transferKeywords, transferMessage, responseDelay, charLimit, humanize, useAudio).
  const promptTable = await CreatePromptService({ ...req.body, companyId });

  const io = getIO();
  io.of(String(companyId))
    .emit(`company-${companyId}-prompt`, {
      action: "update",
      prompt: promptTable
    });

  return res.status(200).json(promptTable);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { promptId } = req.params;
  const authHeader = req.headers.authorization;
  const [, token] = authHeader.split(" ");
  const decoded = verify(token, authConfig.secret);
  const { companyId } = decoded as TokenPayload;
  const prompt = await ShowPromptService({ promptId, companyId });

  return res.status(200).json(prompt);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { promptId } = req.params;
  const promptData = req.body;
  const authHeader = req.headers.authorization;
  const [, token] = authHeader.split(" ");
  const decoded = verify(token, authConfig.secret);
  const { companyId } = decoded as TokenPayload;

  const prompt = await UpdatePromptService({ promptData, promptId: promptId, companyId });

  const io = getIO();
  io.of(String(companyId))
    .emit(`company-${companyId}-prompt`, {
      action: "update",
      prompt
    });

  return res.status(200).json(prompt);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { promptId } = req.params;
  const authHeader = req.headers.authorization;
  const [, token] = authHeader.split(" ");
  const decoded = verify(token, authConfig.secret);
  const { companyId } = decoded as TokenPayload;
  try {
    const { count } = await Whatsapp.findAndCountAll({ where: { promptId: +promptId, companyId } });

    if (count > 0) return res.status(200).json({ message: "Não foi possível excluir! Verifique se este prompt está sendo usado nas conexões Whatsapp!" });

    await DeletePromptService(promptId, companyId);

    const io = getIO();
    io.of(String(companyId))
      .emit(`company-${companyId}-prompt`, {
        action: "delete",
        promptId: +promptId
      });

    return res.status(200).json({ message: "Prompt deleted" });
  } catch (err) {
    return res.status(500).json({ message: "Não foi possível excluir! Verifique se este prompt está sendo usado!" });
  }
};

// Endpoint de prueba: ejecuta el prompt con un mensaje del usuario y devuelve la respuesta de OpenAI.
// Acepta la configuración del agente directamente en el body para permitir probar SIN haber guardado aún.
export const test = async (req: Request, res: Response): Promise<Response> => {
  const {
    apiKey,
    model,
    prompt: personality,
    message,
    maxTokens,
    temperature,
    tone,
    agentFunction,
    languages,
    responseRules,
    transferKeywords,
    initialMessage,
    knowledge
  } = req.body;

  if (!apiKey) throw new AppError("API Key requerida para probar el agente", 400);
  if (!personality) throw new AppError("Personalidad requerida para probar el agente", 400);
  if (!message) throw new AppError("Mensaje requerido", 400);

  const tones: Record<string, string> = {
    friendly: "amigable y cercano",
    professional: "profesional y serio",
    formal: "formal y respetuoso",
    casual: "casual y relajado",
    empathetic: "empático y comprensivo"
  };

  const functions: Record<string, string> = {
    general: "asistente multiusos",
    sales: "agente de ventas para calificar leads",
    support: "agente de soporte técnico",
    scheduling: "agente de agendamiento y reservas",
    qualification: "agente para cualificar prospectos"
  };

  const parts: string[] = [];
  parts.push(`Eres un ${functions[agentFunction] || "asistente"}.`);
  parts.push(`Tu personalidad: ${personality}`);
  if (tone && tones[tone]) parts.push(`Tono de voz: ${tones[tone]}.`);

  if (languages) {
    const langs = String(languages).split(",").map((s: string) => s.trim()).filter(Boolean);
    if (langs.includes("auto")) {
      parts.push("Responde en el mismo idioma que el usuario.");
    } else if (langs.length > 0) {
      const map: Record<string, string> = { es: "Español", en: "Inglés", "pt-BR": "Portugués", fr: "Francés", de: "Alemán", it: "Italiano" };
      parts.push(`Responde solo en: ${langs.map(c => map[c] || c).join(", ")}.`);
    }
  }

  if (responseRules) parts.push(`Reglas adicionales:\n${responseRules}`);
  if (knowledge && knowledge.trim()) {
    parts.push(`Información de referencia (úsala como contexto, no copies literal):\n${knowledge}`);
  }

  const systemPrompt = parts.join("\n\n");

  try {
    const openai = new OpenAI({ apiKey });
    const chat = await openai.chat.completions.create({
      model: model || "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      max_tokens: maxTokens || 500,
      temperature: temperature ?? 1
    });

    return res.status(200).json({
      response: chat.choices[0].message?.content || "",
      usage: chat.usage
    });
  } catch (err: any) {
    const msg = err?.response?.data?.error?.message || err?.message || "Error al llamar a OpenAI";
    return res.status(400).json({ error: msg });
  }
};

