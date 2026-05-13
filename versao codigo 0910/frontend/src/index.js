import React from "react";
import ReactDOM from "react-dom";
import CssBaseline from "@material-ui/core/CssBaseline";
import * as serviceWorker from "./serviceWorker";
import initializePushProviders from "./utils/pushProviders";

import App from "./App";

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
