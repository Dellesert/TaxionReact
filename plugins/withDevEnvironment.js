const { withDangerousMod, withInfoPlist } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Config plugin to switch between dev and production environments
 *
 * iOS:
 * - Changes Bundle ID for dev builds
 * - Copies appropriate GoogleService-Info.plist
 * - Uses dev icon for dev builds
 *
 * Android:
 * - Changes package name for dev builds
 * - Copies google-services.json to android/app/
 * - Uses dev icon for dev builds
 */

const isDev = process.env.APP_ENV !== 'production';

const withDevIcon = (config) => {
  if (isDev) {
    // Use dev icon for dev builds
    const devIconPath = './assets/images/icon-dev.png';
    config.icon = devIconPath;
    if (config.ios) {
      config.ios.icon = devIconPath;
    }
    console.log(`✅ [Dev] Icon changed to: ${devIconPath}`);
  }
  return config;
};

const withDevBundleId = (config) => {
  if (isDev) {
    // iOS Bundle ID
    if (config.ios) {
      const originalBundleId = config.ios.bundleIdentifier;
      config.ios.bundleIdentifier = `${originalBundleId}.dev`;
      console.log(`✅ [Dev] iOS Bundle ID changed to: ${config.ios.bundleIdentifier}`);
    }
    // Android Package Name
    if (config.android) {
      const originalPackage = config.android.package;
      config.android.package = `${originalPackage}.dev`;
      console.log(`✅ [Dev] Android Package changed to: ${config.android.package}`);
    }
  }
  return config;
};

const withDevGoogleServicesIOS = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const iosPath = config.modRequest.platformProjectRoot;

      // Determine which GoogleService-Info.plist to use
      const sourceFile = isDev
        ? 'GoogleService-Info-Dev.plist'
        : 'GoogleService-Info.plist';

      const sourcePath = path.join(projectRoot, sourceFile);
      const destPath = path.join(iosPath, config.modRequest.projectName, 'GoogleService-Info.plist');

      if (fs.existsSync(sourcePath)) {
        // Ensure destination directory exists
        const destDir = path.dirname(destPath);
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }

        fs.copyFileSync(sourcePath, destPath);
        console.log(`✅ [${isDev ? 'Dev' : 'Prod'}] Copied ${sourceFile} to iOS project`);
      } else {
        console.warn(`⚠️  ${sourceFile} not found at ${sourcePath}`);
      }

      return config;
    },
  ]);
};

const withDevGoogleServicesAndroid = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const androidPath = config.modRequest.platformProjectRoot;

      // For Android, we use google-services.json (same file for dev/prod, different Firebase projects handled by package name)
      // But we can support separate files if needed: google-services-dev.json
      const sourceFile = isDev && fs.existsSync(path.join(projectRoot, 'google-services-dev.json'))
        ? 'google-services-dev.json'
        : 'google-services.json';

      const sourcePath = path.join(projectRoot, sourceFile);
      const destPath = path.join(androidPath, 'app', 'google-services.json');

      if (fs.existsSync(sourcePath)) {
        // Ensure destination directory exists
        const destDir = path.dirname(destPath);
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }

        fs.copyFileSync(sourcePath, destPath);
        console.log(`✅ [${isDev ? 'Dev' : 'Prod'}] Copied ${sourceFile} to Android project`);
      } else {
        console.warn(`⚠️  ${sourceFile} not found at ${sourcePath}`);
      }

      return config;
    },
  ]);
};

const withDevAppName = (config) => {
  if (isDev) {
    // Add "Dev" suffix to app name for dev builds
    config.name = `${config.name} Dev`;
    console.log(`✅ [Dev] App name changed to: ${config.name}`);
  }
  return config;
};

const withDevScheme = (config) => {
  if (isDev) {
    // Use different URL scheme for dev builds to avoid conflict with production app
    const originalScheme = config.scheme;
    config.scheme = `${originalScheme}-dev`;
    console.log(`✅ [Dev] URL scheme changed to: ${config.scheme}`);
  }
  return config;
};

const withDevEnvironment = (config) => {
  console.log(`\n🔧 Building for environment: ${isDev ? 'DEVELOPMENT' : 'PRODUCTION'}\n`);

  config = withDevAppName(config);
  config = withDevIcon(config);
  config = withDevBundleId(config);
  config = withDevScheme(config);
  config = withDevGoogleServicesIOS(config);
  config = withDevGoogleServicesAndroid(config);

  return config;
};

module.exports = withDevEnvironment;
