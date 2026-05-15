import React, { useState, useEffect, useContext, useRef } from "react";

import * as Yup from "yup";
import { Formik, Form, Field } from "formik";
import { toast } from "react-toastify";

import { makeStyles } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import CircularProgress from "@material-ui/core/CircularProgress";
import Select from "@material-ui/core/Select";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import FormControl from "@material-ui/core/FormControl";
import whatsappIcon from "../../assets/nopicture.png";
import { i18n } from "../../translate/i18n";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import QueueSelect from "../QueueSelect";
import { AuthContext } from "../../context/Auth/AuthContext";
import useWhatsApps from "../../hooks/useWhatsApps";

import { Can } from "../Can";
import {
  Avatar,
  Grid,
  Input,
  Paper,
  Tab,
  Tabs,
  Switch,
  Typography,
  Box,
  Divider,
} from "@material-ui/core";
import { getBackendUrl } from "../../config";
import TabPanel from "../TabPanel";
import AvatarUploader from "../AvatarUpload";

const backendUrl = getBackendUrl();

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexWrap: "wrap",
  },
  multFieldLine: {
    display: "flex",
    "& > *:not(:last-child)": {
      marginRight: theme.spacing(1),
    },
  },
  btnWrapper: {
    position: "relative",
  },
  buttonProgress: {
    color: green[500],
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -12,
    marginLeft: -12,
  },
  formControl: {
    margin: theme.spacing(1),
    minWidth: 120,
  },
  textField: {
    marginRight: theme.spacing(1),
    flex: 1,
  },
  container: {
    display: "flex",
    flexWrap: "wrap",
  },
  avatar: {
    width: theme.spacing(12),
    height: theme.spacing(12),
    margin: theme.spacing(2),
    cursor: "pointer",
    borderRadius: "50%",
    border: "2px solid #ccc",
  },
  updateDiv: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  updateInput: {
    display: "none",
  },
  updateLabel: {
    padding: theme.spacing(1),
    margin: theme.spacing(1),
    textTransform: "uppercase",
    textAlign: "center",
    cursor: "pointer",
    border: "2px solid #ccc",
    borderRadius: "5px",
    minWidth: 160,
    fontWeight: "bold",
    color: "#555",
  },
  errorUpdate: {
    border: "2px solid red",
  },
  errorText: {
    color: "red",
    fontSize: "0.8rem",
    fontWeight: "bold",
  },
}));

const UserSchema = Yup.object().shape({
  name: Yup.string()
    .min(2, "Too Short!")
    .max(50, "Too Long!")
    .required("Required"),
  password: Yup.string().min(5, "Too Short!").max(50, "Too Long!"),
  email: Yup.string().email("Invalid email").required("Required"),
  allHistoric: Yup.string().nullable(),
});

const formatDateForInput = (date) => {
  if (!date) return '';
  const d = new Date(date);
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
};

const parseDateFromInput = (dateString) => {
  if (!dateString) return null;
  return dateString;
};

// Definición de los 14 permisos del agente con su descripción.
// onValue/offValue mantienen los valores legacy esperados por el backend.
const PERMISSIONS = [
  {
    key: "allTicket",
    icon: "🎫",
    title: "Ver todos los tickets",
    desc: "Permite al agente ver tickets de TODOS los usuarios, no solo los suyos. Útil para supervisores o cuando un agente debe poder tomar tickets de cualquier cola.",
    onValue: "enable",
    offValue: "disable",
  },
  {
    key: "allowGroup",
    icon: "👥",
    title: "Permitir grupos de WhatsApp",
    desc: "Permite que este agente vea y atienda chats de grupos de WhatsApp. Si está deshabilitado, solo verá chats individuales (1 a 1).",
    onValue: true,
    offValue: false,
  },
  {
    key: "allHistoric",
    icon: "📜",
    title: "Ver historial de tickets cerrados",
    desc: "Cuando un cliente vuelve a escribir, el agente puede ver el historial de tickets cerrados anteriores. Útil para dar continuidad a la conversación.",
    onValue: "enabled",
    offValue: "disabled",
  },
  {
    key: "allUserChat",
    icon: "💬",
    title: "Ver chats de todos los agentes",
    desc: "Permite que este agente vea los chats internos entre TODOS los agentes (no solo en los que él participa). Generalmente solo para supervisores.",
    onValue: "enabled",
    offValue: "disabled",
  },
  {
    key: "userClosePendingTicket",
    icon: "✖️",
    title: "Cerrar tickets pendientes",
    desc: "Permite cerrar tickets que están en estado 'pendiente' (sin aceptar todavía). Útil para limpiar la cola de tickets sin respuesta.",
    onValue: "enabled",
    offValue: "disabled",
  },
  {
    key: "allowSeeMessagesInPendingTickets",
    icon: "👁️",
    title: "Ver mensajes en tickets pendientes",
    desc: "Permite ver el contenido de los mensajes de tickets que aún no han sido aceptados. Si está deshabilitado, solo se ve quién escribió pero no qué.",
    onValue: "enabled",
    offValue: "disabled",
  },
  {
    key: "mobileNotifications",
    icon: "🔔",
    title: "Notificaciones push móvil",
    desc: "Recibe notificaciones push en el celular/PWA cuando llegan nuevos mensajes. Por defecto está apagado para no saturar al agente.",
    onValue: "enabled",
    offValue: "disabled",
  },
  {
    key: "allowConnections",
    icon: "🔌",
    title: "Acceso a Conexiones",
    desc: "Permite ver y gestionar las conexiones de WhatsApp (agregar nuevas, configurar QR, editar, eliminar). Es un permiso administrativo.",
    onValue: "enabled",
    offValue: "disabled",
  },
  {
    key: "showDashboard",
    icon: "📊",
    title: "Ver Dashboard",
    desc: "Permite acceder al panel de métricas/estadísticas (tickets atendidos, tiempos de respuesta, etc.). Habilítalo para supervisores y gerentes.",
    onValue: "enabled",
    offValue: "disabled",
  },
  {
    key: "allowRealTime",
    icon: "⚡",
    title: "Reportes en tiempo real",
    desc: "Permite ver la sección 'En tiempo real' con tickets activos, agentes conectados y métricas live. Generalmente para supervisores.",
    onValue: "enabled",
    offValue: "disabled",
  },
  {
    key: "showContacts",
    icon: "📒",
    title: "Acceso a Contactos",
    desc: "Permite ver el listado de Contactos, agregar nuevos, editar, importar/exportar CSV y bloquear contactos.",
    onValue: "enabled",
    offValue: "disabled",
  },
  {
    key: "showCampaign",
    icon: "📣",
    title: "Acceso a Campañas",
    desc: "Permite crear y enviar campañas masivas de WhatsApp (broadcasts a varios contactos a la vez). Habilítalo para marketing.",
    onValue: "enabled",
    offValue: "disabled",
  },
  {
    key: "showFlow",
    icon: "🔀",
    title: "Acceso a FlowBuilder",
    desc: "Permite acceder al diseñador de flujos automáticos (chatbot visual). Solo para administradores que configuran la automatización.",
    onValue: "enabled",
    offValue: "disabled",
  },
  {
    key: "finalizacaoComValorVendaAtiva",
    icon: "💰",
    title: "Cerrar ticket con valor de venta",
    desc: "Al cerrar un ticket, pide al agente registrar el valor monetario de la venta concretada. Útil para medir conversión.",
    onValue: "true",
    offValue: "false",
  },
];

// Helper: determina si un permiso está "activo" comparando su valor actual contra onValue
const isPermissionOn = (value, perm) => {
  if (value === undefined || value === null) return false;
  // Booleano puro
  if (typeof perm.onValue === "boolean") return value === true || value === "true";
  // String legacy ("enable"/"enabled"/"true")
  return String(value) === String(perm.onValue);
};

const UserModal = ({ open, onClose, userId }) => {
  const classes = useStyles();

  const initialState = {
    name: "",
    email: "",
    password: "",
    birthDate: "",
    profile: "user",
    startWork: "00:00",
    endWork: "23:59",
    farewellMessage: "",
    allTicket: "enable",
    allowGroup: false,
    defaultTheme: "light",
    defaultMenu: "open",
    allHistoric: "enabled",
    allUserChat: "enabled",
    userClosePendingTicket: "enabled",
    showDashboard: "enabled",
    allowRealTime: "enabled",
    allowConnections: "enabled",
    showContacts: "enabled",
    showCampaign: "enabled",
    showFlow: "enabled",
    finalizacaoComValorVendaAtiva: "false",
    allowSeeMessagesInPendingTickets: "enabled",
    mobileNotifications: "disabled"
  };

  const { user: loggedInUser } = useContext(AuthContext);

  const [user, setUser] = useState(initialState);
  const [selectedQueueIds, setSelectedQueueIds] = useState([]);
  const [whatsappId, setWhatsappId] = useState(false);
  // const [allTicket, setAllTicket] = useState("disable");
  const { loading, whatsApps } = useWhatsApps();
  const [profileUrl, setProfileUrl] = useState(null);
  const [tab, setTab] = useState("general");
  const [avatar, setAvatar] = useState(null);
  const startWorkRef = useRef();
  const endWorkRef = useRef();

  useEffect(() => {
    const fetchUser = async () => {
      if (!userId) return;
      try {
        const { data } = await api.get(`/users/${userId}`);
        setUser((prevState) => ({
          ...prevState,
          ...data,
          allTicket:
            data.allTicket === "enable" || data.allTicket === "enabled"
              ? "enable"
              : "disable",
          finalizacaoComValorVendaAtiva: data.finalizacaoComValorVendaAtiva
            ? "true"
            : "false",
          allowSeeMessagesInPendingTickets: data.allowSeeMessagesInPendingTickets === "enabled" ? "enabled" : "disabled",
          mobileNotifications: data.mobileNotifications ? "enabled" : "disabled",
          farewellMessage: data.farewellMessage || "",
          // Formatar a data corretamente
          birthDate: formatDateForInput(data.birthDate)
        }));

        const { profileImage } = data;
        setProfileUrl(
          `${backendUrl}/public/company${data.companyId}/user/${profileImage}`
        );

        const userQueueIds = data.queues?.map((queue) => queue.id);
        setSelectedQueueIds(userQueueIds);
        setWhatsappId(data.whatsappId ? data.whatsappId : "");
      } catch (err) {
        toastError(err);
      }
    };

    fetchUser();
  }, [userId, open]);

  const handleClose = () => {
    onClose();
    setUser(initialState);
  };

  const handleTabChange = (event, newValue) => {
    setTab(newValue);
  };

  const getBasename = (filepath) => {
    if (!filepath) return '';
    // Remove query strings e hashes
    const cleanPath = filepath.split('?')[0].split('#')[0];
    // Pega o último segmento após /
    const segments = cleanPath.split('/');
    return segments[segments.length - 1];
  };

  // UserModal/index.js - Função handleSaveUser corrigida
  const handleSaveUser = async (values) => {
    const uploadAvatar = async (userId) => {
      if (!avatar || typeof avatar !== 'object') return null;

      const formData = new FormData();
      formData.append("userId", userId);
      formData.append("typeArch", "user");
      formData.append("profileImage", avatar);

      try {
        const { data } = await api.post(
          `/users/${userId}/media-upload`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        );

        return data.user.profileImage;
      } catch (error) {
        console.error("Erro no upload da imagem:", error);
        throw error;
      }
    };

    const userData = {
      ...values,
      whatsappId,
      queueIds: selectedQueueIds,
      finalizacaoComValorVendaAtiva: values.finalizacaoComValorVendaAtiva === "true",
      birthDate: parseDateFromInput(values.birthDate),
      allowSeeMessagesInPendingTickets: values.allowSeeMessagesInPendingTickets === "enabled" ? "enabled" : "disabled",
      mobileNotifications: values.mobileNotifications === "enabled"
    };

    try {
      let responseData;

      if (userId) {
        // Atualizar usuário existente
        const { data } = await api.put(`/users/${userId}`, userData);
        responseData = data;

        // Upload da imagem se houver uma nova
        if (avatar && typeof avatar === 'object') {
          const newProfileImage = await uploadAvatar(userId);
          if (newProfileImage) {
            responseData.profileImage = newProfileImage;

            // Atualizar localStorage se for o usuário logado
            if (userId === loggedInUser.id) {
              localStorage.setItem("profileImage", newProfileImage);
            }
          }
        }
      } else {
        // Criar novo usuário
        const { data } = await api.post("/users", userData);
        responseData = data.user;

        // Upload da imagem se houver
        if (avatar && typeof avatar === 'object' && responseData.id) {
          const newProfileImage = await uploadAvatar(responseData.id);
          if (newProfileImage) {
            responseData.profileImage = newProfileImage;
          }
        }
      }

      handleClose();
      toast.success(i18n.t("userModal.success"));

      // Recarregar página se for o usuário logado para atualizar a interface
      if (userId === loggedInUser.id) {
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (err) {
      toastError(err);
    }
  };

  return (
    <div className={classes.root}>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        scroll="paper"
      >
        <DialogTitle id="form-dialog-title">
          {userId
            ? `${i18n.t("userModal.title.edit")}`
            : `${i18n.t("userModal.title.add")}`}
        </DialogTitle>
        <Formik
          initialValues={user}
          enableReinitialize={true}
          validationSchema={UserSchema}
          onSubmit={(values, actions) => {
            setTimeout(() => {
              handleSaveUser(values);
              actions.setSubmitting(false);
            }, 400);
          }}
        >
          {({ values, touched, errors, isSubmitting, setFieldValue }) => (
            <Form>
              <Paper className={classes.mainPaper} elevation={1}>
                <Tabs
                  value={tab}
                  indicatorColor="primary"
                  textColor="primary"
                  scrollButtons="on"
                  variant="scrollable"
                  onChange={handleTabChange}
                  className={classes.tab}
                >
                  <Tab
                    label={i18n.t("userModal.tabs.general")}
                    value={"general"}
                  />
                  <Tab
                    label={i18n.t("userModal.tabs.permissions")}
                    value={"permissions"}
                  />
                </Tabs>
              </Paper>
              <Paper className={classes.paper} elevation={0}>
                <DialogContent dividers>
                  <TabPanel
                    className={classes.container}
                    value={tab}
                    name={"general"}
                  >
                    <Grid
                      container
                      spacing={1}
                      alignContent="center"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <FormControl className={classes.updateDiv}>
                        <AvatarUploader
                          setAvatar={setAvatar}
                          avatar={user.profileImage}
                          companyId={user.companyId}
                        />
                        {user.profileImage && (
                          <Button
                            variant="outlined"
                            color="secondary"
                            onClick={() => {
                              user.profileImage = null;
                              setFieldValue("profileImage", null);
                              setAvatar(null);
                            }}
                          >
                            {i18n.t("userModal.title.removeImage")}
                          </Button>
                        )}
                      </FormControl>
                    </Grid>
                    <Grid container spacing={1}>
                      <Grid item xs={12} md={6} xl={6}>
                        <Field
                          as={TextField}
                          label={i18n.t("userModal.form.name")}
                          autoFocus
                          name="name"
                          error={touched.name && Boolean(errors.name)}
                          helperText={touched.name && errors.name}
                          variant="outlined"
                          margin="dense"
                          fullWidth
                        />
                      </Grid>
                      <Grid item xs={12} md={6} xl={6}>
                        <Field
                          as={TextField}
                          label={i18n.t("userModal.form.password")}
                          type="password"
                          name="password"
                          error={touched.password && Boolean(errors.password)}
                          helperText={touched.password && errors.password}
                          variant="outlined"
                          margin="dense"
                          fullWidth
                        />
                      </Grid>
                    </Grid>
                    <Grid container spacing={1}>
                      <Grid item xs={12} md={8} xl={8}>
                        <Field
                          as={TextField}
                          label={i18n.t("userModal.form.email")}
                          name="email"
                          error={touched.email && Boolean(errors.email)}
                          helperText={touched.email && errors.email}
                          variant="outlined"
                          margin="dense"
                          fullWidth
                        />
                      </Grid>
                      <Grid item xs={12} md={4} xl={4}>
                        <FormControl
                          variant="outlined"
                          //className={classes.formControl}
                          margin="dense"
                          fullWidth
                        >
                          <Can
                            role={loggedInUser.profile}
                            perform="user-modal:editProfile"
                            yes={() => (
                              <>
                                <InputLabel id="profile-selection-input-label">
                                  {i18n.t("userModal.form.profile")}
                                </InputLabel>

                                <Field
                                  as={Select}
                                  label={i18n.t("userModal.form.profile")}
                                  name="profile"
                                  labelId="profile-selection-label"
                                  id="profile-selection"
                                  required
                                >
                                  <MenuItem value="admin">Admin</MenuItem>
                                  <MenuItem value="user">User</MenuItem>
                                </Field>
                              </>
                            )}
                          />
                        </FormControl>
                      </Grid>
                    </Grid>
                    <Grid container spacing={1}>
                      <Grid item xs={12} md={12} xl={12}>
                        <Can
                          role={loggedInUser.profile}
                          perform="user-modal:editQueues"
                          yes={() => (
                            <QueueSelect
                              selectedQueueIds={selectedQueueIds}
                              onChange={(values) => setSelectedQueueIds(values)}
                              fullWidth
                            />
                          )}
                        />
                      </Grid>
                    </Grid>
                    <Grid container spacing={1}>
                      <Grid item xs={12} md={12} xl={12}>
                        <Can
                          role={loggedInUser.profile}
                          perform="user-modal:editProfile"
                          yes={() => (
                            <FormControl
                              variant="outlined"
                              margin="dense"
                              className={classes.maxWidth}
                              fullWidth
                            >
                              <InputLabel>
                                {i18n.t("userModal.form.whatsapp")}
                              </InputLabel>
                              <Field
                                as={Select}
                                value={whatsappId}
                                onChange={(e) => setWhatsappId(e.target.value)}
                                label={i18n.t("userModal.form.whatsapp")}
                              >
                                <MenuItem value={""}>&nbsp;</MenuItem>
                                {whatsApps.map((whatsapp) => (
                                  <MenuItem
                                    key={whatsapp.id}
                                    value={whatsapp.id}
                                  >
                                    {whatsapp.name}
                                  </MenuItem>
                                ))}
                              </Field>
                            </FormControl>
                          )}
                        />
                      </Grid>
                    </Grid>
                    <Can
                      role={loggedInUser.profile}
                      perform="user-modal:editProfile"
                      yes={() => (
                        <Grid container spacing={1}>
                          <Grid item xs={12} md={6} xl={6}>
                            <Field
                              as={TextField}
                              label={i18n.t("userModal.form.startWork")}
                              type="time"
                              ampm={"false"}
                              inputRef={startWorkRef}
                              InputLabelProps={{
                                shrink: true,
                              }}
                              inputProps={{
                                step: 600, // 5 min
                              }}
                              fullWidth
                              name="startWork"
                              error={
                                touched.startWork && Boolean(errors.startWork)
                              }
                              helperText={touched.startWork && errors.startWork}
                              variant="outlined"
                              margin="dense"
                              className={classes.textField}
                            />
                          </Grid>
                          <Grid item xs={12} md={6} xl={6}>
                            <Field
                              as={TextField}
                              label={i18n.t("userModal.form.endWork")}
                              type="time"
                              ampm={"false"}
                              inputRef={endWorkRef}
                              InputLabelProps={{
                                shrink: true,
                              }}
                              inputProps={{
                                step: 600, // 5 min
                              }}
                              fullWidth
                              name="endWork"
                              error={touched.endWork && Boolean(errors.endWork)}
                              helperText={touched.endWork && errors.endWork}
                              variant="outlined"
                              margin="dense"
                              className={classes.textField}
                            />
                          </Grid>
                        </Grid>
                      )}
                    />

                    <Grid container spacing={1}>
                      <Grid item xs={12} md={6} xl={6}>
                        <Field
                          as={TextField}
                          label="Data de Nascimento"
                          type="date"
                          name="birthDate"
                          InputLabelProps={{
                            shrink: true,
                          }}
                          fullWidth
                          variant="outlined"
                          margin="dense"
                          className={classes.textField}
                          helperText="Data de nascimento para notificações de aniversário"
                        />
                      </Grid>
                    </Grid>

                    <Field
                      as={TextField}
                      label={i18n.t("userModal.form.farewellMessage")}
                      type="farewellMessage"
                      multiline
                      rows={4}
                      fullWidth
                      name="farewellMessage"
                      error={
                        touched.farewellMessage &&
                        Boolean(errors.farewellMessage)
                      }
                      helperText={
                        touched.farewellMessage && errors.farewellMessage
                      }
                      variant="outlined"
                      margin="dense"
                    />

                    <Grid container spacing={1}>
                      <Grid item xs={12} md={6} xl={6}>
                        <FormControl
                          variant="outlined"
                          className={classes.maxWidth}
                          margin="dense"
                          fullWidth
                        >
                          <>
                            <InputLabel>
                              {i18n.t("userModal.form.defaultTheme")}
                            </InputLabel>

                            <Field
                              as={Select}
                              label={i18n.t("userModal.form.defaultTheme")}
                              name="defaultTheme"
                              type="defaultTheme"
                              required
                            >
                              <MenuItem value="light">
                                {i18n.t("userModal.form.defaultThemeLight")}
                              </MenuItem>
                              <MenuItem value="dark">
                                {i18n.t("userModal.form.defaultThemeDark")}
                              </MenuItem>
                            </Field>
                          </>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} md={6} xl={6}>
                        <FormControl
                          variant="outlined"
                          className={classes.maxWidth}
                          margin="dense"
                          fullWidth
                        >
                          <>
                            <InputLabel>
                              {i18n.t("userModal.form.defaultMenu")}
                            </InputLabel>

                            <Field
                              as={Select}
                              label={i18n.t("userModal.form.defaultMenu")}
                              name="defaultMenu"
                              type="defaultMenu"
                              required
                            >
                              <MenuItem value={"open"}>
                                {i18n.t("userModal.form.defaultMenuOpen")}
                              </MenuItem>
                              <MenuItem value={"closed"}>
                                {i18n.t("userModal.form.defaultMenuClosed")}
                              </MenuItem>
                            </Field>
                          </>
                        </FormControl>
                      </Grid>
                    </Grid>
                  </TabPanel>
                  <TabPanel
                    className={classes.container}
                    value={tab}
                    name={"permissions"}
                  >
                    <Can
                      role={loggedInUser.profile}
                      perform="user-modal:editProfile"
                      yes={() => (
                        <>
                          <Typography
                            variant="caption"
                            color="textSecondary"
                            style={{ display: "block", marginBottom: 12 }}
                          >
                            Activa o desactiva el acceso del agente a cada función del sistema.
                            Haz clic en el switch para cambiar.
                          </Typography>
                          {PERMISSIONS.map((perm, idx) => {
                            const currentValue = values[perm.key];
                            const isOn = isPermissionOn(currentValue, perm);
                            return (
                              <React.Fragment key={perm.key}>
                                <Box
                                  display="flex"
                                  alignItems="flex-start"
                                  py={1.5}
                                  px={1}
                                  style={{
                                    gap: 12,
                                    borderRadius: 8,
                                    transition: "background 0.15s",
                                  }}
                                  onMouseEnter={(e) =>
                                    (e.currentTarget.style.background = "#F8FAFC")
                                  }
                                  onMouseLeave={(e) =>
                                    (e.currentTarget.style.background = "transparent")
                                  }
                                >
                                  <Box
                                    style={{
                                      fontSize: "1.5rem",
                                      minWidth: 32,
                                      textAlign: "center",
                                    }}
                                  >
                                    {perm.icon}
                                  </Box>
                                  <Box flex={1}>
                                    <Typography
                                      style={{
                                        fontSize: "0.92rem",
                                        fontWeight: 600,
                                        marginBottom: 2,
                                      }}
                                    >
                                      {perm.title}
                                    </Typography>
                                    <Typography
                                      variant="caption"
                                      color="textSecondary"
                                      style={{
                                        fontSize: "0.78rem",
                                        lineHeight: 1.35,
                                      }}
                                    >
                                      {perm.desc}
                                    </Typography>
                                  </Box>
                                  <Switch
                                    checked={isOn}
                                    onChange={(e) =>
                                      setFieldValue(
                                        perm.key,
                                        e.target.checked ? perm.onValue : perm.offValue
                                      )
                                    }
                                    color="primary"
                                  />
                                </Box>
                                {idx < PERMISSIONS.length - 1 && <Divider />}
                              </React.Fragment>
                            );
                          })}
                        </>
                      )}
                    />
                  </TabPanel>
                </DialogContent>
              </Paper>
              <DialogActions>
                <Button
                  onClick={handleClose}
                  color="secondary"
                  disabled={isSubmitting}
                  variant="outlined"
                >
                  {i18n.t("userModal.buttons.cancel")}
                </Button>
                <Button
                  type="submit"
                  color="primary"
                  disabled={isSubmitting}
                  variant="contained"
                  className={classes.btnWrapper}
                >
                  {userId
                    ? `${i18n.t("userModal.buttons.okEdit")}`
                    : `${i18n.t("userModal.buttons.okAdd")}`}
                  {isSubmitting && (
                    <CircularProgress
                      size={24}
                      className={classes.buttonProgress}
                    />
                  )}
                </Button>
              </DialogActions>
            </Form>
          )}
        </Formik>
      </Dialog>
    </div>
  );
};

export default UserModal;