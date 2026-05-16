import express from "express";
import isAuth from "../middleware/isAuth";
import isSuper from "../middleware/isSuper";
import * as MonitoringController from "../controllers/MonitoringController";

const monitoringRoutes = express.Router();

// Todos los endpoints son solo super-admin.
monitoringRoutes.get("/monitoring/health", isAuth, isSuper, MonitoringController.health);
monitoringRoutes.get("/monitoring/jobs", isAuth, isSuper, MonitoringController.jobs);
monitoringRoutes.get("/monitoring/queues", isAuth, isSuper, MonitoringController.queues);
monitoringRoutes.get("/monitoring/whatsapps", isAuth, isSuper, MonitoringController.whatsapps);
monitoringRoutes.get("/monitoring/activity", isAuth, isSuper, MonitoringController.activity);
monitoringRoutes.get("/monitoring/resources", isAuth, isSuper, MonitoringController.resources);
monitoringRoutes.get("/monitoring/all", isAuth, isSuper, MonitoringController.all);

export default monitoringRoutes;
