import React, { useState, useEffect, useContext } from "react";
import {
  makeStyles,
  Paper,
  Grid,
  FormControl,
  InputLabel,
  MenuItem,
  TextField,
  Table,
  TableHead,
  TableBody,
  TableCell,
  TableRow,
  IconButton,
  Select,
  Typography,
  Box,
  Chip,
  TableContainer,
  Divider,
} from "@material-ui/core";
import { Formik, Form, Field } from "formik";
import ButtonWithSpinner from "../ButtonWithSpinner";
import ConfirmationModal from "../ConfirmationModal";

import {
  Edit as EditIcon,
  Business as BusinessIcon,
  EventAvailable,
  ListAlt,
  CheckCircle,
  Cancel,
} from "@material-ui/icons";

import { toast } from "react-toastify";
import useCompanies from "../../hooks/useCompanies";
import usePlans from "../../hooks/usePlans";
import ModalUsers from "../ModalUsers";
import api from "../../services/api";
import { head, isArray } from "lodash";
import { useDate } from "../../hooks/useDate";
import ColorModeContext from "../../layout/themeContext";

import moment from "moment";
import { i18n } from "../../translate/i18n";
import { useTheme } from "@material-ui/core/styles";

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
  subSectionTitle: {
    fontSize: "0.85rem",
    fontWeight: 600,
    margin: theme.spacing(2, 0, 1.5),
  },
  fullWidth: { width: "100%" },
  buttonsRow: {
    display: "flex",
    justifyContent: "flex-end",
    gap: theme.spacing(1.25),
    marginTop: theme.spacing(2),
    flexWrap: "wrap",
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
    cursor: "pointer",
    transition: "background-color 0.15s ease",
    "&:hover": {
      backgroundColor:
        theme.palette.type === "dark"
          ? "rgba(59,130,246,0.06)"
          : "#F8FAFC",
    },
    "& .MuiTableCell-body": {
      padding: theme.spacing(1.25, 1.5),
      fontSize: "0.85rem",
    },
  },
  rowDueWarn: {
    backgroundColor:
      theme.palette.type === "dark"
        ? "rgba(255,235,59,0.08)"
        : "#FFFBEB !important",
  },
  rowDueExpired: {
    backgroundColor:
      theme.palette.type === "dark"
        ? "rgba(244,67,54,0.12)"
        : "#FEE2E2 !important",
  },
  badgeActive: {
    height: 22,
    fontSize: "0.7rem",
    backgroundColor:
      theme.palette.type === "dark" ? "rgba(76,175,80,0.18)" : "#E8F5E9",
    color: theme.palette.type === "dark" ? "#81C784" : "#2E7D32",
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
    padding: theme.spacing(6, 2),
    textAlign: "center",
    color: theme.palette.text.secondary,
  },
}));

export function CompanyForm(props) {
  const { onSubmit, onDelete, onCancel, initialValue, loading } = props;
  const classes = useStyles();
  const [plans, setPlans] = useState([]);
  const [modalUser, setModalUser] = useState(false);
  const [firstUser, setFirstUser] = useState({});

  const [record, setRecord] = useState({
    name: "",
    email: "",
    phone: "",
    planId: "",
    status: true,
    dueDate: "",
    recurrence: "",
    password: "",
    generateInvoice: true,
    ...initialValue,
  });

  const { list: listPlans } = usePlans();

  useEffect(() => {
    async function fetchData() {
      const list = await listPlans();
      setPlans(list);
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setRecord((prev) => {
      if (moment(initialValue).isValid()) {
        initialValue.dueDate = moment(initialValue.dueDate).format(
          "YYYY-MM-DD"
        );
      }
      return { ...prev, ...initialValue };
    });
  }, [initialValue]);

  const handleSubmit = async (data) => {
    if (data.dueDate === "" || moment(data.dueDate).isValid() === false) {
      data.dueDate = null;
    }
    onSubmit(data);
    setRecord({ ...initialValue, dueDate: "", generateInvoice: true });
  };

  const handleCloseModalUsers = () => {
    setFirstUser({});
    setModalUser(false);
  };

  const incrementDueDate = () => {
    const data = { ...record };
    if (data.dueDate !== "" && data.dueDate !== null) {
      const monthsByRecurrence = {
        MENSAL: 1,
        BIMESTRAL: 2,
        TRIMESTRAL: 3,
        SEMESTRAL: 6,
        ANUAL: 12,
      };
      const months = monthsByRecurrence[data.recurrence];
      if (months) {
        data.dueDate = moment(data.dueDate)
          .add(months, "month")
          .format("YYYY-MM-DD");
      }
    }
    setRecord(data);
  };

  return (
    <>
      <ModalUsers
        userId={firstUser.id}
        companyId={initialValue.id}
        open={modalUser}
        onClose={handleCloseModalUsers}
      />
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
        {() => (
          <Form className={classes.fullWidth}>
            <Paper elevation={0} className={classes.sectionCard}>
              <div className={classes.sectionHeader}>
                <div className={classes.sectionIcon}>
                  <BusinessIcon fontSize="small" />
                </div>
                <Box>
                  <Typography className={classes.sectionTitle}>
                    {record.id ? "Editar empresa" : "Nueva empresa"}
                  </Typography>
                  <Typography className={classes.sectionSubtitle}>
                    Datos de contacto, plan asignado y facturación.
                  </Typography>
                </Box>
              </div>

              {/* Datos básicos */}
              <Grid spacing={2} container>
                <Grid xs={12} sm={6} md={4} item>
                  <Field
                    as={TextField}
                    label={i18n.t("compaies.table.name")}
                    name="name"
                    variant="outlined"
                    className={classes.fullWidth}
                    size="small"
                  />
                </Grid>
                <Grid xs={12} sm={6} md={4} item>
                  <Field
                    as={TextField}
                    label={i18n.t("compaies.table.email")}
                    name="email"
                    variant="outlined"
                    className={classes.fullWidth}
                    size="small"
                    required
                  />
                </Grid>
                <Grid xs={12} sm={6} md={4} item>
                  <Field
                    as={TextField}
                    label={i18n.t("compaies.table.phone")}
                    name="phone"
                    variant="outlined"
                    className={classes.fullWidth}
                    size="small"
                  />
                </Grid>
                <Grid xs={12} sm={6} md={4} item>
                  <Field
                    as={TextField}
                    label={i18n.t("compaies.table.password")}
                    name="password"
                    type="password"
                    variant="outlined"
                    className={classes.fullWidth}
                    size="small"
                  />
                </Grid>
                <Grid xs={12} sm={6} md={4} item>
                  <Field
                    as={TextField}
                    label={i18n.t("compaies.table.document")}
                    name="document"
                    variant="outlined"
                    className={classes.fullWidth}
                    size="small"
                  />
                </Grid>
              </Grid>

              <Typography className={classes.subSectionTitle}>
                Plan y estado
              </Typography>
              <Grid spacing={2} container>
                <Grid xs={12} sm={6} md={4} item>
                  <FormControl variant="outlined" fullWidth size="small">
                    <InputLabel>{i18n.t("compaies.table.plan")}</InputLabel>
                    <Field
                      as={Select}
                      label={i18n.t("compaies.table.plan")}
                      name="planId"
                      required
                    >
                      {plans.map((plan, key) => (
                        <MenuItem key={key} value={plan.id}>
                          {plan.name}
                        </MenuItem>
                      ))}
                    </Field>
                  </FormControl>
                </Grid>
                <Grid xs={6} sm={3} md={2} item>
                  <FormControl variant="outlined" fullWidth size="small">
                    <InputLabel>{i18n.t("compaies.table.active")}</InputLabel>
                    <Field
                      as={Select}
                      label={i18n.t("compaies.table.active")}
                      name="status"
                    >
                      <MenuItem value={true}>
                        {i18n.t("compaies.table.yes")}
                      </MenuItem>
                      <MenuItem value={false}>
                        {i18n.t("compaies.table.no")}
                      </MenuItem>
                    </Field>
                  </FormControl>
                </Grid>
                <Grid xs={6} sm={3} md={2} item>
                  <FormControl variant="outlined" fullWidth size="small">
                    <InputLabel>Generar factura</InputLabel>
                    <Field
                      as={Select}
                      label="Generar factura"
                      name="generateInvoice"
                    >
                      <MenuItem value={true}>Sí</MenuItem>
                      <MenuItem value={false}>No</MenuItem>
                    </Field>
                  </FormControl>
                </Grid>
              </Grid>

              <Typography className={classes.subSectionTitle}>
                Vencimiento y recurrencia
              </Typography>
              <Grid spacing={2} container>
                <Grid xs={12} sm={6} md={4} item>
                  <Field
                    as={TextField}
                    label={i18n.t("compaies.table.dueDate")}
                    type="date"
                    name="dueDate"
                    InputLabelProps={{ shrink: true }}
                    variant="outlined"
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid xs={12} sm={6} md={4} item>
                  <FormControl variant="outlined" fullWidth size="small">
                    <InputLabel>Recurrencia</InputLabel>
                    <Field
                      as={Select}
                      label="Recurrencia"
                      name="recurrence"
                    >
                      <MenuItem value="MENSAL">
                        {i18n.t("compaies.table.monthly")}
                      </MenuItem>
                      <MenuItem value="BIMESTRAL">
                        {i18n.t("compaies.table.bimonthly")}
                      </MenuItem>
                      <MenuItem value="TRIMESTRAL">
                        {i18n.t("compaies.table.quarterly")}
                      </MenuItem>
                      <MenuItem value="SEMESTRAL">
                        {i18n.t("compaies.table.semester")}
                      </MenuItem>
                      <MenuItem value="ANUAL">
                        {i18n.t("compaies.table.yearly")}
                      </MenuItem>
                    </Field>
                  </FormControl>
                </Grid>
              </Grid>

              <Divider style={{ margin: "20px 0 0" }} />

              <div className={classes.buttonsRow}>
                <ButtonWithSpinner
                  loading={loading}
                  onClick={() => onCancel()}
                  variant="outlined"
                >
                  {i18n.t("compaies.table.clear")}
                </ButtonWithSpinner>
                {record.id !== undefined && (
                  <>
                    <ButtonWithSpinner
                      loading={loading}
                      onClick={() => onDelete(record)}
                      variant="contained"
                      color="secondary"
                      disabled={record.id === 1}
                    >
                      {i18n.t("compaies.table.delete")}
                    </ButtonWithSpinner>
                    <ButtonWithSpinner
                      loading={loading}
                      onClick={() => incrementDueDate()}
                      variant="outlined"
                      color="primary"
                      startIcon={<EventAvailable />}
                    >
                      {i18n.t("compaies.table.dueDate")}
                    </ButtonWithSpinner>
                  </>
                )}
                <ButtonWithSpinner
                  loading={loading}
                  type="submit"
                  variant="contained"
                  color="primary"
                >
                  {i18n.t("compaies.table.save")}
                </ButtonWithSpinner>
              </div>
            </Paper>
          </Form>
        )}
      </Formik>
    </>
  );
}

export function CompaniesManagerGrid(props) {
  const { records, onSelect } = props;
  const classes = useStyles();
  const { dateToClient, datetimeToClient } = useDate();
  useContext(ColorModeContext);
  useTheme();

  const renderPlan = (row) => (row.planId !== null ? row.plan?.name || "-" : "-");

  const renderPlanValue = (row) => {
    if (!row.planId || !row.plan) return "-";
    return row.plan.amount
      ? row.plan.amount.toLocaleString("es-MX", {
          style: "currency",
          currency: "MXN",
        })
      : "$0.00";
  };

  const rowClass = (record) => {
    if (moment(record.dueDate).isValid()) {
      const diff = moment(record.dueDate).diff(moment(), "days");
      if (diff <= 0) return classes.rowDueExpired;
      if (diff <= 5) return classes.rowDueWarn;
    }
    return "";
  };

  return (
    <Paper elevation={0} className={classes.sectionCard} style={{ padding: 0 }}>
      <Box style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <div className={classes.sectionIcon}>
          <ListAlt fontSize="small" />
        </div>
        <Box>
          <Typography className={classes.sectionTitle}>
            Empresas registradas
          </Typography>
          <Typography className={classes.sectionSubtitle}>
            {records.length === 0
              ? "Aún no hay empresas registradas."
              : `${records.length} ${records.length === 1 ? "empresa" : "empresas"} en total.`}
          </Typography>
        </Box>
      </Box>

      {records.length === 0 ? (
        <div className={classes.emptyState}>
          <Typography variant="body2">
            Crea una empresa en el formulario superior para comenzar.
          </Typography>
        </div>
      ) : (
        <TableContainer style={{ maxHeight: 600 }}>
          <Table stickyHeader size="small">
            <TableHead className={classes.tableHead}>
              <TableRow>
                <TableCell align="center" style={{ width: 50 }}></TableCell>
                <TableCell align="left">{i18n.t("compaies.table.name")}</TableCell>
                <TableCell align="left">{i18n.t("compaies.table.email")}</TableCell>
                <TableCell align="center">{i18n.t("compaies.table.phone")}</TableCell>
                <TableCell align="center">{i18n.t("compaies.table.plan")}</TableCell>
                <TableCell align="center">{i18n.t("compaies.table.value")}</TableCell>
                <TableCell align="center">{i18n.t("compaies.table.active")}</TableCell>
                <TableCell align="center">{i18n.t("compaies.table.createdAt")}</TableCell>
                <TableCell align="center">{i18n.t("compaies.table.dueDate")}</TableCell>
                <TableCell align="center">{i18n.t("compaies.table.lastLogin")}</TableCell>
                <TableCell align="center">{i18n.t("compaies.table.generateInvoice")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {records.map((row) => (
                <TableRow
                  key={row.id}
                  className={`${classes.tableRow} ${rowClass(row)}`}
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
                  <TableCell align="left">{row.email || "-"}</TableCell>
                  <TableCell align="center">{row.phone || "-"}</TableCell>
                  <TableCell align="center">{renderPlan(row)}</TableCell>
                  <TableCell align="center">{renderPlanValue(row)}</TableCell>
                  <TableCell align="center">
                    {row.status !== false ? (
                      <Chip
                        size="small"
                        label="Activa"
                        icon={<CheckCircle style={{ fontSize: 14 }} />}
                        className={classes.badgeActive}
                      />
                    ) : (
                      <Chip
                        size="small"
                        label="Inactiva"
                        icon={<Cancel style={{ fontSize: 14 }} />}
                        className={classes.badgeInactive}
                      />
                    )}
                  </TableCell>
                  <TableCell align="center">{dateToClient(row.createdAt)}</TableCell>
                  <TableCell align="center">
                    {dateToClient(row.dueDate)}
                    {row.recurrence && (
                      <>
                        <br />
                        <span style={{ fontSize: "0.7rem", opacity: 0.7 }}>
                          {row.recurrence}
                        </span>
                      </>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    {datetimeToClient(row.lastLogin)}
                  </TableCell>
                  <TableCell align="center">
                    {row.generateInvoice
                      ? i18n.t("compaies.table.yes")
                      : i18n.t("compaies.table.no")}
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

export default function CompaniesManager() {
  const classes = useStyles();
  const { list, save, update, remove } = useCompanies();

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState([]);
  const [record, setRecord] = useState({
    name: "",
    email: "",
    phone: "",
    planId: "",
    status: true,
    dueDate: "",
    recurrence: "",
    password: "",
    document: "",
    paymentMethod: "",
    generateInvoice: true,
  });

  useEffect(() => {
    loadCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCompanies = async () => {
    setLoading(true);
    try {
      const companyList = await list();
      setRecords(companyList);
    } catch (e) {
      toast.error("No se pudo cargar la lista de empresas.");
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
      await loadCompanies();
      handleCancel();
      toast.success("Operación realizada con éxito.");
    } catch (e) {
      toast.error(
        e?.response?.data?.error ||
          e?.response?.data?.message ||
          e?.message ||
          "No se pudo completar la operación. Verifica que no exista otra empresa con el mismo nombre."
      );
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await remove(record.id);
      await loadCompanies();
      handleCancel();
      toast.success("Empresa eliminada con éxito.");
    } catch (e) {
      toast.error(
        e?.response?.data?.error ||
          e?.response?.data?.message ||
          e?.message ||
          "No se pudo eliminar la empresa."
      );
    }
    setLoading(false);
  };

  const handleOpenDeleteDialog = () => setShowConfirmDialog(true);

  const handleCancel = () => {
    setRecord((prev) => ({
      ...prev,
      id: undefined,
      name: "",
      email: "",
      phone: "",
      planId: "",
      status: true,
      dueDate: "",
      recurrence: "",
      password: "",
      document: "",
      paymentMethod: "",
      generateInvoice: true,
    }));
  };

  const handleSelect = (data) => {
    setRecord((prev) => ({
      ...prev,
      id: data.id,
      name: data.name || "",
      phone: data.phone || "",
      email: data.email || "",
      planId: data.planId || "",
      status: data.status !== false,
      dueDate: data.dueDate || "",
      recurrence: data.recurrence || "",
      password: "",
      document: data.document || "",
      paymentMethod: data.paymentMethod || "",
      generateInvoice:
        data.generateInvoice !== undefined ? data.generateInvoice : true,
    }));
  };

  return (
    <div className={classes.container}>
      <CompanyForm
        initialValue={record}
        onDelete={handleOpenDeleteDialog}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        loading={loading}
      />
      <CompaniesManagerGrid records={records} onSelect={handleSelect} />
      <ConfirmationModal
        title="Eliminar empresa"
        open={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={() => handleDelete()}
      >
        ¿Deseas eliminar esta empresa? Esta acción no se puede deshacer.
      </ConfirmationModal>
    </div>
  );
}
