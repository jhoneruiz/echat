import React, { useState, useEffect, useContext } from 'react';
import {
    Modal,
    Box,
    TextField,
    Typography,
    IconButton,
    List,
    ListItem,
    ListItemText,
    Button,
    CircularProgress,
    Chip,
} from '@material-ui/core';
import SearchIcon from '@material-ui/icons/Search';
import { makeStyles } from '@material-ui/core/styles';
import { toast } from 'react-toastify';
import { AuthContext } from '../../context/Auth/AuthContext';
import useMetaTemplates from '../../hooks/useMetaTemplates';
import toastError from '../../errors/toastError';

const useStyles = makeStyles((theme) => ({
    modal: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalContent: {
        width: '80%',
        maxHeight: '80%',
        backgroundColor: theme.palette.background.paper,
        padding: theme.spacing(2),
        borderRadius: theme.shape.borderRadius,
        overflowY: 'auto',
    },
    searchContainer: {
        display: 'flex',
        alignItems: 'center',
        marginBottom: theme.spacing(2),
    },
    searchInput: {
        marginLeft: theme.spacing(1),
        flex: 1,
    },
    templateItem: {
        backgroundColor: theme.palette.type === 'dark'
            ? theme.palette.grey[800]
            : theme.palette.grey[100],
        padding: theme.spacing(2),
        borderRadius: theme.shape.borderRadius,
        marginBottom: theme.spacing(1),
        cursor: 'pointer',
        '&:hover': {
            backgroundColor: theme.palette.type === 'dark'
                ? theme.palette.grey[700]
                : theme.palette.grey[200],
        },
    },
    templateInfo: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statusChip: {
        marginLeft: theme.spacing(1),
    },
}));

const STATUS_COLOR = {
    APPROVED: 'primary',
    REJECTED: 'secondary',
    PENDING: 'default',
};

const TemplateMetaModal = ({ open, handleClose, ticketId, whatsappId }) => {
    const classes = useStyles();
    const { user } = useContext(AuthContext);
    const { listLocal, send } = useMetaTemplates();

    const [search, setSearch] = useState('');
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [variables, setVariables] = useState({});
    const [variableValues, setVariableValues] = useState({});
    const [renderedContent, setRenderedContent] = useState('');

    useEffect(() => {
        if (open) {
            loadTemplates();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const loadTemplates = async () => {
        setLoading(true);
        try {
            const data = await listLocal({ companyId: user.companyId, userId: user.id });
            const approved = (data || []).filter(t => t.status === 'APPROVED');
            setTemplates(approved);
        } catch (err) {
            toastError(err);
        } finally {
            setLoading(false);
        }
    };

    const extractVariablesByComponent = (components) => {
        const regex = /{{(\d+)}}/g;
        const vars = { header: [], body: [], footer: [], buttons: [] };

        (components || []).forEach((component) => {
            const type = component.type?.toLowerCase();
            const text = component.text || '';

            if (type === 'header' && ['IMAGE', 'VIDEO'].includes(component?.format)) {
                vars[type] = vars[type] || [];
                vars[type].push({
                    type: component.format.toLowerCase(),
                    prompt: component.format === 'IMAGE' ? 'URL de la imagen' : 'URL del video',
                });
            } else if (type === 'buttons') {
                const buttons = JSON.parse(component.buttons || '[]');
                buttons.forEach((button, index) => {
                    if (button.example) {
                        vars[type].push({ type: button.type, prompt: button.example, index });
                    }
                });
            } else if (vars[type] !== undefined) {
                let match;
                const re = /{{(\d+)}}/g;
                while ((match = re.exec(text)) !== null) {
                    vars[type].push({ type: 'text', prompt: match[0] });
                }
            }
        });
        return vars;
    };

    const handleSelectTemplate = (template) => {
        const components = template?.components || [];
        const extracted = extractVariablesByComponent(components);
        setSelectedTemplate(template);
        setVariables(extracted);
        setVariableValues({});
        setRenderedContent(components.map(c => c?.text).filter(Boolean).join('\n'));
    };

    const handleVariableChange = (componentType, index, value, buttonIndex) => {
        const updated = {
            ...variableValues,
            [componentType]: {
                ...variableValues[componentType],
                [index]: { value, buttonIndex },
            },
        };
        setVariableValues(updated);
    };

    const generateBodyToSave = () => {
        let body = renderedContent;
        Object.keys(variableValues).forEach((type) => {
            const vals = variableValues[type];
            if (type === 'header') {
                Object.keys(vals).forEach((key) => {
                    const val = vals[key]?.value || '';
                    if (val.startsWith('http')) {
                        body = `${val}\n${body}`;
                    } else {
                        body = body.replace(/{{(\d+)}}/, val);
                    }
                });
            } else {
                Object.keys(vals).forEach((_, i) => {
                    const val = vals[i]?.value || '';
                    body = body.replace(`{{${i + 1}}}`, val);
                });
            }
        });
        return body;
    };

    const handleSend = async () => {
        if (!selectedTemplate || !ticketId) return;
        setSending(true);
        try {
            const bodyToSave = generateBodyToSave();
            await send(ticketId, selectedTemplate.id, variableValues, bodyToSave);
            toast.success('Plantilla enviada correctamente');
            handleClose();
            setSelectedTemplate(null);
            setVariableValues({});
        } catch (err) {
            toastError(err);
        } finally {
            setSending(false);
        }
    };

    const filteredTemplates = templates.filter(t =>
        t?.shortcode?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <Modal
            open={open}
            onClose={handleClose}
            className={classes.modal}
            aria-labelledby="template-modal-title"
        >
            <Box className={classes.modalContent}>
                <Typography variant="h6" id="template-modal-title">
                    Plantillas de WhatsApp
                </Typography>

                {!selectedTemplate && (
                    <>
                        <div className={classes.searchContainer}>
                            <SearchIcon />
                            <TextField
                                variant="outlined"
                                placeholder="Buscar plantillas..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className={classes.searchInput}
                                size="small"
                            />
                        </div>

                        {loading ? (
                            <Box display="flex" justifyContent="center" p={2}>
                                <CircularProgress />
                            </Box>
                        ) : (
                            <List disablePadding>
                                {filteredTemplates.length === 0 && (
                                    <Typography variant="body2" color="textSecondary" align="center">
                                        No hay plantillas aprobadas disponibles
                                    </Typography>
                                )}
                                {filteredTemplates.map((template) => (
                                    <ListItem
                                        key={template.id}
                                        className={classes.templateItem}
                                        onClick={() => handleSelectTemplate(template)}
                                        disableGutters
                                    >
                                        <ListItemText
                                            primary={
                                                <div className={classes.templateInfo}>
                                                    <Typography variant="body1">
                                                        <strong>{template.shortcode}</strong>
                                                    </Typography>
                                                    <Box display="flex" alignItems="center">
                                                        <Typography variant="body2" color="textSecondary">
                                                            {template.language}
                                                        </Typography>
                                                        <Chip
                                                            size="small"
                                                            label={template.status}
                                                            color={STATUS_COLOR[template.status] || 'default'}
                                                            className={classes.statusChip}
                                                        />
                                                    </Box>
                                                </div>
                                            }
                                            secondary={
                                                <>
                                                    <Typography variant="body2" component="span">
                                                        {template?.components?.map(c => c?.text).filter(Boolean).join(' · ')}
                                                    </Typography>
                                                    <Typography variant="caption" color="textSecondary" component="div">
                                                        Categoría: {template.category}
                                                    </Typography>
                                                </>
                                            }
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        )}
                    </>
                )}

                {selectedTemplate && (
                    <Box mt={1}>
                        <Typography variant="h6">
                            {selectedTemplate.shortcode}
                        </Typography>
                        <Typography variant="body2" gutterBottom>
                            {renderedContent}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                            Idioma: {selectedTemplate.language} · Categoría: {selectedTemplate.category}
                        </Typography>

                        {Object.keys(variables).map((componentType) => (
                            variables[componentType].length > 0 && (
                                <Box key={componentType} mt={1}>
                                    <Typography variant="subtitle2">
                                        {componentType.toUpperCase()}
                                    </Typography>
                                    {variables[componentType].map((variable, idx) => (
                                        <TextField
                                            key={`${componentType}-${idx}`}
                                            label={variable?.prompt}
                                            value={variableValues[componentType]?.[idx]?.value || ''}
                                            onChange={e => handleVariableChange(componentType, idx, e.target.value, variable?.index || 0)}
                                            fullWidth
                                            margin="dense"
                                            variant="outlined"
                                            size="small"
                                        />
                                    ))}
                                </Box>
                            )
                        ))}

                        <Box mt={2} display="flex" gridGap={8}>
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={handleSend}
                                disabled={sending}
                                fullWidth
                            >
                                {sending ? <CircularProgress size={20} /> : 'Enviar plantilla'}
                            </Button>
                            <Button
                                variant="outlined"
                                onClick={() => {
                                    setSelectedTemplate(null);
                                    setVariableValues({});
                                }}
                                fullWidth
                            >
                                Volver
                            </Button>
                        </Box>
                    </Box>
                )}
            </Box>
        </Modal>
    );
};

export default TemplateMetaModal;
