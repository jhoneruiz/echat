import { Request, Response } from "express";
import AppError from "../errors/AppError";
import QuickMessage from "../models/QuickMessage";
import QuickMessageComponent from "../models/QuickMessageComponent";
import Whatsapp from "../models/Whatsapp";
import {
    createTemplateOficial,
    deleteTemplateOficial,
    getTemplatesWhatsAppOficial,
    updateTemplateOficial,
} from "../libs/whatsAppOficial/whatsAppOficial.service";
import CreateService from "../services/QuickMessageService/CreateService";

export const index = async (req: Request, res: Response): Promise<Response> => {
    const { companyId } = req.user;
    const { whatsappId } = req.params;

    const whatsapp = await Whatsapp.findByPk(whatsappId);
    if (!whatsapp || whatsapp.companyId !== companyId) throw new AppError("ERR_NO_PERMISSION", 403);

    const data = await getTemplatesWhatsAppOficial(whatsapp.token);
    return res.status(200).json(data);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
    const { companyId, id: userId } = req.user;
    const { whatsappId } = req.params;

    const whatsapp = await Whatsapp.findByPk(whatsappId);
    if (!whatsapp || whatsapp.companyId !== companyId) throw new AppError("ERR_NO_PERMISSION", 403);

    const dto = req.body;
    const result = await createTemplateOficial(whatsapp.token, dto);

    const qm = await CreateService({
        shortcode: dto.name,
        message: dto.name,
        companyId,
        userId,
        geral: true,
        isMedia: false,
        mediaPath: null,
        visao: true,
        isOficial: true,
        language: dto.language,
        status: result.status || "PENDING",
        category: result.category || dto.category,
        metaID: result.id,
        whatsappId: whatsapp.id,
    } as any);

    if (dto.components?.length > 0) {
        await Promise.all(
            dto.components.map(async (component: any) => {
                await QuickMessageComponent.create({
                    quickMessageId: qm.id,
                    type: component.type,
                    text: component.text,
                    buttons: JSON.stringify(component?.buttons),
                    format: component?.format,
                    example: JSON.stringify(component?.example),
                });
            })
        );
    }

    return res.status(201).json({ ...result, localId: qm.id });
};

export const update = async (req: Request, res: Response): Promise<Response> => {
    const { companyId } = req.user;
    const { whatsappId, templateId } = req.params;

    const whatsapp = await Whatsapp.findByPk(whatsappId);
    if (!whatsapp || whatsapp.companyId !== companyId) throw new AppError("ERR_NO_PERMISSION", 403);

    const dto = req.body;
    const result = await updateTemplateOficial(whatsapp.token, templateId, dto);

    const qm = await QuickMessage.findOne({
        where: { metaID: templateId, companyId, isOficial: true },
    });

    if (qm) {
        await qm.update({ status: "PENDING", rejectedReason: null });

        if (dto.components?.length > 0) {
            await QuickMessageComponent.destroy({ where: { quickMessageId: qm.id } });
            await Promise.all(
                dto.components.map(async (component: any) => {
                    await QuickMessageComponent.create({
                        quickMessageId: qm.id,
                        type: component.type,
                        text: component.text,
                        buttons: JSON.stringify(component?.buttons),
                        format: component?.format,
                        example: JSON.stringify(component?.example),
                    });
                })
            );
        }
    }

    return res.status(200).json(result);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
    const { companyId } = req.user;
    const { whatsappId, templateName } = req.params;

    const whatsapp = await Whatsapp.findByPk(whatsappId);
    if (!whatsapp || whatsapp.companyId !== companyId) throw new AppError("ERR_NO_PERMISSION", 403);

    const result = await deleteTemplateOficial(whatsapp.token, templateName);

    await QuickMessage.destroy({
        where: { shortcode: templateName, companyId, isOficial: true },
    });

    return res.status(200).json(result);
};

export const sync = async (req: Request, res: Response): Promise<Response> => {
    const { companyId, id: userId } = req.user;
    const { whatsappId } = req.params;

    const whatsapp = await Whatsapp.findByPk(whatsappId);
    if (!whatsapp || whatsapp.companyId !== companyId) throw new AppError("ERR_NO_PERMISSION", 403);

    const data = await getTemplatesWhatsAppOficial(whatsapp.token);

    if (data.data.length > 0) {
        await Promise.all(
            data.data.map(async template => {
                const qm = await QuickMessage.findOne({
                    where: { metaID: template.id },
                    include: [{ model: QuickMessageComponent, as: "components" }],
                });

                if (qm) {
                    await qm.update({
                        message: template.name,
                        category: template.category,
                        status: template.status,
                        language: template.language,
                    });

                    if (template?.components?.length > 0) {
                        await QuickMessageComponent.destroy({ where: { quickMessageId: qm.id } });
                        await Promise.all(
                            template.components.map(async component => {
                                await QuickMessageComponent.create({
                                    quickMessageId: qm.id,
                                    type: component.type,
                                    text: component.text,
                                    buttons: JSON.stringify(component?.buttons),
                                    format: component?.format,
                                    example: JSON.stringify(component?.example),
                                });
                            })
                        );
                    }
                } else {
                    const newQm = await CreateService({
                        shortcode: template.name,
                        message: template.name,
                        companyId,
                        userId,
                        geral: true,
                        isMedia: false,
                        mediaPath: null,
                        visao: true,
                        isOficial: true,
                        language: template.language,
                        status: template.status,
                        category: template.category,
                        metaID: template.id,
                        whatsappId: whatsapp.id,
                    } as any);

                    await Promise.all(
                        template.components.map(async component => {
                            await QuickMessageComponent.create({
                                quickMessageId: newQm.id,
                                type: component.type,
                                text: component.text,
                                buttons: JSON.stringify(component?.buttons),
                                format: component?.format,
                                example: JSON.stringify(component?.example),
                            });
                        })
                    );
                }
            })
        );
    }

    return res.status(200).json(data);
};
