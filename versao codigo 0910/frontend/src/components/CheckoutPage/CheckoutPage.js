import React, { useContext, useEffect, useState } from "react";
import {
  Typography,
  CircularProgress,
  Button,
  Box,
  Divider,
  makeStyles,
} from "@material-ui/core";
import {
  Receipt as ReceiptIcon,
  CreditCard,
  AccountBalanceWallet,
} from "@material-ui/icons";
import QRCode from "react-qr-code";
import { CopyToClipboard } from "react-copy-to-clipboard";
import { FaCopy, FaCheckCircle } from "react-icons/fa";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/Auth/AuthContext";
import { useDate } from "../../hooks/useDate";
import moment from "moment";
import { useHistory } from "react-router-dom";

const useStyles = makeStyles((theme) => ({
  container: {
    padding: theme.spacing(2),
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1.5),
    marginBottom: theme.spacing(2),
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor:
      theme.palette.type === "dark" ? "rgba(59,130,246,0.15)" : "#EBF5FF",
    color: theme.palette.primary.main,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: "1.1rem",
    fontWeight: 600,
    lineHeight: 1.2,
  },
  subtitle: {
    fontSize: "0.82rem",
    color: theme.palette.text.secondary,
    marginTop: 2,
  },
  invoiceCard: {
    padding: theme.spacing(2),
    borderRadius: 12,
    backgroundColor:
      theme.palette.type === "dark" ? "rgba(255,255,255,0.04)" : "#F8FAFC",
    border: `1px solid ${theme.palette.divider}`,
    marginBottom: theme.spacing(2.5),
  },
  totalRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginTop: theme.spacing(1),
  },
  totalLabel: {
    fontSize: "0.85rem",
    color: theme.palette.text.secondary,
  },
  totalValue: {
    fontSize: "1.6rem",
    fontWeight: 700,
    color: theme.palette.text.primary,
  },
  detailRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "0.85rem",
    padding: theme.spacing(0.5, 0),
    color: theme.palette.text.secondary,
  },
  paymentMethodsTitle: {
    fontSize: "0.85rem",
    fontWeight: 600,
    marginBottom: theme.spacing(1.5),
    color: theme.palette.text.primary,
  },
  paymentButton: {
    width: "100%",
    padding: theme.spacing(1.5, 2),
    marginBottom: theme.spacing(1),
    borderRadius: 10,
    textTransform: "none",
    fontSize: "0.95rem",
    fontWeight: 600,
    justifyContent: "flex-start",
    gap: theme.spacing(1.5),
  },
  mpButton: {
    backgroundColor: "#00B1EA",
    color: "#fff",
    "&:hover": { backgroundColor: "#0093C2" },
  },
  stripeButton: {
    backgroundColor: "#635BFF",
    color: "#fff",
    "&:hover": { backgroundColor: "#4F47D9" },
  },
  asaasButton: {
    backgroundColor: "#1E5BA8",
    color: "#fff",
    "&:hover": { backgroundColor: "#16447F" },
  },
  pixCard: {
    padding: theme.spacing(2),
    borderRadius: 12,
    border: `1px solid ${theme.palette.divider}`,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: theme.spacing(1.5),
    marginTop: theme.spacing(1),
  },
  copyPixButton: {
    textTransform: "none",
    gap: theme.spacing(1),
  },
  loadingBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing(6),
    gap: theme.spacing(2),
  },
  noMethodsBox: {
    padding: theme.spacing(3),
    borderRadius: 12,
    backgroundColor:
      theme.palette.type === "dark" ? "rgba(255,193,7,0.08)" : "#FFFBEB",
    border: `1px solid ${theme.palette.type === "dark" ? "rgba(255,193,7,0.3)" : "#FCD34D"}`,
    textAlign: "center",
  },
  noMethodsText: {
    color: theme.palette.type === "dark" ? "#FCD34D" : "#92400E",
    fontSize: "0.875rem",
  },
}));

export default function CheckoutPage(props) {
  const classes = useStyles();
  const { Invoice } = props;
  const { user, socket } = useContext(AuthContext);
  const { dateToClient } = useDate();
  const history = useHistory();

  const [loading, setLoading] = useState(true);
  const [paymentData, setPaymentData] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const initPayment = async () => {
      try {
        const planData = JSON.parse(JSON.stringify(Invoice));
        const newValues = {
          firstName: user?.name || "",
          lastName: "",
          address2: "",
          city: "",
          state: "",
          zipcode: "",
          country: "",
          useAddressForPaymentDetails: false,
          nameOnCard: "",
          cardNumber: "",
          cvv: "",
          plan: JSON.stringify({
            users: Invoice.users,
            connections: Invoice.connections,
            price: Invoice.value,
          }),
          price: Invoice.value,
          users: Invoice.users,
          connections: Invoice.connections,
          invoiceId: Invoice.id,
        };

        const { data } = await api.post("/subscription", newValues);
        setPaymentData(data);
      } catch (err) {
        toastError(err);
      } finally {
        setLoading(false);
      }
    };

    initPayment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user?.companyId || !socket) return;
    const onPayment = (data) => {
      if (data.action === "CONCLUIDA") {
        toast.success(
          `Tu licencia se renovó hasta ${dateToClient(data.company.dueDate)}.`
        );
        setTimeout(() => history.push("/"), 3000);
      }
    };
    socket.on(`company-${user.companyId}-payment`, onPayment);
    return () => {
      socket.off(`company-${user.companyId}-payment`, onPayment);
    };
  }, [user?.companyId, socket, history, dateToClient]);

  const handleCopyPix = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const pixString = paymentData?.qrcode?.qrcode;
  const stripeURL = paymentData?.stripeURL;
  const asaasURL = paymentData?.asaasURL;
  const mercadopagoURL = paymentData?.mercadopagoURL;

  const hasAnyMethod = pixString || stripeURL || asaasURL || mercadopagoURL;

  return (
    <div className={classes.container}>
      <div className={classes.header}>
        <div className={classes.iconCircle}>
          <ReceiptIcon />
        </div>
        <Box>
          <Typography className={classes.title}>
            Pagar factura #{Invoice.id}
          </Typography>
          <Typography className={classes.subtitle}>
            Selecciona un método de pago para completar la operación.
          </Typography>
        </Box>
      </div>

      {/* Resumen de la factura */}
      <div className={classes.invoiceCard}>
        <div className={classes.detailRow}>
          <span>Detalle</span>
          <span style={{ color: "inherit", fontWeight: 500 }}>
            {Invoice.detail || "—"}
          </span>
        </div>
        <div className={classes.detailRow}>
          <span>Usuarios incluidos</span>
          <span>{Invoice.users}</span>
        </div>
        <div className={classes.detailRow}>
          <span>Conexiones incluidas</span>
          <span>{Invoice.connections}</span>
        </div>
        <div className={classes.detailRow}>
          <span>Vencimiento</span>
          <span>{moment(Invoice.dueDate).format("DD/MM/YYYY")}</span>
        </div>
        <Divider style={{ margin: "12px 0" }} />
        <div className={classes.totalRow}>
          <span className={classes.totalLabel}>Total a pagar</span>
          <span className={classes.totalValue}>
            {Number(Invoice.value).toLocaleString("es-MX", {
              style: "currency",
              currency: "MXN",
            })}
          </span>
        </div>
      </div>

      {loading ? (
        <div className={classes.loadingBox}>
          <CircularProgress />
          <Typography variant="body2" color="textSecondary">
            Generando opciones de pago...
          </Typography>
        </div>
      ) : !hasAnyMethod ? (
        <div className={classes.noMethodsBox}>
          <Typography className={classes.noMethodsText} style={{ fontWeight: 600, marginBottom: 4 }}>
            Pagos no disponibles en este momento
          </Typography>
          <Typography className={classes.noMethodsText}>
            Por favor contacta al soporte para procesar tu pago.
          </Typography>
        </div>
      ) : (
        <>
          <Typography className={classes.paymentMethodsTitle}>
            Métodos disponibles
          </Typography>

          {mercadopagoURL && (
            <Button
              className={`${classes.paymentButton} ${classes.mpButton}`}
              onClick={() => window.open(mercadopagoURL, "_blank")}
              startIcon={<AccountBalanceWallet />}
            >
              Pagar con Mercado Pago
            </Button>
          )}

          {stripeURL && (
            <Button
              className={`${classes.paymentButton} ${classes.stripeButton}`}
              onClick={() => window.open(stripeURL, "_blank")}
              startIcon={<CreditCard />}
            >
              Pagar con tarjeta (Stripe)
            </Button>
          )}

          {asaasURL && (
            <Button
              className={`${classes.paymentButton} ${classes.asaasButton}`}
              onClick={() => window.open(asaasURL, "_blank")}
              startIcon={<CreditCard />}
            >
              Pagar con Asaas
            </Button>
          )}

          {pixString && (
            <div className={classes.pixCard}>
              <Typography style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                Pagar con Pix
              </Typography>
              <QRCode value={pixString} size={180} />
              <CopyToClipboard text={pixString} onCopy={handleCopyPix}>
                <Button
                  variant="outlined"
                  className={classes.copyPixButton}
                  startIcon={copied ? <FaCheckCircle /> : <FaCopy />}
                  size="small"
                >
                  {copied ? "Código copiado" : "Copiar código Pix"}
                </Button>
              </CopyToClipboard>
            </div>
          )}
        </>
      )}
    </div>
  );
}
