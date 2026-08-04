module.exports = {
  presets: ["@react-native/babel-preset"],
  plugins: [
    // WatermelonDB's Model classes use decorator syntax (@field, @date, etc).
    ["@babel/plugin-proposal-decorators", { legacy: true }],
    ["@babel/plugin-transform-class-properties", { loose: true }],
  ],
};
