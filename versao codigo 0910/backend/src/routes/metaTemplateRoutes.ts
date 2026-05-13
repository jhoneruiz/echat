import express from "express";
import isAuth from "../middleware/isAuth";
import * as MetaTemplateController from "../controllers/MetaTemplateController";

const routes = express.Router();

routes.get("/meta-templates/:whatsappId", isAuth, MetaTemplateController.index);
routes.post("/meta-templates/:whatsappId", isAuth, MetaTemplateController.store);
routes.put("/meta-templates/:whatsappId/:templateId", isAuth, MetaTemplateController.update);
routes.delete("/meta-templates/:whatsappId/:templateName", isAuth, MetaTemplateController.remove);
routes.post("/meta-templates/:whatsappId/sync", isAuth, MetaTemplateController.sync);

export default routes;
