const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Config plugin to fix Firebase CocoaPods integration issues
 * Adds use_modular_headers! globally to support Firebase static linking
 */
const withFirebasePodfileModifications = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');

      if (fs.existsSync(podfilePath)) {
        let contents = fs.readFileSync(podfilePath, 'utf-8');

        // Check if already modified
        if (contents.includes('# Firebase modular headers')) {
          console.log('ℹ️  Firebase Podfile modifications already applied');
          return config;
        }

        // Add use_modular_headers! right after platform :ios line
        const platformPattern = /(platform :ios, podfile_properties\['ios\.deploymentTarget'\] \|\| '[^']+'\n)/;

        if (platformPattern.test(contents)) {
          contents = contents.replace(
            platformPattern,
            `$1
  # Firebase modular headers
  use_modular_headers!
`
          );

          fs.writeFileSync(podfilePath, contents);
          console.log('✅ Added use_modular_headers! to Podfile for Firebase support');
        } else {
          console.warn('⚠️  Could not find platform declaration in Podfile');
        }
      } else {
        console.log('ℹ️  Podfile does not exist yet (will be created during prebuild)');
      }

      return config;
    },
  ]);
};

module.exports = withFirebasePodfileModifications;
