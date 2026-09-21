// Re-applies the Windows-only CMake 4.1.2 pin on every `expo prebuild`, so it
// survives regeneration of the android/ folder.
//
// Why: on Windows the new-architecture codegen object paths (e.g.
// react-native-gesture-handler shadow nodes) exceed 260 chars. AGP's default
// CMake 3.22.1 ships ninja 1.10.2, which fails with
// "ninja: error: Stat(...): Filename longer than 260 characters". CMake 4.1.2
// ships ninja 1.12.1, which supports long paths.
//
// The pin is gated on the build host being Windows: Linux/macOS (including EAS
// Build) have no such limit and don't ship 4.1.2, where pinning it fails with
// "[CXX1300] CMake '4.1.2' was not found in SDK, PATH, or by cmake.dir property".
const { withAppBuildGradle, withProjectBuildGradle } = require('expo/config-plugins');

const MARKER = 'isWindowsHost';

const ROOT_FLAG = `// The CMake 4.1.2 pin below exists purely to work around the Windows 260-char
// path limit (added by plugins/withWindowsCmakePin.js).
ext.isWindowsHost = System.getProperty('os.name').toLowerCase().contains('windows')

`;

// gradle.projectsEvaluated runs AFTER every project's afterEvaluate (including
// the React Native plugin's, which otherwise leaves :app on AGP's default
// CMake). Compatible with --configure-on-demand.
const ROOT_HOOK = `

// Windows only: force CMake 4.1.2 (bundled ninja 1.12.1) for every native module
// (added by plugins/withWindowsCmakePin.js).
if (rootProject.ext.isWindowsHost) {
  gradle.projectsEvaluated {
    rootProject.subprojects.each { project ->
      try {
        def androidExt = project.extensions.findByName('android')
        if (androidExt != null) {
          androidExt.externalNativeBuild.cmake.version = '4.1.2'
          // Allow CMake 4 to configure modules that still declare an old
          // cmake_minimum_required (<3.5), which CMake 4 otherwise rejects.
          androidExt.externalNativeBuild.cmake.arguments '-DCMAKE_POLICY_VERSION_MINIMUM=3.5'
        }
      } catch (Throwable ignored) {}
    }
  }
}
`;

const APP_BLOCK = `    // Windows only: use CMake 4.1.2 (ninja 1.12.1) for the app's codegen native
    // build (added by plugins/withWindowsCmakePin.js).
    if (rootProject.ext.isWindowsHost) {
        externalNativeBuild {
            cmake {
                version '4.1.2'
            }
        }
    }
`;

function withWindowsCmakePin(config) {
  config = withProjectBuildGradle(config, (cfg) => {
    let src = cfg.modResults.contents;
    if (src.includes(MARKER)) return cfg;
    const anchor = 'apply plugin: "expo-root-project"';
    if (!src.includes(anchor)) {
      throw new Error(`withWindowsCmakePin: '${anchor}' not found in android/build.gradle`);
    }
    src = src.replace(anchor, ROOT_FLAG + anchor);
    cfg.modResults.contents = src.trimEnd() + ROOT_HOOK;
    return cfg;
  });

  config = withAppBuildGradle(config, (cfg) => {
    const src = cfg.modResults.contents;
    if (src.includes(MARKER)) return cfg;
    const anchor = /^(\s*namespace\s+['"][^'"]+['"]\s*\r?\n)/m;
    if (!anchor.test(src)) {
      throw new Error('withWindowsCmakePin: namespace line not found in android/app/build.gradle');
    }
    cfg.modResults.contents = src.replace(anchor, `$1${APP_BLOCK}`);
    return cfg;
  });

  return config;
}

module.exports = withWindowsCmakePin;
