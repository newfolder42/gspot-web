// Re-applies the Android ABI list on every `expo prebuild`, so it survives
// regeneration of the android/ folder (Expo's template ships
// armeabi-v7a,arm64-v8a,x86,x86_64; we only ship ARM builds).
const { withGradleProperties } = require('expo/config-plugins');

const KEY = 'reactNativeArchitectures';
const DEFAULT_ARCHS = ['armeabi-v7a', 'arm64-v8a'];

function withAndroidArchitectures(config, archs = DEFAULT_ARCHS) {
  return withGradleProperties(config, (cfg) => {
    const value = archs.join(',');
    const props = cfg.modResults;
    const existing = props.find((p) => p.type === 'property' && p.key === KEY);
    if (existing) {
      existing.value = value;
    } else {
      props.push({ type: 'property', key: KEY, value });
    }
    return cfg;
  });
}

module.exports = withAndroidArchitectures;
