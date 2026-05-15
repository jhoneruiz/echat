import React, { useState, useEffect, useContext } from "react";
import { useHistory } from "react-router-dom";

import { makeStyles } from "@material-ui/core/styles";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import Typography from "@material-ui/core/Typography";
import Autocomplete, { createFilterOptions } from "@material-ui/lab/Autocomplete";
import CircularProgress from "@material-ui/core/CircularProgress";
import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import ButtonWithSpinner from "../ButtonWithSpinner";
import ContactModal from "../ContactModal";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";
import { Box, Grid, IconButton, ListItemText, MenuItem, Select } from "@material-ui/core";
import { toast } from "react-toastify";
import { Close, Facebook, Instagram, WhatsApp, AddComment } from "@material-ui/icons";
import ShowTicketOpen from "../ShowTicketOpenModal";

const useStyles = makeStyles((theme) => ({
  online: {
    fontSize: 11,
    color: "#25d366",
    margin: 0,
  },
  offline: {
    fontSize: 11,
    color: "#e1306c",
    margin: 0,
  },
  dialogPaper: {
    borderRadius: 14,
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
    width: 42,
    height: 42,
    borderRadius: 12,
    background: theme.palette.primary.main,
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
  fieldLabel: {
    fontSize: "0.8rem",
    fontWeight: 600,
    marginBottom: 4,
    color: theme.palette.text.primary,
  },
  fieldHint: {
    fontSize: "0.72rem",
    color: theme.palette.text.secondary,
    marginTop: 4,
    lineHeight: 1.3,
  },
  content: {
    padding: theme.spacing(2.5),
  },
  footer: {
    padding: theme.spacing(1.5, 2),
    borderTop: `1px solid ${theme.palette.divider}`,
    gap: theme.spacing(1),
  },
}));

const filter = createFilterOptions({
  trim: true,
});

const NewTicketModal = ({ modalOpen, onClose, initialContact }) => {
  const classes = useStyles();
  const [options, setOptions] = useState([]);
  const [channelFilter, setChannelFilter] = useState(null);

  const [loading, setLoading] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [selectedContact, setSelectedContact] = useState(null);
  const [selectedQueue, setSelectedQueue] = useState("");
  const [selectedWhatsapp, setSelectedWhatsapp] = useState("");
  const [newContact, setNewContact] = useState({});
  const [whatsapps, setWhatsapps] = useState([]);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const { user } = useContext(AuthContext);
  const { companyId, whatsappId } = user;

  const [openAlert, setOpenAlert] = useState(false);
  const [userTicketOpen, setUserTicketOpen] = useState("");
  const [queueTicketOpen, setQueueTicketOpen] = useState("");

  useEffect(() => {
    if (initialContact?.id !== undefined) {
      setOptions([initialContact]);
      setSelectedContact(initialContact);
    }
  }, [initialContact]);

  useEffect(() => {
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      const fetchContacts = async () => {
        api
          // .get(`/whatsapp/filter`, { params: { companyId, session: 0, channel: channelFilter } })
          .get(`/whatsapp`, { params: { companyId, session: 0 } })
          .then(({ data }) => setWhatsapps(data));

        // .then(({ data }) => {
        //   const mappedWhatsapps = data.map((whatsapp) => ({
        //     ...whatsapp,
        //     selected: false,
        //   }));
        //   setWhatsapps(mappedWhatsapps);
        //   if (channelFilter && mappedWhatsapps.length && mappedWhatsapps?.length === 1 && (user.whatsappId === null || user?.whatsapp?.channel !== channelFilter)) {
        //     setSelectedWhatsapp(mappedWhatsapps[0].id)
        //   }
        // });
      };

      if (whatsappId !== null && whatsappId !== undefined) {
        setSelectedWhatsapp(whatsappId)
      }

      if (user.queues.length === 1) {
        setSelectedQueue(user.queues[0].id)
      }
      fetchContacts();
      setLoading(false);
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [selectedContact, channelFilter])

  useEffect(() => {
    if (!modalOpen || searchParam.length < 3) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      const fetchContacts = async () => {
        try {
          const { data } = await api.get("contacts", {
            params: { searchParam },
          });
          setOptions(data.contacts);
          setLoading(false);
        } catch (err) {
          setLoading(false);
          toastError(err);
        }
      };
      fetchContacts();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchParam, modalOpen]);

  const IconChannel = (channel) => {
    switch (channel) {
      case "facebook":
        return <Facebook style={{ color: "#3b5998", verticalAlign: "middle" }} />;
      case "instagram":
        return <Instagram style={{ color: "#e1306c", verticalAlign: "middle" }} />;
      case "whatsapp":
        return <WhatsApp style={{ color: "#25d366", verticalAlign: "middle" }} />
      case "whatsapp_oficial":
        return <WhatsApp style={{ color: "#25d366", verticalAlign: "middle" }} />
      default:
        return "error";
    }
  };

  const handleClose = () => {
    onClose();
    setSearchParam("");
    setOpenAlert(false);
    setUserTicketOpen("");
    setQueueTicketOpen("");
    setSelectedContact(null);
  };

  const handleCloseAlert = () => {
    setOpenAlert(false);
    setLoading(false);
    setOpenAlert(false);
    setUserTicketOpen("");
    setQueueTicketOpen("");
  };

  const handleSaveTicket = async contactId => {
    if (!contactId) return;
    // if (selectedQueue === "" && user.profile !== 'admin') {
    if (selectedQueue === "") {
      toast.error("Selecciona una cola");
      return;
    }

    setLoading(true);
    try {
      const queueId = selectedQueue !== "" ? selectedQueue : null;
      const whatsappId = selectedWhatsapp !== "" ? selectedWhatsapp : null;
      const { data: ticket } = await api.post("/tickets", {
        contactId: contactId,
        queueId,
        whatsappId,
        userId: user.id,
        status: "open",
      });

      onClose(ticket);
    } catch (err) {

      const ticket = JSON.parse(err.response.data.error);

      if (ticket.userId !== user?.id) {
        setOpenAlert(true);
        setUserTicketOpen(ticket?.user?.name);
        setQueueTicketOpen(ticket?.queue?.name);
      } else {
        setOpenAlert(false);
        setUserTicketOpen("");
        setQueueTicketOpen("");
        setLoading(false);
        onClose(ticket);
      }
    }
    setLoading(false);
  };

  const handleSelectOption = (e, newValue) => {
    if (newValue?.number) {
      setSelectedContact(newValue);
    } else if (newValue?.name) {
      setNewContact({ name: newValue.name });
      setContactModalOpen(true);
    }
  };

  const handleCloseContactModal = () => {
    setContactModalOpen(false);
  };

  const handleAddNewContactTicket = contact => {
    setSelectedContact(contact);
  };

  const createAddContactOption = (filterOptions, params) => {
    const filtered = filter(filterOptions, params);
    if (params.inputValue !== "" && !loading && searchParam.length >= 3) {
      filtered.push({
        name: `${params.inputValue}`,
      });
    }
    return filtered;
  };

  const renderOption = option => {
    if (option.number) {
      return <>
        {IconChannel(option.channel)}
        <Typography component="span" style={{ fontSize: 14, marginLeft: "10px", display: "inline-flex", alignItems: "center", lineHeight: "2" }}>
          {option.name} - {option.number}
        </Typography>
      </>
    } else {
      return `${i18n.t("newTicketModal.add")} ${option.name}`;
    }
  };

  const renderOptionLabel = option => {
    if (option.number) {
      return `${option.name} - ${option.number}`;
    } else {
      return `${option.name}`;
    }
  };

  const renderContactAutocomplete = () => {
    if (initialContact === undefined || initialContact.id === undefined) {
      return (
        <Grid xs={12} item>
          <Autocomplete
            fullWidth
            options={options}
            loading={loading}
            clearOnBlur
            autoHighlight
            freeSolo
            clearOnEscape
            getOptionLabel={renderOptionLabel}
            renderOption={renderOption}
            filterOptions={createAddContactOption}
            onChange={(e, newValue) => {
              setChannelFilter(newValue ? newValue.channel : "whatsapp");
              handleSelectOption(e, newValue)
            }}
            renderInput={params => (
              <TextField
                {...params}
                label={i18n.t("newTicketModal.fieldLabel")}
                variant="outlined"
                autoFocus
                onChange={e => setSearchParam(e.target.value)}
                onKeyPress={e => {
                  if (loading || !selectedContact) return;
                  else if (e.key === "Enter") {
                    handleSaveTicket(selectedContact.id);
                  }
                }}
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <React.Fragment>
                      {loading ? (
                        <CircularProgress color="inherit" size={20} />
                      ) : null}
                      {params.InputProps.endAdornment}
                    </React.Fragment>
                  ),
                }}
              />
            )}
          />
        </Grid>
      )
    }
    return null;
  }

  return (
    <>

      <Dialog
        open={modalOpen}
        onClose={handleClose}
        maxWidth="xs"
        fullWidth
        classes={{ paper: classes.dialogPaper }}
      >
        <Box className={classes.header}>
          <Box className={classes.headerIcon}>
            <AddComment />
          </Box>
          <Box flex={1}>
            <Typography className={classes.headerTitle}>
              {i18n.t("newTicketModal.title")}
            </Typography>
            <Typography className={classes.headerSubtitle}>
              Crea una nueva conversación con un contacto existente o nuevo.
            </Typography>
          </Box>
          <IconButton size="small" onClick={handleClose}>
            <Close fontSize="small" />
          </IconButton>
        </Box>

        <DialogContent className={classes.content}>
          {/* CONTACTO */}
          {(initialContact === undefined || initialContact?.id === undefined) && (
            <Box mb={2}>
              <Typography className={classes.fieldLabel}>
                👤 Contacto
              </Typography>
              {renderContactAutocomplete()}
              <Typography className={classes.fieldHint}>
                Busca un contacto existente o escribe un nombre nuevo para crearlo.
              </Typography>
            </Box>
          )}

          {/* COLA */}
          <Box mb={2}>
            <Typography className={classes.fieldLabel}>
              📂 Cola / Sector
            </Typography>
            <Select
              required
              fullWidth
              displayEmpty
              variant="outlined"
              value={selectedQueue}
              onChange={(e) => setSelectedQueue(e.target.value)}
              MenuProps={{
                anchorOrigin: { vertical: "bottom", horizontal: "left" },
                transformOrigin: { vertical: "top", horizontal: "left" },
                getContentAnchorEl: null,
              }}
              renderValue={() => {
                if (selectedQueue === "") return "Selecciona una cola";
                const queue = user.queues.find((q) => q.id === selectedQueue);
                return queue?.name;
              }}
            >
              {user.queues?.length > 0 &&
                user.queues.map((queue, key) => (
                  <MenuItem dense key={key} value={queue.id}>
                    <ListItemText primary={queue.name} />
                  </MenuItem>
                ))}
            </Select>
            <Typography className={classes.fieldHint}>
              Define a qué equipo se asigna el ticket inicialmente.
            </Typography>
          </Box>

          {/* CONEXIÓN */}
          <Box mb={1}>
            <Typography className={classes.fieldLabel}>
              📡 Conexión WhatsApp
            </Typography>
            <Select
              required
              fullWidth
              displayEmpty
              variant="outlined"
              value={selectedWhatsapp}
              onChange={(e) => setSelectedWhatsapp(e.target.value)}
              MenuProps={{
                anchorOrigin: { vertical: "bottom", horizontal: "left" },
                transformOrigin: { vertical: "top", horizontal: "left" },
                getContentAnchorEl: null,
              }}
              renderValue={() => {
                if (selectedWhatsapp === "") return "Selecciona una conexión";
                const whatsapp = whatsapps.find((w) => w.id === selectedWhatsapp);
                return whatsapp?.name;
              }}
            >
              {whatsapps?.length > 0 &&
                whatsapps.map((whatsapp, key) => (
                  <MenuItem dense key={key} value={whatsapp.id}>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          {IconChannel(whatsapp.channel)}
                          <Typography component="span" style={{ fontSize: 14 }}>
                            {whatsapp.name}
                          </Typography>
                          <p className={whatsapp.status === "CONNECTED" ? classes.online : classes.offline}>
                            ({whatsapp.status})
                          </p>
                        </Box>
                      }
                    />
                  </MenuItem>
                ))}
            </Select>
            <Typography className={classes.fieldHint}>
              Desde qué número WhatsApp saldrá la conversación.
            </Typography>
          </Box>
        </DialogContent>

        <DialogActions className={classes.footer}>
          <Button
            onClick={handleClose}
            disabled={loading}
            variant="outlined"
            style={{ textTransform: "none", borderRadius: 10 }}
          >
            {i18n.t("newTicketModal.buttons.cancel")}
          </Button>
          <ButtonWithSpinner
            variant="contained"
            type="button"
            disabled={!selectedContact}
            onClick={() => handleSaveTicket(selectedContact.id)}
            color="primary"
            loading={loading}
            style={{ textTransform: "none", borderRadius: 10 }}
          >
            {i18n.t("newTicketModal.buttons.ok")}
          </ButtonWithSpinner>
        </DialogActions>
        {contactModalOpen && (
          <ContactModal
            open={contactModalOpen}
            initialValues={newContact}
            onClose={handleCloseContactModal}
            onSave={handleAddNewContactTicket}
          ></ContactModal>
        )}
        {openAlert && (
          <ShowTicketOpen
            isOpen={openAlert}
            handleClose={handleCloseAlert}
            user={userTicketOpen}
            queue={queueTicketOpen}
          />
        )}
      </Dialog >
    </>
  );
};
export default NewTicketModal;