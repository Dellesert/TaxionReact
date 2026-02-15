const { withXcodeProject } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');
const plist = require('@expo/plist');

const TEAM_ID = 'QNVQ55232N';

/**
 * Config plugin to configure ShareExtension target:
 * - Sets DEVELOPMENT_TEAM (required for automatic provisioning)
 * - Syncs CURRENT_PROJECT_VERSION and MARKETING_VERSION with the main app
 * - Adds CFBundleShortVersionString and CFBundleVersion to ShareExtension-Info.plist
 *
 * IMPORTANT: This plugin must be listed BEFORE expo-share-intent in app.json.
 * Expo mods execute in LIFO order, so a plugin registered earlier runs AFTER
 * one registered later. This ensures expo-share-intent creates the target
 * and files first, then this plugin modifies them.
 */
const withShareExtensionConfig = (config) => {
  return withXcodeProject(config, (config) => {
    const project = config.modResults;
    const buildNumber = config.ios?.buildNumber || '1';
    const version = config.version || '1.0.0';

    // 1. Set build settings in xcodeproj
    const targets = project.pbxNativeTargetSection();
    for (const key in targets) {
      const target = targets[key];
      if (target.name === 'ShareExtension') {
        const configList = project.pbxXCConfigurationList()[target.buildConfigurationList];
        if (!configList) continue;

        for (const configRef of configList.buildConfigurations) {
          const buildConfig = project.pbxXCBuildConfigurationSection()[configRef.value];
          if (!buildConfig || !buildConfig.buildSettings) continue;

          buildConfig.buildSettings.DEVELOPMENT_TEAM = TEAM_ID;
          buildConfig.buildSettings.CURRENT_PROJECT_VERSION = buildNumber;
          buildConfig.buildSettings.MARKETING_VERSION = version;
        }

        console.log(`✅ ShareExtension: DEVELOPMENT_TEAM=${TEAM_ID}, CURRENT_PROJECT_VERSION=${buildNumber}, MARKETING_VERSION=${version}`);
        break;
      }
    }

    // 2. Add version keys to ShareExtension-Info.plist
    const infoPlistPath = path.join(config.modRequest.platformProjectRoot, 'ShareExtension', 'ShareExtension-Info.plist');
    if (fs.existsSync(infoPlistPath)) {
      const content = fs.readFileSync(infoPlistPath, 'utf8');
      const parsed = plist.default.parse(content);
      parsed.CFBundleShortVersionString = '$(MARKETING_VERSION)';
      parsed.CFBundleVersion = '$(CURRENT_PROJECT_VERSION)';
      fs.writeFileSync(infoPlistPath, plist.default.build(parsed));
      console.log('✅ ShareExtension-Info.plist: added CFBundleShortVersionString and CFBundleVersion');
    }

    return config;
  });
};

module.exports = withShareExtensionConfig;
