import QuickMessage from "../../models/QuickMessage";
import logger from "../../utils/logger";
import { getIO } from "../../libs/socket";

interface ITemplateStatusPayload {
    companyId: number;
    token: string;
    templateId: number;
    templateName: string;
    templateLanguage: string;
    status: string;
    reason?: string;
}

export const SyncTemplateStatus = async (data: ITemplateStatusPayload): Promise<void> => {
    const { templateId, templateName, templateLanguage, status, reason, companyId } = data;

    try {
        const [updated] = await QuickMessage.update(
            {
                status,
                rejectedReason: reason || null,
            },
            {
                where: {
                    metaID: String(templateId),
                    companyId,
                    isOficial: true,
                },
            }
        );

        if (updated === 0) {
            logger.warn(
                `SyncTemplateStatus: template ${templateName} (${templateLanguage}) metaID=${templateId} não encontrado para empresa ${companyId}`
            );
        } else {
            logger.info(
                `SyncTemplateStatus: template ${templateName} status atualizado para ${status} (empresa ${companyId})`
            );
            try {
                const io = getIO();
                io.of(String(companyId)).emit(`company-${companyId}-quickmessage`, {
                    action: "update",
                    record: { metaID: String(templateId), status, rejectedReason: reason || null },
                });
            } catch (_) {
                // socket may not be initialized in tests
            }
        }
    } catch (error) {
        logger.error(`SyncTemplateStatus error: ${error.message}`);
    }
};
