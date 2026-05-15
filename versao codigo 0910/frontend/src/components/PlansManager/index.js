import React, { useState, useEffect } from "react";
import {
  makeStyles,
  Paper,
  Grid,
  TextField,
  Table,
  TableHead,
  TableBody,
  TableCell,
  TableRow,
  IconButton,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
  Switch,
  FormControlLabel,
  Box,
  Chip,
  Divider,
  TableContainer,
} from "@material-ui/core";
import { Formik, Form, Field } from "formik";
import ButtonWithSpinner from "../ButtonWithSpinner";
import ConfirmationModal from "../ConfirmationModal";

import {
  Edit as EditIcon,
  Layers as LayersIcon,
  CheckCircle,
  Cancel,
  CardMembership,
} from "@material-ui/icons";

import { toast } from "react-toastify";
import usePlans from "../../hooks/usePlans";
import { i18n } from "../../translate/i18n";

const useStyles = makeStyles((theme) => ({
  container: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: theme.spacing(2.5),
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
    backgroundColor: theme.palette.type === "dark" ? "rgba(59,130,246,0.15)" : "#EBF5FF",
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
  fullWidth: { width: "100%" },
  permissionGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: theme.spacing(1),
  },
  permissionItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: theme.spacing(1, 1.5),
    borderRadius: 8,
    backgroundColor: theme.palette.type === "dark" ? "rgba(255,255,255,0.03)" : "#F8FAFC",
    "&:hover": {
      backgroundColor: theme.palette.type === "dark" ? "rgba(255,255,255,0.06)" : "#F1F5F9",
    },
  },
  permissionLabel: {
    fontSize: "0.875rem",
    fontWeight: 500,
  },
  buttonsRow: {
    display: "flex",
    justifyContent: "flex-end",
    gap: theme.spacing(1.25),
    marginTop: theme.spacing(2),
    flexWrap: "wrap",
  },
  tableHead: {
    "& .MuiTableCell-head": {
      backgroundColor: theme.palette.type === "dark" ? "rgba(255,255,255,0.04)" : "#F8FAFC",
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
    cursor: "pointer",
    transition: "background-color 0.15s ease",
    "&:hover": {
      backgroundColor: theme.palette.type === "dark" ? "rgba(59,130,246,0.06)" : "#F8FAFC",
    },
    "& .MuiTableCell-body": {
      padding: theme.spacing(1.25, 1.5),
      fontSize: "0.85rem",
    },
  },
  badgeYes: {
    height: 22,
    fontSize: "0.7rem",
    backgroundColor: theme.palette.type === "dark" ? "rgba(76,175,80,0.18)" : "#E8F5E9",
    color: theme.palette.type === "dark" ? "#81C784" : "#2E7D32",
    fontWeight: 600,
  },
  badgeNo: {
    height: 22,
    fontSize: "0.7rem",
    backgroundColor: theme.palette.type === "dark" ? "rgba(255,255,255,0.05)" : "#F1F5F9",
    color: theme.palette.text.secondary,
    fontWeight: 500,
  },
  emptyState: {
    padding: theme.spacing(6, 2),
    textAlign: "center",
    color: theme.palette.text.secondary,
  },
}));

const PERMISSIONS = [
  { name: "useWhatsapp", label: "WhatsApp" },
  { name: "useWhatsappOfficial", label: "WhatsApp Oficial" },
  { name: "useFacebook", label: "Facebook" },
  { name: "useInstagram", label: "Instagram" },
  { name: "useCampaigns", label: "Campañas" },
  { name: "useSchedules", label: "Programaciones" },
  { name: "useInternalChat", label: "Chat interno" },
  { name: "useExternalApi", label: "API externa" },
  { name: "useKanban", label: "Kanban" },
  { name: "useOpenAi", label: "Talk.AI" },
  { name: "useIntegrations", label: "Integraciones" },
  { name: "wavoip", label: "Wavoip" },
];

export function PlanManagerForm(props) {
  const { onSubmit, onDelete, onCancel, initialValue, loading } = props;
  const classes = useStyles();

  const [record, setRecord] = useState({
    name: "",
    users: 0,
    connections: 0,
    queues: 0,
    amount: 0,
    useWhatsapp: true,
    useFacebook: true,
    useInstagram: true,
    useCampaigns: true,
    useSchedules: true,
    useInternalChat: true,
    useExternalApi: true,
    useKanban: true,
    useOpenAi: true,
    useIntegrations: true,
    isPublic: true,
    useWhatsappOfficial: false,
    trial: false,
    trialDays: 3,
    recurrence: "monthly",
    wavoip: false,
  });

  useEffect(() => {
    setRecord(initialValue);
  }, [initialValue]);

  const handleSubmit = async (data) => {
    onSubmit(data);
  };

  return (
    <Formik
      enableReinitialize
      initialValues={record}
      onSubmit={(values, { resetForm }) =>
        setTimeout(() => {
          handleSubmit(values);
          resetForm();
        }, 500)
      }
    >
      {({ values, setFieldValue }) => (
        <Form className={classes.fullWidth}>
          <div className={classes.container}>
            {/* SECCIÓN 1: Datos básicos */}
            <Paper elevation={0} className={classes.sectionCard}>
              <div className={classes.sectionHeader}>
                <div className={classes.sectionIcon}>
                  <CardMembership fontSize="small" />
                </div>
                <Box>
                  <Typography className={classes.sectionTitle}>
                    {record.id ? "Editar plan" : "Nuevo plan"}
                  </Typography>
                  <Typography className={classes.sectionSubtitle}>
                    Información general, límites y precio.
                  </Typography>
                </Box>
              </div>

              <Grid spacing={2} container>
                <Grid xs={12} sm={6} md={4} item>
                  <Field
                    as={TextField}
                    label="Nombre del plan"
                    name="name"
                    variant="outlined"
                    className={classes.fullWidth}
                    size="small"
                  />
                </Grid>
                <Grid xs={6} sm={3} md={2} item>
                  <Field
                    as={TextField}
                    label={i18n.t("plans.form.users")}
                    name="users"
                    variant="outlined"
                    className={classes.fullWidth}
                    type="number"
                    size="small"
                  />
                </Grid>
                <Grid xs={6} sm={3} md={2} item>
                  <Field
                    as={TextField}
                    label={i18n.t("plans.form.connections")}
                    name="connections"
                    variant="outlined"
                    className={classes.fullWidth}
                    type="number"
                    size="small"
                  />
                </Grid>
                <Grid xs={6} sm={3} md={2} item>
                  <Field
                    as={TextField}
                    label="Colas"
                    name="queues"
                    variant="outlined"
                    className={classes.fullWidth}
                    type="number"
                    size="small"
                  />
                </Grid>
                <Grid xs={6} sm={3} md={2} item>
                  <Field
                    as={TextField}
                    label="Precio"
                    name="amount"
                    variant="outlined"
                    className={classes.fullWidth}
                    type="text"
                    size="small"
                  />
                </Grid>
                <Grid xs={6} sm={3} md={2} item>
                  <FormControl variant="outlined" fullWidth size="small">
                    <InputLabel>{i18n.t("plans.form.public")}</InputLabel>
                    <Field
                      as={Select}
                      label={i18n.t("plans.form.public")}
                      name="isPublic"
                    >
                      <MenuItem value={true}>Sí</MenuItem>
                      <MenuItem value={false}>No</MenuItem>
                    </Field>
                  </FormControl>
                </Grid>
              </Grid>

              <Divider style={{ margin: "20px 0 16px" }} />

              {/* TRIAL */}
              <Typography
                style={{ fontSize: "0.85rem", fontWeight: 600, marginBottom: 12 }}
              >
                Periodo de prueba
              </Typography>
              <Grid spacing={2} container>
                <Grid xs={6} sm={3} md={2} item>
                  <FormControl variant="outlined" fullWidth size="small">
                    <InputLabel>Trial</InputLabel>
                    <Field as={Select} label="Trial" name="trial">
                      <MenuItem value={true}>Sí</MenuItem>
                      <MenuItem value={false}>No</MenuItem>
                    </Field>
                  </FormControl>
                </Grid>
                <Grid xs={6} sm={3} md={2} item>
                  <Field
                    as={TextField}
                    label={i18n.t("plans.form.trialDays")}
                    name="trialDays"
                    variant="outlined"
                    className={classes.fullWidth}
                    size="small"
                    type="number"
                    inputProps={{ min: 1 }}
                    disabled={!values.trial}
                  />
                </Grid>
              </Grid>
            </Paper>

            {/* SECCIÓN 2: Permisos */}
            <Paper elevation={0} className={classes.sectionCard}>
              <div className={classes.sectionHeader}>
                <div className={classes.sectionIcon}>
                  <LayersIcon fontSize="small" />
                </div>
                <Box>
                  <Typography className={classes.sectionTitle}>
                    Permisos del plan
                  </Typography>
                  <Typography className={classes.sectionSubtitle}>
                    Activa o desactiva los módulos disponibles para este plan.
                  </Typography>
                </Box>
              </div>

              <div className={classes.permissionGrid}>
                {PERMISSIONS.map((perm) => (
                  <div className={classes.permissionItem} key={perm.name}>
                    <Typography className={classes.permissionLabel}>
                      {perm.label}
                    </Typography>
                    <Switch
                      checked={Boolean(values[perm.name])}
                      onChange={(e) => setFieldValue(perm.name, e.target.checked)}
                      color="primary"
                      size="small"
                    />
                  </div>
                ))}
              </div>
            </Paper>

            {/* BOTONES */}
            <div className={classes.buttonsRow}>
              <ButtonWithSpinner
                loading={loading}
                onClick={() => onCancel()}
                variant="outlined"
              >
                {i18n.t("plans.form.clear")}
              </ButtonWithSpinner>
              {record.id !== undefined && (
                <ButtonWithSpinner
                  loading={loading}
                  onClick={() => onDelete(record)}
                  variant="contained"
                  color="secondary"
                >
                  {i18n.t("plans.form.delete")}
                </ButtonWithSpinner>
              )}
              <ButtonWithSpinner
                loading={loading}
                type="submit"
                variant="contained"
                color="primary"
              >
                {i18n.t("plans.form.save")}
              </ButtonWithSpinner>
            </div>
          </div>
        </Form>
      )}
    </Formik>
  );
}

const Yes = ({ value, classes }) =>
  value ? (
    <Chip
      size="small"
      label="Sí"
      icon={<CheckCircle style={{ fontSize: 14 }} />}
      className={classes.badgeYes}
    />
  ) : (
    <Chip
      size="small"
      label="No"
      icon={<Cancel style={{ fontSize: 14 }} />}
      className={classes.badgeNo}
    />
  );

export function PlansManagerGrid(props) {
  const { records, onSelect } = props;
  const classes = useStyles();

  return (
    <Paper elevation={0} className={classes.sectionCard} style={{ padding: 0 }}>
      <Box style={{ padding: "16px 20px" }}>
        <Typography className={classes.sectionTitle}>
          Planes registrados
        </Typography>
        <Typography className={classes.sectionSubtitle}>
          {records.length === 0
            ? "Aún no hay planes creados."
            : `${records.length} ${records.length === 1 ? "plan" : "planes"} en total.`}
        </Typography>
      </Box>

      {records.length === 0 ? (
        <div className={classes.emptyState}>
          <Typography variant="body2">
            Crea un plan en el formulario superior para comenzar.
          </Typography>
        </div>
      ) : (
        <TableContainer style={{ maxHeight: 600 }}>
          <Table stickyHeader size="small">
            <TableHead className={classes.tableHead}>
              <TableRow>
                <TableCell align="center" style={{ width: 50 }}></TableCell>
                <TableCell align="left">{i18n.t("plans.form.name")}</TableCell>
                <TableCell align="center">{i18n.t("plans.form.users")}</TableCell>
                <TableCell align="center">{i18n.t("plans.form.connections")}</TableCell>
                <TableCell align="center">Colas</TableCell>
                <TableCell align="center">Precio</TableCell>
                <TableCell align="center">{i18n.t("plans.form.public")}</TableCell>
                <TableCell align="center">Trial</TableCell>
                <TableCell align="center">WhatsApp</TableCell>
                <TableCell align="center">WA Oficial</TableCell>
                <TableCell align="center">Facebook</TableCell>
                <TableCell align="center">Instagram</TableCell>
                <TableCell align="center">{i18n.t("plans.form.campaigns")}</TableCell>
                <TableCell align="center">{i18n.t("plans.form.schedules")}</TableCell>
                <TableCell align="center">Chat interno</TableCell>
                <TableCell align="center">API</TableCell>
                <TableCell align="center">Kanban</TableCell>
                <TableCell align="center">Talk.AI</TableCell>
                <TableCell align="center">Integraciones</TableCell>
                <TableCell align="center">Wavoip</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {records.map((row) => (
                <TableRow
                  key={row.id}
                  className={classes.tableRow}
                  onClick={() => onSelect(row)}
                >
                  <TableCell align="center" style={{ width: 50 }}>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(row);
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                  <TableCell align="left" style={{ fontWeight: 600 }}>
                    {row.name || "-"}
                  </TableCell>
                  <TableCell align="center">{row.users || "-"}</TableCell>
                  <TableCell align="center">{row.connections || "-"}</TableCell>
                  <TableCell align="center">{row.queues || "-"}</TableCell>
                  <TableCell align="center">
                    {row.amount
                      ? row.amount.toLocaleString("es-MX", {
                          style: "currency",
                          currency: "MXN",
                        })
                      : "$0.00"}
                  </TableCell>
                  <TableCell align="center">
                    <Yes value={row.isPublic} classes={classes} />
                  </TableCell>
                  <TableCell align="center">
                    {row.trial ? `${row.trialDays}d` : "-"}
                  </TableCell>
                  <TableCell align="center">
                    <Yes value={row.useWhatsapp !== false} classes={classes} />
                  </TableCell>
                  <TableCell align="center">
                    <Yes value={row.useWhatsappOfficial !== false} classes={classes} />
                  </TableCell>
                  <TableCell align="center">
                    <Yes value={row.useFacebook !== false} classes={classes} />
                  </TableCell>
                  <TableCell align="center">
                    <Yes value={row.useInstagram !== false} classes={classes} />
                  </TableCell>
                  <TableCell align="center">
                    <Yes value={row.useCampaigns !== false} classes={classes} />
                  </TableCell>
                  <TableCell align="center">
                    <Yes value={row.useSchedules !== false} classes={classes} />
                  </TableCell>
                  <TableCell align="center">
                    <Yes value={row.useInternalChat !== false} classes={classes} />
                  </TableCell>
                  <TableCell align="center">
                    <Yes value={row.useExternalApi !== false} classes={classes} />
                  </TableCell>
                  <TableCell align="center">
                    <Yes value={row.useKanban !== false} classes={classes} />
                  </TableCell>
                  <TableCell align="center">
                    <Yes value={row.useOpenAi !== false} classes={classes} />
                  </TableCell>
                  <TableCell align="center">
                    <Yes value={row.useIntegrations !== false} classes={classes} />
                  </TableCell>
                  <TableCell align="center">
                    <Yes value={row.wavoip !== false} classes={classes} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
}

export default function PlansManager() {
  const classes = useStyles();
  const { list, save, update, remove } = usePlans();

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState([]);
  const [record, setRecord] = useState({
    name: "",
    users: 0,
    connections: 0,
    queues: 0,
    amount: 0,
    useWhatsapp: true,
    useFacebook: true,
    useInstagram: true,
    useCampaigns: true,
    useSchedules: true,
    useInternalChat: true,
    useExternalApi: true,
    useKanban: true,
    useOpenAi: true,
    useIntegrations: true,
    isPublic: true,
    useWhatsappOfficial: false,
    trial: false,
    trialDays: 3,
    recurrence: "monthly",
    wavoip: false,
  });

  useEffect(() => {
    async function fetchData() {
      await loadPlans();
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record]);

  const loadPlans = async () => {
    setLoading(true);
    try {
      const planList = await list();
      setRecords(planList);
    } catch (e) {
      toast.error("No se pudo cargar la lista de planes.");
    }
    setLoading(false);
  };

  const handleSubmit = async (data) => {
    setLoading(true);
    try {
      if (data.id !== undefined) {
        await update(data);
      } else {
        await save(data);
      }
      await loadPlans();
      handleCancel();
      toast.success("Operación realizada con éxito.");
    } catch (e) {
      toast.error(
        "No se pudo completar la operación. Verifica que no exista otro plan con el mismo nombre o que los campos estén llenos correctamente."
      );
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await remove(record.id);
      await loadPlans();
      handleCancel();
      toast.success("Plan eliminado con éxito.");
    } catch (e) {
      toast.error("No se pudo eliminar el plan.");
    }
    setLoading(false);
  };

  const handleOpenDeleteDialog = () => {
    setShowConfirmDialog(true);
  };

  const handleCancel = () => {
    setRecord({
      id: undefined,
      name: "",
      users: 0,
      connections: 0,
      queues: 0,
      amount: 0,
      useWhatsapp: true,
      useFacebook: true,
      useInstagram: true,
      useCampaigns: true,
      useSchedules: true,
      useInternalChat: true,
      useExternalApi: true,
      useKanban: true,
      useOpenAi: true,
      useIntegrations: true,
      isPublic: true,
      useWhatsappOfficial: false,
      trial: false,
      trialDays: 3,
      recurrence: "monthly",
      wavoip: false,
    });
  };

  const handleSelect = (data) => {
    setRecord({
      id: data.id,
      name: data.name || "",
      users: data.users || 0,
      connections: data.connections || 0,
      queues: data.queues || 0,
      amount:
        data.amount?.toLocaleString("es-MX", { minimumFractionDigits: 2 }) || 0,
      useWhatsapp: data.useWhatsapp !== false,
      useWhatsappOfficial: data.useWhatsappOfficial !== false,
      useFacebook: data.useFacebook !== false,
      useInstagram: data.useInstagram !== false,
      useCampaigns: data.useCampaigns !== false,
      useSchedules: data.useSchedules !== false,
      useInternalChat: data.useInternalChat !== false,
      useExternalApi: data.useExternalApi !== false,
      useKanban: data.useKanban !== false,
      useOpenAi: data.useOpenAi !== false,
      useIntegrations: data.useIntegrations !== false,
      isPublic: data.isPublic,
      trial: data.trial,
      trialDays: data.trialDays,
      recurrence: data.recurrence,
      wavoip: data.wavoip !== false,
    });
  };

  return (
    <div className={classes.container}>
      <PlanManagerForm
        initialValue={record}
        onDelete={handleOpenDeleteDialog}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        loading={loading}
      />
      <PlansManagerGrid records={records} onSelect={handleSelect} />
      <ConfirmationModal
        title="Eliminar plan"
        open={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={() => handleDelete()}
      >
        ¿Deseas eliminar este plan? Esta acción no se puede deshacer.
      </ConfirmationModal>
    </div>
  );
}
