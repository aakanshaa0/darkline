const { getDefaultConfig, mergeConfig } = require("@react-native/metro-config");

/**
 * Metro serves the iOS/Android bundles only — the web target is built
 * separately by Vite (see web/vite.config.ts), which is what actually
 * resolves react-native-web aliasing for the browser build.
 * https://reactnative.dev/docs/metro
 */
const config = {};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
