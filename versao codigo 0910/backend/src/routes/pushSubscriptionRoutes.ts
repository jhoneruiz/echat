import { Router } from "express";

import isAuth from "../middleware/isAuth";
import * as PushSubscriptionController from "../controllers/PushSubscriptionController";

const pushRoutes = Router();

pushRoutes.get("/push/public-key", isAuth, PushSubscriptionController.publicKey);
pushRoutes.get("/push/subscriptions", isAuth, PushSubscriptionController.list);
pushRoutes.post("/push/subscriptions", isAuth, PushSubscriptionController.store);
pushRoutes.delete("/push/subscriptions/:subscriptionId", isAuth, PushSubscriptionController.remove);

export default pushRoutes;
