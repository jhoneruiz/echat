import React, { useState, useEffect, useReducer, useContext } from "react";
import { makeStyles } from "@material-ui/core/styles";
import {
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Typography,
  Box,
  Chip,
} from "@material-ui/core";
import {
  Receipt as ReceiptIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  AccessTime as AccessTimeIcon,
  Cancel as CancelIcon,
} from "@material-ui/icons";
import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";
import SubscriptionModal from "../../components/SubscriptionModal";
import api from "../../services/api";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";

import moment from "moment";

const reducer = (state, action) => {
  if (action.type === "LOAD_INVOICES") {
    const invoices = action.payload.invoices || action.payload;
    const newInvoices = [];
    invoices.forEach((invoice) => {
      const i = state.findIndex((x) => x.id === invoice.id);
      if (i !== -1) state[i] = invoice;
      else newInvoices.push(invoice);
    });
    return [...state, ...newInvoices];
  }
  if (action.type === "UPDATE_INVOICE") {
    const invoice = action.payload;
    const i = state.findIndex((x) => x.id === invoice.id);
    if (i !== -1) {
      state[i] = invoice;
      return [...state];
    }
    return [invoice, ...state];
  }
  if (action.type === "DELETE_INVOICE") {
    const id = action.payload;
    const i = state.findIndex((x) => x.id === id);
    if (i !== -1) state.splice(i, 1);
    return [...state];
  }
  if (action.type === "RESET") return [];
};

const useStyles = makeStyles((theme) => ({
  mainPaper: {
    flex: 1,
    overflowY: "auto",
    ...theme.scrollbarStyles,
    padding: theme.spacing(2.5),
    backgroundColor: "transparent",
  },
  expiredBanner: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1.5),
    padding: theme.spacing(1.5, 2),
    borderRadius: 12,
    backgroundColor:
      theme.palette.type === "dark" ? "rgba(244,67,54,0.12)" : "#FEE2E2",
    color: theme.palette.type === "dark" ? "#FCA5A5" : "#991B1B",
    border: `1px solid ${
      theme.palette.type === "dark" ? "rgba(244,67,54,0.35)" : "#FCA5A5"
    }`,
    marginTop: theme.spacing(1.5),
    fontSize: "0.85rem",
  },
  sectionCard: {
    borderRadius: 14,
    border: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
    overflow: "hidden",
  },
  sectionHeader: {
    padding: theme.spacing(2, 2.5),
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1.5),
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
  tableHead: {
    "& .MuiTableCell-head": {
      backgroundColor:
        theme.palette.type === "dark" ? "rgba(255,255,255,0.04)" : "#F8FAFC",
      fontWeight: 600,
      fontSize: "0.78rem",
      textTransform: "uppercase",
      letterSpacing: "0.04em",
      color: theme.palette.text.secondary,
      borderBottom: `1px solid ${theme.palette.divider}`,
      padding: theme.spacing(1.25, 1.5),
    },
  },
  tableRow: {
    transition: "background-color 0.15s ease",
    "&:hover": {
      backgroundColor:
        theme.palette.type === "dark"
          ? "rgba(59,130,246,0.06)"
          : "#F8FAFC",
    },
    "& .MuiTableCell-body": {
      padding: theme.spacing(1.5, 1.5),
      fontSize: "0.875rem",
    },
  },
  totalCell: {
    fontWeight: 700,
    fontSize: "0.95rem",
  },
  badgePaid: {
    height: 24,
    fontSize: "0.7rem",
    backgroundColor:
      theme.palette.type === "dark" ? "rgba(76,175,80,0.18)" : "#E8F5E9",
    color: theme.palette.type === "dark" ? "#81C784" : "#2E7D32",
    fontWeight: 600,
  },
  badgePending: {
    height: 24,
    fontSize: "0.7rem",
    backgroundColor:
      theme.palette.type === "dark" ? "rgba(255,193,7,0.15)" : "#FEF3C7",
    color: theme.palette.type === "dark" ? "#FBBF24" : "#92400E",
    fontWeight: 600,
  },
  badgeOverdue: {
    height: 24,
    fontSize: "0.7rem",
    backgroundColor:
      theme.palette.type === "dark" ? "rgba(244,67,54,0.18)" : "#FEE2E2",
    color: theme.palette.type === "dark" ? "#FCA5A5" : "#991B1B",
    fontWeight: 600,
  },
  payButton: {
    textTransform: "none",
    borderRadius: 8,
    fontWeight: 600,
    fontSize: "0.78rem",
  },
  emptyState: {
    padding: theme.spacing(8, 2),
    textAlign: "center",
    color: theme.palette.text.secondary,
  },
}));

const Invoices = () => {
  const classes = useStyles();
  const { user } = useContext(AuthContext);

  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [searchParam] = useState("");
  const [invoices, dispatch] = useReducer(reducer, []);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [isCompanyExpired, setIsCompanyExpired] = useState(false);

  useEffect(() => {
    if (user && user.company) {
      const isExpired = moment().isAfter(moment(user.company.dueDate));
      setIsCompanyExpired(isExpired);
    }
  }, [user]);

  const handleOpenPaymentModal = (invoice) => {
    setSelectedInvoice(invoice);
    setContactModalOpen(true);
  };

  const handleClosePaymentModal = () => {
    setSelectedInvoice(null);
    setContactModalOpen(false);
  };

  useEffect(() => {
    dispatch({ type: "RESET" });
    setPageNumber(1);
  }, [searchParam]);

  useEffect(() => {
    setLoading(true);
    const delay = setTimeout(async () => {
      try {
        const { data } = await api.get("/invoices/all", {
          params: { searchParam, pageNumber },
        });
        dispatch({ type: "LOAD_INVOICES", payload: data });
        setHasMore(data.hasMore);
      } catch (err) {
        toastError(err);
      } finally {
        setLoading(false);
      }
    }, 500);
    return () => clearTimeout(delay);
  }, [searchParam, pageNumber]);

  const handleScroll = (e) => {
    if (!hasMore || loading) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - (scrollTop + 100) < clientHeight) {
      setPageNumber((prev) => prev + 1);
    }
  };

  const getStatus = (record) => {
    const days = moment(record.dueDate).diff(moment(), "days");
    if (record.status === "paid") return "paid";
    if (days < 0) return "overdue";
    return "pending";
  };

  const renderStatusBadge = (record) => {
    const status = getStatus(record);
    if (status === "paid") {
      return (
        <Chip
          size="small"
          label="Pagada"
          icon={<CheckCircleIcon style={{ fontSize: 14 }} />}
          className={classes.badgePaid}
        />
      );
    }
    if (status === "overdue") {
      return (
        <Chip
          size="small"
          label="Vencida"
          icon={<CancelIcon style={{ fontSize: 14 }} />}
          className={classes.badgeOverdue}
        />
      );
    }
    return (
      <Chip
        size="small"
        label="Pendiente"
        icon={<AccessTimeIcon style={{ fontSize: 14 }} />}
        className={classes.badgePending}
      />
    );
  };

  return (
    <MainContainer>
      <SubscriptionModal
        open={contactModalOpen}
        onClose={handleClosePaymentModal}
        Invoice={selectedInvoice}
      />
      <MainHeader>
        <Title>Facturas ({invoices.length})</Title>
      </MainHeader>

      {isCompanyExpired && (
        <div className={classes.expiredBanner}>
          <WarningIcon />
          <Box>
            <strong>Suscripción vencida.</strong> Paga la última factura
            pendiente o contacta a soporte para regularizar tu cuenta.
          </Box>
        </div>
      )}

      <Paper
        className={classes.mainPaper}
        elevation={0}
        onScroll={handleScroll}
      >
        <div className={classes.sectionCard}>
          <div className={classes.sectionHeader}>
            <div className={classes.sectionIcon}>
              <ReceiptIcon fontSize="small" />
            </div>
            <Box>
              <Typography className={classes.sectionTitle}>
                Historial de facturas
              </Typography>
              <Typography className={classes.sectionSubtitle}>
                {invoices.length === 0
                  ? "Aún no hay facturas emitidas."
                  : `${invoices.length} ${
                      invoices.length === 1 ? "factura" : "facturas"
                    } en total.`}
              </Typography>
            </Box>
          </div>

          {!loading && invoices.length === 0 ? (
            <div className={classes.emptyState}>
              <Typography variant="body2">
                Cuando se generen facturas para tu cuenta aparecerán aquí.
              </Typography>
            </div>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead className={classes.tableHead}>
                  <TableRow>
                    <TableCell align="left">Factura</TableCell>
                    <TableCell align="center">Usuarios</TableCell>
                    <TableCell align="center">Conexiones</TableCell>
                    <TableCell align="center">Colas</TableCell>
                    <TableCell align="center">Total</TableCell>
                    <TableCell align="center">Vence</TableCell>
                    <TableCell align="center">Estado</TableCell>
                    <TableCell align="center">Acción</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invoices.map((invoice) => {
                    const status = getStatus(invoice);
                    return (
                      <TableRow key={invoice.id} className={classes.tableRow}>
                        <TableCell align="left">
                          <Typography
                            variant="body2"
                            style={{ fontWeight: 600 }}
                          >
                            #{invoice.id}
                          </Typography>
                          <Typography
                            variant="caption"
                            color="textSecondary"
                          >
                            {invoice.detail}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">{invoice.users}</TableCell>
                        <TableCell align="center">
                          {invoice.connections}
                        </TableCell>
                        <TableCell align="center">{invoice.queues}</TableCell>
                        <TableCell align="center" className={classes.totalCell}>
                          {invoice.value.toLocaleString("es-MX", {
                            style: "currency",
                            currency: "MXN",
                          })}
                        </TableCell>
                        <TableCell align="center">
                          {moment(invoice.dueDate).format("DD/MM/YYYY")}
                        </TableCell>
                        <TableCell align="center">
                          {renderStatusBadge(invoice)}
                        </TableCell>
                        <TableCell align="center">
                          {status !== "paid" ? (
                            <Button
                              size="small"
                              variant="contained"
                              color="primary"
                              className={classes.payButton}
                              onClick={() => handleOpenPaymentModal(invoice)}
                            >
                              Pagar
                            </Button>
                          ) : (
                            <Button
                              size="small"
                              variant="outlined"
                              disabled
                              className={classes.payButton}
                            >
                              Pagada
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {loading && <TableRowSkeleton columns={8} />}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </div>
      </Paper>
    </MainContainer>
  );
};

export default Invoices;
