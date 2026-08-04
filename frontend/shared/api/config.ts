/**
 * Dev-only defaults. A real build needs these to come from an actual
 * config mechanism (react-native-config, EAS/CI-injected env, etc.) that
 * differs per environment (simulator vs. physical device vs. prod) — not
 * built here, this is just enough to point at the local backend from
 * docs/setup/backend-setup.md during development.
 */
export const API_BASE_URL = "http://localhost:4000";
export const WS_SIGNALING_URL = "http://localhost:4001";
