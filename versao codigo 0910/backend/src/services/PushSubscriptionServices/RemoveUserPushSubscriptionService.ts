import UserPushSubscription from "../../models/UserPushSubscription";

interface Request {
  userId: number;
  companyId: number;
  subscriptionId?: number;
  endpoint?: string;
}

const RemoveUserPushSubscriptionService = async ({
  userId,
  companyId,
  subscriptionId,
  endpoint
}: Request): Promise<number> => {
  const where: any = { userId, companyId };

  if (subscriptionId) {
    where.id = subscriptionId;
  }

  if (endpoint) {
    where.endpoint = endpoint;
  }

  if (!where.id && !where.endpoint) {
    throw new Error("ERR_PUSH_SUBSCRIPTION_IDENTIFIER_REQUIRED");
  }

  const deleted = await UserPushSubscription.destroy({
    where
  });

  return deleted;
};

export default RemoveUserPushSubscriptionService;
