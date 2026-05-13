import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  makeStyles,
  Chip
} from "@material-ui/core";
import CheckCircleIcon from "@material-ui/icons/CheckCircle";
import NotificationsActiveIcon from "@material-ui/icons/NotificationsActive";
import PhoneIphoneIcon from "@material-ui/icons/PhoneIphone";
import CloudDoneIcon from "@material-ui/icons/CloudDone";
import ErrorOutlineIcon from "@material-ui/icons/ErrorOutline";
import RefreshIcon from "@material-ui/icons/Refresh";

import { toast } from "react-toastify";

import { AuthContext } from "../../context/Auth/AuthContext";
import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";
import api from "../../services/api";
import {
  deleteSubscription,
  fetchPublicKey,
  listSubscriptions,
  saveSubscription
} from "../../services/pushNotifications";
import { i18n } from "../../translate/i18n";
import { sendMessageToServiceWorker } from "../../serviceWorker";

const useStyles = makeStyles(theme => ({
  root: {
    padding: theme.spacing(3),
    display: "flex",
    flexDirection: "column",
    height: "100%",
    gap: theme.spacing(3),
    background: theme.palette.background.default,
    color: theme.palette.text.primary
  },
  statusChip: {
    marginLeft: theme.spacing(1)
  },
  stepList: {
    paddingLeft: theme.spacing(2)
  },
  actionBox: {
    display: "flex",
    gap: theme.spacing(2),
    flexWrap: "wrap"
  },
  infoCard: {
    height: "100%"
  },
  mutedText: {
    color: theme.palette.text.secondary
  }
}));

const isSafariIOS = () => {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) && /safari/i.test(ua) && !/crios|fxios/i.test(ua);
};

const detectPlatform = () => {
  if (typeof window === "undefined") return "web";
  if (isSafariIOS()) return "ios";
  if (/android/i.test(window.navigator.userAgent)) return "android";
  return "web";
};

const urlBase64ToUint8Array = (base64String) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

const MobileNotifications = () => {
  const classes = useStyles();
  const { user } = useContext(AuthContext);

  const [publicKey, setPublicKey] = useState("");
  const [permission, setPermission] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const support = useMemo(() => ({
    notifications: typeof Notification !== "undefined",
    serviceWorker: typeof navigator !== "undefined" && "serviceWorker" in navigator,
    pushManager: typeof navigator !== "undefined" && navigator?.serviceWorker && "PushManager" in window
  }), []);

  const hasActiveSubscription = subscriptions.length > 0;

  const fetchSubscriptions = useCallback(async () => {
    try {
      const { data } = await listSubscriptions();
      setSubscriptions(data || []);
    } catch (err) {
      setError(err);
    }
  }, []);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [keyResponse] = await Promise.all([
          fetchPublicKey(),
          fetchSubscriptions()
        ]);

        const fetchedKey = keyResponse?.data?.publicKey || "";
        setPublicKey(fetchedKey);

        if (fetchedKey) {
          await sendMessageToServiceWorker({
            type: "SET_PUBLIC_VAPID_KEY",
            publicKey: fetchedKey
          });
        } else {
          await sendMessageToServiceWorker({ type: "CLEAR_PUBLIC_VAPID_KEY" });
        }
      } catch (err) {
        setError(err);
      }
    };

    loadInitialData();
  }, [fetchSubscriptions, sendMessageToServiceWorker]);

  useEffect(() => {
    const onSwMessage = (event) => {
      if (event.data?.type === "PUSH_SUBSCRIPTION_CHANGE") {
        fetchSubscriptions();
      }

      if (event.data?.type === "PUSH_SUBSCRIPTION_ERROR") {
        const message = event.data?.message || i18n.t("notifications.mobile.genericError");
        toast.error(message);
        setError(new Error(message));
      }
    };

    if (support.serviceWorker) {
      navigator.serviceWorker.addEventListener("message", onSwMessage);
    }

    return () => {
      if (support.serviceWorker) {
        navigator.serviceWorker.removeEventListener("message", onSwMessage);
      }
    };
  }, [fetchSubscriptions, support.serviceWorker]);

  const ensureServiceWorkerReady = useCallback(async () => {
    if (!support.serviceWorker) {
      throw new Error("Este navegador no soporta Service Workers.");
    }

    const registration = await navigator.serviceWorker.ready;
    return registration;
  }, [support.serviceWorker]);

  const subscribePush = useCallback(async () => {
    if (!publicKey) {
      throw new Error("La clave pública de notificaciones no está disponible.");
    }

    const registration = await ensureServiceWorkerReady();
    const existing = await registration.pushManager.getSubscription();
    let oldEndpoint = null;
    if (existing) {
      oldEndpoint = existing.endpoint;
      await existing.unsubscribe();
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    });

    return { subscription, oldEndpoint };
  }, [ensureServiceWorkerReady, publicKey]);

  const handleActivate = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!support.notifications) {
        throw new Error("Este navegador no permite notificaciones.");
      }

      if (!support.serviceWorker || !support.pushManager) {
        throw new Error(i18n.t("notifications.mobile.unsupported"));
      }

      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== "granted") {
        throw new Error("Permiso de notificaciones denegado.");
      }

      const { subscription, oldEndpoint } = await subscribePush();
      const platform = detectPlatform();

      const deviceInfo = {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };

      await saveSubscription({
        subscription: subscription.toJSON(),
        platform,
        deviceInfo,
        oldEndpoint
      });

      await sendMessageToServiceWorker({
        type: "SYNC_PUSH_SUBSCRIPTION",
        subscription: subscription.toJSON(),
        platform,
        deviceInfo
      });

      if (!user.mobileNotifications) {
        await api.put(`/users/${user.id}`, { mobileNotifications: true });
      }

      await fetchSubscriptions();
      toast.success(i18n.t("notifications.mobile.activated"));
    } catch (err) {
      console.error("Error enabling push", err);
      toast.error(
        err?.response?.data?.error || err?.message || i18n.t("notifications.mobile.genericError")
      );
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [
    fetchSubscriptions,
    subscribePush,
    support.notifications,
    support.pushManager,
    support.serviceWorker,
    user,
    sendMessageToServiceWorker
  ]);

  const handleDeactivate = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const registration = support.serviceWorker
        ? await navigator.serviceWorker.ready
        : null;

      const existing = await registration?.pushManager.getSubscription();
      if (existing) {
        await existing.unsubscribe();
      }

      for (const subscription of subscriptions) {
        await deleteSubscription(subscription.id, { endpoint: subscription.endpoint });
      }

      if (user.mobileNotifications) {
        await api.put(`/users/${user.id}`, { mobileNotifications: false });
      }

      await sendMessageToServiceWorker({ type: "CLEAR_PUSH_SUBSCRIPTION" });

      await fetchSubscriptions();
      toast.success(i18n.t("notifications.mobile.deactivated"));
    } catch (err) {
      console.error("Error disabling push", err);
      toast.error(
        err?.response?.data?.error || err?.message || i18n.t("notifications.mobile.genericError")
      );
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [
    fetchSubscriptions,
    sendMessageToServiceWorker,
    subscriptions,
    support.serviceWorker,
    user
  ]);

  const refreshStatus = useCallback(async () => {
    try {
      setRefreshing(true);
      await fetchSubscriptions();
      const registration = support.serviceWorker ? await navigator.serviceWorker.ready : null;
      const currentSubscription = await registration?.pushManager.getSubscription();
      setPermission(typeof Notification !== "undefined" ? Notification.permission : "default");
      if (!currentSubscription && hasActiveSubscription) {
        await handleDeactivate();
      }
    } catch (err) {
      setError(err);
    } finally {
      setRefreshing(false);
    }
  }, [fetchSubscriptions, handleDeactivate, hasActiveSubscription, support.serviceWorker]);

  const statusLabel = useMemo(() => {
    if (!support.notifications || !support.serviceWorker || !support.pushManager) {
      return i18n.t("notifications.mobile.unsupported");
    }
    if (permission === "granted" && hasActiveSubscription) {
      return i18n.t("notifications.mobile.enabled");
    }
    if (permission === "denied") {
      return i18n.t("notifications.mobile.blocked");
    }
    return i18n.t("notifications.mobile.disabled");
  }, [hasActiveSubscription, permission, support.notifications, support.pushManager, support.serviceWorker]);

  return (
    <MainContainer className={classes.root}>
      <MainHeader>
        <Title>{i18n.t("notifications.mobile.title")}</Title>
        <Chip
          color={hasActiveSubscription ? "primary" : "default"}
          icon={<NotificationsActiveIcon />}
          label={statusLabel}
          className={classes.statusChip}
        />
      </MainHeader>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card className={classes.infoCard}>
            <CardHeader
              avatar={<PhoneIphoneIcon color="primary" />}
              title={i18n.t("notifications.mobile.steps.title")}
              subheader={i18n.t("notifications.mobile.steps.subtitle")}
            />
            <CardContent>
              <List className={classes.stepList}>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary={i18n.t("notifications.mobile.steps.install")}
                    secondary={i18n.t("notifications.mobile.steps.installHint")}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary={i18n.t("notifications.mobile.steps.open")}
                    secondary={i18n.t("notifications.mobile.steps.openHint")}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary={i18n.t("notifications.mobile.steps.enable")}
                    secondary={i18n.t("notifications.mobile.steps.enableHint")}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card className={classes.infoCard}>
            <CardHeader
              avatar={<CloudDoneIcon color="primary" />}
              title={i18n.t("notifications.mobile.status.title")}
              subheader={i18n.t("notifications.mobile.status.subtitle")}
            />
            <CardContent>
              <Typography variant="body1" gutterBottom>
                {i18n.t("notifications.mobile.status.permission", { status: permission })}
              </Typography>
              <Typography variant="body2" className={classes.mutedText} gutterBottom>
                {support.notifications
                  ? i18n.t("notifications.mobile.status.permissionHint")
                  : i18n.t("notifications.mobile.status.permissionUnsupported")}
              </Typography>

              <Typography variant="body1" gutterBottom>
                {i18n.t("notifications.mobile.status.subscriptions", { total: subscriptions.length })}
              </Typography>
              {subscriptions.map(sub => (
                <Typography key={sub.id} variant="caption" display="block" className={classes.mutedText}>
                  {sub.platform || detectPlatform()} · {new Date(sub.updatedAt).toLocaleString()}
                </Typography>
              ))}

              {error && (
                <Box display="flex" alignItems="center" color="error.main" mt={2}>
                  <ErrorOutlineIcon style={{ marginRight: 8 }} />
                  <Typography variant="body2">
                    {error?.response?.data?.error || error?.message || i18n.t("notifications.mobile.genericError")}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <Box className={classes.actionBox}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<NotificationsActiveIcon />}
              disabled={
                loading ||
                permission === "denied" ||
                !support.notifications ||
                !support.serviceWorker ||
                !support.pushManager
              }
              onClick={handleActivate}
            >
              {loading ? <CircularProgress size={20} /> : i18n.t("notifications.mobile.actions.activate")}
            </Button>

            <Button
              variant="outlined"
              color="secondary"
              disabled={loading || !hasActiveSubscription || !support.serviceWorker}
              onClick={handleDeactivate}
            >
              {i18n.t("notifications.mobile.actions.deactivate")}
            </Button>

            <Button
              variant="text"
              startIcon={<RefreshIcon />}
              disabled={refreshing || !support.serviceWorker}
              onClick={refreshStatus}
            >
              {refreshing ? <CircularProgress size={20} /> : i18n.t("notifications.mobile.actions.refresh")}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </MainContainer>
  );
};

export default MobileNotifications;
