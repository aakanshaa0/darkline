import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

/**
 * Builds the react-native-web target. Metro (metro.config.js) still owns
 * the iOS/Android bundles — this is a separate build pipeline, not a
 * Metro plugin, per the RN-web setup described in
 * docs/design-reference/darkline-complete-context.md Part E.1.
 */
export default defineConfig({
  root: __dirname,
  plugins: [react()],
  resolve: {
    alias: {
      "react-native": "react-native-web",
      "@app": path.resolve(__dirname, "../app"),
      "@shared": path.resolve(__dirname, "../shared"),
    },
    extensions: [".web.tsx", ".web.ts", ".tsx", ".ts", ".web.js", ".jsx", ".js"],
  },
  define: {
    global: "window",
  },
});
