const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Add use_modular_headers! to Podfile for Firebase compatibility
 */
const withPodfileModifications = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');

      if (fs.existsSync(podfilePath)) {
        let contents = fs.readFileSync(podfilePath, 'utf-8');

        // Add use_modular_headers! if not already present
        if (!contents.includes('use_modular_headers!')) {
          // Add after "target 'AppName' do" line
          contents = contents.replace(
            /(target .+ do\n)/,
            '$1  use_modular_headers!\n'
          );

          fs.writeFileSync(podfilePath, contents);
          console.log('✅ Added use_modular_headers! to Podfile');
        }
      }

      return config;
    },
  ]);
};

module.exports = withPodfileModifications;
