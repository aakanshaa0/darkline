/**
 * Mobile entry point. `ios/` and `android/` native projects are generated
 * by the React Native CLI (see docs/setup/frontend-setup.md) — this file
 * is kept in place so RN CLI init doesn't need to relocate it.
 */
import { AppRegistry } from "react-native";
import App from "./app/App";
import { name as appName } from "./app.json";

AppRegistry.registerComponent(appName, () => App);
