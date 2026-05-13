import api from "../../services/api";

const useMetaTemplates = () => {

    const list = async (whatsappId) => {
        const { data } = await api.get(`/meta-templates/${whatsappId}`);
        return data;
    };

    const listLocal = async ({ companyId, userId }) => {
        const { data } = await api.get('/quick-messages/list', {
            params: { isOficial: 'true', companyId, userId }
        });
        return data;
    };

    const save = async (whatsappId, dto) => {
        const { data } = await api.post(`/meta-templates/${whatsappId}`, dto);
        return data;
    };

    const update = async (whatsappId, templateId, dto) => {
        const { data } = await api.put(`/meta-templates/${whatsappId}/${templateId}`, dto);
        return data;
    };

    const remove = async (whatsappId, templateName) => {
        const { data } = await api.delete(`/meta-templates/${whatsappId}/${encodeURIComponent(templateName)}`);
        return data;
    };

    const sync = async (whatsappId) => {
        const { data } = await api.post(`/meta-templates/${whatsappId}/sync`);
        return data;
    };

    const send = async (ticketId, templateId, variables, bodyToSave) => {
        const { data } = await api.post(`/messages-template/${ticketId}`, {
            templateId,
            variables,
            bodyToSave,
            fromMe: true,
            read: true,
        });
        return data;
    };

    return { list, listLocal, save, update, remove, sync, send };
};

export default useMetaTemplates;
