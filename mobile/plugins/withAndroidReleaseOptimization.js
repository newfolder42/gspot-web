// Turns on R8 (code shrinking + obfuscation) and resource shrinking for
// Android release builds, re-applied on every `expo prebuild` so it survives
// regeneration of the android/ folder. Play Console flags the app's DEX code
// optimization as "Low" without it.
const { withGradleProperties } = require('expo/config-plugins');

const PROPS = {
  'android.enableMinifyInReleaseBuilds': 'true',
  'android.enableShrinkResourcesInReleaseBuilds': 'true',
};

function withAndroidReleaseOptimization(config) {
  return withGradleProperties(config, (cfg) => {
    const props = cfg.modResults;
    for (const [key, value] of Object.entries(PROPS)) {
      const existing = props.find((p) => p.type === 'property' && p.key === key);
      if (existing) {
        existing.value = value;
      } else {
        props.push({ type: 'property', key, value });
      }
    }
    return cfg;
  });
}

module.exports = withAndroidReleaseOptimization;
