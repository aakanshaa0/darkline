const path = require("path");
const { getDefaultConfig, mergeConfig } = require("@react-native/metro-config");

/**
 * Metro serves the iOS/Android bundles only — the web target is built
 * separately by Vite (see web/vite.config.ts), which is what actually
 * resolves react-native-web aliasing for the browser build.
 * https://reactnative.dev/docs/metro
 *
 * Mirrors the "@app/*"/"@shared/*" paths in tsconfig.json — tsc and Vite
 * both resolve those already, but Metro needs its own mapping or every
 * "@shared/..." import fails to bundle for iOS/Android.
 *
 * extraNodeModules alone doesn't work here: Metro treats a leading "@x/y"
 * as an npm-scoped package name (both segments), so it looks up
 * extraNodeModules["@shared/store"], not extraNodeModules["@shared"] +
 * "/store". A resolveRequest override rewrites the prefix ourselves and
 * hands off to the default resolver for everything else (including the
 * .native/.web extension-suffix resolution).
 */
const ALIASES = {
  "@app": path.resolve(__dirname, "app"),
  "@shared": path.resolve(__dirname, "shared"),
};

const config = {
  resolver: {
    resolveRequest: (context, moduleName, platform) => {
      for (const [alias, target] of Object.entries(ALIASES)) {
        if (moduleName === alias || moduleName.startsWith(`${alias}/`)) {
          const rewritten = target + moduleName.slice(alias.length);
          return context.resolveRequest(context, rewritten, platform);
        }
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
