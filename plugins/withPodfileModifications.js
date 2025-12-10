const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Add use_modular_headers! for GoogleUtilities to fix Firebase static library integration
 */
const withPodfileModifications = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');

      if (fs.existsSync(podfilePath)) {
        let contents = fs.readFileSync(podfilePath, 'utf-8');

        // Add modular headers configuration after 'require File.join(File.dirname(`node --print "require.resolve('expo/package.json')"`), "scripts/autolinking")'
        const modularHeadersConfig = `
  # Enable modular headers for GoogleUtilities to support Firebase static linking
  pod 'GoogleUtilities', :modular_headers => true
`;

        // Insert after the require statements but before use_expo_modules!
        if (!contents.includes("pod 'GoogleUtilities', :modular_headers => true")) {
          // Find the position after require statements
          const requirePattern = /require File\.join\(File\.dirname\(`node --print "require\.resolve\('expo\/package\.json'\)"`\), "scripts\/autolinking"\)/;

          if (requirePattern.test(contents)) {
            contents = contents.replace(
              requirePattern,
              `$&${modularHeadersConfig}`
            );

            fs.writeFileSync(podfilePath, contents);
            console.log('✅ Added GoogleUtilities modular headers configuration');
          } else {
            console.warn('⚠️  Could not find autolinking require statement in Podfile');
          }
        } else {
          console.log('ℹ️  GoogleUtilities modular headers already configured');
        }
      }

      return config;
    },
  ]);
};

module.exports = withPodfileModifications;
