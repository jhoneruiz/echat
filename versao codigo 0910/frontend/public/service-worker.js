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

    // El service worker no puede adjuntar el token JWT de auth, así que delega
    // el re-registro a la app cliente mediante postMessage.
    await notifyClients({
      type: "PUSH_SUBSCRIPTION_NEEDS_RENEWAL",
      oldEndpoint,
      platform: metadata.platform || "web"
    });
  } catch (error) {
    console.error("[ServiceWorker] pushsubscriptionchange handling failed", error);
    await notifyClients({
      type: "PUSH_SUBSCRIPTION_ERROR",
      message: "Error al actualizar la suscripción de notificaciones."
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
    payload = { title: "Nuevo mensaje", body: event.data?.text() || "Tienes un mensaje nuevo." };
  }

  // Soporta payload directo o anidado en .notification (Firebase style)
  const src = payload.notification || payload;

  const title = src.title || "Nuevo mensaje";
  const body = src.body || "Tienes un mensaje nuevo.";

  const notificationOptions = {
    body,
    icon: src.icon || "/apple-touch-icon.png",
    badge: src.badge || "/favicon-32x32.png",
    image: src.image || undefined,
    data: src.data || {},
    tag: src.tag || (src.data?.ticketId ? `ticket-${src.data.ticketId}` : undefined),
    renotify: src.renotify !== undefined ? src.renotify : true,
    vibrate: src.vibrate || [120, 60, 120, 60, 120],
    requireInteraction: false,
    silent: false,
    actions: [
      { action: "open", title: "Abrir" },
      { action: "dismiss", title: "Descartar" }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, notificationOptions));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  if (event.action === "dismiss") return;

  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(clientList => {
      // Si ya hay una ventana abierta, enfocarla y navegar
      for (const client of clientList) {
        if ("focus" in client) {
          if (client.url.includes(targetUrl) || targetUrl === "/") {
            return client.focus();
          }
        }
      }
      // Si no hay ventana abierta o ninguna match, abrir nueva
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});
