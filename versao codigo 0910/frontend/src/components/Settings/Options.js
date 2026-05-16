import React, { useEffect, useState, useMemo } from "react";

import Grid from "@material-ui/core/Grid";
import MenuItem from "@material-ui/core/MenuItem";
import FormControl from "@material-ui/core/FormControl";
import InputLabel from "@material-ui/core/InputLabel";
import Select from "@material-ui/core/Select";
import FormHelperText from "@material-ui/core/FormHelperText";

import useSettings from "../../hooks/useSettings";
import { ToastContainer, toast } from 'react-toastify';
import { makeStyles } from "@material-ui/core/styles";
import { grey, blue } from "@material-ui/core/colors";

import { Tab, Tabs, TextField, Switch as MuiSwitch } from "@material-ui/core";
import {
  Tune as TuneIcon,
  Forum as ForumIcon,
  Security as SecurityIcon,
  Payment as PaymentIcon,
  Message as MessageIcon,
  AlternateEmail as AlternateEmailIcon,
} from "@material-ui/icons";
import { i18n } from "../../translate/i18n";
import useCompanySettings from "../../hooks/useSettings/companySettings";
import { ALL_TIMEZONES } from "../../data/timezones";

const useStyles = makeStyles((theme) => ({
  pageRoot: {
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(2.5),
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(4),
  },
  sectionCard: {
    padding: theme.spacing(3),
    borderRadius: 14,
    border: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
    [theme.breakpoints.down("sm")]: {
      padding: theme.spacing(2),
      borderRadius: 10,
    },
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1.5),
    marginBottom: theme.spacing(2.5),
  },
  sectionIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor:
      theme.palette.type === "dark" ? "rgba(59,130,246,0.15)" : "#EBF5FF",
    color: theme.palette.primary.main,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 20,
  },
  sectionTitle: {
    fontSize: "1rem",
    fontWeight: 600,
    lineHeight: 1.2,
  },
  sectionSubtitle: {
    fontSize: "0.8rem",
    color: theme.palette.text.secondary,
    marginTop: 2,
  },
  fixedHeightPaper: {
    padding: theme.spacing(2),
    display: "flex",
    overflow: "auto",
    flexDirection: "column",
    height: 240,
  },
  cardAvatar: {
    fontSize: "55px",
    color: grey[500],
    backgroundColor: "#ffffff",
    width: theme.spacing(7),
    height: theme.spacing(7),
  },
  cardTitle: { fontSize: "18px", color: blue[700] },
  cardSubtitle: { color: grey[600], fontSize: "14px" },
  alignRight: { textAlign: "right" },
  fullWidth: { width: "100%" },
  selectContainer: { width: "100%", textAlign: "left" },
  // Estilos para SwitchOption (toggle moderno)
  switchOption: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: theme.spacing(1.5),
    padding: theme.spacing(1.25, 1.5),
    borderRadius: 10,
    border: `1px solid ${theme.palette.divider}`,
    background:
      theme.palette.type === "dark"
        ? "rgba(255,255,255,0.02)"
        : "rgba(248,250,252,0.5)",
    transition: "all 0.15s ease",
    height: "100%",
    "&:hover": {
      borderColor: theme.palette.primary.main,
      background:
        theme.palette.type === "dark"
          ? "rgba(255,255,255,0.04)"
          : "rgba(248,250,252,0.9)",
    },
  },
  switchLabel: {
    fontSize: "0.86rem",
    fontWeight: 600,
    lineHeight: 1.3,
    color: theme.palette.text.primary,
  },
  switchHint: {
    fontSize: "0.72rem",
    color: theme.palette.text.secondary,
    marginTop: 2,
    lineHeight: 1.3,
  },
  switchLoading: {
    fontSize: "0.7rem",
    fontStyle: "italic",
    color: theme.palette.primary.main,
    marginTop: 2,
  },
  tab: {
    backgroundColor: theme.mode === "light" ? "#f2f2f2" : "#7f7f7f",
    borderRadius: 4,
    width: "100%",
    "& .MuiTabs-flexContainer": { justifyContent: "center" },
  },
}));

const SectionCard = ({ title, subtitle, icon, children, classes }) => (
  <div className={classes.sectionCard}>
    <div className={classes.sectionHeader}>
      <div className={classes.sectionIcon}>{icon}</div>
      <div>
        <div className={classes.sectionTitle}>{title}</div>
        {subtitle && <div className={classes.sectionSubtitle}>{subtitle}</div>}
      </div>
    </div>
    {children}
  </div>
);

/**
 * SwitchOption: toggle moderno con label + descripción y switch al lado derecho.
 * Reemplaza el patrón Select "Habilitado/Deshabilitado" en toda la pantalla de Settings.
 * `value` y `onChange` siguen usando strings "enabled"/"disabled" para conservar
 * compatibilidad con el backend sin tocar la API.
 */
const SwitchOption = ({ label, hint, value, onChange, loading, classes, disabled, booleanMode = false }) => {
  const isOn = value === "enabled" || value === true || value === "true";
  return (
    <div className={classes.switchOption}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className={classes.switchLabel}>{label}</div>
        {hint && <div className={classes.switchHint}>{hint}</div>}
        {loading && <div className={classes.switchLoading}>Actualizando…</div>}
      </div>
      <MuiSwitch
        checked={isOn}
        onChange={(e) => {
          const checked = e.target.checked;
          // booleanMode envía true/false. Default envía "enabled"/"disabled".
          onChange(booleanMode ? checked : (checked ? "enabled" : "disabled"));
        }}
        color="primary"
        disabled={disabled || loading}
      />
    </div>
  );
};

export default function Options(props) {
  const { oldSettings, settings, scheduleTypeChanged, user } = props;

  const classes = useStyles();
  const [userRating, setUserRating] = useState("disabled");
  const [scheduleType, setScheduleType] = useState("disabled");
  const [chatBotType, setChatBotType] = useState("text");

  const timezoneList = useMemo(() => {
    if (typeof Intl !== "undefined" && typeof Intl.supportedValuesOf === "function") {
      try {
        const supportedZones = Intl.supportedValuesOf("timeZone");
        if (Array.isArray(supportedZones) && supportedZones.length > 0) {
          return supportedZones;
        }
      } catch (err) {
        // Ignore and fall back to the static list below
      }
    }

    return ALL_TIMEZONES;
  }, []);
  const defaultTimezone = useMemo(() => {
    try {
      const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      return timezoneList.includes(browserTimezone) ? browserTimezone : "UTC";
    } catch (err) {
      return "UTC";
    }
  }, [timezoneList]);
  const [timezone, setTimezone] = useState(defaultTimezone);
  const [loadingTimezone, setLoadingTimezone] = useState(false);

  const [loadingUserRating, setLoadingUserRating] = useState(false);
  const [loadingScheduleType, setLoadingScheduleType] = useState(false);

  const [userCreation, setUserCreation] = useState("disabled");
  const [loadingUserCreation, setLoadingUserCreation] = useState(false);

  const [SendGreetingAccepted, setSendGreetingAccepted] = useState("enabled");
  const [loadingSendGreetingAccepted, setLoadingSendGreetingAccepted] = useState(false);

  const [UserRandom, setUserRandom] = useState("enabled");
  const [loadingUserRandom, setLoadingUserRandom] = useState(false);

  const [SettingsTransfTicket, setSettingsTransfTicket] = useState("enabled");
  const [loadingSettingsTransfTicket, setLoadingSettingsTransfTicket] = useState(false);

  const [AcceptCallWhatsapp, setAcceptCallWhatsapp] = useState("enabled");
  const [loadingAcceptCallWhatsapp, setLoadingAcceptCallWhatsapp] = useState(false);

  const [sendSignMessage, setSendSignMessage] = useState("enabled");
  const [loadingSendSignMessage, setLoadingSendSignMessage] = useState(false);

  const [sendGreetingMessageOneQueues, setSendGreetingMessageOneQueues] = useState("enabled");
  const [loadingSendGreetingMessageOneQueues, setLoadingSendGreetingMessageOneQueues] = useState(false);

  const [sendQueuePosition, setSendQueuePosition] = useState("enabled");
  const [loadingSendQueuePosition, setLoadingSendQueuePosition] = useState(false);

  const [sendFarewellWaitingTicket, setSendFarewellWaitingTicket] = useState("enabled");
  const [loadingSendFarewellWaitingTicket, setLoadingSendFarewellWaitingTicket] = useState(false);

  const [acceptAudioMessageContact, setAcceptAudioMessageContact] = useState("enabled");
  const [loadingAcceptAudioMessageContact, setLoadingAcceptAudioMessageContact] = useState(false);

  //PAYMENT METHODS
  const [eficlientidType, setEfiClientidType] = useState('');
  const [loadingEfiClientidType, setLoadingEfiClientidType] = useState(false);

  const [eficlientsecretType, setEfiClientsecretType] = useState('');
  const [loadingEfiClientsecretType, setLoadingEfiClientsecretType] =
    useState(false);

  const [efichavepixType, setEfiChavepixType] = useState('');
  const [loadingEfiChavepixType, setLoadingEfiChavepixType] = useState(false);

  const [mpaccesstokenType, setmpaccesstokenType] = useState('');
  const [loadingmpaccesstokenType, setLoadingmpaccesstokenType] =
    useState(false);

  const [stripeprivatekeyType, setstripeprivatekeyType] = useState('');
  const [loadingstripeprivatekeyType, setLoadingstripeprivatekeyType] =
    useState(false);

  const [asaastokenType, setasaastokenType] = useState('');
  const [loadingasaastokenType, setLoadingasaastokenType] = useState(false);

  //OPENAI API KEY TRANSCRIÇÃO DE ÁUDIO
  const [openaitokenType, setopenaitokenType] = useState('');
  const [loadingopenaitokenType, setLoadingopenaitokenType] = useState(false);

  //LGPD
  const [enableLGPD, setEnableLGPD] = useState("disabled");
  const [loadingEnableLGPD, setLoadingEnableLGPD] = useState(false);

  const [lgpdMessage, setLGPDMessage] = useState("");
  const [loadinglgpdMessage, setLoadingLGPDMessage] = useState(false);

  const [lgpdLink, setLGPDLink] = useState("");
  const [loadingLGPDLink, setLoadingLGPDLink] = useState(false);

  const [lgpdDeleteMessage, setLGPDDeleteMessage] = useState("disabled");
  const [loadingLGPDDeleteMessage, setLoadingLGPDDeleteMessage] = useState(false);

  //LIMITAR DOWNLOAD
  // const [downloadLimit, setdownloadLimit] = useState("64");
  // const [loadingDownloadLimit, setLoadingdownloadLimit] = useState(false);

  const [lgpdConsent, setLGPDConsent] = useState("disabled");
  const [loadingLGPDConsent, setLoadingLGPDConsent] = useState(false);

  const [lgpdHideNumber, setLGPDHideNumber] = useState("disabled");
  const [loadingLGPDHideNumber, setLoadingLGPDHideNumber] = useState(false);

  // Tag obrigatoria
  const [requiredTag, setRequiredTag] = useState("enabled")
  const [loadingRequiredTag, setLoadingRequiredTag] = useState(false)

  // Fechar ticket ao transferir para outro setor
  const [closeTicketOnTransfer, setCloseTicketOnTransfer] = useState(false)
  const [loadingCloseTicketOnTransfer, setLoadingCloseTicketOnTransfer] = useState(false)

  // Usar carteira de clientes
  const [directTicketsToWallets, setDirectTicketsToWallets] = useState(false)
  const [loadingDirectTicketsToWallets, setLoadingDirectTicketsToWallets] = useState(false)

  // Sigla para inserir no copiar contatos
  const [copyContactPrefix, setCopyContactPrefix] = useState("");
const [loadingCopyContactPrefix, setLoadingCopyContactPrefix] = useState(false);

  //MENSAGENS CUSTOMIZADAS
  const [transferMessage, setTransferMessage] = useState("");
  const [loadingTransferMessage, setLoadingTransferMessage] = useState(false);

  const [greetingAcceptedMessage, setGreetingAcceptedMessage] = useState("");
  const [loadingGreetingAcceptedMessage, setLoadingGreetingAcceptedMessage] = useState(false);

  const [AcceptCallWhatsappMessage, setAcceptCallWhatsappMessage] = useState("");
  const [loadingAcceptCallWhatsappMessage, setLoadingAcceptCallWhatsappMessage] = useState(false);

  const [sendQueuePositionMessage, setSendQueuePositionMessage] = useState("");
  const [loadingSendQueuePositionMessage, setLoadingSendQueuePositionMessage] = useState(false);

  const [showNotificationPending, setShowNotificationPending] = useState(false);
  const [loadingShowNotificationPending, setLoadingShowNotificationPending] = useState(false);

  const { update: updateUserCreation, getAll } = useSettings();

  // const { update: updatedownloadLimit } = useSettings();

  const { update: updateeficlientid } = useSettings();
  const { update: updateeficlientsecret } = useSettings();
  const { update: updateefichavepix } = useSettings();
  const { update: updatempaccesstoken } = useSettings();
  const { update: updatestripeprivatekey } = useSettings();
  const { update: updateasaastoken } = useSettings();

  const { update } = useCompanySettings();

  const isSuper = () => {
    return user.super;
  };


  useEffect(() => {

    if (Array.isArray(oldSettings) && oldSettings.length) {

      const userPar = oldSettings.find((s) => s.key === "userCreation");

      if (userPar) {
        setUserCreation(userPar.value);
      }

      // const downloadLimit = oldSettings.find((s) => s.key === "downloadLimit");

      // if (downloadLimit) {
      //  setdownloadLimit(downloadLimit.value);
      // }

      const copyContactPrefix = oldSettings.find((s) => s.key === 'copyContactPrefix');
      if (copyContactPrefix) {
        setCopyContactPrefix(copyContactPrefix.value);
      }

      const eficlientidType = oldSettings.find((s) => s.key === 'eficlientid');
      if (eficlientidType) {
        setEfiClientidType(eficlientidType.value);
      }

      const eficlientsecretType = oldSettings.find((s) => s.key === 'eficlientsecret');
      if (eficlientsecretType) {
        setEfiClientsecretType(eficlientsecretType.value);
      }

      const efichavepixType = oldSettings.find((s) => s.key === 'efichavepix');
      if (efichavepixType) {
        setEfiChavepixType(efichavepixType.value);
      }

      const mpaccesstokenType = oldSettings.find((s) => s.key === 'mpaccesstoken');
      if (mpaccesstokenType) {
        setmpaccesstokenType(mpaccesstokenType.value);
      }

      const asaastokenType = oldSettings.find((s) => s.key === 'asaastoken');
      if (asaastokenType) {
        setasaastokenType(asaastokenType.value);
      }

    }
  }, [oldSettings])


  useEffect(() => {
    for (const [key, value] of Object.entries(settings)) {
      if (key === "userRating") setUserRating(value);
      if (key === "scheduleType") setScheduleType(value);
      if (key === "chatBotType") setChatBotType(value);
      if (key === "timezone") setTimezone(value || defaultTimezone);
      if (key === "acceptCallWhatsapp") setAcceptCallWhatsapp(value);
      if (key === "userRandom") setUserRandom(value);
      if (key === "sendGreetingMessageOneQueues") setSendGreetingMessageOneQueues(value);
      if (key === "sendSignMessage") setSendSignMessage(value);
      if (key === "sendFarewellWaitingTicket") setSendFarewellWaitingTicket(value);
      if (key === "sendGreetingAccepted") setSendGreetingAccepted(value);
      if (key === "sendQueuePosition") setSendQueuePosition(value);
      if (key === "acceptAudioMessageContact") setAcceptAudioMessageContact(value);
      if (key === "enableLGPD") setEnableLGPD(value);
      if (key === "requiredTag") setRequiredTag(value);
      if (key === "lgpdDeleteMessage") setLGPDDeleteMessage(value)
      if (key === "lgpdHideNumber") setLGPDHideNumber(value);
      if (key === "lgpdConsent") setLGPDConsent(value);
      if (key === "lgpdMessage") setLGPDMessage(value);
      if (key === "sendMsgTransfTicket") setSettingsTransfTicket(value);
      if (key === "lgpdLink") setLGPDLink(value);
      if (key === "DirectTicketsToWallets") setDirectTicketsToWallets(value);
      if (key === "closeTicketOnTransfer") setCloseTicketOnTransfer(value);
      if (key === "transferMessage") setTransferMessage(value);
      if (key === "greetingAcceptedMessage") setGreetingAcceptedMessage(value);
      if (key === "AcceptCallWhatsappMessage") setAcceptCallWhatsappMessage(value);
      if (key === "sendQueuePositionMessage") setSendQueuePositionMessage(value);
      if (key === "showNotificationPending") setShowNotificationPending(value);
      if (key === "copyContactPrefix") setCopyContactPrefix(value);
    }
  }, [settings, defaultTimezone]);

  async function handleChangeUserCreation(value) {
    setUserCreation(value);
    setLoadingUserCreation(true);
    await updateUserCreation({
      key: "userCreation",
      value,
    });
    setLoadingUserCreation(false);
  }

  // async function handleDownloadLimit(value) {
  //   setdownloadLimit(value);
  //   setLoadingdownloadLimit(true);
  //   await updatedownloadLimit({
  //     key: "downloadLimit",
  //     value,
  //   });
  //   setLoadingdownloadLimit(false);
  // }

  async function handleChangeEfiClientid(value) {
    setEfiClientidType(value);
    setLoadingEfiClientidType(true);
    await updateeficlientid({
      key: 'eficlientid',
      value,
    });
    toast.success('Operação atualizada com sucesso.');
    setLoadingEfiClientidType(false);
  }

async function handleCopyContactPrefix(value) {
  setCopyContactPrefix(value);
  setLoadingCopyContactPrefix(true);
  await update({
    column: "copyContactPrefix",
    data: value
  });
  setLoadingCopyContactPrefix(false);
}

  async function handleChangeEfiClientsecret(value) {
    setEfiClientsecretType(value);
    setLoadingEfiClientsecretType(true);
    await updateeficlientsecret({
      key: 'eficlientsecret',
      value,
    });
    toast.success('Operação atualizada com sucesso.');
    setLoadingEfiClientsecretType(false);
  }

  async function handleChangeEfiChavepix(value) {
    setEfiChavepixType(value);
    setLoadingEfiChavepixType(true);
    await updateefichavepix({
      key: 'efichavepix',
      value,
    });
    toast.success('Operação atualizada com sucesso.');
    setLoadingEfiChavepixType(false);
  }

  async function handleChangempaccesstoken(value) {
    setmpaccesstokenType(value);
    setLoadingmpaccesstokenType(true);
    await updatempaccesstoken({
      key: 'mpaccesstoken',
      value,
    });
    toast.success('Operação atualizada com sucesso.');
    setLoadingmpaccesstokenType(false);
  }

  async function handleChangestripeprivatekey(value) {
    setstripeprivatekeyType(value);
    setLoadingstripeprivatekeyType(true);
    await updatestripeprivatekey({
      key: 'stripeprivatekey',
      value,
    });
    toast.success('Operação atualizada com sucesso.');
    setLoadingstripeprivatekeyType(false);
  }

  async function handleChangeasaastoken(value) {
    setasaastokenType(value);
    setLoadingasaastokenType(true);
    await updateasaastoken({
      key: 'asaastoken',
      value,
    });
    toast.success('Operação atualizada com sucesso.');
    setLoadingasaastokenType(false);
  }

  async function handleChangeUserRating(value) {
    setUserRating(value);
    setLoadingUserRating(true);
    await update({
      column: "userRating",
      data: value
    });
    setLoadingUserRating(false);
  }

  async function handleScheduleType(value) {
    setScheduleType(value);
    setLoadingScheduleType(true);
    await update({
      column: "scheduleType",
      data: value
    });
    setLoadingScheduleType(false);
    if (typeof scheduleTypeChanged === "function") {
      scheduleTypeChanged(value);
    }
  }

  async function handleTimezone(value) {
    setTimezone(value);
    setLoadingTimezone(true);
    await update({
      column: "timezone",
      data: value
    });
    setLoadingTimezone(false);
  }

  async function handleCopyContactPrefix(value) {
    setCopyContactPrefix(value);
    setLoadingCopyContactPrefix(true);
    await update({
      column: "copyContactPrefix",
      data: value
    });
    setLoadingCopyContactPrefix(false);
  }

  async function handleChatBotType(value) {
    setChatBotType(value);
    await update({
      column: "chatBotType",
      data: value
    });
    if (typeof scheduleTypeChanged === "function") {
      setChatBotType(value);
    }
  }

  async function handleLGPDMessage(value) {
    setLGPDMessage(value);
    setLoadingLGPDMessage(true);
    await update({
      column: "lgpdMessage",
      data: value
    });
    setLoadingLGPDMessage(false);
  }

  async function handletransferMessage(value) {
    setTransferMessage(value);
    setLoadingTransferMessage(true);
    await update({
      column: "transferMessage",
      data: value
    });
    setLoadingTransferMessage(false);
  }

  async function handleGreetingAcceptedMessage(value) {
    setGreetingAcceptedMessage(value);
    setLoadingGreetingAcceptedMessage(true);
    await update({
      column: "greetingAcceptedMessage",
      data: value
    });
    setLoadingGreetingAcceptedMessage(false);
  }

  async function handleAcceptCallWhatsappMessage(value) {
    setAcceptCallWhatsappMessage(value);
    setLoadingAcceptCallWhatsappMessage(true);
    await update({
      column: "AcceptCallWhatsappMessage",
      data: value
    });
    setLoadingAcceptCallWhatsappMessage(false);
  }

  async function handlesendQueuePositionMessage(value) {
    setSendQueuePositionMessage(value);
    setLoadingSendQueuePositionMessage(true);
    await update({
      column: "sendQueuePositionMessage",
      data: value
    });
    setLoadingSendQueuePositionMessage(false);
  }

  async function handleShowNotificationPending(value) {
    setShowNotificationPending(value);
    setLoadingShowNotificationPending(true);
    await update({
      column: "showNotificationPending",
      data: value
    });
    setLoadingShowNotificationPending(false);
  }

  async function handleLGPDLink(value) {
    setLGPDLink(value);
    setLoadingLGPDLink(true);
    await update({
      column: "lgpdLink",
      data: value
    });
    setLoadingLGPDLink(false);
  }

  async function handleLGPDDeleteMessage(value) {
    setLGPDDeleteMessage(value);
    setLoadingLGPDDeleteMessage(true);
    await update({
      column: "lgpdDeleteMessage",
      data: value
    });
    setLoadingLGPDDeleteMessage(false);
  }

  async function handleLGPDConsent(value) {
    setLGPDConsent(value);
    setLoadingLGPDConsent(true);
    await update({
      column: "lgpdConsent",
      data: value
    });
    setLoadingLGPDConsent(false);
  }

  async function handleLGPDHideNumber(value) {
    setLGPDHideNumber(value);
    setLoadingLGPDHideNumber(true);
    await update({
      column: "lgpdHideNumber",
      data: value
    });
    setLoadingLGPDHideNumber(false);
  }

  async function handleSendGreetingAccepted(value) {
    setSendGreetingAccepted(value);
    setLoadingSendGreetingAccepted(true);
    await update({
      column: "sendGreetingAccepted",
      data: value
    });
    setLoadingSendGreetingAccepted(false);
  }

  async function handleUserRandom(value) {
    setUserRandom(value);
    setLoadingUserRandom(true);
    await update({
      column: "userRandom",
      data: value
    });
    setLoadingUserRandom(false);
  }

  async function handleSettingsTransfTicket(value) {
    setSettingsTransfTicket(value);
    setLoadingSettingsTransfTicket(true);
    await update({
      column: "sendMsgTransfTicket",
      data: value
    });
    setLoadingSettingsTransfTicket(false);
  }

  async function handleAcceptCallWhatsapp(value) {
    setAcceptCallWhatsapp(value);
    setLoadingAcceptCallWhatsapp(true);
    await update({
      column: "acceptCallWhatsapp",
      data: value
    });
    setLoadingAcceptCallWhatsapp(false);
  }

  async function handleSendSignMessage(value) {
    setSendSignMessage(value);
    setLoadingSendSignMessage(true);
    await update({
      column: "sendSignMessage",
      data: value
    });
    localStorage.setItem("sendSignMessage", value === "enabled" ? true : false); //atualiza localstorage para sessão
    setLoadingSendSignMessage(false);
  }

  async function handleSendGreetingMessageOneQueues(value) {
    setSendGreetingMessageOneQueues(value);
    setLoadingSendGreetingMessageOneQueues(true);
    await update({
      column: "sendGreetingMessageOneQueues",
      data: value
    });
    setLoadingSendGreetingMessageOneQueues(false);
  }

  async function handleSendQueuePosition(value) {
    setSendQueuePosition(value);
    setLoadingSendQueuePosition(true);
    await update({
      column: "sendQueuePosition",
      data: value
    });
    setLoadingSendQueuePosition(false);
  }

  async function handleSendFarewellWaitingTicket(value) {
    setSendFarewellWaitingTicket(value);
    setLoadingSendFarewellWaitingTicket(true);
    await update({
      column: "sendFarewellWaitingTicket",
      data: value
    });
    setLoadingSendFarewellWaitingTicket(false);
  }

  async function handleAcceptAudioMessageContact(value) {
    setAcceptAudioMessageContact(value);
    setLoadingAcceptAudioMessageContact(true);
    await update({
      column: "acceptAudioMessageContact",
      data: value
    });
    setLoadingAcceptAudioMessageContact(false);
  }

  async function handleEnableLGPD(value) {
    setEnableLGPD(value);
    setLoadingEnableLGPD(true);
    await update({
      column: "enableLGPD",
      data: value
    });
    setLoadingEnableLGPD(false);
  }

  async function handleRequiredTag(value) {
    setRequiredTag(value);
    setLoadingRequiredTag(true);
    await update({
      column: "requiredTag",
      data: value,
    });
    setLoadingRequiredTag(false);
  }

  async function handleCloseTicketOnTransfer(value) {
    setCloseTicketOnTransfer(value);
    setLoadingCloseTicketOnTransfer(true);
    await update({
      column: "closeTicketOnTransfer",
      data: value,
    });
    setLoadingCloseTicketOnTransfer(false);
  }

  async function handleDirectTicketsToWallets(value) {
    setDirectTicketsToWallets(value);
    setLoadingDirectTicketsToWallets(true);
    await update({
      column: "DirectTicketsToWallets",
      data: value,
    });
    setLoadingDirectTicketsToWallets(false);
  }

  return (
    <div className={classes.pageRoot}>
      <SectionCard
        classes={classes}
        icon={<TuneIcon />}
        title="Configuración general"
        subtitle="Ajustes globales del sistema, zona horaria y comportamiento de tickets."
      >
      <Grid spacing={3} container>

        {/* CREACIÓN DE EMPRESA/USUARIOS (solo super-admin) */}
        {isSuper() ?
          <Grid xs={12} sm={6} md={4} item>
            <SwitchOption
              classes={classes}
              label={i18n.t("settings.settings.options.creationCompanyUser")}
              hint="Permite que se creen nuevas empresas y usuarios desde el frontend."
              value={userCreation}
              loading={loadingUserCreation}
              onChange={handleChangeUserCreation}
            />
          </Grid>
          : null}

        <Grid xs={12} sm={6} md={4} item>
          <FormControl className={classes.selectContainer}>
            <InputLabel id="timezone-label">
              {i18n.t("settings.settings.options.timezone")}
            </InputLabel>
            <Select
              labelId="timezone-label"
              value={timezone}
              onChange={async (e) => {
                handleTimezone(e.target.value);
              }}
              MenuProps={{
                PaperProps: {
                  style: {
                    maxHeight: 48 * 8,
                    width: 280,
                  },
                },
              }}
            >
              {timezoneList.map((tz) => (
                <MenuItem key={tz} value={tz}>
                  {tz}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>
              {loadingTimezone &&
                i18n.t("settings.settings.options.updating")}
            </FormHelperText>
          </FormControl>
        </Grid>

        {/* LIMITAR DOWNLOAD */}
        {/* {isSuper() ?
          <Grid xs={12} sm={6} md={4} item>
            <FormControl className={classes.selectContainer}>
              <InputLabel id="downloadLimit-label">
                Limite de Download de Arquivos (MB)
              </InputLabel>
              <Select
                labelId="downloadLimit-label"
                value={downloadLimit}
                size="small"
                onChange={async (e) => {
                  handleDownloadLimit(e.target.value);
                }}
              >
                <MenuItem value={"32"}>32</MenuItem>
                <MenuItem value={"64"}>64</MenuItem>
                <MenuItem value={"128"}>128</MenuItem>
                <MenuItem value={"256"}>256</MenuItem>
                <MenuItem value={"512"}>512</MenuItem>
                <MenuItem value={"1024"}>1024</MenuItem>
                <MenuItem value={"2048"}>2048</MenuItem>
              </Select>
              <FormHelperText>
                {loadingDownloadLimit && "Atualizando..."}
              </FormHelperText>
            </FormControl>
          </Grid>
          : null
        } */}

        {/* EVALUACIONES NPS al cerrar ticket */}
        <Grid xs={12} sm={6} md={4} item>
          <SwitchOption
            classes={classes}
            label={i18n.t("settings.settings.options.evaluations")}
            hint="Al cerrar un ticket envía una encuesta de satisfacción al cliente."
            value={userRating}
            loading={loadingUserRating}
            onChange={handleChangeUserRating}
          />
        </Grid>

        {/* AGENDAMENTO DE EXPEDIENTE */}
        <Grid xs={12} sm={6} md={4} item>
          <FormControl className={classes.selectContainer}>
            <InputLabel id="schedule-type-label">
              {i18n.t("settings.settings.options.officeScheduling")}
            </InputLabel>
            <Select
              labelId="schedule-type-label"
              value={scheduleType}
              onChange={async (e) => {
                handleScheduleType(e.target.value);
              }}
            >
              <MenuItem value={"disabled"}>{i18n.t("settings.settings.options.disabled")}</MenuItem>
              <MenuItem value={"queue"}>{i18n.t("settings.settings.options.queueManagement")}</MenuItem>
              <MenuItem value={"company"}>{i18n.t("settings.settings.options.companyManagement")}</MenuItem>
              <MenuItem value={"connection"}>{i18n.t("settings.settings.options.connectionManagement")}</MenuItem>
            </Select>
            <FormHelperText>
              {loadingScheduleType && i18n.t("settings.settings.options.updating")}
            </FormHelperText>
          </FormControl>
        </Grid>

        {/* SALUDO AL ACEPTAR EL TICKET */}
        <Grid xs={12} sm={6} md={4} item>
          <SwitchOption
            classes={classes}
            label={i18n.t("settings.settings.options.sendGreetingAccepted")}
            hint="Envía un saludo automático al cliente cuando el agente acepta su ticket."
            value={SendGreetingAccepted}
            loading={loadingSendGreetingAccepted}
            onChange={handleSendGreetingAccepted}
          />
        </Grid>

        {/* ELEGIR OPERADOR ALEATORIO */}
        <Grid xs={12} sm={6} md={4} item>
          <SwitchOption
            classes={classes}
            label={i18n.t("settings.settings.options.userRandom")}
            hint="Asigna los tickets de la cola a un agente al azar (round-robin)."
            value={UserRandom}
            loading={loadingUserRandom}
            onChange={handleUserRandom}
          />
        </Grid>

        {/* MENSAJE DE TRANSFERENCIA DE COLA/AGENTE */}
        <Grid xs={12} sm={6} md={4} item>
          <SwitchOption
            classes={classes}
            label={i18n.t("settings.settings.options.sendMsgTransfTicket")}
            hint="Avisa al cliente cuando su ticket es transferido a otro agente o cola."
            value={SettingsTransfTicket}
            loading={loadingSettingsTransfTicket}
            onChange={handleSettingsTransfTicket}
          />
        </Grid>

        {/* TIPO DO BOT */}
        <Grid xs={12} sm={6} md={4} item>
          <FormControl className={classes.selectContainer}>
            <InputLabel id="schedule-type-label">{i18n.t("settings.settings.options.chatBotType")}</InputLabel>
            <Select
              labelId="schedule-type-label"
              value={chatBotType}
              onChange={async (e) => {
                handleChatBotType(e.target.value);
              }}
            >
              <MenuItem value={"text"}>Texto</MenuItem>
            </Select>
            <FormHelperText>
              {loadingScheduleType && i18n.t("settings.settings.options.updating")}
            </FormHelperText>
          </FormControl>
        </Grid>

        {/* AVISO DE LLAMADA WHATSAPP */}
        <Grid xs={12} sm={6} md={4} item>
          <SwitchOption
            classes={classes}
            label={i18n.t("settings.settings.options.acceptCallWhatsapp")}
            hint="Cuando un cliente llama por WhatsApp, le envía un aviso de que no se aceptan llamadas."
            value={AcceptCallWhatsapp}
            loading={loadingAcceptCallWhatsapp}
            onChange={handleAcceptCallWhatsapp}
          />
        </Grid>

        {/* PERMITIR QUITAR FIRMA AL AGENTE */}
        <Grid xs={12} sm={6} md={4} item>
          <SwitchOption
            classes={classes}
            label={i18n.t("settings.settings.options.sendSignMessage")}
            hint="Permite al agente decidir si su nombre aparece o no antes de cada mensaje enviado."
            value={sendSignMessage}
            loading={loadingSendSignMessage}
            onChange={handleSendSignMessage}
          />
        </Grid>

        {/* ENVIAR SALUDO SI HAY UNA SOLA COLA */}
        <Grid xs={12} sm={6} md={4} item>
          <SwitchOption
            classes={classes}
            label={i18n.t("settings.settings.options.sendGreetingMessageOneQueues")}
            hint="Si solo hay una cola, envía el saludo directamente sin pedir al cliente que la elija."
            value={sendGreetingMessageOneQueues}
            loading={loadingSendGreetingMessageOneQueues}
            onChange={handleSendGreetingMessageOneQueues}
          />
        </Grid>

        {/* AVISAR LA POSICIÓN EN LA COLA */}
        <Grid xs={12} sm={6} md={4} item>
          <SwitchOption
            classes={classes}
            label={i18n.t("settings.settings.options.sendQueuePosition")}
            hint="Avisa al cliente su posición en la cola mientras espera ser atendido."
            value={sendQueuePosition}
            loading={loadingSendQueuePosition}
            onChange={handleSendQueuePosition}
          />
        </Grid>

        {/* MENSAJE DE DESPEDIDA AL ESPERAR */}
        <Grid xs={12} sm={6} md={4} item>
          <SwitchOption
            classes={classes}
            label={i18n.t("settings.settings.options.sendFarewellWaitingTicket")}
            hint="Envía mensaje de despedida automático cuando se cierra un ticket sin atender."
            value={sendFarewellWaitingTicket}
            loading={loadingSendFarewellWaitingTicket}
            onChange={handleSendFarewellWaitingTicket}
          />
        </Grid>

        {/* ACEPTAR MENSAJES DE AUDIO DEL CONTACTO */}
        <Grid xs={12} sm={6} md={4} item>
          <SwitchOption
            classes={classes}
            label={i18n.t("settings.settings.options.acceptAudioMessageContact")}
            hint="Si está apagado, descarta los audios entrantes y avisa al contacto que no se aceptan."
            value={acceptAudioMessageContact}
            loading={loadingAcceptAudioMessageContact}
            onChange={handleAcceptAudioMessageContact}
          />
        </Grid>

        {/* HABILITAR LGPD (Protección de Datos) */}
        <Grid xs={12} sm={6} md={4} item>
          <SwitchOption
            classes={classes}
            label={i18n.t("settings.settings.options.enableLGPD")}
            hint="Activa el cumplimiento de protección de datos: consentimiento, ocultar números y borrado de mensajes."
            value={enableLGPD}
            loading={loadingEnableLGPD}
            onChange={handleEnableLGPD}
          />
        </Grid>

        {/* ETIQUETA OBLIGATORIA AL CERRAR TICKET */}
        <Grid xs={12} sm={6} md={4} item>
          <SwitchOption
            classes={classes}
            label={i18n.t("settings.settings.options.requiredTag")}
            hint="Obliga al agente a poner una etiqueta antes de cerrar el ticket."
            value={requiredTag}
            loading={loadingRequiredTag}
            onChange={handleRequiredTag}
          />
        </Grid>
        {/* CERRAR TICKET AL TRANSFERIR */}
        <Grid xs={12} sm={6} md={4} item>
          <SwitchOption
            classes={classes}
            booleanMode
            label={i18n.t("settings.settings.options.closeTicketOnTransfer")}
            hint="Cuando un agente transfiere un ticket a otra cola/usuario, el original se cierra automáticamente."
            value={closeTicketOnTransfer}
            loading={loadingCloseTicketOnTransfer}
            onChange={handleCloseTicketOnTransfer}
          />
        </Grid>

        {/* MOSTRAR NOTIFICACIONES DE TICKETS PENDIENTES */}
        <Grid xs={12} sm={6} md={4} item>
          <SwitchOption
            classes={classes}
            booleanMode
            label={i18n.t("settings.settings.options.showNotificationPending")}
            hint="Los agentes reciben notificaciones de mensajes nuevos en tickets que aún no han sido aceptados."
            value={showNotificationPending}
            loading={loadingShowNotificationPending}
            onChange={handleShowNotificationPending}
          />
        </Grid>

        {/* WALLETS: enrutar contactos a su agente asignado */}
        <Grid xs={12} sm={6} md={4} item>
          <SwitchOption
            classes={classes}
            booleanMode
            label={i18n.t("settings.settings.options.DirectTicketsToWallets")}
            hint="Si un contacto tiene un agente preferido (wallet), sus tickets nuevos van directamente a él/ella."
            value={directTicketsToWallets}
            loading={loadingDirectTicketsToWallets}
            onChange={handleDirectTicketsToWallets}
          />
        </Grid>
      </Grid>
      </SectionCard>

      <SectionCard
        classes={classes}
        icon={<AlternateEmailIcon />}
        title="Prefijo para copiar contactos"
        subtitle="Texto que se antepone al copiar números desde el panel."
      >
        <Grid spacing={3} container>
          <Grid xs={12} sm={6} md={6} item>
            <FormControl className={classes.selectContainer}>
              <TextField
                id="copyContactPrefix"
                name="copyContactPrefix"
                margin="dense"
                label={i18n.t("settings.settings.options.copyContactPrefix")}
                variant="outlined"
                value={copyContactPrefix}
                placeholder={i18n.t("settings.settings.options.copyContactPrefixPlaceholder")}
                onChange={async (e) => {
                  handleCopyContactPrefix(e.target.value);
                }}
                InputLabelProps={{ shrink: true }}
              />
              <FormHelperText>
                {loadingCopyContactPrefix && i18n.t("settings.settings.options.updating")}
              </FormHelperText>
            </FormControl>
          </Grid>
        </Grid>
      </SectionCard>


      {/*-----------------LGPD-----------------*/}
      {enableLGPD === "enabled" && (
        <SectionCard
          classes={classes}
          icon={<SecurityIcon />}
          title={i18n.t("settings.settings.LGPD.title")}
          subtitle="Configuración de privacidad, mensaje de bienvenida y consentimiento."
        >
          <Grid spacing={2} container>
            <Grid xs={12} sm={6} md={12} item>
              <FormControl className={classes.selectContainer}>
                <TextField
                  id="lgpdMessage"
                  name="lgpdMessage"
                  margin="dense"
                  multiline
                  rows={3}
                  label={i18n.t("settings.settings.LGPD.welcome")}
                  variant="outlined"
                  value={lgpdMessage}
                  onChange={async (e) => {
                    handleLGPDMessage(e.target.value);
                  }}
                >
                </TextField>
                <FormHelperText>
                  {loadinglgpdMessage && i18n.t("settings.settings.options.updating")}
                </FormHelperText>
              </FormControl>
            </Grid>
            <Grid xs={12} sm={6} md={12} item>
              <FormControl className={classes.selectContainer}>
                <TextField
                  id="lgpdLink"
                  name="lgpdLink"
                  margin="dense"
                  label={i18n.t("settings.settings.LGPD.linkLGPD")}
                  variant="outlined"
                  value={lgpdLink}
                  onChange={async (e) => {
                    handleLGPDLink(e.target.value);
                  }}
                >
                </TextField>
                <FormHelperText>
                  {loadingLGPDLink && i18n.t("settings.settings.options.updating")}
                </FormHelperText>
              </FormControl>
            </Grid>
            {/* LGPD: ocultar contenido de mensajes eliminados por el contacto */}
            <Grid xs={12} sm={6} md={4} item>
              <SwitchOption
                classes={classes}
                label={i18n.t("settings.settings.LGPD.obfuscateMessageDelete")}
                hint="Cuando un contacto borra un mensaje, muestra al agente solo 'Mensaje eliminado' en vez del contenido original."
                value={lgpdDeleteMessage}
                loading={loadingLGPDDeleteMessage}
                onChange={handleLGPDDeleteMessage}
              />
            </Grid>
            {/* LGPD: pedir consentimiento al cliente para tratar sus datos */}
            <Grid xs={12} sm={6} md={4} item>
              <SwitchOption
                classes={classes}
                label={i18n.t("settings.settings.LGPD.alwaysConsent")}
                hint="Antes de empezar a chatear, pide al cliente que acepte los términos de tratamiento de datos."
                value={lgpdConsent}
                loading={loadingLGPDConsent}
                onChange={handleLGPDConsent}
              />
            </Grid>
            {/* LGPD: ocultar el número de teléfono a los usuarios */}
            <Grid xs={12} sm={6} md={4} item>
              <SwitchOption
                classes={classes}
                label={i18n.t("settings.settings.LGPD.obfuscatePhoneUser")}
                hint="Oculta parcialmente el número de teléfono del cliente en la vista del agente (ej: 55****1234)."
                value={lgpdHideNumber}
                loading={loadingLGPDHideNumber}
                onChange={handleLGPDHideNumber}
              />
            </Grid>
          </Grid>
        </SectionCard>
      )}

      {isSuper() && (
        <SectionCard
          classes={classes}
          icon={<PaymentIcon />}
          title="Pasarelas de pago"
          subtitle="Configura los tokens de Mercado Pago, Stripe, Asaas y Pix Efí. Solo visible para el superadmin."
        >
          <div style={{ marginBottom: 8, fontSize: "0.85rem", fontWeight: 600 }}>
            Mercado Pago
          </div>
          <Grid spacing={2} container style={{ marginBottom: 16 }}>
            <Grid xs={12} item>
              <FormControl className={classes.selectContainer}>
                <TextField
                  id="mpaccesstoken"
                  name="mpaccesstoken"
                  size="small"
                  variant="outlined"
                  label="Access Token de Mercado Pago"
                  value={mpaccesstokenType}
                  onChange={async (e) => handleChangempaccesstoken(e.target.value)}
                />
                <FormHelperText>
                  {loadingmpaccesstokenType && "Actualizando..."}
                </FormHelperText>
              </FormControl>
            </Grid>
          </Grid>

          <div style={{ marginBottom: 8, fontSize: "0.85rem", fontWeight: 600 }}>
            Stripe
          </div>
          <Grid spacing={2} container style={{ marginBottom: 16 }}>
            <Grid xs={12} item>
              <FormControl className={classes.selectContainer}>
                <TextField
                  id="stripeprivatekey"
                  name="stripeprivatekey"
                  size="small"
                  variant="outlined"
                  label="Stripe Private Key"
                  value={stripeprivatekeyType}
                  onChange={async (e) => handleChangestripeprivatekey(e.target.value)}
                />
                <FormHelperText>
                  {loadingstripeprivatekeyType && "Actualizando..."}
                </FormHelperText>
              </FormControl>
            </Grid>
          </Grid>

          <div style={{ marginBottom: 8, fontSize: "0.85rem", fontWeight: 600 }}>
            Asaas
          </div>
          <Grid spacing={2} container style={{ marginBottom: 16 }}>
            <Grid xs={12} item>
              <FormControl className={classes.selectContainer}>
                <TextField
                  id="asaastoken"
                  name="asaastoken"
                  size="small"
                  variant="outlined"
                  label="Token Asaas"
                  value={asaastokenType}
                  onChange={async (e) => handleChangeasaastoken(e.target.value)}
                />
                <FormHelperText>
                  {loadingasaastokenType && "Actualizando..."}
                </FormHelperText>
              </FormControl>
            </Grid>
          </Grid>

          <div style={{ marginBottom: 8, fontSize: "0.85rem", fontWeight: 600 }}>
            Pix Efí (GerenciaNet)
          </div>
          <Grid spacing={2} container>
            <Grid xs={12} sm={6} item>
              <FormControl className={classes.selectContainer}>
                <TextField
                  id="eficlientid"
                  name="eficlientid"
                  size="small"
                  variant="outlined"
                  label="Client ID"
                  value={eficlientidType}
                  onChange={async (e) => handleChangeEfiClientid(e.target.value)}
                />
                <FormHelperText>
                  {loadingEfiClientidType && "Actualizando..."}
                </FormHelperText>
              </FormControl>
            </Grid>
            <Grid xs={12} sm={6} item>
              <FormControl className={classes.selectContainer}>
                <TextField
                  id="eficlientsecret"
                  name="eficlientsecret"
                  size="small"
                  variant="outlined"
                  label="Client Secret"
                  value={eficlientsecretType}
                  onChange={async (e) => handleChangeEfiClientsecret(e.target.value)}
                />
                <FormHelperText>
                  {loadingEfiClientsecretType && "Actualizando..."}
                </FormHelperText>
              </FormControl>
            </Grid>
            <Grid xs={12} item>
              <FormControl className={classes.selectContainer}>
                <TextField
                  id="efichavepix"
                  name="efichavepix"
                  size="small"
                  variant="outlined"
                  label="Clave Pix"
                  value={efichavepixType}
                  onChange={async (e) => handleChangeEfiChavepix(e.target.value)}
                />
                <FormHelperText>
                  {loadingEfiChavepixType && "Actualizando..."}
                </FormHelperText>
              </FormControl>
            </Grid>
          </Grid>
        </SectionCard>
      )}

      <SectionCard
        classes={classes}
        icon={<MessageIcon />}
        title="Mensajes personalizados"
        subtitle="Plantillas que el sistema envía automáticamente a los contactos."
      >
      <Grid spacing={2} container>
        <Grid xs={12} sm={6} md={6} item>
          <FormControl className={classes.selectContainer}>
            <TextField
              id="transferMessage"
              name="transferMessage"
              margin="dense"
              multiline
              rows={3}
              label={i18n.t("settings.settings.customMessages.transferMessage")}
              variant="outlined"
              value={transferMessage}
              required={SettingsTransfTicket === "enabled"}
              onChange={async (e) => {
                handletransferMessage(e.target.value);
              }}
            >
            </TextField>
            <FormHelperText>
              {loadingTransferMessage && i18n.t("settings.settings.options.updating")}
            </FormHelperText>
          </FormControl>
        </Grid>

        <Grid xs={12} sm={6} md={6} item>
          <FormControl className={classes.selectContainer}>
            <TextField
              id="greetingAcceptedMessage"
              name="greetingAcceptedMessage"
              margin="dense"
              multiline
              rows={3}
              label={i18n.t("settings.settings.customMessages.greetingAcceptedMessage")}
              variant="outlined"
              value={greetingAcceptedMessage}
              required={SendGreetingAccepted === "enabled"}
              onChange={async (e) => {
                handleGreetingAcceptedMessage(e.target.value);
              }}
            >
            </TextField>
            <FormHelperText>
              {loadingGreetingAcceptedMessage && i18n.t("settings.settings.options.updating")}
            </FormHelperText>
          </FormControl>
        </Grid>

        <Grid xs={12} sm={6} md={6} item>
          <FormControl className={classes.selectContainer}>
            <TextField
              id="AcceptCallWhatsappMessage"
              name="AcceptCallWhatsappMessage"
              margin="dense"
              multiline
              rows={3}
              label={i18n.t("settings.settings.customMessages.AcceptCallWhatsappMessage")}
              variant="outlined"
              required={AcceptCallWhatsapp === "disabled"}
              value={AcceptCallWhatsappMessage}
              onChange={async (e) => {
                handleAcceptCallWhatsappMessage(e.target.value);
              }}
            >
            </TextField>
            <FormHelperText>
              {loadingAcceptCallWhatsappMessage && i18n.t("settings.settings.options.updating")}
            </FormHelperText>
          </FormControl>
        </Grid>

        <Grid xs={12} sm={6} md={6} item>
          <FormControl className={classes.selectContainer}>
            <TextField
              id="sendQueuePositionMessage"
              name="sendQueuePositionMessage"
              margin="dense"
              multiline
              required={sendQueuePosition === "enabled"}
              rows={3}
              label={i18n.t("settings.settings.customMessages.sendQueuePositionMessage")}
              variant="outlined"
              value={sendQueuePositionMessage}
              onChange={async (e) => {
                handlesendQueuePositionMessage(e.target.value);
              }}
            >
            </TextField>
            <FormHelperText>
              {loadingSendQueuePositionMessage && i18n.t("settings.settings.options.updating")}
            </FormHelperText>
          </FormControl>
        </Grid>
      </Grid>
      </SectionCard>
    </div>
  );
}
