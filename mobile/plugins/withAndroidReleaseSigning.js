// Signs local Android release builds with the Play upload key, re-applied on
// every `expo prebuild` so it survives regeneration of the android/ folder.
// The keystore path and passwords come from Gradle properties (put them in
// ~/.gradle/gradle.properties, never in the repo):
//   GSPOT_UPLOAD_STORE_FILE, GSPOT_UPLOAD_STORE_PASSWORD,
//   GSPOT_UPLOAD_KEY_ALIAS, GSPOT_UPLOAD_KEY_PASSWORD
// Without them the release build falls back to the debug keystore, so EAS
// (which injects its own signing) and machines without the key keep working.
const { withAppBuildGradle } = require('expo/config-plugins');

const MARKER = '// gspot-release-signing';

const SIGNING_CONFIG = `        release { ${MARKER}
            if (findProperty('GSPOT_UPLOAD_STORE_FILE')) {
                storeFile file(findProperty('GSPOT_UPLOAD_STORE_FILE'))
                storePassword findProperty('GSPOT_UPLOAD_STORE_PASSWORD')
                keyAlias findProperty('GSPOT_UPLOAD_KEY_ALIAS')
                keyPassword findProperty('GSPOT_UPLOAD_KEY_PASSWORD')
            }
        }
`;

function withAndroidReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let gradle = cfg.modResults.contents;
    if (gradle.includes(MARKER)) return cfg;

    gradle = gradle.replace(
      /(signingConfigs\s*\{\s*\n)/,
      `$1${SIGNING_CONFIG}`
    );
    gradle = gradle.replace(
      /(release\s*\{[^}]*?)signingConfig signingConfigs\.debug/,
      "$1signingConfig findProperty('GSPOT_UPLOAD_STORE_FILE') ? signingConfigs.release : signingConfigs.debug"
    );

    if (!gradle.includes(MARKER) || !gradle.includes('signingConfigs.release')) {
      throw new Error('withAndroidReleaseSigning: could not patch android/app/build.gradle');
    }
    cfg.modResults.contents = gradle;
    return cfg;
  });
}

module.exports = withAndroidReleaseSigning;
