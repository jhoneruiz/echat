import React, { useState, useEffect, useRef, useContext } from "react";
import * as Yup from "yup";
import { Formik, Form, Field } from "formik";
import { toast } from "react-toastify";
import { isNil } from "lodash";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";

import { makeStyles } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";
import moment from "moment";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Button,
  DialogActions,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Switch,
  FormControlLabel,
  Grid,
  Divider,
  Tab,
  Tabs,
  Paper,
  Box,
  Chip,
  Typography,
} from "@material-ui/core";

import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import toastError from "../../errors/toastError";
import QueueSelect from "../QueueSelect";
import TabPanel from "../TabPanel";
import {
  Autorenew,
  FileCopy,
  WhatsApp as WhatsAppIcon,
  Close as CloseIcon,
  Info as InfoIcon,
} from "@material-ui/icons";
import useCompanySettings from "../../hooks/useSettings/companySettings";
import SchedulesForm from "../SchedulesForm";
import usePlans from "../../hooks/usePlans";
import { AuthContext } from "../../context/Auth/AuthContext";
import { Colorize } from "@material-ui/icons";
import ColorPicker from "../ColorPicker";
import InputAdornment from "@material-ui/core/InputAdornment";
import IconButton from "@material-ui/core/IconButton";
import getRandomHexColor from "../../utils/getRandomHexColor";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
    flexWrap: "wrap",
    gap: 4,
  },
  dialogPaper: {
    borderRadius: 16,
  },
  modalHeader: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1.5),
    padding: theme.spacing(2, 2.5),
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  modalHeaderIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#22C55E",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  modalHeaderTitle: {
    fontSize: "1.05rem",
    fontWeight: 600,
    lineHeight: 1.2,
  },
  modalHeaderSubtitle: {
    fontSize: "0.78rem",
    color: theme.palette.text.secondary,
    marginTop: 2,
  },

  multFieldLine: {
    marginTop: 12,
    display: "flex",
    "& > *:not(:last-child)": {
      marginRight: theme.spacing(1),
    },
  },

  btnWrapper: {
    position: "relative",
  },
  importMessage: {
    marginTop: 12,
    marginBottom: 12,
    paddingBottom: 20,
    paddingTop: 3,
    padding: 12,
    border: "solid grey 2px",
    borderRadius: 4,
    display: "flex",
    "& > *:not(:last-child)": {
      marginRight: theme.spacing(1),
    },
  },

  buttonProgress: {
    color: green[500],
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -12,
    marginLeft: -12,
  },

  textField: {
    marginRight: theme.spacing(1),
    flex: 1,
  },
  tokenRefresh: {
    minWidth: "auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  colorAdorment: {
    width: 20,
    height: 20,
  },
  formControl: {
    width: 220,
  },
  colorField: {
    width: 150,
  },

  /* ------- Secciones modernizadas (General / Integraciones) ------- */
  sectionCard: {
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2),
    borderRadius: 12,
    border: `1px solid ${
      theme.palette.type === "dark" ? "rgba(255,255,255,0.08)" : "#E5E7EB"
    }`,
    backgroundColor:
      theme.palette.type === "dark" ? "rgba(255,255,255,0.02)" : "#FAFAFA",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    marginBottom: theme.spacing(0.5),
  },
  sectionTitle: {
    fontSize: "0.95rem",
    fontWeight: 600,
    color: theme.palette.text.primary,
  },
  sectionDesc: {
    fontSize: "0.75rem",
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(1.5),
    lineHeight: 1.4,
  },
  fieldHelper: {
    fontSize: "0.72rem",
    color: theme.palette.text.secondary,
    marginTop: 4,
    display: "block",
    lineHeight: 1.35,
  },
  fieldGroupRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: theme.spacing(1),
    alignItems: "flex-start",
  },
  switchRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: theme.spacing(1, 1.25),
    borderRadius: 8,
    backgroundColor:
      theme.palette.type === "dark" ? "rgba(255,255,255,0.04)" : "#fff",
    border: `1px solid ${
      theme.palette.type === "dark" ? "rgba(255,255,255,0.06)" : "#E5E7EB"
    }`,
    marginBottom: theme.spacing(1),
    [theme.breakpoints.down("xs")]: {
      flexDirection: "column",
      alignItems: "flex-start",
      gap: theme.spacing(0.5),
    },
  },
  switchLabel: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
  },
  metaCallout: {
    padding: theme.spacing(1, 1.25),
    backgroundColor: "rgba(34, 197, 94, 0.08)",
    border: "1px solid rgba(34, 197, 94, 0.25)",
    borderRadius: 8,
    fontSize: "0.78rem",
    color: theme.palette.text.primary,
    marginBottom: theme.spacing(1.5),
    lineHeight: 1.4,
  },
  tokenBox: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(0.5),
    padding: theme.spacing(1),
    borderRadius: 10,
    border: `1px solid ${
      theme.palette.type === "dark" ? "rgba(255,255,255,0.08)" : "#E5E7EB"
    }`,
    backgroundColor:
      theme.palette.type === "dark" ? "rgba(255,255,255,0.02)" : "#fff",
  },
}));

const SessionSchema = Yup.object().shape({
  name: Yup.string()
    .min(2, "Too Short!")
    .max(50, "Too Long!")
    .required("Required"),
});

const WhatsAppModal = ({ open, onClose, whatsAppId, channel }) => {
  const classes = useStyles();
  const [autoToken, setAutoToken] = useState("");

  const inputFileRef = useRef(null);

  const [attachment, setAttachment] = useState(null);
  const [attachmentName, setAttachmentName] = useState("");

  const initialState = {
    name: "",
    greetingMessage: "",
    complationMessage: "",
    outOfHoursMessage: "",
    ratingMessage: "",
    isDefault: false,
    token: "",
    maxUseBotQueues: 3,
    provider: "beta",
    expiresTicket: 0,
    allowGroup: false,
    enableImportMessage: false,
    groupAsTicket: "disabled",
    timeUseBotQueues: "0",
    timeSendQueue: "0",
    sendIdQueue: 0,
    expiresTicketNPS: "0",
    expiresInactiveMessage: "",
    timeInactiveMessage: "",
    inactiveMessage: "",
    maxUseBotQueuesNPS: 3,
    whenExpiresTicket: 0,
    timeCreateNewTicket: 0,
    greetingMediaAttachment: "",
    importRecentMessages: "",
    importOldMessages: "",
    importOldMessagesGroups: "",
    integrationId: "",
    collectiveVacationEnd: "",
    collectiveVacationStart: "",
    collectiveVacationMessage: "",
    queueIdImportMessages: null,
    isOficial: false,
    phone_number_id: "",
    waba_id: "",
    send_token: "",
    business_id: "",
    phone_number: "",
    color: getRandomHexColor(),
    flowInactiveTime: 0,
    flowIdInactiveTime: 0,
    timeAwaitActiveFlowId: 0,
    maxUseInactiveTime: 1,
    timeToReturnQueue: 0,
    triggerIntegrationOnClose: true,
    wavoip: "",
  };
  const [whatsApp, setWhatsApp] = useState(initialState);
  const [selectedQueueIds, setSelectedQueueIds] = useState([]);
  const [queues, setQueues] = useState([]);
  const [tab, setTab] = useState("general");
  // Tracking del campo de mensaje enfocado actualmente para insertar variables
  const [focusedMsgField, setFocusedMsgField] = useState("greetingMessage");
  const [msgFieldCursors, setMsgFieldCursors] = useState({});
  const [enableImportMessage, setEnableImportMessage] = useState(false);
  const [importOldMessagesGroups, setImportOldMessagesGroups] = useState(false);
  const [closedTicketsPostImported, setClosedTicketsPostImported] =
    useState(false);
  const [importOldMessages, setImportOldMessages] = useState(
    moment().add(-1, "days").format("YYYY-MM-DDTHH:mm")
  );
  const [importRecentMessages, setImportRecentMessages] = useState(
    moment().add(-1, "minutes").format("YYYY-MM-DDTHH:mm")
  );
  const [copied, setCopied] = useState(false);
  const [integrations, setIntegrations] = useState([]);
  const [schedulesEnabled, setSchedulesEnabled] = useState(false);
  const [NPSEnabled, setNPSEnabled] = useState(false);
  const [showOpenAi, setShowOpenAi] = useState(false);
  const [showIntegrations, setShowIntegrations] = useState(false);
  const { user } = useContext(AuthContext);
  const [isOficial, setIsOficial] = useState(false);
  const [useWhatsappOfficial, setUseWhatsappOfficial] = useState(false);
  const [colorPickerModalOpen, setColorPickerModalOpen] = useState(false);

  const [schedules, setSchedules] = useState([
    {
      weekday: i18n.t("queueModal.serviceHours.monday"),
      weekdayEn: "monday",
      startTimeA: "08:00",
      endTimeA: "12:00",
      startTimeB: "13:00",
      endTimeB: "18:00",
    },
    {
      weekday: i18n.t("queueModal.serviceHours.tuesday"),
      weekdayEn: "tuesday",
      startTimeA: "08:00",
      endTimeA: "12:00",
      startTimeB: "13:00",
      endTimeB: "18:00",
    },
    {
      weekday: i18n.t("queueModal.serviceHours.wednesday"),
      weekdayEn: "wednesday",
      startTimeA: "08:00",
      endTimeA: "12:00",
      startTimeB: "13:00",
      endTimeB: "18:00",
    },
    {
      weekday: i18n.t("queueModal.serviceHours.thursday"),
      weekdayEn: "thursday",
      startTimeA: "08:00",
      endTimeA: "12:00",
      startTimeB: "13:00",
      endTimeB: "18:00",
    },
    {
      weekday: i18n.t("queueModal.serviceHours.friday"),
      weekdayEn: "friday",
      startTimeA: "08:00",
      endTimeA: "12:00",
      startTimeB: "13:00",
      endTimeB: "18:00",
    },
    {
      weekday: "Sábado",
      weekdayEn: "saturday",
      startTimeA: "08:00",
      endTimeA: "12:00",
      startTimeB: "13:00",
      endTimeB: "18:00",
    },
    {
      weekday: "Domingo",
      weekdayEn: "sunday",
      startTimeA: "08:00",
      endTimeA: "12:00",
      startTimeB: "13:00",
      endTimeB: "18:00",
    },
  ]);

  const { get: getSetting } = useCompanySettings();
  const { getPlanCompany } = usePlans();

  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [triggerIntegrationOnClose, setTriggerIntegrationOnClose] =
    useState(true);
  const [integrationType, setIntegrationType] = useState("n8n");
  const [integrationTypeId, setIntegrationTypeId] = useState(null);

  const [prompts, setPrompts] = useState([]);

  const [webhooks, setWebhooks] = useState([]);
  const [flowIdNotPhrase, setFlowIdNotPhrase] = useState();
  const [flowIdWelcome, setFlowIdWelcome] = useState();
  const [flowIdInactiveTime, setFlowIdInactiveTime] = useState();
  const [timeAwaitActiveFlowId, setTimeAwaitActiveFlowId] = useState();
  const [showWavoipCall, setShowWavoipCall] = useState(false);

  useEffect(() => {
    if (!whatsAppId && !whatsApp.token) {
      setAutoToken(generateRandomCode(30));
    } else if (whatsAppId && !whatsApp.token) {
      setAutoToken(generateRandomCode(30));
    } else {
      setAutoToken(whatsApp.token);
    }
  }, [whatsAppId, whatsApp.token]);

  useEffect(() => {
    async function fetchData() {
      const companyId = user.companyId;
      const planConfigs = await getPlanCompany(undefined, companyId);

      setShowOpenAi(planConfigs.plan.useOpenAi);
      setShowIntegrations(planConfigs.plan.useIntegrations);
      setUseWhatsappOfficial(planConfigs.plan.useWhatsappOfficial);
      setShowWavoipCall(planConfigs.plan.wavoip);
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/prompt");
        setPrompts(data.prompts);
      } catch (err) {
        toastError(err);
      }
    })();
  }, [whatsAppId]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/flowbuilder");
        setWebhooks(data.flows);
      } catch (err) {
        toastError(err);
      }
    })();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const settingSchedules = await getSetting({
        column: "scheduleType",
      });
      setSchedulesEnabled(settingSchedules.scheduleType === "connection");
      const settingNPS = await getSetting({
        column: "userRating",
      });
      setNPSEnabled(settingNPS.userRating === "enabled");
    };
    fetchData();
  }, []);

  const handleEnableImportMessage = async (e) => {
    setEnableImportMessage(e.target.checked);
  };

  const handleEnableIsOficial = async (e) => {
    setIsOficial(e.target.checked);
  };

  useEffect(() => {
    const fetchSession = async () => {
      if (!whatsAppId) return;

      try {
        const { data } = await api.get(`whatsapp/${whatsAppId}?session=0`);

        if (data && data?.flowIdNotPhrase) {
          const { data: flowDefault } = await api.get(
            `flowbuilder/${data.flowIdNotPhrase}`
          );
          const selectedFlowIdNotPhrase = flowDefault?.flow.id;
          setFlowIdNotPhrase(selectedFlowIdNotPhrase);
        }

        if (data && data?.flowIdWelcome) {
          const { data: flowDefault } = await api.get(
            `flowbuilder/${data.flowIdWelcome}`
          );
          const selectedFlowIdWelcome = flowDefault?.flow.id;
          setFlowIdWelcome(selectedFlowIdWelcome);
        }

        if (data && data?.flowIdInactiveTime) {
          const { data: flowDefault } = await api.get(
            `flowbuilder/${data.flowIdInactiveTime}`
          );
          const selectedFlowIdInactiveTime = flowDefault?.flow.id;
          setFlowIdInactiveTime(selectedFlowIdInactiveTime);
        }

        if (data && data?.timeAwaitActiveFlowId) {
          const { data: flowDefault } = await api.get(
            `flowbuilder/${data.timeAwaitActiveFlowId}`
          );
          const selectedTimeAwaitActiveFlowId = flowDefault?.flow.id;
          setTimeAwaitActiveFlowId(selectedTimeAwaitActiveFlowId);
        }

        setWhatsApp(data);
        setAttachmentName(data.greetingMediaAttachment);
        setAutoToken(data.token);
        data.promptId
          ? setSelectedPrompt(data.promptId)
          : setSelectedPrompt(null);
        const whatsQueueIds = data.queues?.map((queue) => queue.id);
        setSelectedQueueIds(whatsQueueIds);
        setIsOficial(channel === "whatsapp_oficial");
        setSchedules(data.schedules);
        if (!isNil(data?.importOldMessages)) {
          setEnableImportMessage(true);
          setImportOldMessages(data?.importOldMessages);
          setImportRecentMessages(data?.importRecentMessages);
          setClosedTicketsPostImported(data?.closedTicketsPostImported);
          setImportOldMessagesGroups(data?.importOldMessagesGroups);
        }
      } catch (err) {
        toastError(err);
      }
    };
    fetchSession();
  }, [whatsAppId]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/queue");
        setQueues(data);
      } catch (err) {
        toastError(err);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/queueIntegration");

        setIntegrations(data.queueIntegrations);
      } catch (err) {
        toastError(err);
      }
    })();
  }, []);

  const handleChangeQueue = (e) => {
    setSelectedQueueIds(e);
    setSelectedPrompt(null);
  };

  const handleChangePrompt = (e) => {
    setSelectedPrompt(e.target.value);
    setSelectedQueueIds([]);
  };

  const handleChange = (e) => {
    setTriggerIntegrationOnClose(e.target.value);
  };

  const handleIntegrationTypeChange = (e) => {
    setIntegrationType(e.target.value);
    setIntegrationTypeId(e.target.value);
  };

  const handleSaveWhatsApp = async (values) => {
    const newToken = !whatsAppId ? generateRandomCode(30) : autoToken;
    if (!whatsAppId) setAutoToken(newToken);

    if (NPSEnabled) {
      if (isNil(values.ratingMessage)) {
        toastError(i18n.t("whatsappModal.errorRatingMessage"));
        return;
      }

      if (
        values.expiresTicketNPS === "0" &&
        values.expiresTicketNPS === "" &&
        values.expiresTicketNPS === 0
      ) {
        toastError(i18n.t("whatsappModal.errorExpiresNPS"));
        return;
      }
    }

    if (values.timeSendQueue === "") values.timeSendQueue = "0";

    if (
      (values.sendIdQueue === 0 ||
        values.sendIdQueue === "" ||
        isNil(values.sendIdQueue)) &&
      values.timeSendQueue !== 0 &&
      values.timeSendQueue !== "0"
    ) {
      toastError(i18n.t("whatsappModal.errorSendQueue"));
      return;
    }

    const whatsappData = {
      ...values,
      flowIdWelcome: flowIdWelcome ? flowIdWelcome : null,
      flowIdInactiveTime: flowIdInactiveTime ? flowIdInactiveTime : null,
      flowIdNotPhrase: flowIdNotPhrase ? flowIdNotPhrase : null,
      timeAwaitActiveFlowId: timeAwaitActiveFlowId
        ? timeAwaitActiveFlowId
        : null,
      queueIds: selectedQueueIds,
      importOldMessages: enableImportMessage ? importOldMessages : null,
      importRecentMessages: enableImportMessage ? importRecentMessages : null,
      importOldMessagesGroups: importOldMessagesGroups
        ? importOldMessagesGroups
        : null,
      closedTicketsPostImported: closedTicketsPostImported
        ? closedTicketsPostImported
        : null,
      token: newToken || null,
      schedules,
      promptId: selectedPrompt ? selectedPrompt : null,
      channel,
      triggerIntegrationOnClose: triggerIntegrationOnClose,
      integrationTypeId: triggerIntegrationOnClose ? integrationTypeId : null,
      color: values.color ? values.color : getRandomHexColor(),
      wavoip: values.wavoip ? values.wavoip : null,
    };
    delete whatsappData["queues"];
    delete whatsappData["session"];

    try {
      if (whatsAppId) {
        if (
          whatsAppId &&
          enableImportMessage &&
          whatsApp?.status === "CONNECTED"
        ) {
          try {
            setWhatsApp({ ...whatsApp, status: "qrcode" });
            await api.delete(`/whatsappsession/${whatsApp.id}`);
          } catch (err) {
            toastError(err);
          }
        }

        await api.put(`/whatsapp/${whatsAppId}`, whatsappData);
        if (attachment != null) {
          const formData = new FormData();
          formData.append("file", attachment);
          await api.post(`/whatsapp/${whatsAppId}/media-upload`, formData);
        }
        if (!attachmentName && whatsApp.greetingMediaAttachment !== null) {
          await api.delete(`/whatsapp/${whatsAppId}/media-upload`);
        }
      } else {
        const { data } = await api.post("/whatsapp", whatsappData);
        if (attachment != null) {
          const formData = new FormData();
          formData.append("file", attachment);
          await api.post(`/whatsapp/${data.id}/media-upload`, formData);
        }
      }
      toast.success(i18n.t("whatsappModal.success"));

      handleClose();
    } catch (err) {
      toastError(err);
    }
  };

  function generateRandomCode(length) {
    const charset =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyvz0123456789";
    let code = "";

    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      code += charset.charAt(randomIndex);
    }
    return code;
  }

  const handleRefreshToken = () => {
    setAutoToken(generateRandomCode(30));
  };

  const handleChangeFlowIdNotPhrase = (e) => {
    console.log(e.target.value);
    setFlowIdNotPhrase(e.target.value);
  };

  const handleChangeFlowIdWelcome = (e) => {
    setFlowIdWelcome(e.target.value);
  };

  const handleChangeFlowIdInactiveTime = (e) => {
    setFlowIdInactiveTime(e.target.value);
  };

  const handleChangeTimeAwaitActiveFlowId = (e) => {
    setTimeAwaitActiveFlowId(e.target.value);
  };

  const handleCopyToken = () => {
    navigator.clipboard.writeText(autoToken); // Copia o token para a área de transferência
    setCopied(true); // Define o estado de cópia como verdadeiro
  };

  const handleSaveSchedules = async (values) => {
    toast.success("Clique em salvar para registar as alterações");
    setSchedules(values);
  };

  const handleClose = () => {
    onClose();
    setWhatsApp(initialState);
    setEnableImportMessage(false);
    // inputFileRef.current.value = null
    setAttachment(null);
    setAttachmentName("");
    setCopied(false);
  };

  const handleTabChange = (event, newValue) => {
    setTab(newValue);
  };

  const handleFileUpload = () => {
    const file = inputFileRef.current.files[0];
    setAttachment(file);
    setAttachmentName(file.name);
    inputFileRef.current.value = null;
  };

  const handleDeleFile = () => {
    setAttachment(null);
    setAttachmentName(null);
  };

  return (
    <div className={classes.root}>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="lg"
        fullWidth
        scroll="paper"
        classes={{ paper: classes.dialogPaper }}
      >
        <Box className={classes.modalHeader}>
          <Box
            className={classes.modalHeaderIcon}
            style={{
              backgroundColor:
                channel === "whatsapp_oficial" ? "#1877F2" : "#25D366",
            }}
          >
            <WhatsAppIcon />
          </Box>
          <Box style={{ flex: 1, minWidth: 0 }}>
            <Typography className={classes.modalHeaderTitle} noWrap>
              {whatsAppId
                ? i18n.t("whatsappModal.title.edit")
                : i18n.t("whatsappModal.title.add")}
            </Typography>
            <Typography className={classes.modalHeaderSubtitle} noWrap>
              {channel === "whatsapp_oficial"
                ? "Canal oficial Meta Cloud API"
                : "Canal Baileys (WhatsApp Web)"}
            </Typography>
          </Box>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
        <Formik
          initialValues={whatsApp}
          enableReinitialize={true}
          validationSchema={SessionSchema}
          onSubmit={(values, actions) => {
            setTimeout(() => {
              handleSaveWhatsApp(values);
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
                    label={i18n.t("whatsappModal.tabs.general")}
                    value={"general"}
                  />
                  <Tab
                    label={i18n.t("whatsappModal.tabs.integrations")}
                    value={"integrations"}
                  />
                  <Tab
                    label={i18n.t("whatsappModal.tabs.messages")}
                    value={"messages"}
                  />
                  <Tab label="Chatbot" value={"chatbot"} />
                  <Tab
                    label={i18n.t("whatsappModal.tabs.assessments")}
                    value={"nps"}
                  />
                  {user.showFlow === "enabled" && (
                    <Tab label="Fluxo Padrão" value={"flowbuilder"} />
                  )}
                  {schedulesEnabled && (
                    <Tab
                      label={i18n.t("whatsappModal.tabs.schedules")}
                      value={"schedules"}
                    />
                  )}
                </Tabs>
              </Paper>
              <Paper className={classes.paper} elevation={0}>
                <TabPanel
                  className={classes.container}
                  value={tab}
                  name={"general"}
                >
                  <DialogContent dividers>
                    {attachmentName && (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "row-reverse",
                        }}
                      >
                        <Button
                          variant="outlined"
                          color="primary"
                          endIcon={<DeleteOutlineIcon />}
                          onClick={handleDeleFile}
                        >
                          {attachmentName}
                        </Button>
                      </div>
                    )}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column-reverse",
                      }}
                    >
                      <input
                        type="file"
                        accept="video/*,image/*"
                        ref={inputFileRef}
                        style={{ display: "none" }}
                        onChange={handleFileUpload}
                      />
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={() => inputFileRef.current.click()}
                      >
                        {i18n.t("userModal.buttons.addImage")}
                      </Button>
                    </div>
                    {/* === SECCIÓN: IDENTIDAD === */}
                    <Box className={classes.sectionCard}>
                      <Box className={classes.sectionHeader}>
                        <Typography className={classes.sectionTitle}>
                          🏷 Identidad de la conexión
                        </Typography>
                      </Box>
                      <Typography className={classes.sectionDesc}>
                        Nombre visible internamente, color de la etiqueta en la lista
                        de tickets y comportamiento básico de la conexión.
                      </Typography>
                      <Grid spacing={2} container>
                        <Grid item xs={12} sm={6}>
                          <Field
                            as={TextField}
                            label={i18n.t("whatsappModal.form.name")}
                            autoFocus
                            name="name"
                            fullWidth
                            error={touched.name && Boolean(errors.name)}
                            helperText={
                              (touched.name && errors.name) ||
                              "Solo se ve en el panel; no aparece al cliente."
                            }
                            variant="outlined"
                            margin="dense"
                          />
                        </Grid>

                        {/* COR */}
                        <Grid item xs={12} sm={6}>
                          <Field
                            as={TextField}
                            label={i18n.t("connections.table.color")}
                            name="color"
                            id="color"
                            onFocus={() => {
                              setColorPickerModalOpen(false);
                            }}
                            error={touched.color && Boolean(errors.color)}
                            helperText={touched.color && errors.color}
                            InputProps={{
                              startAdornment: (
                                <InputAdornment position="start">
                                  <div
                                    style={{ backgroundColor: values.color }}
                                    className={classes.colorAdorment}
                                  ></div>
                                </InputAdornment>
                              ),
                              endAdornment: (
                                <IconButton
                                  size="small"
                                  color="default"
                                  onClick={() => setColorPickerModalOpen(true)}
                                >
                                  <Colorize />
                                </IconButton>
                              ),
                            }}
                            variant="outlined"
                            margin="dense"
                            fullWidth
                          />
                          <Typography className={classes.fieldHelper}>
                            Color con el que se marca esta conexión en la lista
                            de tickets para identificarla rápido.
                          </Typography>
                          <ColorPicker
                            open={colorPickerModalOpen}
                            handleClose={() => setColorPickerModalOpen(false)}
                            onChange={(color) => {
                              values.color = color;
                              setWhatsApp(() => {
                                return { ...values, color };
                              });
                            }}
                          />
                        </Grid>
                      </Grid>

                      <Box mt={1.5}>
                        <Box className={classes.switchRow}>
                          <Box className={classes.switchLabel}>
                            <Typography variant="body2" style={{ fontWeight: 500 }}>
                              ⭐ Conexión predeterminada
                            </Typography>
                            <Typography className={classes.fieldHelper}>
                              Conexión que se usa por defecto al enviar mensajes
                              desde la API o cuando no hay otra conexión asignada.
                              Solo una puede estar marcada como predeterminada.
                            </Typography>
                          </Box>
                          <Field
                            as={Switch}
                            color="primary"
                            name="isDefault"
                            checked={values.isDefault}
                          />
                        </Box>

                        {useWhatsappOfficial &&
                          channel === "whatsapp_oficial" && (
                            <Box className={classes.switchRow}>
                              <Box className={classes.switchLabel}>
                                <Typography variant="body2" style={{ fontWeight: 500 }}>
                                  ✅ Habilitar API oficial Meta
                                </Typography>
                                <Typography className={classes.fieldHelper}>
                                  Activa los campos de credenciales (Phone Number
                                  ID, WABA, Business, Token) para conectar
                                  contra WhatsApp Cloud API en lugar de Baileys.
                                </Typography>
                              </Box>
                              <Switch
                                size="medium"
                                checked={isOficial}
                                onChange={handleEnableIsOficial}
                                name="isOficial"
                                color="primary"
                              />
                            </Box>
                          )}

                        <Box className={classes.switchRow}>
                          <Box className={classes.switchLabel}>
                            <Typography variant="body2" style={{ fontWeight: 500 }}>
                              👥 Permitir grupos
                            </Typography>
                            <Typography className={classes.fieldHelper}>
                              Si está desactivado, los mensajes que llegan a
                              grupos de WhatsApp se ignoran (no crean ticket).
                            </Typography>
                          </Box>
                          <Field
                            as={Switch}
                            color="primary"
                            name="allowGroup"
                            checked={values.allowGroup}
                          />
                        </Box>

                        <Grid item xs={12}>
                          <FormControl
                            variant="outlined"
                            margin="dense"
                            fullWidth
                          >
                            <InputLabel id="groupAsTicket-selection-label">
                              {i18n.t("whatsappModal.form.groupAsTicket")}
                            </InputLabel>
                            <Field
                              as={Select}
                              label={i18n.t("whatsappModal.form.groupAsTicket")}
                              placeholder={i18n.t(
                                "whatsappModal.form.groupAsTicket"
                              )}
                              labelId="groupAsTicket-selection-label"
                              id="groupAsTicket"
                              name="groupAsTicket"
                            >
                              <MenuItem value={"disabled"}>
                                {i18n.t("whatsappModal.menuItem.disabled")}
                              </MenuItem>
                              <MenuItem value={"enabled"}>
                                {i18n.t("whatsappModal.menuItem.enabled")}
                              </MenuItem>
                            </Field>
                          </FormControl>
                          <Typography className={classes.fieldHelper}>
                            "Habilitado" → cada grupo de WhatsApp se trata como
                            un único ticket compartido. "Deshabilitado" → cada
                            integrante del grupo abre su propio ticket.
                          </Typography>
                        </Grid>
                      </Box>
                    </Box>

                    {/* === SECCIÓN: CREDENCIALES META CLOUD API === */}
                    {isOficial && (
                      <Box className={classes.sectionCard}>
                        <Box className={classes.sectionHeader}>
                          <Typography className={classes.sectionTitle}>
                            🌐 Credenciales WhatsApp Cloud API (Meta)
                          </Typography>
                        </Box>
                        <Typography className={classes.sectionDesc}>
                          Datos que tu app de Meta Business necesita para enviar y
                          recibir mensajes. Los encuentras en Meta Business Manager →
                          WhatsApp Manager.
                        </Typography>
                        <Box className={classes.metaCallout}>
                          💡 ¿Dónde encontrarlos? En{" "}
                          <a
                            href="https://business.facebook.com/wa/manage/phone-numbers/"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "#1877F2", fontWeight: 600 }}
                          >
                            Meta Business → WhatsApp → Números
                          </a>
                          . El System User Token se crea en Business Settings →
                          Users → System Users.
                        </Box>
                        <Grid container spacing={1}>
                          <Grid xs={12} md={6} item>
                            <Field
                              fullWidth
                              as={TextField}
                              label={i18n.t(
                                "whatsappModal.form.phone_number_id"
                              )}
                              name="phone_number_id"
                              InputLabelProps={{ shrink: true }}
                              error={
                                touched.phone_number_id &&
                                Boolean(errors.phone_number_id)
                              }
                              helperText={
                                (touched.phone_number_id &&
                                  errors.phone_number_id) ||
                                "ID del número de teléfono registrado en Meta (15+ dígitos)"
                              }
                              variant="outlined"
                              margin="dense"
                              required={isOficial}
                            />
                          </Grid>
                          <Grid xs={12} md={6} item>
                            <Field
                              fullWidth
                              as={TextField}
                              label={i18n.t("whatsappModal.form.waba_id")}
                              name="waba_id"
                              InputLabelProps={{ shrink: true }}
                              error={touched.waba_id && Boolean(errors.waba_id)}
                              helperText={
                                (touched.waba_id && errors.waba_id) ||
                                "WhatsApp Business Account ID — controla plantillas y webhook"
                              }
                              variant="outlined"
                              margin="dense"
                              required={isOficial}
                            />
                          </Grid>

                          <Grid xs={12} md={6} item>
                            <Field
                              fullWidth
                              as={TextField}
                              label={i18n.t("whatsappModal.form.business_id")}
                              name="business_id"
                              InputLabelProps={{ shrink: true }}
                              error={
                                touched.business_id &&
                                Boolean(errors.business_id)
                              }
                              helperText={
                                (touched.business_id && errors.business_id) ||
                                "Business Manager ID — la cuenta de empresa en Meta"
                              }
                              variant="outlined"
                              margin="dense"
                              required={isOficial}
                            />
                          </Grid>
                          <Grid xs={12} md={6} item>
                            <Field
                              fullWidth
                              as={TextField}
                              label={i18n.t("whatsappModal.form.phone_number")}
                              name="phone_number"
                              InputLabelProps={{ shrink: true }}
                              error={
                                touched.phone_number &&
                                Boolean(errors.phone_number)
                              }
                              helperText={
                                (touched.phone_number &&
                                  errors.phone_number) ||
                                "Número en formato internacional (+52 1 55..., +54 9 11..., +1...)"
                              }
                              variant="outlined"
                              margin="dense"
                              required={isOficial}
                            />
                          </Grid>
                          <Grid xs={12} item>
                            <Field
                              fullWidth
                              as={TextField}
                              label={i18n.t("whatsappModal.form.send_token")}
                              name="send_token"
                              InputLabelProps={{ shrink: true }}
                              error={
                                touched.send_token && Boolean(errors.send_token)
                              }
                              helperText={
                                (touched.send_token && errors.send_token) ||
                                "System User Access Token (permanente). Empieza por 'EAA...' y debe tener permisos whatsapp_business_messaging + whatsapp_business_management."
                              }
                              variant="outlined"
                              margin="dense"
                              required={isOficial}
                            />
                          </Grid>
                        </Grid>
                      </Box>
                    )}
                    {!isOficial && (
                      <Box className={classes.sectionCard}>
                        <Box className={classes.sectionHeader}>
                          <Typography className={classes.sectionTitle}>
                            📥 Importación de mensajes antiguos (Baileys)
                          </Typography>
                        </Box>
                        <Typography className={classes.sectionDesc}>
                          Al conectar por primera vez, importa el historial de
                          conversaciones del teléfono. Solo disponible con el
                          canal no oficial (Baileys); el canal Meta no lo
                          permite.
                        </Typography>

                        <Box className={classes.switchRow}>
                          <Box className={classes.switchLabel}>
                            <Typography variant="body2" style={{ fontWeight: 500 }}>
                              🔄 Importar mensajes antiguos
                            </Typography>
                            <Typography className={classes.fieldHelper}>
                              Activa la importación. Aparecerán los campos para
                              definir el rango de fechas.
                            </Typography>
                          </Box>
                          <Switch
                            size="medium"
                            checked={enableImportMessage}
                            onChange={handleEnableImportMessage}
                            name="importOldMessagesEnable"
                            color="primary"
                          />
                        </Box>

                        {enableImportMessage && (
                          <>
                            <Box className={classes.switchRow}>
                              <Box className={classes.switchLabel}>
                                <Typography variant="body2" style={{ fontWeight: 500 }}>
                                  👥 Incluir grupos en la importación
                                </Typography>
                                <Typography className={classes.fieldHelper}>
                                  Si está apagado, solo se importan chats
                                  individuales (no grupos).
                                </Typography>
                              </Box>
                              <Switch
                                size="medium"
                                checked={importOldMessagesGroups}
                                onChange={(e) =>
                                  setImportOldMessagesGroups(e.target.checked)
                                }
                                name="importOldMessagesGroups"
                                color="primary"
                              />
                            </Box>

                            <Box className={classes.switchRow}>
                              <Box className={classes.switchLabel}>
                                <Typography variant="body2" style={{ fontWeight: 500 }}>
                                  ✅ Cerrar tickets importados
                                </Typography>
                                <Typography className={classes.fieldHelper}>
                                  Crea los tickets de la importación ya en
                                  estado "cerrado" para no inundar la cola de
                                  pendientes con conversaciones antiguas.
                                </Typography>
                              </Box>
                              <Switch
                                size="medium"
                                checked={closedTicketsPostImported}
                                onChange={(e) =>
                                  setClosedTicketsPostImported(e.target.checked)
                                }
                                name="closedTicketsPostImported"
                                color="primary"
                              />
                            </Box>
                          </>
                        )}

                        {enableImportMessage && (
                          <Grid style={{ marginTop: 18 }} container spacing={1}>
                            <Grid item xs={6}>
                              <Field
                                fullWidth
                                as={TextField}
                                label={i18n.t(
                                  "whatsappModal.form.importOldMessages"
                                )}
                                type="datetime-local"
                                name="importOldMessages"
                                inputProps={{
                                  max: moment()
                                    .add(0, "minutes")
                                    .format("YYYY-MM-DDTHH:mm"),
                                  min: moment()
                                    .add(-2, "years")
                                    .format("YYYY-MM-DDTHH:mm"),
                                }}
                                //min="2022-11-06T22:22:55"
                                InputLabelProps={{
                                  shrink: true,
                                }}
                                error={
                                  touched.importOldMessages &&
                                  Boolean(errors.importOldMessages)
                                }
                                helperText={
                                  touched.importOldMessages &&
                                  errors.importOldMessages
                                }
                                variant="outlined"
                                value={moment(importOldMessages).format(
                                  "YYYY-MM-DDTHH:mm"
                                )}
                                onChange={(e) => {
                                  setImportOldMessages(e.target.value);
                                }}
                              />
                            </Grid>
                            <Grid item xs={6}>
                              <Field
                                fullWidth
                                as={TextField}
                                label={i18n.t(
                                  "whatsappModal.form.importRecentMessages"
                                )}
                                type="datetime-local"
                                name="importRecentMessages"
                                inputProps={{
                                  max: moment()
                                    .add(0, "minutes")
                                    .format("YYYY-MM-DDTHH:mm"),
                                  min: moment(importOldMessages).format(
                                    "YYYY-MM-DDTHH:mm"
                                  ),
                                }}
                                //min="2022-11-06T22:22:55"
                                InputLabelProps={{
                                  shrink: true,
                                }}
                                error={
                                  touched.importRecentMessages &&
                                  Boolean(errors.importRecentMessages)
                                }
                                helperText={
                                  touched.importRecentMessages &&
                                  errors.importRecentMessages
                                }
                                variant="outlined"
                                value={moment(importRecentMessages).format(
                                  "YYYY-MM-DDTHH:mm"
                                )}
                                onChange={(e) => {
                                  setImportRecentMessages(e.target.value);
                                }}
                              />
                            </Grid>
                            <Grid xs={12} md={12} xl={12} item>
                              <FormControl
                                variant="outlined"
                                margin="dense"
                                className={classes.FormControl}
                                fullWidth
                              >
                                <InputLabel id="queueIdImportMessages-selection-label">
                                  {i18n.t(
                                    "whatsappModal.form.queueIdImportMessages"
                                  )}
                                </InputLabel>
                                <Field
                                  as={Select}
                                  name="queueIdImportMessages"
                                  id="queueIdImportMessages"
                                  value={values.queueIdImportMessages || "0"}
                                  required={enableImportMessage}
                                  label={i18n.t(
                                    "whatsappModal.form.queueIdImportMessages"
                                  )}
                                  placeholder={i18n.t(
                                    "whatsappModal.form.queueIdImportMessages"
                                  )}
                                  labelId="queueIdImportMessages-selection-label"
                                >
                                  <MenuItem value={0}>&nbsp;</MenuItem>
                                  {queues.map((queue) => (
                                    <MenuItem key={queue.id} value={queue.id}>
                                      {queue.name}
                                    </MenuItem>
                                  ))}
                                </Field>
                              </FormControl>
                              <Typography className={classes.fieldHelper}>
                                Cola donde se asignarán los tickets generados
                                por la importación.
                              </Typography>
                            </Grid>
                          </Grid>
                        )}
                        {enableImportMessage && (
                          <Typography
                            className={classes.fieldHelper}
                            style={{ color: "#DC2626", marginTop: 8 }}
                          >
                            ⚠ {i18n.t("whatsappModal.form.importAlert")}
                          </Typography>
                        )}
                      </Box>
                    )}

                    {/* === SECCIÓN: TOKEN DE API === */}
                    <Box className={classes.sectionCard}>
                      <Box className={classes.sectionHeader}>
                        <Typography className={classes.sectionTitle}>
                          🔑 Token de integración (API externa)
                        </Typography>
                      </Box>
                      <Typography className={classes.sectionDesc}>
                        Token que se usa para enviar mensajes desde sistemas
                        externos a esta conexión vía{" "}
                        <code>POST /api/messages/send</code>. También se usa
                        como <code>verify_token</code> al configurar el webhook
                        en Meta. ⚠ Manténlo en secreto.
                      </Typography>
                      <Box className={classes.tokenBox}>
                        <Field
                          as={TextField}
                          type="token"
                          fullWidth
                          value={autoToken}
                          variant="outlined"
                          margin="dense"
                          disabled
                          style={{ marginTop: 0, marginBottom: 0 }}
                        />
                        <Button
                          onClick={handleRefreshToken}
                          disabled={isSubmitting}
                          className={classes.tokenRefresh}
                          variant="text"
                          title="Regenerar token"
                          startIcon={
                            <Autorenew style={{ color: "#22C55E" }} />
                          }
                        />
                        <Button
                          onClick={handleCopyToken}
                          className={classes.tokenRefresh}
                          variant="text"
                          title="Copiar token al portapapeles"
                          startIcon={
                            <FileCopy
                              style={{ color: copied ? "#1877F2" : "inherit" }}
                            />
                          }
                        />
                      </Box>
                      <Typography className={classes.fieldHelper}>
                        {copied
                          ? "✓ Token copiado al portapapeles"
                          : "Al regenerar, los integraciones que usen el token anterior dejarán de funcionar hasta actualizarlas."}
                      </Typography>
                    </Box>

                    {/* === SECCIÓN: REENVÍO AUTOMÁTICO === */}
                    <Box className={classes.sectionCard}>
                      <Box className={classes.sectionHeader}>
                        <Typography className={classes.sectionTitle}>
                          ➡ Reenvío automático a cola
                        </Typography>
                      </Box>
                      <Typography className={classes.sectionDesc}>
                        {i18n.t("whatsappModal.form.queueRedirectionDesc")}
                      </Typography>
                      <Grid spacing={2} container>
                        <Grid xs={6} md={6} item>
                          <FormControl
                            variant="outlined"
                            margin="dense"
                            className={classes.FormControl}
                            fullWidth
                          >
                            <InputLabel id="sendIdQueue-selection-label">
                              {i18n.t("whatsappModal.form.sendIdQueue")}
                            </InputLabel>
                            <Field
                              as={Select}
                              name="sendIdQueue"
                              id="sendIdQueue"
                              value={values.sendIdQueue || "0"}
                              required={values.timeSendQueue > 0}
                              label={i18n.t("whatsappModal.form.sendIdQueue")}
                              placeholder={i18n.t(
                                "whatsappModal.form.sendIdQueue"
                              )}
                              labelId="sendIdQueue-selection-label"
                            >
                              <MenuItem value={0}>&nbsp;</MenuItem>
                              {queues.map((queue) => (
                                <MenuItem key={queue.id} value={queue.id}>
                                  {queue.name}
                                </MenuItem>
                              ))}
                            </Field>
                          </FormControl>
                        </Grid>

                        <Grid xs={12} md={6} item>
                          <Field
                            as={TextField}
                            label={i18n.t("whatsappModal.form.timeSendQueue")}
                            fullWidth
                            name="timeSendQueue"
                            variant="outlined"
                            margin="dense"
                            error={
                              touched.timeSendQueue &&
                              Boolean(errors.timeSendQueue)
                            }
                            helperText={
                              (touched.timeSendQueue &&
                                errors.timeSendQueue) ||
                              "Minutos de espera. 0 = no aplicar reenvío automático."
                            }
                          />
                        </Grid>
                      </Grid>
                    </Box>
                  </DialogContent>
                </TabPanel>
                <TabPanel
                  className={classes.container}
                  value={tab}
                  name={"integrations"}
                >
                  <DialogContent dividers>
                    {/* === SECCIÓN: COLAS ASIGNADAS === */}
                    <Box className={classes.sectionCard}>
                      <Box className={classes.sectionHeader}>
                        <Typography className={classes.sectionTitle}>
                          👥 Colas asignadas
                        </Typography>
                      </Box>
                      <Typography className={classes.sectionDesc}>
                        Selecciona a qué colas se enrutan los tickets que llegan
                        a este número. El cliente verá un menú para elegir cuando
                        haya más de una; con una sola cola, los tickets se
                        asignan directamente.
                      </Typography>
                      <QueueSelect
                        selectedQueueIds={selectedQueueIds}
                        onChange={(selectedIds) => handleChangeQueue(selectedIds)}
                      />
                      <Typography className={classes.fieldHelper}>
                        ℹ Asignar al menos una cola permite que los agentes vean
                        los tickets. Sin cola asignada, los mensajes quedan
                        huérfanos.
                      </Typography>
                    </Box>

                    {/* === SECCIÓN: LLAMADAS WAVOIP (opcional) === */}
                    {showWavoipCall && (
                      <Box className={classes.sectionCard}>
                        <Box className={classes.sectionHeader}>
                          <Typography className={classes.sectionTitle}>
                            📞 Llamadas de voz (Wavoip)
                          </Typography>
                        </Box>
                        <Typography className={classes.sectionDesc}>
                          Servicio externo de pago que permite hacer y recibir
                          llamadas de WhatsApp desde el panel. Solo necesario si
                          tu plan tiene esta función habilitada.
                        </Typography>
                        <Field
                          as={TextField}
                          label="Token Wavoip"
                          fullWidth
                          name="wavoip"
                          variant="outlined"
                          margin="dense"
                          helperText={
                            <span>
                              Obtén tu token en{" "}
                              <a
                                href="https://app.wavoip.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: "#1877F2", fontWeight: 600 }}
                              >
                                wavoip.com
                              </a>
                              . Sin token no funcionarán las llamadas; el resto
                              de mensajería sigue normal.
                            </span>
                          }
                        />
                      </Box>
                    )}

                    {/* === SECCIÓN: INTEGRACIÓN AL INICIO (chatbot externo) === */}
                    {showIntegrations && (
                      <Box className={classes.sectionCard}>
                        <Box className={classes.sectionHeader}>
                          <Typography className={classes.sectionTitle}>
                            🔌 Integración al inicio del chat (chatbot externo)
                          </Typography>
                        </Box>
                        <Typography className={classes.sectionDesc}>
                          Cuando llega un mensaje nuevo, antes de pasar a la
                          cola, el ticket se enruta primero a esta integración
                          (n8n, Typebot, Dialogflow…). Útil para preguntas
                          frecuentes automáticas, calificación previa o
                          enrutamiento inteligente. Configura las integraciones
                          en{" "}
                          <strong>
                            Configuración → Integraciones de cola
                          </strong>
                          .
                        </Typography>
                        <FormControl
                          variant="outlined"
                          margin="dense"
                          fullWidth
                        >
                          <InputLabel id="integrationId-selection-label">
                            Integración a ejecutar al iniciar conversación
                          </InputLabel>
                          <Field
                            as={Select}
                            label="Integración a ejecutar al iniciar conversación"
                            name="integrationId"
                            id="integrationId"
                            variant="outlined"
                            margin="dense"
                            labelId="integrationId-selection-label"
                          >
                            <MenuItem value={null}>
                              — Deshabilitado (ir directo a la cola) —
                            </MenuItem>
                            {integrations.map((integration) => (
                              <MenuItem
                                key={integration.id}
                                value={integration.id}
                              >
                                {integration.name} ({integration.type})
                              </MenuItem>
                            ))}
                          </Field>
                        </FormControl>
                      </Box>
                    )}

                    {/* === SECCIÓN: AGENTE DE IA (OpenAI) === */}
                    {showOpenAi && (
                      <Box className={classes.sectionCard}>
                        <Box className={classes.sectionHeader}>
                          <Typography className={classes.sectionTitle}>
                            🤖 Agente de IA
                          </Typography>
                        </Box>
                        <Typography className={classes.sectionDesc}>
                          Asigna un Agente de IA (configurado en{" "}
                          <strong>Configuración → Agentes IA</strong>) que
                          responderá automáticamente a los mensajes entrantes en
                          esta conexión. Tiene prioridad sobre la integración
                          externa de arriba. Al seleccionar un agente, se
                          deselecciona la cola — el agente la gestiona.
                        </Typography>
                        <FormControl margin="dense" variant="outlined" fullWidth>
                          <InputLabel>
                            {i18n.t("whatsappModal.form.prompt")}
                          </InputLabel>
                          <Select
                            labelId="dialog-select-prompt-label"
                            id="dialog-select-prompt"
                            name="promptId"
                            value={selectedPrompt || ""}
                            onChange={handleChangePrompt}
                            label={i18n.t("whatsappModal.form.prompt")}
                            fullWidth
                            MenuProps={{
                              anchorOrigin: {
                                vertical: "bottom",
                                horizontal: "left",
                              },
                              transformOrigin: {
                                vertical: "top",
                                horizontal: "left",
                              },
                              getContentAnchorEl: null,
                            }}
                          >
                            <MenuItem value="">
                              — Sin agente —
                            </MenuItem>
                            {prompts.map((prompt) => (
                              <MenuItem key={prompt.id} value={prompt.id}>
                                🤖 {prompt.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <Typography className={classes.fieldHelper}>
                          💡 El agente usa su propia API Key de OpenAI y la base
                          de conocimiento que tenga configurada.
                        </Typography>
                      </Box>
                    )}

                    {/* === SECCIÓN: TRIGGER AL CERRAR === */}
                    <Box className={classes.sectionCard}>
                      <Box className={classes.sectionHeader}>
                        <Typography className={classes.sectionTitle}>
                          🔚 Integración al cerrar el ticket
                        </Typography>
                      </Box>
                      <Typography className={classes.sectionDesc}>
                        Cuando el agente cierra un ticket, dispara una
                        integración externa (por ejemplo, registrar en CRM,
                        enviar encuesta NPS, sincronizar con base de datos…).
                        Solo se permiten integraciones de tipo n8n o Typebot
                        para esta acción.
                      </Typography>
                      <FormControl
                        variant="outlined"
                        margin="dense"
                        fullWidth
                      >
                        <InputLabel id="triggerIntegrationOnClose-selection-label">
                          ¿Disparar integración al cerrar?
                        </InputLabel>
                        <Field
                          onChange={handleChange}
                          value={triggerIntegrationOnClose}
                          as={Select}
                          label="¿Disparar integración al cerrar?"
                          name="triggerIntegrationOnClose"
                          id="triggerIntegrationOnClose"
                          variant="outlined"
                          margin="dense"
                          labelId="triggerIntegrationOnClose-selection-label"
                        >
                          <MenuItem value={false}>
                            ✕ No disparar nada al cerrar
                          </MenuItem>
                          <MenuItem value={true}>
                            ✓ Sí, ejecutar una integración
                          </MenuItem>
                        </Field>
                      </FormControl>

                      {triggerIntegrationOnClose && (
                        <Box mt={1}>
                          <FormControl
                            variant="outlined"
                            margin="dense"
                            fullWidth
                          >
                            <InputLabel id="integrationType-selection-label">
                              Integración a ejecutar
                            </InputLabel>
                            <Field
                              as={Select}
                              label="Integración a ejecutar"
                              name="integrationType"
                              id="integrationType"
                              variant="outlined"
                              margin="dense"
                              labelId="integrationType-selection-label"
                              value={integrationTypeId}
                              onChange={handleIntegrationTypeChange}
                            >
                              <MenuItem value={null}>
                                — Selecciona una integración —
                              </MenuItem>
                              {integrations
                                .filter(
                                  (integration) =>
                                    integration.type === "n8n" ||
                                    integration.type === "typebot"
                                )
                                .map((integration) => (
                                  <MenuItem
                                    key={integration.id}
                                    value={integration.id}
                                  >
                                    {integration.name} ({integration.type})
                                  </MenuItem>
                                ))}
                            </Field>
                          </FormControl>
                          <Typography className={classes.fieldHelper}>
                            Se enviará un webhook con los datos del ticket
                            (cliente, agente, fecha, motivo de cierre).
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </DialogContent>
                </TabPanel>
                <TabPanel
                  className={classes.container}
                  value={tab}
                  name={"messages"}
                >
                  <DialogContent dividers>
                    {/* PANEL DE VARIABLES DISPONIBLES */}
                    <Box
                      mb={2}
                      p={1.5}
                      style={{
                        border: "1px dashed #cbd5e1",
                        borderRadius: 8,
                        backgroundColor: "#F8FAFC",
                      }}
                    >
                      <Typography variant="caption" style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>
                        💡 Variables disponibles — haz clic para insertarlas en el campo activo ({focusedMsgField === "greetingMessage" ? "Saludo" : focusedMsgField === "complationMessage" ? "Conclusión" : focusedMsgField === "outOfHoursMessage" ? "Fuera de horario" : focusedMsgField === "collectiveVacationMessage" ? "Vacaciones" : "Saludo"}):
                      </Typography>
                      <Box display="flex" flexWrap="wrap" gridGap={6} style={{ gap: 6 }}>
                        {[
                          { v: "{{firstName}}", d: "Primer Nombre" },
                          { v: "{{name}}", d: "Nombre completo" },
                          { v: "{{userName}}", d: "Agente" },
                          { v: "{{ms}}", d: "Saludo según horario" },
                          { v: "{{protocol}}", d: "Protocolo" },
                          { v: "{{date}}", d: "Fecha" },
                          { v: "{{hour}}", d: "Hora" },
                          { v: "{{ticket_id}}", d: "Nº del Ticket" },
                          { v: "{{queue}}", d: "Sector" },
                          { v: "{{connection}}", d: "Conexión" },
                          { v: "{{data_hora}}", d: "Fecha programada" },
                        ].map(({ v, d }) => (
                          <Chip
                            key={v}
                            size="small"
                            label={d}
                            title={`Inserta ${v} en ${focusedMsgField}`}
                            onClick={() => {
                              const fieldName = focusedMsgField || "greetingMessage";
                              const current = values[fieldName] || "";
                              const pos = msgFieldCursors[fieldName] ?? current.length;
                              const next = current.substring(0, pos) + v + current.substring(pos);
                              setFieldValue(fieldName, next);
                              // Restaurar foco al campo y posicionar cursor después del var insertado
                              setTimeout(() => {
                                const el = document.querySelector(`textarea[name="${fieldName}"]`);
                                if (el) {
                                  el.focus();
                                  const newPos = pos + v.length;
                                  el.setSelectionRange(newPos, newPos);
                                  setMsgFieldCursors(prev => ({ ...prev, [fieldName]: newPos }));
                                }
                              }, 0);
                            }}
                            style={{
                              fontSize: "0.72rem",
                              cursor: "pointer",
                              backgroundColor: "#fff",
                              border: "1px solid #cbd5e1",
                            }}
                          />
                        ))}
                      </Box>
                      <Typography variant="caption" color="textSecondary" style={{ display: "block", marginTop: 6 }}>
                        Ejemplo: <code>Hola {`{{firstName}}`}, {`{{ms}}`}. Tu protocolo es {`{{protocol}}`}.</code>
                      </Typography>
                    </Box>

                    {/* MENSAGEM DE SAUDAÇÃO */}
                    <Grid container spacing={1}>
                      <Grid item xs={12} md={12} xl={12}>
                        <Field
                          as={TextField}
                          label={i18n.t("whatsappModal.form.greetingMessage")}
                          type="greetingMessage"
                          multiline
                          rows={4}
                          fullWidth
                          name="greetingMessage"
                          error={
                            touched.greetingMessage &&
                            Boolean(errors.greetingMessage)
                          }
                          helperText={
                            touched.greetingMessage && errors.greetingMessage
                          }
                          variant="outlined"
                          margin="dense"
                          onFocus={() => setFocusedMsgField("greetingMessage")}
                          onSelect={(e) => {
                            const pos = e?.target?.selectionStart;
                            if (pos != null) setMsgFieldCursors(p => ({ ...p, greetingMessage: pos }));
                          }}
                        />
                      </Grid>

                      {/* MENSAGEM DE CONCLUSÃO */}
                      <Grid item xs={12} md={12} xl={12}>
                        <Field
                          as={TextField}
                          label={i18n.t("whatsappModal.form.complationMessage")}
                          multiline
                          rows={4}
                          fullWidth
                          name="complationMessage"
                          error={
                            touched.complationMessage &&
                            Boolean(errors.complationMessage)
                          }
                          helperText={
                            touched.complationMessage &&
                            errors.complationMessage
                          }
                          variant="outlined"
                          margin="dense"
                          onFocus={() => setFocusedMsgField("complationMessage")}
                          onSelect={(e) => {
                            const pos = e?.target?.selectionStart;
                            if (pos != null) setMsgFieldCursors(p => ({ ...p, complationMessage: pos }));
                          }}
                        />
                      </Grid>

                      {/* MENSAGEM DE FORA DE EXPEDIENTE */}
                      <Grid item xs={12} md={12} xl={12}>
                        <Typography variant="caption" color="textSecondary" style={{ display: "block", marginTop: 8, marginBottom: 4 }}>
                          ⏰ Este mensaje se enviará automáticamente cuando un cliente escriba <strong>fuera del horario de atención</strong>. Los horarios se configuran en la <strong>cola del ticket</strong> o en esta conexión (pestaña Horarios/Schedules de cada una). Si ambas están configuradas, prevalece la de la cola.
                        </Typography>
                        <Field
                          as={TextField}
                          label={i18n.t("whatsappModal.form.outOfHoursMessage")}
                          multiline
                          rows={4}
                          fullWidth
                          name="outOfHoursMessage"
                          error={
                            touched.outOfHoursMessage &&
                            Boolean(errors.outOfHoursMessage)
                          }
                          helperText={
                            touched.outOfHoursMessage &&
                            errors.outOfHoursMessage
                          }
                          variant="outlined"
                          margin="dense"
                          onFocus={() => setFocusedMsgField("outOfHoursMessage")}
                          onSelect={(e) => {
                            const pos = e?.target?.selectionStart;
                            if (pos != null) setMsgFieldCursors(p => ({ ...p, outOfHoursMessage: pos }));
                          }}
                        />
                      </Grid>
                      {/* MENSAGEM DE FÉRIAS COLETIVAS */}
                      <Grid item xs={12} md={12} xl={12}>
                        <Typography variant="caption" color="textSecondary" style={{ display: "block", marginTop: 8, marginBottom: 4 }}>
                          📅 El mensaje de vacaciones se enviará automáticamente durante el rango de fechas (inicial-final) que definas abajo, reemplazando los mensajes normales de saludo/fuera de horario.
                        </Typography>
                        <Field
                          as={TextField}
                          label={i18n.t(
                            "whatsappModal.form.collectiveVacationMessage"
                          )}
                          multiline
                          rows={4}
                          fullWidth
                          name="collectiveVacationMessage"
                          error={
                            touched.collectiveVacationMessage &&
                            Boolean(errors.collectiveVacationMessage)
                          }
                          helperText={
                            touched.collectiveVacationMessage &&
                            errors.collectiveVacationMessage
                          }
                          variant="outlined"
                          margin="dense"
                          onFocus={() => setFocusedMsgField("collectiveVacationMessage")}
                          onSelect={(e) => {
                            const pos = e?.target?.selectionStart;
                            if (pos != null) setMsgFieldCursors(p => ({ ...p, collectiveVacationMessage: pos }));
                          }}
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <Field
                          fullWidth
                          as={TextField}
                          label={i18n.t(
                            "whatsappModal.form.collectiveVacationStart"
                          )}
                          type="date"
                          name="collectiveVacationStart"
                          required={
                            values.collectiveVacationMessage?.length > 0
                          }
                          inputProps={{
                            min: moment().add(-10, "days").format("YYYY-MM-DD"),
                          }}
                          //min="2022-11-06T22:22:55"
                          InputLabelProps={{
                            shrink: true,
                          }}
                          error={
                            touched.collectiveVacationStart &&
                            Boolean(errors.collectiveVacationStart)
                          }
                          helperText={
                            touched.collectiveVacationStart &&
                            errors.collectiveVacationStart
                          }
                          variant="outlined"
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <Field
                          fullWidth
                          as={TextField}
                          label={i18n.t(
                            "whatsappModal.form.collectiveVacationEnd"
                          )}
                          type="date"
                          name="collectiveVacationEnd"
                          required={
                            values.collectiveVacationMessage?.length > 0
                          }
                          inputProps={{
                            min: moment().add(-10, "days").format("YYYY-MM-DD"),
                          }}
                          //min="2022-11-06T22:22:55"
                          InputLabelProps={{
                            shrink: true,
                          }}
                          error={
                            touched.collectiveVacationEnd &&
                            Boolean(errors.collectiveVacationEnd)
                          }
                          helperText={
                            touched.collectiveVacationEnd &&
                            errors.collectiveVacationEnd
                          }
                          variant="outlined"
                        />
                      </Grid>
                    </Grid>
                  </DialogContent>
                </TabPanel>

                <TabPanel
                  className={classes.container}
                  value={tab}
                  name={"chatbot"}
                >
                  <DialogContent dividers>
                    <Grid spacing={2} container>
                      {/* TEMPO PARA CRIAR NOVO TICKET */}
                      <Grid xs={6} md={3} item>
                        <Field
                          as={TextField}
                          label={i18n.t(
                            "whatsappModal.form.timeCreateNewTicket"
                          )}
                          fullWidth
                          name="timeCreateNewTicket"
                          variant="outlined"
                          margin="dense"
                          error={
                            touched.timeCreateNewTicket &&
                            Boolean(errors.timeCreateNewTicket)
                          }
                          helperText={
                            touched.timeCreateNewTicket &&
                            errors.timeCreateNewTicket
                          }
                        />
                      </Grid>

                      {/* QUANTIDADE MÁXIMA DE VEZES QUE O CHATBOT VAI SER ENVIADO */}
                      <Grid xs={6} md={3} item>
                        <Field
                          as={TextField}
                          label={i18n.t("whatsappModal.form.maxUseBotQueues")}
                          fullWidth
                          name="maxUseBotQueues"
                          variant="outlined"
                          margin="dense"
                          error={
                            touched.maxUseBotQueues &&
                            Boolean(errors.maxUseBotQueues)
                          }
                          helperText={
                            touched.maxUseBotQueues && errors.maxUseBotQueues
                          }
                        />
                      </Grid>
                      {/* TEMPO PARA ENVIO DO CHATBOT */}
                      <Grid xs={6} md={3} item>
                        <Field
                          as={TextField}
                          label={i18n.t("whatsappModal.form.timeUseBotQueues")}
                          fullWidth
                          name="timeUseBotQueues"
                          variant="outlined"
                          margin="dense"
                          error={
                            touched.timeUseBotQueues &&
                            Boolean(errors.timeUseBotQueues)
                          }
                          helperText={
                            touched.timeUseBotQueues && errors.timeUseBotQueues
                          }
                        />
                      </Grid>
                      {/* TEMPO PARA RETORNAR A FILA */}
                      <Grid xs={6} md={3} item>
                        <Field
                          as={TextField}
                          label={i18n.t("whatsappModal.form.timeToReturnQueue")}
                          fullWidth
                          name="timeToReturnQueue"
                          variant="outlined"
                          margin="dense"
                          error={
                            touched.timeToReturnQueue &&
                            Boolean(errors.timeToReturnQueue)
                          }
                          helperText={
                            touched.timeToReturnQueue &&
                            errors.timeToReturnQueue
                          }
                        />
                      </Grid>
                    </Grid>
                    <Grid spacing={2} container>
                      {/* ENCERRAR CHATS ABERTOS APÓS X HORAS */}
                      <Grid xs={6} md={6} item>
                        <Field
                          as={TextField}
                          label={i18n.t("whatsappModal.form.expiresTicket")}
                          fullWidth
                          name="expiresTicket"
                          required={values.timeInactiveMessage > 0}
                          variant="outlined"
                          margin="dense"
                          error={
                            touched.expiresTicket &&
                            Boolean(errors.expiresTicket)
                          }
                          helperText={
                            touched.expiresTicket && errors.expiresTicket
                          }
                        />
                      </Grid>
                      {/* TEMPO PARA ENVIO DO CHATBOT */}
                      <Grid xs={6} md={6} item>
                        <FormControl
                          variant="outlined"
                          margin="dense"
                          fullWidth
                        // className={classes.formControl}
                        >
                          <InputLabel id="whenExpiresTicket-selection-label">
                            {i18n.t("whatsappModal.form.whenExpiresTicket")}
                          </InputLabel>
                          <Field
                            as={Select}
                            label={i18n.t(
                              "whatsappModal.form.whenExpiresTicket"
                            )}
                            placeholder={i18n.t(
                              "whatsappModal.form.whenExpiresTicket"
                            )}
                            labelId="whenExpiresTicket-selection-label"
                            id="whenExpiresTicket"
                            name="whenExpiresTicket"
                          >
                            <MenuItem value={"0"}>
                              {i18n.t(
                                "whatsappModal.form.closeLastMessageOptions1"
                              )}
                            </MenuItem>
                            <MenuItem value={"1"}>
                              {i18n.t(
                                "whatsappModal.form.closeLastMessageOptions2"
                              )}
                            </MenuItem>
                          </Field>
                        </FormControl>
                      </Grid>
                    </Grid>
                    {/* MENSAGEM POR INATIVIDADE*/}
                    <div>
                      <Field
                        as={TextField}
                        label={i18n.t(
                          "whatsappModal.form.expiresInactiveMessage"
                        )}
                        multiline
                        rows={4}
                        fullWidth
                        name="expiresInactiveMessage"
                        error={
                          touched.expiresInactiveMessage &&
                          Boolean(errors.expiresInactiveMessage)
                        }
                        helperText={
                          touched.expiresInactiveMessage &&
                          errors.expiresInactiveMessage
                        }
                        variant="outlined"
                        margin="dense"
                      />
                    </div>

                    {/* TEMPO PARA ENVIO DE MENSAGEM POR INATIVIDADE */}
                    <Field
                      as={TextField}
                      label={i18n.t("whatsappModal.form.timeInactiveMessage")}
                      fullWidth
                      name="timeInactiveMessage"
                      variant="outlined"
                      margin="dense"
                      error={
                        touched.timeInactiveMessage &&
                        Boolean(errors.timeInactiveMessage)
                      }
                      helperText={
                        touched.timeInactiveMessage &&
                        errors.timeInactiveMessage
                      }
                    />
                    {/* MENSAGEM POR INATIVIDADE*/}
                    <div>
                      <Field
                        as={TextField}
                        label={i18n.t("whatsappModal.form.inactiveMessage")}
                        multiline
                        rows={4}
                        fullWidth
                        name="inactiveMessage"
                        error={
                          touched.inactiveMessage &&
                          Boolean(errors.inactiveMessage)
                        }
                        helperText={
                          touched.inactiveMessage && errors.inactiveMessage
                        }
                        variant="outlined"
                        margin="dense"
                      />
                    </div>


                    <Grid spacing={2} container>
                      {user.showFlow === "enabled" && (
                        <>
                          {/* TEMPO PARA ENVIO DE MENSAGEM POR INATIVIDADE */}
                          <Grid xs={6} md={4} item>
                            <Field
                              as={TextField}
                              label={i18n.t("whatsappModal.form.flowInactiveTime")}
                              fullWidth
                              name="flowInactiveTime"
                              variant="outlined"
                              margin="dense"
                              error={
                                touched.flowIdInactiveTime &&
                                Boolean(errors.flowIdInactiveTime)
                              }
                              helperText={
                                touched.flowIdInactiveTime &&
                                errors.flowIdInactiveTime
                              }
                            />
                          </Grid>
                        </>
                      )}
                      {/* QUANTIDADE MÁXIMA DE VEZES QUE O FLOW DE INATIVIDADE VAI SER ENVIADO */}
                      <Grid xs={6} md={4} item>
                        <Field
                          as={TextField}
                          label={i18n.t(
                            "whatsappModal.form.maxUseInactiveTime"
                          )}
                          fullWidth
                          name="maxUseInactiveTime"
                          variant="outlined"
                          margin="dense"
                          error={
                            touched.maxUseInactiveTime &&
                            Boolean(errors.maxUseInactiveTime)
                          }
                          helperText={
                            touched.maxUseInactiveTime &&
                            errors.maxUseInactiveTime
                          }
                        />
                      </Grid>

                      {user.showFlow === "enabled" && (
                        <Grid xs={6} md={4} item>
                          {/* FLUXO DE INATIVIDADE */}
                          <div>
                            <FormControl
                              variant="outlined"
                              margin="dense"
                              className={classes.FormControl}
                              fullWidth
                            >
                              <Select
                                name="flowIdInactiveTime"
                                value={flowIdInactiveTime || ""}
                                onChange={handleChangeFlowIdInactiveTime}
                                id="flowIdInactiveTime"
                                variant="outlined"
                                margin="dense"
                                labelId="flowIdInactiveTime-selection-label"
                              >
                                <MenuItem value={null}>{"Desabilitado"}</MenuItem>
                                {webhooks.map((webhook) => (
                                  <MenuItem key={webhook.id} value={webhook.id}>
                                    {webhook.name}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </div>
                        </Grid>
                      )}
                    </Grid>

                    {/* <Grid spacing={2} container>
                      <Grid xs={6} md={4} item>
                        <Field
                          as={TextField}
                          label={i18n.t("whatsappModal.form.timeAwaitActiveFlow")}
                          fullWidth
                          name="timeAwaitActiveFlow"
                          variant="outlined"
                          margin="dense"
                          error={
                            touched.timeAwaitActiveFlow &&
                            Boolean(errors.timeAwaitActiveFlow)
                          }
                          helperText={
                            touched.timeAwaitActiveFlow &&
                            errors.timeAwaitActiveFlow
                          }
                        />
                      </Grid>

                      <Grid xs={6} md={4} item>
                        <div>
                          <FormControl
                            variant="outlined"
                            margin="dense"
                            className={classes.FormControl}
                            fullWidth
                          >
                            <Select
                              name="timeAwaitActiveFlowId"
                              value={timeAwaitActiveFlowId || ""}
                              onChange={handleChangeTimeAwaitActiveFlowId}
                              id="timeAwaitActiveFlowId"
                              variant="outlined"
                              margin="dense"
                              labelId="timeAwaitActiveFlowId-selection-label"
                            >
                              <MenuItem value={null}>{"Desabilitado"}</MenuItem>
                              {webhooks.map((webhook) => (
                                <MenuItem key={webhook.id} value={webhook.id}>
                                  {webhook.name}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </div>
                      </Grid>
                    </Grid> */}
                  </DialogContent>
                </TabPanel>

                {/* NPS */}
                <TabPanel
                  className={classes.container}
                  value={tab}
                  name={"nps"}
                >
                  <DialogContent dividers>
                    {/* MENSAGEM DE AVALIAÇAO*/}
                    <div>
                      <Field
                        as={TextField}
                        label={i18n.t("whatsappModal.form.ratingMessage")}
                        multiline
                        rows={4}
                        fullWidth
                        name="ratingMessage"
                        error={
                          touched.ratingMessage && Boolean(errors.ratingMessage)
                        }
                        helperText={
                          touched.ratingMessage && errors.ratingMessage
                        }
                        variant="outlined"
                        margin="dense"
                      />
                    </div>
                    {/* QUANTIDADE MÁXIMA DE VEZES QUE O NPS VAI SER ENVIADO */}
                    <div>
                      <Field
                        as={TextField}
                        label={i18n.t("whatsappModal.form.maxUseBotQueuesNPS")}
                        fullWidth
                        name="maxUseBotQueuesNPS"
                        variant="outlined"
                        margin="dense"
                        error={
                          touched.maxUseBotQueuesNPS &&
                          Boolean(errors.maxUseBotQueuesNPS)
                        }
                        helperText={
                          touched.maxUseBotQueuesNPS &&
                          errors.maxUseBotQueuesNPS
                        }
                      />
                    </div>
                    {/* ENCERRAR CHATS NPS APÓS X Minutos */}
                    <div>
                      <Field
                        as={TextField}
                        label={i18n.t("whatsappModal.form.expiresTicketNPS")}
                        fullWidth
                        name="expiresTicketNPS"
                        variant="outlined"
                        margin="dense"
                        error={
                          touched.expiresTicketNPS &&
                          Boolean(errors.expiresTicketNPS)
                        }
                        helperText={
                          touched.expiresTicketNPS && errors.expiresTicketNPS
                        }
                      />
                    </div>
                  </DialogContent>
                </TabPanel>

                {/* Flowbuilder */}
                {showIntegrations && user.showFlow === "enabled" && (
                  <>
                    <TabPanel
                      className={classes.container}
                      value={tab}
                      name={"flowbuilder"}
                    >
                      <DialogContent>
                        <h3>Fluxo de boas vindas</h3>
                        <p>
                          Este fluxo é disparado apenas para novos contatos,
                          pessoas que voce não possui em sua lista de contatos e
                          que mandaram uma mensagem
                        </p>
                        <FormControl
                          variant="outlined"
                          margin="dense"
                          className={classes.FormControl}
                          fullWidth
                        >
                          <Select
                            name="flowIdWelcome"
                            value={flowIdWelcome || ""}
                            onChange={handleChangeFlowIdWelcome}
                            id="flowIdWelcome"
                            variant="outlined"
                            margin="dense"
                            labelId="flowIdWelcome-selection-label"
                          >
                            <MenuItem value={null}>{"Desabilitado"}</MenuItem>
                            {webhooks.map((webhook) => (
                              <MenuItem key={webhook.id} value={webhook.id}>
                                {webhook.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </DialogContent>
                      <DialogContent>
                        <h3>Fluxo de resposta padrão</h3>
                        <p>
                          Resposta Padrão é enviada com qualquer caractere
                          diferente de uma palavra chave. ATENÇÃO! Será
                          disparada se o atendimento ja estiver fechado.
                        </p>
                        <FormControl
                          variant="outlined"
                          margin="dense"
                          className={classes.FormControl}
                          fullWidth
                        >
                          <Select
                            name="flowNotIdPhrase"
                            value={flowIdNotPhrase || ""}
                            onChange={handleChangeFlowIdNotPhrase}
                            id="flowNotIdPhrase"
                            variant="outlined"
                            margin="dense"
                            labelId="flowNotIdPhrase-selection-label"
                          >
                            <MenuItem value={null}>{"Desabilitado"}</MenuItem>
                            {webhooks.map((webhook) => (
                              <MenuItem key={webhook.id} value={webhook.id}>
                                {webhook.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </DialogContent>
                    </TabPanel>
                  </>
                )}

                {/* Schedules */}
                <TabPanel
                  className={classes.container}
                  value={tab}
                  name={"schedules"}
                >
                  {tab === "schedules" && (
                    <Paper style={{ padding: 20 }}>
                      <SchedulesForm
                        loading={false}
                        onSubmit={handleSaveSchedules}
                        initialValues={schedules}
                        labelSaveButton={i18n.t("whatsappModal.buttons.okAdd")}
                      />
                    </Paper>
                  )}
                </TabPanel>
              </Paper>
              <DialogActions>
                <Button
                  onClick={handleClose}
                  color="secondary"
                  disabled={isSubmitting}
                  variant="outlined"
                >
                  {i18n.t("whatsappModal.buttons.cancel")}
                </Button>
                <Button
                  type="submit"
                  color="primary"
                  disabled={isSubmitting}
                  variant="contained"
                  className={classes.btnWrapper}
                >
                  {whatsAppId
                    ? i18n.t("whatsappModal.buttons.okEdit")
                    : i18n.t("whatsappModal.buttons.okAdd")}
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
    </div >
  );
};

export default React.memo(WhatsAppModal);
