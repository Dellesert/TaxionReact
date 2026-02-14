const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');
const plist = require('@expo/plist').default;

const TEAM_ID = 'QNVQ55232N';

/**
 * Config plugin to generate ExportOptions plist files for xcodebuild.
 * Creates both development and app-store-connect export options
 * in ios/build/ directory during prebuild.
 */
const withExportOptions = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const iosPath = config.modRequest.platformProjectRoot;
      const buildDir = path.join(iosPath, 'build');

      if (!fs.existsSync(buildDir)) {
        fs.mkdirSync(buildDir, { recursive: true });
      }

      // Development export options
      const devOptions = {
        method: 'development',
        teamID: TEAM_ID,
        signingStyle: 'automatic',
        compileBitcode: false,
      };
      fs.writeFileSync(
        path.join(buildDir, 'ExportOptions.plist'),
        plist.build(devOptions)
      );

      // App Store export options
      const appStoreOptions = {
        method: 'app-store-connect',
        teamID: TEAM_ID,
        signingStyle: 'automatic',
        uploadSymbols: true,
      };
      fs.writeFileSync(
        path.join(buildDir, 'ExportOptions-AppStore.plist'),
        plist.build(appStoreOptions)
      );

      console.log('✅ Generated ExportOptions.plist and ExportOptions-AppStore.plist');

      return config;
    },
  ]);
};

module.exports = withExportOptions;
