const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Add modular_headers for specific Firebase pods only
 */
const withPodfileModifications = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');

      if (fs.existsSync(podfilePath)) {
        let contents = fs.readFileSync(podfilePath, 'utf-8');

        // Add post_install hook to set modular_headers for Firebase pods
        if (!contents.includes('Firebase pods modular headers')) {
          const postInstallHook = `
  post_install do |installer|
    # Firebase pods modular headers
    installer.pods_project.targets.each do |target|
      if target.name.include?('Firebase') || target.name.include?('Google')
        target.build_configurations.each do |config|
          config.build_settings['DEFINES_MODULE'] = 'YES'
        end
      end
    end

    react_native_post_install(
      installer,
      config[:reactNativePath],
      :mac_catalyst_enabled => false,
      :ccache_enabled => ccache_enabled?(podfile_properties),
    )
  end`;

          // Replace existing post_install
          contents = contents.replace(
            /post_install do \|installer\|[\s\S]*?end\nend/,
            postInstallHook + '\nend'
          );

          fs.writeFileSync(podfilePath, contents);
          console.log('✅ Added Firebase modular headers to post_install');
        }
      }

      return config;
    },
  ]);
};

module.exports = withPodfileModifications;
