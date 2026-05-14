import React from "react";
import ReactDOM from "react-dom";
import CssBaseline from "@material-ui/core/CssBaseline";
import moment from "moment";
import "moment/locale/es-mx";
import * as serviceWorker from "./serviceWorker";
import initializePushProviders from "./utils/pushProviders";

import App from "./App";

// Locale global de moment: español de México (dígitos latinos, formato dd/mm/yyyy).
// Limpia un posible "i18nextLng" persistido (p.ej. "ar") que arrastraba dígitos arábigos.
moment.locale("es-mx");
try {
  const stored = window.localStorage?.getItem("i18nextLng");
  if (stored && !/^es/i.test(stored)) {
    window.localStorage.removeItem("i18nextLng");
  }
} catch (e) { /* ignore */ }

initializePushProviders();

ReactDOM.render(
  <CssBaseline>
    <App />
  </CssBaseline>,
  document.getElementById("root"),
  () => {
    window.finishProgress();
  }
);

serviceWorker.register();
