module.exports = {
  presets: ["@react-native/babel-preset"],
  plugins: [
    // WatermelonDB's Model classes use decorator syntax (@field, @date, etc).
    ["@babel/plugin-proposal-decorators", { legacy: true }],
    ["@babel/plugin-transform-class-properties", { loose: true }],
    // shared/api/index.ts uses `export * as x from "./y"` (e.g. `authApi`) —
    // Metro's Babel preset doesn't include this transform by default, unlike
    // Vite/tsc which handle it natively.
    "@babel/plugin-transform-export-namespace-from",
  ],
};
