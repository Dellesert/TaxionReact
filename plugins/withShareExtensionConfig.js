const { withXcodeProject } = require('@expo/config-plugins');

const TEAM_ID = 'QNVQ55232N';

/**
 * Config plugin to configure ShareExtension target:
 * - Sets DEVELOPMENT_TEAM (required for automatic provisioning)
 * - Syncs CURRENT_PROJECT_VERSION with the main app's buildNumber
 */
const withShareExtensionConfig = (config) => {
  return withXcodeProject(config, (config) => {
    const project = config.modResults;
    const buildNumber = config.ios?.buildNumber || '1';

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
        }

        console.log(`✅ ShareExtension: DEVELOPMENT_TEAM=${TEAM_ID}, CURRENT_PROJECT_VERSION=${buildNumber}`);
        break;
      }
    }

    return config;
  });
};

module.exports = withShareExtensionConfig;
