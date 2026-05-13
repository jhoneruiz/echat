import UserPushSubscription from "../../models/UserPushSubscription";

interface Request {
  userId: number;
  companyId: number;
}

const ListUserPushSubscriptionsService = async ({
  userId,
  companyId
}: Request): Promise<UserPushSubscription[]> => {
  const subscriptions = await UserPushSubscription.findAll({
    where: { userId, companyId },
    order: [["updatedAt", "DESC"]]
  });

  return subscriptions;
};

export default ListUserPushSubscriptionsService;
