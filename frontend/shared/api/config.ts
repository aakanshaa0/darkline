import { Platform } from "react-native";

/**
 * Dev-only defaults. A real build needs these to come from an actual
 * config mechanism (react-native-config, EAS/CI-injected env, etc.) that
 * differs per environment (simulator vs. physical device vs. prod) — not
 * built here, this is just enough to point at the local backend from
 * docs/setup/backend-setup.md during development.
 *
 * "localhost" means different things depending on where the JS is
 * actually running: the browser (web), or the Android emulator's own
 * virtual device (10.0.2.2 is its alias for the host machine — see
 * https://developer.android.com/studio/run/emulator-networking). iOS
 * Simulator shares the host's network directly, so localhost works there
 * unchanged. A physical device needs the host's real LAN IP instead —
 * still not handled here, since it can't be inferred at build time.
 */
const DEV_HOST = Platform.OS === "android" ? "10.0.2.2" : "localhost";

export const API_BASE_URL = `http://${DEV_HOST}:4000`;
export const WS_SIGNALING_URL = `http://${DEV_HOST}:4001`;
