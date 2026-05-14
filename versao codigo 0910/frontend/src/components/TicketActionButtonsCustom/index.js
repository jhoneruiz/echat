import React, { useContext, useState, useEffect, useRef, useCallback } from "react";
import { useHistory } from "react-router-dom";

import { Can } from "../Can";
import { makeStyles } from "@material-ui/core/styles";
import { IconButton, Menu, CircularProgress, Divider } from "@material-ui/core";
import {
  MoreVert,
  Replay,
  SwapHorizOutlined,
  AccountBalanceWallet,
  FileCopy as FileCopyIcon,
  FlashOn,
  ExpandMore,
  Apps,
} from "@material-ui/icons";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import ButtonWithSpinner from "../ButtonWithSpinner";
import toastError from "../../errors/toastError";
import usePlans from "../../hooks/usePlans";
import { AuthContext } from "../../context/Auth/AuthContext";
import { TicketsContext } from "../../context/Tickets/TicketsContext";
import Tooltip from "@material-ui/core/Tooltip";
import ConfirmationModal from "../ConfirmationModal";
import * as Yup from "yup";
import { Formik, Form } from "formik";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogActions from "@material-ui/core/DialogActions";

import Button from "@material-ui/core/Button";
import TransferTicketModalCustom from "../TransferTicketModalCustom";
import AcceptTicketWithouSelectQueue from "../AcceptTicketWithoutQueueModal";

import HighlightOffIcon from "@material-ui/icons/HighlightOff";
import UndoIcon from "@material-ui/icons/Undo";

import MenuItem from "@material-ui/core/MenuItem";
import { Switch } from "@material-ui/core";
import ShowTicketOpen from "../ShowTicketOpenModal";
import { toast } from "react-toastify";
import useCompanySettings from "../../hooks/useSettings/companySettings";
import ShowTicketLogModal from "../../components/ShowTicketLogModal";
import TicketMessagesDialog from "../TicketMessagesDialog";
import { useTheme } from "@material-ui/styles";
import html2pdf from "html2pdf.js";
import FinalizacaoVendaModal from "../FinalizacaoVendaModal";
import QuickMessageModal from "../QuickMessageModal";
import TemplateMetaModal from "../TemplateMetaModal";
import { Phone } from "@material-ui/icons";
import AssignmentIcon from "@material-ui/icons/Assignment";

const useStyles = makeStyles((theme) => ({
  actionButtons: {
    marginRight: 6,
    maxWidth: "100%",
    flex: "none",
    alignSelf: "center",
    marginLeft: "auto",
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(0.5),
  },
  resolveButton: {
    backgroundColor: theme.palette.success.main,
    color: "#fff",
    borderRadius: 20,
    padding: "4px 14px",
    fontSize: "0.78rem",
    fontWeight: 600,
    textTransform: "none",
    whiteSpace: "nowrap",
    "&:hover": {
      backgroundColor: theme.palette.success.dark,
    },
  },
  transferButton: {
    borderRadius: 20,
    padding: "4px 10px",
    fontSize: "0.78rem",
    textTransform: "none",
    border: `1px solid ${theme.palette.divider}`,
    color: theme.mode === "light" ? theme.palette.text.primary : "#FFF",
    whiteSpace: "nowrap",
  },
  actionsButton: {
    borderRadius: 20,
    padding: "4px 10px",
    fontSize: "0.78rem",
    textTransform: "none",
    border: `1px solid ${theme.palette.divider}`,
    color: theme.mode === "light" ? theme.palette.text.primary : "#FFF",
    whiteSpace: "nowrap",
  },
  moreIconButton: {
    padding: 4,
    color: theme.mode === "light" ? theme.palette.text.secondary : "#FFF",
  },
  menuItem: {
    fontSize: "0.875rem",
    gap: theme.spacing(1.5),
    minWidth: 190,
    padding: theme.spacing(1, 2),
  },
  menuItemIcon: {
    fontSize: "1.1rem",
    opacity: 0.75,
    flexShrink: 0,
  },
  walletActive: {
    color: theme.palette.success.main,
  },
  botoes: {
    display: "flex",
    padding: "15px",
    justifyContent: "flex-end",
    maxWidth: "100%",
  },
}));

const SessionSchema = Yup.object().shape({
  ratingId: Yup.string().required("Evaluación obligatoria"),
});

const TicketActionButtonsCustom = ({
  ticket,
  contact,
  onQuickMessageSelect,
}) => {
  const classes = useStyles();
  const theme = useTheme();
  const history = useHistory();
  const isMounted = useRef(true);
  const [loading, setLoading] = useState(false);
  const { user } = useContext(AuthContext);
  const { setCurrentTicket, setTabOpen } = useContext(TicketsContext);
  const [open, setOpen] = React.useState(false);
  const formRef = React.useRef(null);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [transferTicketModalOpen, setTransferTicketModalOpen] = useState(false);
  const [acceptTicketWithouSelectQueueOpen, setAcceptTicketWithouSelectQueueOpen] = useState(false);
  const [showTicketLogOpen, setShowTicketLogOpen] = useState(false);
  const [openTicketMessageDialog, setOpenTicketMessageDialog] = useState(false);
  const [disableBot, setDisableBot] = useState(ticket.contact.disableBot);
  const [enableIntegration, setEnableIntegration] = useState(ticket.useIntegration);
  const [openAlert, setOpenAlert] = useState(false);
  const [userTicketOpen, setUserTicketOpen] = useState("");
  const [queueTicketOpen, setQueueTicketOpen] = useState("");
  const [showWavoipCall, setShowWavoipCall] = useState(false);
  const { get: getSetting } = useCompanySettings();
  const { getPlanCompany } = usePlans();

  // Menú "⋮ Más"
  const [moreAnchorEl, setMoreAnchorEl] = useState(null);
  const moreMenuOpen = Boolean(moreAnchorEl);

  // Menú "Acciones"
  const [actionsAnchorEl, setActionsAnchorEl] = useState(null);
  const actionsMenuOpen = Boolean(actionsAnchorEl);

  const [showTestButton, setShowTestButton] = useState(false);
  const [linkingWallet, setLinkingWallet] = useState(false);
  const [openFinalizacaoVenda, setOpenFinalizacaoVenda] = useState(false);
  const [ticketDataToFinalize, setTicketDataToFinalize] = useState(null);
  const [showFinalizacaoOptions, setShowFinalizacaoOptions] = useState(false);
  const [finalizacaoTipo, setFinalizacaoTipo] = useState(null);
  const [directTicketsToWallets, setDirectTicketsToWallets] = useState(false);
  const [quickMessageModalOpen, setQuickMessageModalOpen] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);

  useEffect(() => {
    fetchData();
    checkWhatsAppTriggerIntegration();
    fetchDirectTicketsToWalletsSetting();
    return () => { isMounted.current = false; };
  }, []);

  const fetchData = async () => {
    const companyId = user.companyId;
    const planConfigs = await getPlanCompany(undefined, companyId);
    if (isMounted.current) {
      setShowWavoipCall(planConfigs.plan.wavoip);
      setOpenTicketMessageDialog(false);
      setDisableBot(ticket.contact.disableBot);
      setShowTicketLogOpen(false);
    }
  };

  const checkWhatsAppTriggerIntegration = async () => {
    try {
      const { data } = await api.get(`/whatsapp/${ticket.whatsappId}`);
      if (isMounted.current) setShowTestButton(data.triggerIntegrationOnClose === true);
    } catch (err) {
      if (isMounted.current) setShowTestButton(false);
    }
  };

  const fetchDirectTicketsToWalletsSetting = async () => {
    try {
      const setting = await getSetting({ column: "DirectTicketsToWallets" });
      if (isMounted.current) setDirectTicketsToWallets(setting.DirectTicketsToWallets);
    } catch (err) {
      if (isMounted.current) setDirectTicketsToWallets(false);
    }
  };

  const handleCopyPhone = async () => {
    try {
      if (!contact?.number) { toast.error(i18n.t("ticketInfo.noPhone")); return; }
      const phoneNumber = contact.number.replace(/\D/g, '');
      if (phoneNumber.length >= 8) {
        await navigator.clipboard.writeText(phoneNumber);
        toast.success(i18n.t("ticketInfo.phonecopied"));
      } else {
        toast.error(i18n.t("ticketInfo.invalidPhoneFormat"));
      }
    } catch (err) {
      toast.error(i18n.t("ticketInfo.copyError"));
    }
    setActionsAnchorEl(null);
  };

  const handleQuickMessageSelect = useCallback((selectedMessage) => {
    setQuickMessageModalOpen(false);
    const event = new CustomEvent('insertQuickMessage', {
      detail: {
        quickMessage: {
          id: selectedMessage.id,
          message: selectedMessage.message || "",
          shortcode: selectedMessage.shortcode || "",
          mediaPath: selectedMessage.mediaPath || null,
          mediaType: selectedMessage.mediaType || null,
          value: selectedMessage.message || ""
        }
      },
      bubbles: false
    });
    window.dispatchEvent(event);
  }, []);

  const handleClickOpen = async () => {
    const setting = await getSetting({ column: "requiredTag" });
    if (setting?.requiredTag === "enabled") {
      try {
        const contactTags = await api.get(`/contactTags/${ticket.contact.id}`);
        if (!contactTags.data.tags) {
          toast.warning(i18n.t("messagesList.header.buttons.requiredTag"));
        } else {
          setOpen(true);
        }
      } catch (err) { toastError(err); }
    } else {
      setOpen(true);
    }
  };

  const handleClose = () => { formRef.current.resetForm(); setOpen(false); };
  const handleCloseAlert = () => { setOpenAlert(false); setLoading(false); };

  const handleOpenAcceptTicketWithouSelectQueue = () => setAcceptTicketWithouSelectQueueOpen(true);

  const handleOpenTransferModal = () => {
    setTransferTicketModalOpen(true);
    setActionsAnchorEl(null);
  };

  const handleOpenConfirmationModal = () => {
    setConfirmationOpen(true);
    setMoreAnchorEl(null);
  };

  const handleCloseTicketWithoutFarewellMsg = async () => {
    setLoading(true);
    try {
      await api.put(`/tickets/${ticket.id}`, {
        status: "closed", userId: user?.id || null,
        sendFarewellMessage: false, amountUsedBotQueues: 0,
      });
      setLoading(false);
      history.push("/tickets");
    } catch (err) { setLoading(false); toastError(err); }
  };

  const handleEnableIntegration = async () => {
    setLoading(true);
    try {
      await api.put(`/tickets/${ticket.id}`, { useIntegration: !enableIntegration });
      setEnableIntegration(!enableIntegration);
      setLoading(false);
    } catch (err) { setLoading(false); toastError(err); }
    setMoreAnchorEl(null);
  };

  const handleShowLogTicket = () => { setShowTicketLogOpen(true); setMoreAnchorEl(null); };

  const handleContactToggleDisableBot = async () => {
    const { id } = ticket.contact;
    try {
      const { data } = await api.put(`/contacts/toggleDisableBot/${id}`);
      ticket.contact.disableBot = data.disableBot;
      setDisableBot(data.disableBot);
    } catch (err) { toastError(err); }
  };

  const handleCloseTransferTicketModal = () => setTransferTicketModalOpen(false);

  const handleDeleteTicket = async () => {
    try {
      await api.delete(`/tickets/${ticket.id}`);
      history.push("/tickets");
    } catch (err) { toastError(err); }
  };

  const handleSendMessage = async (id) => {
    let setting;
    try { setting = await getSetting({ column: "greetingAcceptedMessage" }); }
    catch (err) { toastError(err); }
    if (!setting.greetingAcceptedMessage) {
      toast.warning(i18n.t("messagesList.header.buttons.greetingAcceptedMessage"));
      return;
    }
    const message = { read: 1, fromMe: true, mediaUrl: "", body: `${setting.greetingAcceptedMessage.trim()}` };
    try { await api.post(`/messages/${id}`, message); }
    catch (err) { toastError(err); }
  };

  const handleUpdateTicketStatus = async (e, status, userId) => {
    setLoading(true);
    try {
      await api.put(`/tickets/${ticket.id}`, { status, userId: userId || null });
      let setting;
      try { setting = await getSetting({ column: "sendGreetingAccepted" }); }
      catch (err) { toastError(err); }
      if (setting?.sendGreetingAccepted === "enabled" &&
        (!ticket.isGroup || ticket.whatsapp?.groupAsTicket === "enabled") &&
        ticket.status === "pending") {
        handleSendMessage(ticket.id);
      }
      if (isMounted.current) setLoading(false);
      if (status === "open" || status === "group") {
        setCurrentTicket({ ...ticket, code: "#" + status });
        setTimeout(() => { history.push("/tickets"); }, 0);
        setTimeout(() => { history.push(`/tickets/${ticket.uuid}`); setTabOpen(status); }, 10);
      } else {
        setCurrentTicket({ id: null, code: null });
        history.push("/tickets");
      }
    } catch (err) {
      if (isMounted.current) setLoading(false);
      toastError(err);
    }
  };

  const handleAcepptTicket = async (id) => {
    setLoading(true);
    try {
      const otherTicket = await api.put(`/tickets/${id}`, {
        status: ticket.isGroup ? "group" : "open", userId: user?.id,
      });
      if (otherTicket.data.id !== ticket.id) {
        if (otherTicket.data.userId !== user?.id) {
          if (isMounted.current) {
            setOpenAlert(true);
            setUserTicketOpen(otherTicket.data.user.name);
            setQueueTicketOpen(otherTicket.data.queue.name);
            setTabOpen(otherTicket.isGroup ? "group" : "open");
          }
        } else {
          if (isMounted.current) { setLoading(false); setTabOpen(otherTicket.isGroup ? "group" : "open"); }
          history.push(`/tickets/${otherTicket.data.uuid}`);
        }
      } else {
        if (isMounted.current) setLoading(false);
        history.push("/tickets");
        setTimeout(() => { history.push(`/tickets/${ticket.uuid}`); setTabOpen(ticket.isGroup ? "group" : "open"); }, 1000);
      }
    } catch (err) {
      if (isMounted.current) setLoading(false);
      toastError(err);
    }
  };

  const saveHistoricalLink = async (payload) => {
    await api.post(`/call/historical/wavoip`, payload);
  };

  const handleOpenWavoipCall = async () => {
    if (!ticket?.whatsapp?.wavoip || !ticket?.contact?.number) {
      toastError("Error: Token o número de teléfono no disponible.");
      return;
    }
    const token = ticket.whatsapp.wavoip;
    const phone = ticket.contact.number.replace(/\D/g, "");
    const name = ticket.contact.name;
    const url = `https://app.wavoip.com/call?token=${token}&phone=${phone}&name=${name}&start_if_ready=true&close_after_call=true`;
    try {
      await saveHistoricalLink({
        user_id: ticket?.user?.id || null, token_wavoip: token,
        whatsapp_id: ticket?.whatsapp?.id || null, contact_id: ticket?.contact?.id || null,
        company_id: ticket?.company?.id || null, phone_to: phone, name, url, createdAt: new Date()
      });
    } catch (e) { /* silencioso */ }
    window.open(url, "wavoip", "toolbar=no,scrollbars=no,resizable=no,top=500,left=500,width=500,height=700");
    setActionsAnchorEl(null);
  };

  const handleExportPDF = async () => { setOpenTicketMessageDialog(true); setMoreAnchorEl(null); };

  const handleTestButton = async () => {
    try {
      if (ticket?.whatsapp?.integrationTypeId) {
        const { data: integration } = await api.get(`/queueIntegration/${ticket.whatsapp.integrationTypeId}`);
        if (integration) {
          await api.post(`/queueIntegration/testsession`, {
            integrationId: ticket.whatsapp.integrationTypeId, ticketId: ticket.id,
            contactId: ticket.contactId, body: ticket.lastMessage?.body || "", status: "closed",
          });
          if (isMounted.current) toast.success(i18n.t("ticketList.success.integrationTriggered"));
        }
      }
      await handleUpdateTicketStatus(null, "closed", user?.id, ticket?.queue?.id);
      if (isMounted.current) handleClose();
    } catch (err) { toastError(err); }
  };

  const handleLinkToWallet = async () => {
    if (!ticket.contactId) { toast.error(i18n.t("contactModal.saveFirst")); return; }
    setLinkingWallet(true);
    try {
      if (!user.queues || user.queues.length === 0) {
        toast.error(i18n.t("contactModal.walletError")); return;
      }
      const userQueue = user.queues[0];
      await api.put(`/contacts/wallet/${ticket.contactId}`, {
        wallets: { userId: user.id, queueId: ticket.queueId || userQueue.id },
      });
      toast.success(i18n.t("contactModal.walletLinked"));
    } catch (err) { toastError(err); }
    finally { setLinkingWallet(false); setActionsAnchorEl(null); }
  };

  const handleUnlinkWallet = async () => {
    if (!ticket.contactId) return;
    setLinkingWallet(true);
    try {
      await api.delete(`/contacts/wallet/${ticket.contactId}`);
      toast.success(i18n.t("contactModal.walletUnlinked"));
    } catch (err) { toastError(err); }
    finally { setLinkingWallet(false); setActionsAnchorEl(null); }
  };

  const handleFinalizarTicket = async (tipo) => {
    if (user.finalizacaoComValorVendaAtiva === true || user.finalizacaoComValorVendaAtiva === "true") {
      setFinalizacaoTipo(tipo);
      setOpenFinalizacaoVenda(true);
    } else {
      if (tipo === "semDespedida") { handleCloseTicketWithoutFarewellMsg(); }
      else { handleUpdateTicketStatus(null, "closed", user?.id, ticket?.queue?.id); }
    }
  };

  const handleClickResolver = () => {
    if (user.finalizacaoComValorVendaAtiva === true || user.finalizacaoComValorVendaAtiva === "true") {
      setFinalizacaoTipo("comDespedida");
      setOpenFinalizacaoVenda(true);
    } else {
      setOpen(true);
    }
  };

  const handleUpdateTicketStatusWithData = async (ticketData, sendFarewellMessage, finalizacaoMessage) => {
    try {
      await api.put(`/tickets/${ticket.id}`, { ...ticketData, sendFarewellMessage, finalizacaoMessage });
      toast.success("Ticket finalizado con éxito.");
    } catch (err) { toastError(err); }
  };

  const hasWallet = ticket.contact?.contactWallets && ticket.contact.contactWallets.length > 0;

  return (
    <>
      {openAlert && (
        <ShowTicketOpen isOpen={openAlert} handleClose={handleCloseAlert}
          user={userTicketOpen} queue={queueTicketOpen} />
      )}
      {acceptTicketWithouSelectQueueOpen && (
        <AcceptTicketWithouSelectQueue
          modalOpen={acceptTicketWithouSelectQueueOpen}
          onClose={() => setAcceptTicketWithouSelectQueueOpen(false)}
          ticketId={ticket.id} ticket={ticket}
        />
      )}
      {showTicketLogOpen && (
        <ShowTicketLogModal isOpen={showTicketLogOpen}
          handleClose={() => setShowTicketLogOpen(false)} ticketId={ticket.id} />
      )}
      {openTicketMessageDialog && (
        <TicketMessagesDialog open={openTicketMessageDialog}
          handleClose={() => setOpenTicketMessageDialog(false)} ticketId={ticket.id} />
      )}
      {quickMessageModalOpen && (
        <QuickMessageModal open={quickMessageModalOpen}
          onClose={() => setQuickMessageModalOpen(false)}
          onSelect={handleQuickMessageSelect}
          companyId={user?.companyId} userId={user?.id}
        />
      )}
      {templateModalOpen && (
        <TemplateMetaModal open={templateModalOpen}
          handleClose={() => setTemplateModalOpen(false)}
          ticketId={ticket.id} whatsappId={ticket.whatsappId}
        />
      )}

      <div className={classes.actionButtons}>

        {/* ── Tickets CERRADOS: botón Reabrir ── */}
        {ticket.status === "closed" && (ticket.queueId === null || ticket.queueId === undefined) && (
          <ButtonWithSpinner loading={loading} startIcon={<Replay />} size="small"
            onClick={handleOpenAcceptTicketWithouSelectQueue}>
            {i18n.t("messagesList.header.buttons.reopen")}
          </ButtonWithSpinner>
        )}
        {ticket.status === "closed" && ticket.queueId !== null && (
          <ButtonWithSpinner startIcon={<Replay />} loading={loading}
            onClick={() => handleAcepptTicket(ticket.id)}>
            {i18n.t("messagesList.header.buttons.reopen")}
          </ButtonWithSpinner>
        )}

        {/* ── Tickets PENDING: botón Aceptar ── */}
        {ticket.status === "pending" && (ticket.queueId === null || ticket.queueId === undefined) && (
          <ButtonWithSpinner loading={loading} size="small" variant="contained"
            onClick={handleOpenAcceptTicketWithouSelectQueue}>
            {i18n.t("messagesList.header.buttons.accept")}
          </ButtonWithSpinner>
        )}
        {ticket.status === "pending" && ticket.queueId !== null && (
          <ButtonWithSpinner loading={loading} size="small" variant="contained"
            onClick={(e) => handleUpdateTicketStatus(e, "open", user?.id)}>
            {i18n.t("messagesList.header.buttons.accept")}
          </ButtonWithSpinner>
        )}

        {/* ── Tickets ABIERTOS: barra de acciones moderna ── */}
        {(ticket.status === "open" || ticket.status === "group") && (
          <>
            {/* Botón Resolver (verde prominente) */}
            <Button
              className={classes.resolveButton}
              onClick={handleClickResolver}
              disabled={loading}
              endIcon={<ExpandMore style={{ fontSize: 16 }} />}
            >
              Resolver
            </Button>

            {/* Botón Transferir */}
            <Tooltip title="Transferir ticket">
              <Button
                className={classes.transferButton}
                onClick={handleOpenTransferModal}
                startIcon={<SwapHorizOutlined style={{ fontSize: 16 }} />}
              >
                Transferir
              </Button>
            </Tooltip>

            {/* Menú Acciones (agrupa: teléfono, rápidos, wavoip, plantilla, regresar, wallet, bot) */}
            <Button
              className={classes.actionsButton}
              onClick={(e) => setActionsAnchorEl(e.currentTarget)}
              endIcon={<ExpandMore style={{ fontSize: 16 }} />}
              startIcon={<Apps style={{ fontSize: 16 }} />}
            >
              Acciones
            </Button>
            <Menu
              anchorEl={actionsAnchorEl}
              open={actionsMenuOpen}
              onClose={() => setActionsAnchorEl(null)}
              getContentAnchorEl={null}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
            >
              {/* Comunicación */}
              <MenuItem className={classes.menuItem} onClick={handleCopyPhone} disabled={!contact?.number}>
                <FileCopyIcon className={classes.menuItemIcon} />
                Copiar teléfono
              </MenuItem>
              <MenuItem className={classes.menuItem} onClick={() => { setQuickMessageModalOpen(true); setActionsAnchorEl(null); }}>
                <FlashOn className={classes.menuItemIcon} />
                Mensajes rápidos
              </MenuItem>
              {showWavoipCall && (
                <MenuItem className={classes.menuItem} onClick={handleOpenWavoipCall}>
                  <Phone className={classes.menuItemIcon} />
                  Llamada Wavoip
                </MenuItem>
              )}
              {ticket.channel === "whatsapp_oficial" && (
                <MenuItem className={classes.menuItem} onClick={() => { setTemplateModalOpen(true); setActionsAnchorEl(null); }}>
                  <AssignmentIcon className={classes.menuItemIcon} />
                  Enviar plantilla
                </MenuItem>
              )}

              <Divider style={{ margin: "4px 0" }} />

              {/* Gestión del ticket */}
              <MenuItem className={classes.menuItem} onClick={() => { handleUpdateTicketStatus(null, "pending", null); setActionsAnchorEl(null); }}>
                <UndoIcon className={classes.menuItemIcon} />
                Regresar a cola
              </MenuItem>

              {directTicketsToWallets && (
                hasWallet ? (
                  <MenuItem className={classes.menuItem} onClick={handleUnlinkWallet} disabled={linkingWallet}>
                    {linkingWallet ? <CircularProgress size={16} /> : (
                      <AccountBalanceWallet className={`${classes.menuItemIcon} ${classes.walletActive}`} />
                    )}
                    Quitar asignación fija
                  </MenuItem>
                ) : (
                  <MenuItem className={classes.menuItem} onClick={handleLinkToWallet} disabled={linkingWallet}>
                    {linkingWallet ? <CircularProgress size={16} /> : (
                      <AccountBalanceWallet className={classes.menuItemIcon} />
                    )}
                    Mantener conmigo
                  </MenuItem>
                )
              )}

              <Divider style={{ margin: "4px 0" }} />

              {/* Bot toggle inline */}
              <MenuItem className={classes.menuItem} onClick={handleContactToggleDisableBot}>
                <Switch size="small" checked={disableBot} color="primary"
                  onChange={() => {}} style={{ marginRight: 4, pointerEvents: "none" }} />
                {disableBot ? "Bot desactivado" : "Desactivar bot"}
              </MenuItem>
            </Menu>

            {/* Confirmación de eliminar */}
            {confirmationOpen && (
              <ConfirmationModal
                title={`${i18n.t("ticketOptionsMenu.confirmationModal.title")} #${ticket.id}?`}
                open={confirmationOpen}
                onClose={setConfirmationOpen}
                onConfirm={handleDeleteTicket}
              >
                {i18n.t("ticketOptionsMenu.confirmationModal.message")}
              </ConfirmationModal>
            )}
            {transferTicketModalOpen && (
              <TransferTicketModalCustom
                modalOpen={transferTicketModalOpen}
                onClose={handleCloseTransferTicketModal}
                ticketid={ticket.id} ticket={ticket}
              />
            )}
          </>
        )}

        {/* ── Menú "⋮ Más" (siempre visible) ── */}
        <IconButton
          className={classes.moreIconButton}
          onClick={(e) => setMoreAnchorEl(e.currentTarget)}
          size="small"
        >
          <MoreVert style={{ fontSize: 18 }} />
        </IconButton>
        <Menu
          anchorEl={moreAnchorEl}
          open={moreMenuOpen}
          onClose={() => setMoreAnchorEl(null)}
          getContentAnchorEl={null}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
        >
          <Can
            role={user.profile}
            perform="ticket-options:deleteTicket"
            yes={() => (
              <MenuItem className={classes.menuItem} onClick={handleOpenConfirmationModal}>
                {i18n.t("tickets.buttons.deleteTicket")}
              </MenuItem>
            )}
          />
          <MenuItem className={classes.menuItem} onClick={handleEnableIntegration}>
            {enableIntegration
              ? i18n.t("messagesList.header.buttons.disableIntegration")
              : i18n.t("messagesList.header.buttons.enableIntegration")}
          </MenuItem>
          <MenuItem className={classes.menuItem} onClick={handleShowLogTicket}>
            {i18n.t("messagesList.header.buttons.logTicket")}
          </MenuItem>
          <MenuItem className={classes.menuItem} onClick={handleExportPDF}>
            {i18n.t("ticketsList.buttons.exportAsPDF")}
          </MenuItem>
        </Menu>
      </div>

      {/* ── Modal de confirmación de cierre ── */}
      <>
        {(!user.finalizacaoComValorVendaAtiva ||
          user.finalizacaoComValorVendaAtiva === false ||
          user.finalizacaoComValorVendaAtiva === "false") && (
          <Formik
            enableReinitialize={true}
            validationSchema={SessionSchema}
            innerRef={formRef}
            onSubmit={(values, actions) => {
              setTimeout(() => { actions.setSubmitting(false); actions.resetForm(); }, 400);
            }}
          >
            {({ resetForm }) => (
              <Dialog open={open} onClose={handleClose}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
              >
                <Form>
                  <DialogActions className={classes.botoes}>
                    <Button onClick={() => handleFinalizarTicket("semDespedida")}
                      style={{ background: theme.palette.primary.main, color: "white" }}>
                      {i18n.t("messagesList.header.dialogRatingWithoutFarewellMsg")}
                    </Button>
                    <Button onClick={() => handleFinalizarTicket("comDespedida")}
                      style={{ background: theme.palette.primary.main, color: "white" }}>
                      {i18n.t("messagesList.header.dialogRatingCancel")}
                    </Button>
                    {showTestButton && (
                      <Button onClick={handleTestButton}
                        style={{ background: theme.palette.primary.main, color: "white" }}>
                        {i18n.t("whatsappModalRel.form.resolveAndTriggerIntegration")}
                      </Button>
                    )}
                  </DialogActions>
                </Form>
              </Dialog>
            )}
          </Formik>
        )}
      </>

      {openFinalizacaoVenda && (
        <FinalizacaoVendaModal
          open={openFinalizacaoVenda}
          onClose={() => setOpenFinalizacaoVenda(false)}
          ticket={ticket}
          onFinalizar={(ticketData) => {
            setOpenFinalizacaoVenda(false);
            setTicketDataToFinalize(ticketData);
            setShowFinalizacaoOptions(true);
          }}
        />
      )}

      {showFinalizacaoOptions && (
        <Dialog open={showFinalizacaoOptions} onClose={() => setShowFinalizacaoOptions(false)}
          aria-labelledby="finalizacao-options-title">
          <DialogTitle id="finalizacao-options-title">¿Cómo deseas finalizar?</DialogTitle>
          <DialogActions className={classes.botoes}>
            <Button
              onClick={async () => {
                setShowFinalizacaoOptions(false);
                await handleUpdateTicketStatusWithData(ticketDataToFinalize, false, null);
              }}
              style={{ background: theme.palette.primary.main, color: "white" }}
            >
              {i18n.t("messagesList.header.dialogRatingWithoutFarewellMsg")}
            </Button>
            <Button
              onClick={async () => {
                setShowFinalizacaoOptions(false);
                await handleUpdateTicketStatusWithData(ticketDataToFinalize, true, null);
              }}
              style={{ background: theme.palette.primary.main, color: "white" }}
            >
              {i18n.t("messagesList.header.dialogRatingCancel")}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  );
};

export default TicketActionButtonsCustom;
