import React, { useContext, useEffect, useReducer, useState } from "react";

import {
  Button,
  IconButton,
  Paper,
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
import { makeStyles } from "@material-ui/core/styles";
import {
  DeleteOutline,
  Edit,
  BarChart as BarChartIcon,
} from "@material-ui/icons";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import Title from "../../components/Title";
import { i18n } from "../../translate/i18n";
import toastError from "../../errors/toastError";
import api from "../../services/api";
import PromptModal from "../../components/PromptModal";
import { toast } from "react-toastify";
import ConfirmationModal from "../../components/ConfirmationModal";
import { AuthContext } from "../../context/Auth/AuthContext";
import usePlans from "../../hooks/usePlans";
import { useHistory } from "react-router-dom/cjs/react-router-dom.min";
import ForbiddenPage from "../../components/ForbiddenPage";

const MODEL_PRICING = {
  "gpt-4o-mini": { input: 0.00015 / 1000, output: 0.0006 / 1000 },
  "gpt-4o": { input: 0.0025 / 1000, output: 0.01 / 1000 },
  "gpt-4.1": { input: 0.002 / 1000, output: 0.008 / 1000 },
  "gpt-4.1-mini": { input: 0.0004 / 1000, output: 0.0016 / 1000 },
  "gpt-5.1": { input: 0.005 / 1000, output: 0.015 / 1000 },
  "gpt-5.1-mini": { input: 0.0005 / 1000, output: 0.002 / 1000 },
  "gpt-3.5-turbo": { input: 0.0005 / 1000, output: 0.0015 / 1000 },
};

const useStyles = makeStyles((theme) => ({
  mainPaper: {
    flex: 1,
    overflowY: "auto",
    ...theme.scrollbarStyles,
    padding: theme.spacing(2.5),
    backgroundColor: "transparent",
  },
  metricsCard: {
    padding: theme.spacing(2),
    borderRadius: 14,
    border: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
    marginBottom: theme.spacing(2),
  },
  metricsHeader: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    marginBottom: theme.spacing(1.5),
    fontSize: "0.85rem",
    fontWeight: 600,
  },
  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: theme.spacing(1.5),
    [theme.breakpoints.down("sm")]: {
      gridTemplateColumns: "repeat(2, 1fr)",
    },
  },
  metricBox: {
    padding: theme.spacing(2),
    borderRadius: 12,
    background: `linear-gradient(135deg, ${
      theme.palette.type === "dark" ? "rgba(255,255,255,0.04)" : "#F8FAFC"
    } 0%, ${theme.palette.type === "dark" ? "rgba(255,255,255,0.06)" : "#EBF1F7"} 100%)`,
    border: `1px solid ${theme.palette.divider}`,
    textAlign: "center",
  },
  metricValue: {
    fontSize: "1.6rem",
    fontWeight: 700,
    lineHeight: 1.1,
  },
  metricValueAccent: {
    color: "#E11D48",
  },
  metricLabel: {
    fontSize: "0.7rem",
    color: theme.palette.text.secondary,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    marginTop: theme.spacing(0.5),
    fontWeight: 500,
  },
  agentsCard: {
    borderRadius: 14,
    border: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.background.paper,
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
    overflow: "hidden",
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
      padding: theme.spacing(1.5),
    },
  },
  tableRow: {
    transition: "background-color 0.15s ease",
    "&:hover": {
      backgroundColor:
        theme.palette.type === "dark" ? "rgba(59,130,246,0.06)" : "#F8FAFC",
    },
    "& .MuiTableCell-body": {
      padding: theme.spacing(1.5),
      fontSize: "0.875rem",
    },
  },
  addButton: {
    backgroundColor: "#0F172A",
    color: "#fff",
    textTransform: "none",
    borderRadius: 10,
    fontWeight: 600,
    padding: theme.spacing(1, 2),
    "&:hover": {
      backgroundColor: "#1E293B",
    },
  },
  badgeActive: {
    height: 22,
    fontSize: "0.7rem",
    backgroundColor:
      theme.palette.type === "dark" ? "rgba(34,197,94,0.18)" : "#DCFCE7",
    color: theme.palette.type === "dark" ? "#86EFAC" : "#15803D",
    fontWeight: 600,
  },
  badgeInactive: {
    height: 22,
    fontSize: "0.7rem",
    backgroundColor:
      theme.palette.type === "dark" ? "rgba(255,255,255,0.05)" : "#F1F5F9",
    color: theme.palette.text.secondary,
    fontWeight: 500,
  },
  emptyState: {
    padding: theme.spacing(8, 2),
    textAlign: "center",
    color: theme.palette.text.secondary,
  },
}));

const reducer = (state, action) => {
  if (action.type === "LOAD_PROMPTS") {
    const prompts = action.payload;
    const newPrompts = [];
    prompts.forEach((p) => {
      const idx = state.findIndex((x) => x.id === p.id);
      if (idx !== -1) state[idx] = p;
      else newPrompts.push(p);
    });
    return [...state, ...newPrompts];
  }
  if (action.type === "UPDATE_PROMPTS") {
    const prompt = action.payload;
    const idx = state.findIndex((p) => p.id === prompt.id);
    if (idx !== -1) {
      state[idx] = prompt;
      return [...state];
    }
    return [prompt, ...state];
  }
  if (action.type === "DELETE_PROMPT") {
    const id = action.payload;
    const idx = state.findIndex((p) => p.id === id);
    if (idx !== -1) state.splice(idx, 1);
    return [...state];
  }
  if (action.type === "RESET") return [];
};

const Prompts = () => {
  const classes = useStyles();
  const [prompts, dispatch] = useReducer(reducer, []);
  const [loading, setLoading] = useState(false);
  const [promptModalOpen, setPromptModalOpen] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  const { user, socket } = useContext(AuthContext);
  const { getPlanCompany } = usePlans();
  const history = useHistory();
  const companyId = user.companyId;

  useEffect(() => {
    async function fetchData() {
      const planConfigs = await getPlanCompany(undefined, companyId);
      if (!planConfigs.plan.useOpenAi) {
        toast.error(
          "¡Esta empresa no tiene permiso para acceder a esta página! Te estamos redirigiendo."
        );
        setTimeout(() => history.push(`/`), 1000);
      }
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/prompt");
        dispatch({ type: "LOAD_PROMPTS", payload: data.prompts });
      } catch (err) {
        toastError(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const onPromptEvent = (data) => {
      if (data.action === "update" || data.action === "create") {
        dispatch({ type: "UPDATE_PROMPTS", payload: data.prompt });
      }
      if (data.action === "delete") {
        dispatch({ type: "DELETE_PROMPT", payload: data.promptId });
      }
    };
    socket.on(`company-${companyId}-prompt`, onPromptEvent);
    return () => {
      socket.off(`company-${companyId}-prompt`, onPromptEvent);
    };
  }, [socket, companyId]);

  const totals = prompts.reduce(
    (acc, p) => {
      acc.total += p.totalTokens || 0;
      acc.input += p.promptTokens || 0;
      acc.output += p.completionTokens || 0;
      const pricing = MODEL_PRICING[p.model] || MODEL_PRICING["gpt-4o-mini"];
      acc.cost += (p.promptTokens || 0) * pricing.input;
      acc.cost += (p.completionTokens || 0) * pricing.output;
      return acc;
    },
    { total: 0, input: 0, output: 0, cost: 0 }
  );

  const handleOpenPromptModal = () => {
    setPromptModalOpen(true);
    setSelectedPrompt(null);
  };

  const handleClosePromptModal = () => {
    setPromptModalOpen(false);
    setSelectedPrompt(null);
  };

  const handleEditPrompt = (prompt) => {
    setSelectedPrompt(prompt);
    setPromptModalOpen(true);
  };

  const handleCloseConfirmationModal = () => {
    setConfirmModalOpen(false);
    setSelectedPrompt(null);
  };

  const handleDeletePrompt = async (promptId) => {
    try {
      const { data } = await api.delete(`/prompt/${promptId}`);
      toast.info(i18n.t(data.message));
    } catch (err) {
      toastError(err);
    }
    setSelectedPrompt(null);
  };

  return (
    <MainContainer>
      <ConfirmationModal
        title={
          selectedPrompt &&
          `${i18n.t("prompts.confirmationModal.deleteTitle")} ${selectedPrompt.name}?`
        }
        open={confirmModalOpen}
        onClose={handleCloseConfirmationModal}
        onConfirm={() => handleDeletePrompt(selectedPrompt.id)}
      >
        {i18n.t("prompts.confirmationModal.deleteMessage")}
      </ConfirmationModal>
      <PromptModal
        open={promptModalOpen}
        onClose={handleClosePromptModal}
        promptId={selectedPrompt?.id}
      />
      {user.profile === "user" ? (
        <ForbiddenPage />
      ) : (
        <>
          <MainHeader>
            <Title>Agente de IA</Title>
            <MainHeaderButtonsWrapper>
              <Button
                variant="contained"
                onClick={handleOpenPromptModal}
                className={classes.addButton}
              >
                Agregar Agente
              </Button>
            </MainHeaderButtonsWrapper>
          </MainHeader>

          <Paper className={classes.mainPaper} elevation={0}>
            {/* Métricas de tokens */}
            <div className={classes.metricsCard}>
              <div className={classes.metricsHeader}>
                <BarChartIcon fontSize="small" />
                Métricas de Uso de Tokens
              </div>
              <div className={classes.metricsGrid}>
                <div className={classes.metricBox}>
                  <div className={classes.metricValue}>
                    {totals.total.toLocaleString("es-MX")}
                  </div>
                  <div className={classes.metricLabel}>Total de tokens</div>
                </div>
                <div className={classes.metricBox}>
                  <div className={classes.metricValue}>
                    {totals.input.toLocaleString("es-MX")}
                  </div>
                  <div className={classes.metricLabel}>Tokens de entrada</div>
                </div>
                <div className={classes.metricBox}>
                  <div className={classes.metricValue}>
                    {totals.output.toLocaleString("es-MX")}
                  </div>
                  <div className={classes.metricLabel}>Tokens de salida</div>
                </div>
                <div className={classes.metricBox}>
                  <div
                    className={`${classes.metricValue} ${classes.metricValueAccent}`}
                  >
                    ${totals.cost.toFixed(4)}
                  </div>
                  <div className={classes.metricLabel}>Costo estimado (USD)</div>
                </div>
              </div>
            </div>

            {/* Tabla de agentes */}
            <div className={classes.agentsCard}>
              {!loading && prompts.length === 0 ? (
                <div className={classes.emptyState}>
                  <Typography variant="body2">
                    Aún no hay agentes. Crea tu primer Agente de IA con el botón
                    "Agregar Agente".
                  </Typography>
                </div>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead className={classes.tableHead}>
                      <TableRow>
                        <TableCell align="left">Nombre</TableCell>
                        <TableCell align="left">Modelo</TableCell>
                        <TableCell align="left">Sector / Cola</TableCell>
                        <TableCell align="center">Estado</TableCell>
                        <TableCell align="center">Máx. Tokens</TableCell>
                        <TableCell align="center">Tokens Usados</TableCell>
                        <TableCell align="center">Acciones</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {prompts.map((prompt) => (
                        <TableRow key={prompt.id} className={classes.tableRow}>
                          <TableCell align="left" style={{ fontWeight: 600 }}>
                            {prompt.name}
                          </TableCell>
                          <TableCell align="left">
                            <Chip
                              label={prompt.model || "gpt-4o-mini"}
                              size="small"
                              style={{
                                backgroundColor: "#FFF7ED",
                                color: "#C2410C",
                                fontSize: "0.7rem",
                                height: 22,
                                fontWeight: 600,
                              }}
                            />
                          </TableCell>
                          <TableCell align="left">
                            {prompt.queue?.name || "-"}
                          </TableCell>
                          <TableCell align="center">
                            {prompt.isActive !== false ? (
                              <Chip
                                size="small"
                                label="Activo"
                                className={classes.badgeActive}
                              />
                            ) : (
                              <Chip
                                size="small"
                                label="Inactivo"
                                className={classes.badgeInactive}
                              />
                            )}
                          </TableCell>
                          <TableCell align="center">{prompt.maxTokens}</TableCell>
                          <TableCell align="center">
                            {(prompt.totalTokens || 0).toLocaleString("es-MX")}
                          </TableCell>
                          <TableCell align="center">
                            <IconButton
                              size="small"
                              onClick={() => handleEditPrompt(prompt)}
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedPrompt(prompt);
                                setConfirmModalOpen(true);
                              }}
                            >
                              <DeleteOutline fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                      {loading && <TableRowSkeleton columns={7} />}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </div>
          </Paper>
        </>
      )}
    </MainContainer>
  );
};

export default Prompts;
