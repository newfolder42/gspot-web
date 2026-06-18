module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
    ],
    // react-native-worklets/plugin (Reanimated 4) is added automatically by
    // babel-preset-expo when react-native-worklets is installed.
  };
};
