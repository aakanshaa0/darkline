import React from "react";
import { AppRegistry } from "react-native";
import WebApp from "./WebApp";
import { name as appName } from "../app.json";

// Web gets its own three-pane shell (WebApp), not the mobile single-screen
// shell (app/App.tsx) — see WebApp.tsx for why.
AppRegistry.registerComponent(appName, () => WebApp);
AppRegistry.runApplication(appName, {
  rootTag: document.getElementById("root"),
});
