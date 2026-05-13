import UserPushSubscription from "../../models/UserPushSubscription";

interface KeysPayload {
  auth: string;
  p256dh: string;
}

interface Request {
  userId: number;
  companyId: number;
  endpoint: string;
  expirationTime?: number | null;
  keys: KeysPayload;
  platform?: string | null;
  deviceInfo?: any;
}

const SaveUserPushSubscriptionService = async ({
  userId,
  companyId,
  endpoint,
  expirationTime,
  keys,
  platform,
  deviceInfo
}: Request): Promise<UserPushSubscription> => {
  const payload = {
    endpoint,
    expirationTime: expirationTime ? new Date(expirationTime) : null,
    keysAuth: keys.auth,
    keysP256dh: keys.p256dh,
    platform: platform || null,
    deviceInfo: deviceInfo
      ? typeof deviceInfo === "string"
        ? deviceInfo
        : JSON.stringify(deviceInfo)
      : null,
    lastUsedAt: new Date(),
    userId,
    companyId
  };

  const existing = await UserPushSubscription.findOne({
    where: { endpoint }
  });

  if (existing) {
    await existing.update(payload);
    return existing;
  }

  return UserPushSubscription.create(payload);
};

export default SaveUserPushSubscriptionService;
