import { Router } from "express";
import multer from "multer";
import * as PromptController from "../controllers/PromptController";
import * as PromptKnowledgeController from "../controllers/PromptKnowledgeController";
import isAuth from "../middleware/isAuth";
import uploadConfig from "../config/upload";

const promptRoutes = Router();
const upload = multer(uploadConfig);

promptRoutes.get("/prompt", isAuth, PromptController.index);

promptRoutes.post("/prompt", isAuth, PromptController.store);

promptRoutes.get("/prompt/:promptId", isAuth, PromptController.show);

promptRoutes.put("/prompt/:promptId", isAuth, PromptController.update);

promptRoutes.delete("/prompt/:promptId", isAuth, PromptController.remove);

promptRoutes.post("/prompt/test", isAuth, PromptController.test);

// Knowledge items (text, URL, archivos PDF/audio/video/imagen)
promptRoutes.get(
  "/prompt/:promptId/knowledge",
  isAuth,
  PromptKnowledgeController.index
);
promptRoutes.post(
  "/prompt/:promptId/knowledge",
  isAuth,
  upload.single("file"),
  PromptKnowledgeController.store
);
promptRoutes.delete(
  "/prompt/:promptId/knowledge/:itemId",
  isAuth,
  PromptKnowledgeController.remove
);

export default promptRoutes;
