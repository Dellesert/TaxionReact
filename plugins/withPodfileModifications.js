const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Config plugin to fix Firebase CocoaPods integration issues
 * Adds modular headers for GoogleUtilities and Firebase pods
 */
const withFirebasePodfileModifications = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');

      if (fs.existsSync(podfilePath)) {
        let contents = fs.readFileSync(podfilePath, 'utf-8');

        // Check if already modified
        if (contents.includes('# Firebase modular headers fix')) {
          console.log('ℹ️  Firebase Podfile modifications already applied');
          return config;
        }

        // Find the post_install hook and modify it to add DEFINES_MODULE
        const postInstallPattern = /post_install do \|installer\|/;

        if (postInstallPattern.test(contents)) {
          const firebaseFixCode = `post_install do |installer|
  # Firebase modular headers fix
  installer.pods_project.targets.each do |target|
    if ['GoogleUtilities', 'FirebaseCore', 'FirebaseCoreInternal'].include?(target.name)
      target.build_configurations.each do |config|
        config.build_settings['DEFINES_MODULE'] = 'YES'
      end
    end
  end

  `;

          contents = contents.replace(
            postInstallPattern,
            firebaseFixCode
          );

          fs.writeFileSync(podfilePath, contents);
          console.log('✅ Applied Firebase modular headers fix in post_install');
        } else {
          console.warn('⚠️  Could not find post_install hook in Podfile');
        }
      } else {
        console.log('ℹ️  Podfile does not exist yet (will be created during prebuild)');
      }

      return config;
    },
  ]);
};

module.exports = withFirebasePodfileModifications;
