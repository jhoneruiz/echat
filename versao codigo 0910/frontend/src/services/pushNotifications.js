import api from "./api";

export const fetchPublicKey = () => api.get("/push/public-key");

export const listSubscriptions = () => api.get("/push/subscriptions");

export const saveSubscription = (payload) => api.post("/push/subscriptions", payload);

export const deleteSubscription = (subscriptionId, data) =>
  api.delete(`/push/subscriptions/${subscriptionId}`, { data });
