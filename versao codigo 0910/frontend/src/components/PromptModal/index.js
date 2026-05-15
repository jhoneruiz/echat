import React, { useState, useEffect, useContext } from "react";

import * as Yup from "yup";
import { Formik, Form, Field } from "formik";
import { toast } from "react-toastify";

import { makeStyles, useTheme } from "@material-ui/core/styles";
import {
  Button,
  TextField,
  Dialog,
  DialogContent,
  DialogTitle,
  CircularProgress,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  IconButton,
  Tabs,
  Tab,
  Box,
  Typography,
  Switch,
  Slider,
  Chip,
  InputAdornment,
  Divider,
} from "@material-ui/core";
import {
  Visibility,
  VisibilityOff,
  Close,
  Android as SmartToy,
  Send as SendIcon,
} from "@material-ui/icons";
import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import toastError from "../../errors/toastError";

const useStyles = makeStyles((theme) => ({
  dialogPaper: {
    borderRadius: 16,
    overflow: "hidden",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1.5),
    padding: theme.spacing(2),
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#FF6B35",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: "1.05rem",
    fontWeight: 600,
    lineHeight: 1.2,
  },
  headerSubtitle: {
    fontSize: "0.78rem",
    color: theme.palette.text.secondary,
    marginTop: 2,
  },
  closeButton: {
    marginLeft: "auto",
  },
  tabs: {
    borderBottom: `1px solid ${theme.palette.divider}`,
    "& .MuiTab-root": {
      minHeight: 44,
      fontSize: "0.85rem",
      textTransform: "none",
      fontWeight: 500,
    },
    "& .Mui-selected": {
      color: "#FF6B35",
    },
    "& .MuiTabs-indicator": {
      backgroundColor: "#FF6B35",
      height: 3,
    },
  },
  content: {
    padding: theme.spacing(2.5),
    minHeight: 380,
  },
  fieldLabel: {
    fontSize: "0.85rem",
    fontWeight: 500,
    marginBottom: theme.spacing(0.5),
    color: theme.palette.text.primary,
  },
  helperText: {
    fontSize: "0.72rem",
    color: theme.palette.text.secondary,
    marginTop: theme.spacing(0.5),
  },
  twoCol: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: theme.spacing(2),
    [theme.breakpoints.down("xs")]: {
      gridTemplateColumns: "1fr",
    },
  },
  fieldBlock: {
    marginBottom: theme.spacing(2),
  },
  switchRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: theme.spacing(1.25, 0),
  },
  langChips: {
    display: "flex",
    flexWrap: "wrap",
    gap: theme.spacing(0.75),
    marginBottom: theme.spacing(0.5),
  },
  langChipActive: {
    backgroundColor: "#22C55E",
    color: "#fff",
    fontWeight: 600,
    "&:hover": {
      backgroundColor: "#16A34A",
    },
  },
  langChip: {
    backgroundColor:
      theme.palette.type === "dark" ? "rgba(255,255,255,0.06)" : "#F1F5F9",
    color: theme.palette.text.primary,
    fontWeight: 500,
  },
  sliderRoot: {
    color: "#FF6B35",
  },
  saveButton: {
    backgroundColor: "#FF6B35",
    color: "#fff",
    textTransform: "none",
    fontWeight: 600,
    borderRadius: 8,
    padding: theme.spacing(1, 3),
    "&:hover": {
      backgroundColor: "#E55A2B",
    },
  },
  cancelButton: {
    textTransform: "none",
    fontWeight: 500,
    borderRadius: 8,
    padding: theme.spacing(1, 3),
  },
  footer: {
    padding: theme.spacing(2),
    borderTop: `1px solid ${theme.palette.divider}`,
    display: "flex",
    justifyContent: "flex-end",
    gap: theme.spacing(1),
  },
  testChat: {
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 12,
    minHeight: 240,
    padding: theme.spacing(2),
    backgroundColor:
      theme.palette.type === "dark" ? "rgba(255,255,255,0.03)" : "#FAFAFA",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    color: theme.palette.text.secondary,
    fontSize: "0.85rem",
    marginBottom: theme.spacing(2),
  },
  testInput: {
    display: "flex",
    gap: theme.spacing(1),
  },
  knowledgeBox: {
    border: `2px dashed ${theme.palette.divider}`,
    borderRadius: 12,
    padding: theme.spacing(4, 2),
    textAlign: "center",
    color: theme.palette.text.secondary,
    fontSize: "0.85rem",
  },
}));

const PromptSchema = Yup.object().shape({
  name: Yup.string().min(3, "Demasiado corto").max(100, "Demasiado largo").required("Nombre obligatorio"),
  prompt: Yup.string().min(10, "La personalidad debe tener al menos 10 caracteres").required("Personalidad obligatoria"),
  apiKey: Yup.string().required("API Key obligatoria"),
  queueId: Yup.number().typeError("Selecciona una cola").required("Selecciona una cola").nullable(),
});

// Mapeo de cada campo del schema al tab donde aparece, para auto-saltar al tab con error.
const FIELD_TO_TAB = {
  name: 0,
  prompt: 0,
  apiKey: 0,
  queueId: 1,
};

const FUNCTIONS = [
  { value: "general", label: "General — Asistente multiusos" },
  { value: "sales", label: "Ventas — Calificación de leads" },
  { value: "support", label: "Soporte — Resolución de dudas" },
  { value: "scheduling", label: "Agendamiento — Reservas y citas" },
  { value: "qualification", label: "Cualificación — Pre-filtro" },
];

const TONES = [
  { value: "friendly", label: "😊 Amigable" },
  { value: "professional", label: "👔 Profesional" },
  { value: "formal", label: "🎩 Formal" },
  { value: "casual", label: "🙂 Casual" },
  { value: "empathetic", label: "💝 Empático" },
];

const MODELS = [
  { value: "gpt-4o-mini", label: "GPT-4o Mini", desc: "Recomendado — Económico, rápido y multilingüe" },
  { value: "gpt-4.1-mini", label: "GPT-4.1 Mini", desc: "Mini de nueva generación, mejor seguimiento de instrucciones" },
  { value: "gpt-4o", label: "GPT-4o", desc: "Más capaz, multimodal" },
  { value: "gpt-4.1", label: "GPT-4.1", desc: "Última generación 4.x, mayor calidad" },
  { value: "gpt-5.1-mini", label: "GPT-5.1 Mini", desc: "Última generación 5.x económica" },
  { value: "gpt-5.1", label: "GPT-5.1", desc: "Razonamiento avanzado (costo mayor)" },
  { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo", desc: "Legado — más rápido, calidad menor" },
];

const LANGUAGES = [
  { code: "pt-BR", flag: "🇧🇷", label: "Português (BR)" },
  { code: "en", flag: "🇺🇸", label: "English" },
  { code: "es", flag: "🇪🇸", label: "Español" },
  { code: "fr", flag: "🇫🇷", label: "Français" },
  { code: "de", flag: "🇩🇪", label: "Deutsch" },
  { code: "it", flag: "🇮🇹", label: "Italiano" },
  { code: "auto", flag: "🌐", label: "Auto" },
];

function TabPanel({ children, value, index }) {
  return value === index ? <Box>{children}</Box> : null;
}

const initialState = {
  name: "",
  prompt: "",
  apiKey: "",
  queueId: null,
  maxTokens: 2000,
  temperature: 1,
  maxMessages: 10,
  voice: "texto",
  voiceKey: "",
  voiceRegion: "",
  model: "gpt-4o-mini",
  agentFunction: "general",
  tone: "friendly",
  languages: "es",
  isActive: true,
  initialMessage: "¡Hola! ¿Cómo puedo ayudarte?",
  responseRules: "",
  allowTransfer: true,
  transferKeywords: "agente, salir, hablar con humano, humano",
  transferMessage:
    "Disculpa, no tengo información sobre este tema. Te transferiré a un agente.",
  responseDelay: 1,
  charLimit: 2000,
  humanize: true,
  useAudio: false,
  knowledge: "",
};

const PromptModal = ({ open, onClose, promptId }) => {
  const classes = useStyles();
  const theme = useTheme();
  const [tab, setTab] = useState(0);
  const [showApiKey, setShowApiKey] = useState(false);
  const [prompt, setPrompt] = useState(initialState);
  const [queues, setQueues] = useState([]);
  // Test chat
  const [testMessages, setTestMessages] = useState([]);
  const [testInput, setTestInput] = useState("");
  const [testLoading, setTestLoading] = useState(false);

  useEffect(() => {
    const loadQueues = async () => {
      try {
        const { data } = await api.get("/queue");
        setQueues(data);
      } catch (err) {
        // silent
      }
    };
    if (open) loadQueues();
  }, [open]);

  useEffect(() => {
    const fetchPrompt = async () => {
      if (!promptId) {
        setPrompt(initialState);
        setTab(0);
        return;
      }
      try {
        const { data } = await api.get(`/prompt/${promptId}`);
        setPrompt({ ...initialState, ...data });
      } catch (err) {
        toastError(err);
      }
    };
    if (open) fetchPrompt();
  }, [promptId, open]);

  const handleClose = () => {
    setPrompt(initialState);
    setTab(0);
    setTestMessages([]);
    setTestInput("");
    onClose();
  };

  const handleSendTestMessage = async (values) => {
    if (!testInput.trim()) return;
    if (!values.apiKey || !values.prompt) {
      toast.error("Configura API Key y Personalidad en la pestaña 'Básico' antes de probar.");
      setTab(0);
      return;
    }
    const userMsg = testInput.trim();
    setTestMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setTestInput("");
    setTestLoading(true);
    try {
      const { data } = await api.post("/prompt/test", {
        apiKey: values.apiKey,
        model: values.model,
        prompt: values.prompt,
        message: userMsg,
        maxTokens: values.maxTokens,
        temperature: values.temperature,
        tone: values.tone,
        agentFunction: values.agentFunction,
        languages: values.languages,
        responseRules: values.responseRules,
        knowledge: values.knowledge,
      });
      setTestMessages((prev) => [...prev, { role: "assistant", content: data.response || "(sin respuesta)" }]);
    } catch (err) {
      const errMsg = err?.response?.data?.error || err.message || "Error desconocido";
      setTestMessages((prev) => [...prev, { role: "error", content: errMsg }]);
    } finally {
      setTestLoading(false);
    }
  };

  const handleSavePrompt = async (values) => {
    if (!values.queueId) {
      toastError("Selecciona una cola para el agente");
      return;
    }
    try {
      const data = { ...values };
      if (promptId) {
        await api.put(`/prompt/${promptId}`, data);
        toast.success("Agente actualizado");
      } else {
        await api.post("/prompt", data);
        toast.success("Agente creado");
      }
    } catch (err) {
      toastError(err);
    }
    handleClose();
  };

  const toggleLanguage = (values, setFieldValue, code) => {
    const current = (values.languages || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const has = current.includes(code);
    const next = has ? current.filter((c) => c !== code) : [...current, code];
    setFieldValue("languages", next.join(","));
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      classes={{ paper: classes.dialogPaper }}
    >
      <Formik
        initialValues={prompt}
        enableReinitialize
        validationSchema={PromptSchema}
        onSubmit={(values, actions) => {
          setTimeout(() => {
            handleSavePrompt(values);
            actions.setSubmitting(false);
          }, 300);
        }}
      >
        {({ values, setFieldValue, isSubmitting, touched, errors, submitForm, validateForm, setTouched }) => (
          <Form>
            <Box className={classes.header}>
              <Box className={classes.headerIcon}>
                <SmartToy />
              </Box>
              <Box>
                <Typography className={classes.headerTitle}>
                  {promptId ? "Editar Agente" : "Crear Agente"}
                </Typography>
                <Typography className={classes.headerSubtitle}>
                  Configure los parámetros del agente de IA
                </Typography>
              </Box>
              <IconButton className={classes.closeButton} onClick={handleClose} size="small">
                <Close />
              </IconButton>
            </Box>

            <Tabs
              value={tab}
              onChange={(_, v) => setTab(v)}
              variant="scrollable"
              scrollButtons="auto"
              className={classes.tabs}
            >
              <Tab label="Básico" />
              <Tab label="Comportamiento" />
              <Tab label="Avanzado" />
              <Tab label="Conocimiento" />
              <Tab label="Probar" />
            </Tabs>

            <DialogContent className={classes.content}>
              {/* TAB 1: BÁSICO */}
              <TabPanel value={tab} index={0}>
                <Box className={classes.twoCol}>
                  <Box>
                    <Typography className={classes.fieldLabel}>
                      Nombre del Agente *
                    </Typography>
                    <Field
                      as={TextField}
                      name="name"
                      placeholder="Ej: Asistente de Ventas"
                      variant="outlined"
                      fullWidth
                      size="small"
                      error={touched.name && Boolean(errors.name)}
                      helperText={touched.name && errors.name}
                    />
                  </Box>
                  <Box>
                    <Typography className={classes.fieldLabel}>Función</Typography>
                    <FormControl variant="outlined" fullWidth size="small">
                      <Field as={Select} name="agentFunction">
                        {FUNCTIONS.map((f) => (
                          <MenuItem key={f.value} value={f.value}>
                            {f.label}
                          </MenuItem>
                        ))}
                      </Field>
                    </FormControl>
                  </Box>
                </Box>

                <Box className={classes.twoCol} mt={2}>
                  <Box>
                    <Typography className={classes.fieldLabel}>Tono de Voz</Typography>
                    <FormControl variant="outlined" fullWidth size="small">
                      <Field as={Select} name="tone">
                        {TONES.map((t) => (
                          <MenuItem key={t.value} value={t.value}>
                            {t.label}
                          </MenuItem>
                        ))}
                      </Field>
                    </FormControl>
                  </Box>
                  <Box>
                    <Typography className={classes.fieldLabel}>Modelo de IA</Typography>
                    <FormControl variant="outlined" fullWidth size="small">
                      <Field as={Select} name="model">
                        {MODELS.map((m) => (
                          <MenuItem key={m.value} value={m.value}>
                            <Box>
                              <Typography style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                                {m.label}
                              </Typography>
                              <Typography style={{ fontSize: "0.7rem", color: "#666" }}>
                                {m.desc}
                              </Typography>
                            </Box>
                          </MenuItem>
                        ))}
                      </Field>
                    </FormControl>
                  </Box>
                </Box>

                <Box mt={2}>
                  <Typography className={classes.fieldLabel}>API Key *</Typography>
                  <Field
                    as={TextField}
                    name="apiKey"
                    placeholder="sk-..."
                    type={showApiKey ? "text" : "password"}
                    variant="outlined"
                    fullWidth
                    size="small"
                    error={touched.apiKey && Boolean(errors.apiKey)}
                    helperText={touched.apiKey && errors.apiKey}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => setShowApiKey((s) => !s)}>
                            {showApiKey ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>

                <Box mt={2}>
                  <Typography className={classes.fieldLabel}>
                    🌐 Idiomas de respuesta
                  </Typography>
                  <Box className={classes.langChips}>
                    {LANGUAGES.map((lang) => {
                      const active = (values.languages || "")
                        .split(",")
                        .map((c) => c.trim())
                        .includes(lang.code);
                      return (
                        <Chip
                          key={lang.code}
                          label={`${lang.flag} ${lang.label}`}
                          size="small"
                          onClick={() => toggleLanguage(values, setFieldValue, lang.code)}
                          className={active ? classes.langChipActive : classes.langChip}
                        />
                      );
                    })}
                  </Box>
                  <Typography className={classes.helperText}>
                    Selecciona los idiomas en los que la IA puede responder. Use "Auto"
                    para responder en el idioma del cliente automáticamente.
                  </Typography>
                </Box>

                <Box mt={2}>
                  <Typography className={classes.fieldLabel}>Personalidad *</Typography>
                  <Field
                    as={TextField}
                    name="prompt"
                    placeholder="Describe la personalidad, conocimientos y habilidades del agente"
                    multiline
                    rows={3}
                    variant="outlined"
                    fullWidth
                    error={touched.prompt && Boolean(errors.prompt)}
                    helperText={
                      (touched.prompt && errors.prompt) ||
                      "Describe la personalidad, conocimientos y habilidades del agente"
                    }
                  />
                </Box>

                <Divider style={{ margin: "16px 0" }} />

                <Box className={classes.switchRow}>
                  <Typography className={classes.fieldLabel} style={{ marginBottom: 0 }}>
                    Agente Activo
                  </Typography>
                  <Switch
                    checked={Boolean(values.isActive)}
                    onChange={(e) => setFieldValue("isActive", e.target.checked)}
                    style={{ color: "#FF6B35" }}
                  />
                </Box>
              </TabPanel>

              {/* TAB 2: COMPORTAMIENTO */}
              <TabPanel value={tab} index={1}>
                <Box className={classes.fieldBlock}>
                  <Typography className={classes.fieldLabel}>
                    Mensaje Inicial (opcional)
                  </Typography>
                  <Field
                    as={TextField}
                    name="initialMessage"
                    placeholder="¡Hola! ¿Cómo puedo ayudarte?"
                    multiline
                    rows={2}
                    variant="outlined"
                    fullWidth
                  />
                  <Typography className={classes.helperText}>
                    Mensaje enviado automáticamente cuando el agente inicia una conversación
                  </Typography>
                </Box>

                <Box className={classes.fieldBlock}>
                  <Typography className={classes.fieldLabel}>Reglas de Respuesta</Typography>
                  <Field
                    as={TextField}
                    name="responseRules"
                    placeholder="Liste reglas específicas que el agente debe seguir"
                    multiline
                    rows={3}
                    variant="outlined"
                    fullWidth
                  />
                  <Typography className={classes.helperText}>
                    Liste reglas específicas que el agente debe seguir
                  </Typography>
                </Box>

                <Box className={classes.switchRow}>
                  <Typography className={classes.fieldLabel} style={{ marginBottom: 0 }}>
                    Permitir transferencia a agente
                  </Typography>
                  <Switch
                    checked={Boolean(values.allowTransfer)}
                    onChange={(e) => setFieldValue("allowTransfer", e.target.checked)}
                    style={{ color: "#FF6B35" }}
                  />
                </Box>

                {values.allowTransfer && (
                  <>
                    <Box className={classes.fieldBlock}>
                      <Typography className={classes.fieldLabel}>
                        Palabras clave para transferencia
                      </Typography>
                      <Field
                        as={TextField}
                        name="transferKeywords"
                        variant="outlined"
                        fullWidth
                        size="small"
                      />
                      <Typography className={classes.helperText}>
                        Separe por coma. Cuando se detecten, la IA transfiere a un agente
                      </Typography>
                    </Box>

                    <Box className={classes.fieldBlock}>
                      <Typography className={classes.fieldLabel}>
                        Mensaje al transferir
                      </Typography>
                      <Field
                        as={TextField}
                        name="transferMessage"
                        multiline
                        rows={2}
                        variant="outlined"
                        fullWidth
                      />
                    </Box>
                  </>
                )}

                <Box className={classes.fieldBlock}>
                  <Typography className={classes.fieldLabel}>Cola *</Typography>
                  <FormControl
                    variant="outlined"
                    fullWidth
                    size="small"
                    error={touched.queueId && Boolean(errors.queueId)}
                  >
                    <Field
                      as={Select}
                      name="queueId"
                      value={values.queueId || ""}
                      displayEmpty
                    >
                      <MenuItem value="" disabled>
                        Selecciona una cola
                      </MenuItem>
                      {queues.map((q) => (
                        <MenuItem key={q.id} value={q.id}>
                          {q.name}
                        </MenuItem>
                      ))}
                    </Field>
                    {touched.queueId && errors.queueId && (
                      <Typography variant="caption" style={{ color: "#f44336", marginTop: 4 }}>
                        {errors.queueId}
                      </Typography>
                    )}
                  </FormControl>
                </Box>
              </TabPanel>

              {/* TAB 3: AVANZADO */}
              <TabPanel value={tab} index={2}>
                <Box className={classes.fieldBlock}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography className={classes.fieldLabel}>
                      Retraso de Respuesta: {values.responseDelay}s
                    </Typography>
                    <IconButton size="small" onClick={() => setFieldValue("responseDelay", 1)}>
                      <i className="material-icons" style={{ fontSize: 18 }}>refresh</i>
                    </IconButton>
                  </Box>
                  <Slider
                    value={Number(values.responseDelay) || 0}
                    onChange={(_, v) => setFieldValue("responseDelay", v)}
                    min={0}
                    max={10}
                    step={1}
                    className={classes.sliderRoot}
                  />
                  <Typography className={classes.helperText}>
                    Tiempo de espera antes de enviar la respuesta (simula escritura)
                  </Typography>
                </Box>

                <Box className={classes.fieldBlock}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography className={classes.fieldLabel}>
                      Límite de caracteres: {values.charLimit}
                    </Typography>
                    <Switch
                      checked={values.charLimit > 0}
                      onChange={(e) =>
                        setFieldValue("charLimit", e.target.checked ? 2000 : 0)
                      }
                      style={{ color: "#FF6B35" }}
                    />
                  </Box>
                  <Slider
                    value={Number(values.charLimit) || 0}
                    onChange={(_, v) => setFieldValue("charLimit", v)}
                    min={0}
                    max={4000}
                    step={100}
                    className={classes.sliderRoot}
                    disabled={!values.charLimit}
                  />
                  <Typography className={classes.helperText}>
                    Tamaño máximo de la respuesta del agente
                  </Typography>
                </Box>

                <Box className={classes.switchRow}>
                  <Box>
                    <Typography className={classes.fieldLabel} style={{ marginBottom: 0 }}>
                      ✨ Humanizar conversación
                    </Typography>
                    <Typography className={classes.helperText}>
                      Alterna entre primer nombre, nombre completo y sin nombre
                    </Typography>
                  </Box>
                  <Switch
                    checked={Boolean(values.humanize)}
                    onChange={(e) => setFieldValue("humanize", e.target.checked)}
                    style={{ color: "#FF6B35" }}
                  />
                </Box>

                <Box className={classes.switchRow}>
                  <Typography className={classes.fieldLabel} style={{ marginBottom: 0 }}>
                    🔊 Recursos de Audio
                  </Typography>
                  <Switch
                    checked={Boolean(values.useAudio)}
                    onChange={(e) => setFieldValue("useAudio", e.target.checked)}
                    style={{ color: "#FF6B35" }}
                  />
                </Box>

                <Divider style={{ margin: "12px 0" }} />

                <Box className={classes.fieldBlock}>
                  <Typography className={classes.fieldLabel}>Temperatura</Typography>
                  <Field
                    as={TextField}
                    name="temperature"
                    type="number"
                    inputProps={{ min: 0, max: 2, step: 0.1 }}
                    variant="outlined"
                    fullWidth
                    size="small"
                  />
                  <Typography className={classes.helperText}>
                    0 = preciso, 2 = creativo
                  </Typography>
                </Box>

                <Box className={classes.twoCol}>
                  <Box>
                    <Typography className={classes.fieldLabel}>Max Tokens</Typography>
                    <Field
                      as={TextField}
                      name="maxTokens"
                      type="number"
                      variant="outlined"
                      fullWidth
                      size="small"
                    />
                  </Box>
                  <Box>
                    <Typography className={classes.fieldLabel}>Max Mensajes</Typography>
                    <Field
                      as={TextField}
                      name="maxMessages"
                      type="number"
                      variant="outlined"
                      fullWidth
                      size="small"
                    />
                  </Box>
                </Box>
              </TabPanel>

              {/* TAB 4: CONOCIMIENTO */}
              <TabPanel value={tab} index={3}>
                <Typography className={classes.fieldLabel}>Base de Conocimiento</Typography>
                <Typography className={classes.helperText} style={{ marginBottom: 12 }}>
                  Pega aquí información de referencia (precios, políticas, FAQs, catálogo,
                  horarios, etc.) que el agente usará como contexto para responder.
                </Typography>
                <Field
                  as={TextField}
                  name="knowledge"
                  placeholder="Ejemplo:&#10;HORARIO DE ATENCIÓN: Lunes a Viernes 9:00 a 18:00, Sábados 9:00 a 14:00.&#10;DIRECCIÓN: Av. Reforma 123, CDMX.&#10;PRECIOS:&#10;  - Servicio básico: $500&#10;  - Servicio premium: $1,200&#10;FAQ:&#10;  - ¿Aceptan tarjetas? Sí, todas las marcas.&#10;  - ¿Hacen envíos? Sí, a toda la república."
                  multiline
                  rows={12}
                  variant="outlined"
                  fullWidth
                />
                <Typography className={classes.helperText} style={{ marginTop: 8 }}>
                  💡 Se incluye automáticamente en cada conversación. Mantén el texto conciso
                  (máx ~2000 palabras). Subida de archivos PDF/URLs próximamente.
                </Typography>
              </TabPanel>

              {/* TAB 5: PROBAR */}
              <TabPanel value={tab} index={4}>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  <FormControl variant="outlined" size="small" style={{ minWidth: 160 }}>
                    <InputLabel>Modelo</InputLabel>
                    <Field as={Select} name="model" label="Modelo">
                      {MODELS.map((m) => (
                        <MenuItem key={m.value} value={m.value}>
                          {m.label}
                        </MenuItem>
                      ))}
                    </Field>
                  </FormControl>
                  <Typography variant="caption" color="textSecondary">
                    Usa la config actual del formulario (sin necesidad de guardar)
                  </Typography>
                </Box>

                <Box
                  className={classes.testChat}
                  style={{
                    maxHeight: 280,
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    padding: 12,
                    background: theme.palette.type === "dark" ? "rgba(255,255,255,0.03)" : "#F8FAFC",
                    borderRadius: 10,
                  }}
                >
                  {testMessages.length === 0 ? (
                    <Typography variant="caption" color="textSecondary" align="center">
                      ✉️ Envía un mensaje para probar tu Agente de IA
                    </Typography>
                  ) : (
                    testMessages.map((m, idx) => (
                      <Box
                        key={idx}
                        style={{
                          alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                          maxWidth: "85%",
                          padding: "8px 12px",
                          borderRadius: 12,
                          background:
                            m.role === "user"
                              ? "#FF6B35"
                              : m.role === "error"
                              ? "#FEE2E2"
                              : theme.palette.type === "dark"
                              ? "rgba(255,255,255,0.08)"
                              : "#fff",
                          color:
                            m.role === "user"
                              ? "#fff"
                              : m.role === "error"
                              ? "#B91C1C"
                              : theme.palette.text.primary,
                          border:
                            m.role === "assistant"
                              ? `1px solid ${theme.palette.divider}`
                              : undefined,
                          whiteSpace: "pre-wrap",
                          fontSize: "0.85rem",
                          lineHeight: 1.4,
                        }}
                      >
                        {m.content}
                      </Box>
                    ))
                  )}
                  {testLoading && (
                    <Box style={{ alignSelf: "flex-start", padding: 8 }}>
                      <CircularProgress size={18} style={{ color: "#FF6B35" }} />
                    </Box>
                  )}
                </Box>

                <Box className={classes.testInput} display="flex" alignItems="center" gap={1} mt={2}>
                  <TextField
                    placeholder="Escribe tu mensaje de prueba..."
                    variant="outlined"
                    fullWidth
                    size="small"
                    value={testInput}
                    onChange={(e) => setTestInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendTestMessage(values);
                      }
                    }}
                    disabled={testLoading}
                  />
                  <IconButton
                    style={{ color: "#FF6B35" }}
                    onClick={() => handleSendTestMessage(values)}
                    disabled={testLoading || !testInput.trim()}
                  >
                    <SendIcon />
                  </IconButton>
                </Box>
                <Typography className={classes.helperText} style={{ marginTop: 8 }}>
                  El test usa la API Key y configuración que tengas en este momento — sin necesidad de guardar.
                </Typography>
              </TabPanel>
            </DialogContent>

            <Box className={classes.footer}>
              <Button
                onClick={handleClose}
                variant="outlined"
                className={classes.cancelButton}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="contained"
                className={classes.saveButton}
                disabled={isSubmitting}
                onClick={async () => {
                  const validationErrors = await validateForm();
                  if (Object.keys(validationErrors).length > 0) {
                    // Marcar todos los campos como tocados para que se vean errores inline
                    setTouched(
                      Object.keys(validationErrors).reduce((acc, k) => ({ ...acc, [k]: true }), {})
                    );
                    // Saltar al tab del primer error y mostrar toast
                    const firstField = Object.keys(validationErrors)[0];
                    const targetTab = FIELD_TO_TAB[firstField] ?? 0;
                    setTab(targetTab);
                    toast.error(`${validationErrors[firstField]}`);
                    return;
                  }
                  submitForm();
                }}
              >
                {isSubmitting ? <CircularProgress size={20} color="inherit" /> : "Guardar"}
              </Button>
            </Box>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
};

export default PromptModal;
