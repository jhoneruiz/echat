import initializePushAlert from "./pushalert";

const initializePushProviders = () => {
  if (typeof window === "undefined") {
    return;
  }

  const pushAlertId = process.env.REACT_APP_PUSHALERT_ID;

  if (pushAlertId) {
    initializePushAlert(pushAlertId);
  }
};

export default initializePushProviders;
