const PUSH_CONFIG_CACHE = "push-config-v1";
const PUBLIC_KEY_CACHE_KEY = "/__push_config/public-key";
const SUBSCRIPTION_CACHE_KEY = "/__push_config/subscription";
const PROVIDER_CACHE_KEY = "/__push_config/provider";

const urlBase64ToUint8Array = base64String => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
};

const openPushConfigCache = () => caches.open(PUSH_CONFIG_CACHE);

const writeCacheJson = async (key, value) => {
  const cache = await openPushConfigCache();
  await cache.put(
    key,
    new Response(JSON.stringify(value), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store"
      }
    })
  );
};

const readCacheJson = async key => {
  const cache = await openPushConfigCache();
  const response = await cache.match(key);

  if (!response) {
    return null;
  }

  try {
    return await response.json();
  } catch (error) {
    console.error("[ServiceWorker] Failed to parse cached config", key, error);
    return null;
  }
};

const deleteCacheEntry = async key => {
  const cache = await openPushConfigCache();
  await cache.delete(key);
};

const setCachedPublicKey = async key => {
  if (key) {
    self.__PUSH_PUBLIC_KEY__ = key;
    await writeCacheJson(PUBLIC_KEY_CACHE_KEY, { key });
  } else {
    self.__PUSH_PUBLIC_KEY__ = null;
    await deleteCacheEntry(PUBLIC_KEY_CACHE_KEY);
  }
};

const getCachedPublicKey = async () => {
  if (self.__PUSH_PUBLIC_KEY__) {
    return self.__PUSH_PUBLIC_KEY__;
  }

  const cached = await readCacheJson(PUBLIC_KEY_CACHE_KEY);
  self.__PUSH_PUBLIC_KEY__ = cached?.key || null;
  return self.__PUSH_PUBLIC_KEY__;
};

const setCachedSubscriptionMetadata = async metadata => {
  if (metadata) {
    self.__PUSH_SUBSCRIPTION_METADATA__ = metadata;
    await writeCacheJson(SUBSCRIPTION_CACHE_KEY, metadata);
  } else {
    self.__PUSH_SUBSCRIPTION_METADATA__ = null;
    await deleteCacheEntry(SUBSCRIPTION_CACHE_KEY);
  }
};

const getCachedSubscriptionMetadata = async () => {
  if (self.__PUSH_SUBSCRIPTION_METADATA__) {
    return self.__PUSH_SUBSCRIPTION_METADATA__;
  }

  const cached = await readCacheJson(SUBSCRIPTION_CACHE_KEY);
  self.__PUSH_SUBSCRIPTION_METADATA__ = cached || null;
  return self.__PUSH_SUBSCRIPTION_METADATA__;
};

const setCachedProviderConfig = async config => {
  if (config) {
    self.__PUSH_PROVIDER__ = config.provider || null;
    self.__PUSH_PROVIDER_CONFIG__ = config;
    await writeCacheJson(PROVIDER_CACHE_KEY, config);
  } else {
    self.__PUSH_PROVIDER__ = null;
    self.__PUSH_PROVIDER_CONFIG__ = null;
    await deleteCacheEntry(PROVIDER_CACHE_KEY);
  }
};

const getCachedProviderConfig = async () => {
  if (self.__PUSH_PROVIDER_CONFIG__) {
    return self.__PUSH_PROVIDER_CONFIG__;
  }

  const cached = await readCacheJson(PROVIDER_CACHE_KEY);
  if (cached) {
    self.__PUSH_PROVIDER__ = cached.provider || null;
    self.__PUSH_PROVIDER_CONFIG__ = cached;
  }

  return cached || null;
};

const importProviderScripts = async config => {
  if (!config || !Array.isArray(config.scriptUrls)) {
    return;
  }

  const urls = config.scriptUrls.filter(Boolean);

  if (!urls.length) {
    return;
  }

  try {
    importScripts(...urls);
  } catch (error) {
    console.error("[ServiceWorker] Failed to import provider scripts", urls, error);
  }
};

const restorePushConfiguration = async () => {
  try {
    await getCachedPublicKey();
    const providerConfig = await getCachedProviderConfig();
    if (providerConfig) {
      await importProviderScripts(providerConfig);
    }
    await getCachedSubscriptionMetadata();
  } catch (error) {
    console.error("[ServiceWorker] Failed to restore push configuration", error);
  }
};

const notifyClients = async payload => {
  const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  for (const client of clients) {
    client.postMessage(payload);
  }
};

const handlePushSubscriptionChange = async event => {
  try {
    const metadata = (await getCachedSubscriptionMetadata()) || {};
    const oldEndpoint = event.oldSubscription?.endpoint || metadata.subscription?.endpoint || null;
    let subscription = event.newSubscription || null;

    if (!subscription) {
      const existing = await self.registration.pushManager.getSubscription();
      if (existing) {
        subscription = existing;
      }
    }

    if (!subscription) {
      const applicationServerKeyBuffer = event.oldSubscription?.options?.applicationServerKey || null;
      let applicationServerKey = null;

      if (applicationServerKeyBuffer) {
        applicationServerKey = new Uint8Array(applicationServerKeyBuffer);
      } else {
        const cachedKey = await getCachedPublicKey();
        if (cachedKey) {
          applicationServerKey = urlBase64ToUint8Array(cachedKey);
        }
      }

      if (!applicationServerKey) {
        console.warn("[ServiceWorker] Missing VAPID key for push re-subscription");
        await notifyClients({
          type: "PUSH_SUBSCRIPTION_ERROR",
          message: "Não foi possível renovar a assinatura de notificações automaticamente."
        });
        return;
      }

      subscription = await self.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey
      });
    }

    const subscriptionJson = subscription.toJSON();
    const payload = {
      subscription: subscriptionJson,
      platform: metadata.platform || "web",
      deviceInfo: metadata.deviceInfo || { autoRenewed: true },
      oldEndpoint: oldEndpoint && oldEndpoint !== subscriptionJson.endpoint ? oldEndpoint : null
    };

    const response = await fetch(`${self.location.origin}/push/subscriptions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to refresh push subscription (${response.status}): ${errorText}`);
    }

    await setCachedSubscriptionMetadata({
      subscription: subscriptionJson,
      platform: payload.platform,
      deviceInfo: payload.deviceInfo,
      storedAt: Date.now()
    });

    await notifyClients({
      type: "PUSH_SUBSCRIPTION_CHANGE",
      subscription: subscriptionJson,
      autoRenewed: true
    });
  } catch (error) {
    console.error("[ServiceWorker] pushsubscriptionchange handling failed", error);
    await notifyClients({
      type: "PUSH_SUBSCRIPTION_ERROR",
      message: error?.message || "Falha ao atualizar a assinatura de notificações."
    });
  }
};

self.addEventListener("install", event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", event => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      await restorePushConfiguration();
    })()
  );
});

self.addEventListener("message", event => {
  const data = event.data;

  if (!data || typeof data !== "object") {
    return;
  }

  switch (data.type) {
    case "SET_PUBLIC_VAPID_KEY":
      if (typeof data.publicKey === "string" && data.publicKey.length > 0) {
        event.waitUntil(setCachedPublicKey(data.publicKey));
      }
      break;
    case "CLEAR_PUBLIC_VAPID_KEY":
      event.waitUntil(setCachedPublicKey(null));
      break;
    case "SYNC_PUSH_SUBSCRIPTION":
      if (data.subscription) {
        event.waitUntil(
          setCachedSubscriptionMetadata({
            subscription: data.subscription,
            platform: data.platform || "web",
            deviceInfo: data.deviceInfo || null,
            storedAt: Date.now()
          })
        );
      }
      break;
    case "CLEAR_PUSH_SUBSCRIPTION":
      event.waitUntil(setCachedSubscriptionMetadata(null));
      break;
    case "CONFIGURE_PUSH_PROVIDER":
      event.waitUntil(
        (async () => {
          if (!data.provider) {
            await setCachedProviderConfig(null);
            return;
          }

          const config = {
            provider: data.provider,
            integrationId: data.integrationId || null,
            scriptUrls: Array.isArray(data.scriptUrls) ? data.scriptUrls : []
          };

          await setCachedProviderConfig(config);
          await importProviderScripts(config);
        })()
      );
      break;
    default:
      break;
  }
});

self.addEventListener("pushsubscriptionchange", event => {
  event.waitUntil(handlePushSubscriptionChange(event));
});

self.addEventListener("push", event => {
  if (self.__PUSH_PROVIDER__ === "pushalert") {
    return;
  }

  let payload = {};

  try {
    if (event.data) {
      payload = event.data.json();
    }
  } catch (err) {
    payload = { title: "Nuevo mensaje", body: event.data?.text() };
  }

  const title = payload.title || payload.notification?.title || "Nuevo mensaje";
  const body = payload.body || payload.notification?.body || "Tienes un mensaje nuevo.";

  const notificationOptions = {
    body,
    icon: payload.icon || payload.notification?.icon || "/apple-touch-icon.png",
    badge: payload.badge || payload.notification?.badge || "/favicon-32x32.png",
    data: payload.data || payload.notification?.data || {},
    tag: payload.data?.ticketId ? `ticket-${payload.data.ticketId}` : undefined,
    renotify: true,
    vibrate: payload.vibrate || [100, 50, 100]
  };

  event.waitUntil(self.registration.showNotification(title, notificationOptions));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url === targetUrl && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});
