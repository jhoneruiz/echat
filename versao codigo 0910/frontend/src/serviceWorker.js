const registerServiceWorker = async swUrl => {
  const registration = await navigator.serviceWorker.register(swUrl, {
    scope: "/"
  });

  console.log("Service worker registrado com sucesso!", registration);
  return registration;
};

const configureServiceWorker = async () => {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const worker = registration?.active || registration?.waiting || registration?.installing;

    if (!worker) {
      return;
    }

    const messages = [];
    const pushAlertId = process.env.REACT_APP_PUSHALERT_ID;

    if (pushAlertId) {
      messages.push({
        type: "CONFIGURE_PUSH_PROVIDER",
        provider: "pushalert",
        integrationId: pushAlertId,
        scriptUrls: [`https://cdn.pushalert.co/sw-${pushAlertId}.js`]
      });
    } else {
      messages.push({
        type: "CONFIGURE_PUSH_PROVIDER",
        provider: null
      });
    }

    for (const message of messages) {
      worker.postMessage(message);
    }
  } catch (error) {
    console.error("[ServiceWorker] Failed to configure worker", error);
  }
};

const setupControllerChangeListener = () => {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  if (navigator.serviceWorker.__hasControllerChangeListener) {
    return;
  }

  const onControllerChange = () => {
    configureServiceWorker();
  };

  navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
  navigator.serviceWorker.__hasControllerChangeListener = true;
};

export const sendMessageToServiceWorker = async message => {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const worker = registration?.active || registration?.waiting || registration?.installing;

    if (!worker) {
      return false;
    }

    worker.postMessage(message);
    return true;
  } catch (error) {
    console.error("[ServiceWorker] Failed to send message", error, message);
    return false;
  }
};

export function register() {
  if (typeof window === "undefined") {
    return;
  }

  if ("serviceWorker" in navigator) {
    const swUrl = `${process.env.PUBLIC_URL}/service-worker.js`;

    const attemptRegistration = async () => {
      try {
        await registerServiceWorker(swUrl);
        setupControllerChangeListener();
        await configureServiceWorker();
      } catch (error) {
        console.error("Erro durante o registro do service worker:", error);
        window.addEventListener(
          "load",
          () => {
            registerServiceWorker(swUrl)
              .then(() => {
                setupControllerChangeListener();
                return configureServiceWorker();
              })
              .catch(err => {
                console.error("Falha ao registrar o service worker após o carregamento da página.", err);
              });
          },
          { once: true }
        );
      }
    };

    attemptRegistration();
  }
}

export function unregister() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready
      .then(registration => {
        registration.unregister();
      })
      .catch(error => {
        console.error("Erro durante o desregistro do service worker:", error);
      });
  }
}
