import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  Box,
  Grid,
  Typography,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Divider,
  useTheme,
  useMediaQuery,
} from "@material-ui/core";
import RefreshIcon from "@material-ui/icons/Refresh";
import FiberManualRecordIcon from "@material-ui/icons/FiberManualRecord";
import StorageIcon from "@material-ui/icons/Storage";
import CloudIcon from "@material-ui/icons/Cloud";
import MicIcon from "@material-ui/icons/Mic";
import MemoryIcon from "@material-ui/icons/Memory";
import PhoneIphoneIcon from "@material-ui/icons/PhoneIphone";
import EventNoteIcon from "@material-ui/icons/EventNote";
import GroupIcon from "@material-ui/icons/Group";
import LayersIcon from "@material-ui/icons/Layers";
import WhatshotIcon from "@material-ui/icons/Whatshot";
import { makeStyles } from "@material-ui/core/styles";
import { toast } from "react-toastify";
import api from "../../services/api";

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(2),
    width: "100%",
  },
  headerBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing(2),
    flexWrap: "wrap",
    gap: theme.spacing(1),
  },
  lastUpdate: {
    fontSize: 12,
    color: theme.palette.text.secondary,
  },
  card: {
    padding: theme.spacing(2),
    height: "100%",
    borderRadius: 12,
    border: `1px solid ${
      theme.palette.type === "dark" ? "rgba(255,255,255,0.08)" : "#E5E7EB"
    }`,
  },
  cardTitle: {
    fontWeight: 600,
    fontSize: 14,
    marginBottom: theme.spacing(1),
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    color: theme.palette.text.primary,
  },
  row: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: theme.spacing(0.75, 0),
    borderBottom: `1px dashed ${
      theme.palette.type === "dark"
        ? "rgba(255,255,255,0.06)"
        : "rgba(0,0,0,0.06)"
    }`,
    "&:last-child": { borderBottom: "none" },
  },
  rowLeft: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    minWidth: 0,
    flex: 1,
  },
  rowLabel: {
    fontSize: 13,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  statusDot: {
    fontSize: 12,
  },
  statusChip: {
    fontSize: 11,
    height: 22,
    fontWeight: 600,
  },
  metric: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: theme.spacing(1),
  },
  metricValue: {
    fontSize: 22,
    fontWeight: 700,
    color: theme.palette.primary.main,
  },
  metricLabel: {
    fontSize: 11,
    color: theme.palette.text.secondary,
    textAlign: "center",
  },
  empty: {
    fontSize: 12,
    color: theme.palette.text.secondary,
    fontStyle: "italic",
    padding: theme.spacing(1, 0),
  },
}));

const STATUS_COLORS = {
  ok: "#10B981",
  slow: "#F59E0B",
  down: "#EF4444",
  unknown: "#9CA3AF",
  running: "#3B82F6",
  error: "#EF4444",
  CONNECTED: "#10B981",
  DISCONNECTED: "#EF4444",
  qrcode: "#F59E0B",
  OPENING: "#F59E0B",
  PAIRING: "#F59E0B",
  TIMEOUT: "#EF4444",
};

const formatRelative = (date) => {
  if (!date) return "Sin datos";
  const diffMs = Date.now() - new Date(date).getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return `hace ${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `hace ${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h}h`;
  const d = Math.floor(h / 24);
  return `hace ${d}d`;
};

const formatUptime = (sec) => {
  if (!sec) return "—";
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

const StatusChip = ({ status }) => {
  const color = STATUS_COLORS[status] || "#9CA3AF";
  return (
    <Chip
      size="small"
      label={status || "—"}
      style={{
        backgroundColor: color,
        color: "white",
        fontSize: 11,
        height: 22,
        fontWeight: 600,
      }}
    />
  );
};

const ServiceRow = ({ icon, name, check }) => {
  const color = STATUS_COLORS[check?.status] || "#9CA3AF";
  return (
    <Box display="flex" alignItems="center" justifyContent="space-between" py={0.75}>
      <Box display="flex" alignItems="center" style={{ gap: 8, minWidth: 0, flex: 1 }}>
        <FiberManualRecordIcon style={{ color, fontSize: 12 }} />
        {icon}
        <Typography variant="body2" style={{ fontWeight: 500 }}>
          {name}
        </Typography>
      </Box>
      <Box display="flex" alignItems="center" style={{ gap: 8 }}>
        {check?.latencyMs != null && (
          <Typography variant="caption" color="textSecondary">
            {check.latencyMs}ms
          </Typography>
        )}
        <StatusChip status={check?.status || "unknown"} />
      </Box>
    </Box>
  );
};

const MonitoringPanel = () => {
  const classes = useStyles();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState(null);
  const [error, setError] = useState(null);
  const [, forceTick] = useState(0); // re-render para refrescar tiempos relativos
  const intervalRef = useRef(null);
  const tickRef = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const { data: resp } = await api.get("/monitoring/all");
      setData(resp);
      setLastFetch(new Date());
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Error de red");
      if (loading) toast.error("No se pudo cargar el monitoreo");
    } finally {
      setLoading(false);
    }
  }, [loading]);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 30000);
    tickRef.current = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => {
      clearInterval(intervalRef.current);
      clearInterval(tickRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
        <CircularProgress />
      </Box>
    );
  }

  const h = data?.health || {};
  const jobs = data?.jobs || [];
  const queues = data?.queues || [];
  const whatsapps = data?.whatsapps || [];
  const act = data?.activity || {};
  const res = data?.resources || {};

  return (
    <Box className={classes.root}>
      <Box className={classes.headerBar}>
        <Box>
          <Typography variant="h6" style={{ fontWeight: 700 }}>
            📊 Monitoreo del Sistema
          </Typography>
          <Typography variant="caption" color="textSecondary">
            Estado en vivo de servicios, conexiones y recursos. Solo super-admin.
          </Typography>
        </Box>
        <Box display="flex" alignItems="center" style={{ gap: 8 }}>
          {lastFetch && (
            <Typography className={classes.lastUpdate}>
              Última actualización: {formatRelative(lastFetch)}
            </Typography>
          )}
          <Tooltip title="Actualizar ahora">
            <IconButton size="small" onClick={fetchData}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {error && (
        <Paper className={classes.card} style={{ borderColor: "#EF4444", marginBottom: 16 }}>
          <Typography style={{ color: "#EF4444", fontWeight: 600 }}>
            ⚠ {error}
          </Typography>
        </Paper>
      )}

      <Grid container spacing={2}>
        {/* Servicios externos */}
        <Grid item xs={12} md={6} lg={4}>
          <Paper className={classes.card} elevation={0}>
            <Typography className={classes.cardTitle}>
              <CloudIcon fontSize="small" /> Estado de Servicios
            </Typography>
            <ServiceRow icon={<StorageIcon fontSize="small" />} name="PostgreSQL" check={h.db} />
            <ServiceRow icon={<StorageIcon fontSize="small" />} name="Redis" check={h.redis} />
            <ServiceRow icon={<CloudIcon fontSize="small" />} name="API Oficial (Meta)" check={h.apiOficial} />
            <ServiceRow icon={<MicIcon fontSize="small" />} name="Transcribe" check={h.transcribe} />
          </Paper>
        </Grid>

        {/* Recursos del servidor */}
        <Grid item xs={12} md={6} lg={4}>
          <Paper className={classes.card} elevation={0}>
            <Typography className={classes.cardTitle}>
              <MemoryIcon fontSize="small" /> Recursos del Servidor
            </Typography>
            <Box className={classes.row}>
              <Typography className={classes.rowLabel}>Memoria RSS</Typography>
              <Typography variant="body2" style={{ fontWeight: 600 }}>
                {res?.memory?.rssMB ?? "—"} MB
              </Typography>
            </Box>
            <Box className={classes.row}>
              <Typography className={classes.rowLabel}>Heap usado</Typography>
              <Typography variant="body2" style={{ fontWeight: 600 }}>
                {res?.memory?.heapUsedMB ?? "—"} / {res?.memory?.heapTotalMB ?? "—"} MB
              </Typography>
            </Box>
            <Box className={classes.row}>
              <Typography className={classes.rowLabel}>Uptime proceso</Typography>
              <Typography variant="body2" style={{ fontWeight: 600 }}>
                {formatUptime(res?.uptimeSec)}
              </Typography>
            </Box>
            <Box className={classes.row}>
              <Typography className={classes.rowLabel}>Node.js</Typography>
              <Typography variant="body2" style={{ fontWeight: 600 }}>
                {res?.nodeVersion || "—"} (PID {res?.pid})
              </Typography>
            </Box>
            <Box className={classes.row}>
              <Typography className={classes.rowLabel}>DB Pool</Typography>
              <Typography variant="body2" style={{ fontWeight: 600 }}>
                {res?.dbPool?.using ?? "?"} en uso / {res?.dbPool?.size ?? "?"} total
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* Actividad de hoy */}
        <Grid item xs={12} md={12} lg={4}>
          <Paper className={classes.card} elevation={0}>
            <Typography className={classes.cardTitle}>
              <WhatshotIcon fontSize="small" /> Actividad
            </Typography>
            <Grid container spacing={1}>
              <Grid item xs={4}>
                <Box className={classes.metric}>
                  <Typography className={classes.metricValue}>
                    {act?.tickets?.pending ?? 0}
                  </Typography>
                  <Typography className={classes.metricLabel}>Pendientes</Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box className={classes.metric}>
                  <Typography className={classes.metricValue}>
                    {act?.tickets?.open ?? 0}
                  </Typography>
                  <Typography className={classes.metricLabel}>Abiertos</Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box className={classes.metric}>
                  <Typography className={classes.metricValue}>
                    {act?.tickets?.closedToday ?? 0}
                  </Typography>
                  <Typography className={classes.metricLabel}>Cerrados hoy</Typography>
                </Box>
              </Grid>
            </Grid>
            <Divider style={{ margin: "8px 0" }} />
            <Box className={classes.row}>
              <Typography className={classes.rowLabel}>Mensajes 24h</Typography>
              <Typography variant="body2" style={{ fontWeight: 600 }}>
                ↓ {act?.messages24h?.in ?? 0} / ↑ {act?.messages24h?.out ?? 0}
              </Typography>
            </Box>
            <Box className={classes.row}>
              <Typography className={classes.rowLabel}>
                <GroupIcon fontSize="inherit" /> Agentes online
              </Typography>
              <Typography variant="body2" style={{ fontWeight: 600 }}>
                {act?.onlineAgents ?? 0}
              </Typography>
            </Box>
            <Box className={classes.row}>
              <Typography className={classes.rowLabel}>Suscripciones push</Typography>
              <Typography variant="body2" style={{ fontWeight: 600 }}>
                {act?.pushSubscriptions ?? 0}
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* WhatsApps */}
        <Grid item xs={12} md={6}>
          <Paper className={classes.card} elevation={0}>
            <Typography className={classes.cardTitle}>
              <PhoneIphoneIcon fontSize="small" /> Conexiones WhatsApp ({whatsapps.length})
            </Typography>
            {whatsapps.length === 0 ? (
              <Typography className={classes.empty}>Sin conexiones registradas.</Typography>
            ) : (
              <Box style={{ maxHeight: 320, overflowY: "auto" }}>
                {whatsapps.map((w) => (
                  <Box key={w.id} className={classes.row}>
                    <Box className={classes.rowLeft}>
                      <FiberManualRecordIcon
                        style={{
                          color: STATUS_COLORS[w.status] || "#9CA3AF",
                          fontSize: 12,
                        }}
                      />
                      <Typography className={classes.rowLabel}>
                        {w.name}
                        {w.isDefault && (
                          <Chip
                            label="default"
                            size="small"
                            style={{ marginLeft: 6, height: 18, fontSize: 10 }}
                          />
                        )}
                      </Typography>
                    </Box>
                    <Box display="flex" alignItems="center" style={{ gap: 6 }}>
                      <Chip
                        label={w.channel || "whatsapp"}
                        size="small"
                        variant="outlined"
                        style={{ height: 20, fontSize: 10 }}
                      />
                      <StatusChip status={w.status} />
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Jobs Cron */}
        <Grid item xs={12} md={6}>
          <Paper className={classes.card} elevation={0}>
            <Typography className={classes.cardTitle}>
              <EventNoteIcon fontSize="small" /> Jobs Cron ({jobs.length})
            </Typography>
            {jobs.length === 0 ? (
              <Typography className={classes.empty}>
                Aún no se han ejecutado jobs. Aparecerán tras su primer tick.
              </Typography>
            ) : (
              jobs.map((j) => (
                <Box key={j.name} className={classes.row}>
                  <Box className={classes.rowLeft}>
                    <FiberManualRecordIcon
                      style={{
                        color: STATUS_COLORS[j.lastStatus] || "#9CA3AF",
                        fontSize: 12,
                      }}
                    />
                    <Box>
                      <Typography className={classes.rowLabel}>{j.name}</Typography>
                      {j.lastError && (
                        <Typography variant="caption" style={{ color: "#EF4444" }}>
                          {j.lastError.substring(0, 80)}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                  <Box textAlign="right">
                    <Typography variant="caption" color="textSecondary">
                      {formatRelative(j.lastRunAt)}
                    </Typography>
                    {j.lastDurationMs != null && (
                      <Typography variant="caption" display="block" color="textSecondary">
                        {j.lastDurationMs}ms · {j.runCount} runs
                      </Typography>
                    )}
                  </Box>
                </Box>
              ))
            )}
          </Paper>
        </Grid>

        {/* Bull Queues */}
        <Grid item xs={12}>
          <Paper className={classes.card} elevation={0}>
            <Typography className={classes.cardTitle}>
              <LayersIcon fontSize="small" /> Colas Bull (Redis)
            </Typography>
            {queues.length === 0 ? (
              <Typography className={classes.empty}>Sin colas registradas.</Typography>
            ) : (
              <Grid container spacing={1}>
                {queues.map((q, idx) => (
                  <Grid item xs={12} sm={6} md={4} key={q.name || idx}>
                    <Box
                      style={{
                        padding: 8,
                        borderRadius: 8,
                        border: `1px solid ${
                          theme.palette.type === "dark"
                            ? "rgba(255,255,255,0.08)"
                            : "#E5E7EB"
                        }`,
                      }}
                    >
                      <Typography variant="body2" style={{ fontWeight: 600 }}>
                        {q.name || "—"}
                      </Typography>
                      {q.error ? (
                        <Typography variant="caption" style={{ color: "#EF4444" }}>
                          {q.error}
                        </Typography>
                      ) : (
                        <Box display="flex" style={{ gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                          <Chip
                            label={`waiting ${q.waiting ?? 0}`}
                            size="small"
                            style={{ fontSize: 10, height: 20 }}
                          />
                          <Chip
                            label={`active ${q.active ?? 0}`}
                            size="small"
                            style={{ fontSize: 10, height: 20, backgroundColor: "#DBEAFE" }}
                          />
                          <Chip
                            label={`failed ${q.failed ?? 0}`}
                            size="small"
                            style={{
                              fontSize: 10,
                              height: 20,
                              backgroundColor: q.failed > 0 ? "#FEE2E2" : undefined,
                              color: q.failed > 0 ? "#991B1B" : undefined,
                            }}
                          />
                          <Chip
                            label={`completed ${q.completed ?? 0}`}
                            size="small"
                            style={{ fontSize: 10, height: 20 }}
                          />
                          <Chip
                            label={`delayed ${q.delayed ?? 0}`}
                            size="small"
                            style={{ fontSize: 10, height: 20 }}
                          />
                        </Box>
                      )}
                    </Box>
                  </Grid>
                ))}
              </Grid>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default MonitoringPanel;
