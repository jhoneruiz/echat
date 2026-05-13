const PUSHALERT_SCRIPT_ID = "pushalert-integration-script";

const hasWindow = () => typeof window !== "undefined";

export const initializePushAlert = integrationId => {
  if (!hasWindow()) {
    return;
  }

  if (!integrationId) {
    console.warn("[PushAlert] Integration ID is not configured.");
    return;
  }

  if (document.getElementById(PUSHALERT_SCRIPT_ID)) {
    return;
  }

  const script = document.createElement("script");
  script.id = PUSHALERT_SCRIPT_ID;
  script.async = true;
  script.src = `https://cdn.pushalert.co/integrate_${integrationId}.js`;
  script.onerror = error => {
    console.error("[PushAlert] Failed to load integration script", error);
  };

  document.head.appendChild(script);
};

export default initializePushAlert;
