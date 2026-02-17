const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Config plugin to copy release.keystore to android/app/
 *
 * The keystore file should be placed in the project root.
 * This plugin copies it to android/app/ during prebuild.
 *
 * For CI/CD, you can set ANDROID_KEYSTORE_BASE64 environment variable
 * with base64-encoded keystore content.
 */

const withAndroidKeystore = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const androidAppPath = path.join(config.modRequest.platformProjectRoot, 'app');
      const destPath = path.join(androidAppPath, 'release.keystore');

      // Ensure android/app directory exists
      if (!fs.existsSync(androidAppPath)) {
        fs.mkdirSync(androidAppPath, { recursive: true });
      }

      // Option 1: Check for base64-encoded keystore from environment (CI/CD)
      const keystoreBase64 = process.env.ANDROID_KEYSTORE_BASE64;
      if (keystoreBase64) {
        try {
          const keystoreBuffer = Buffer.from(keystoreBase64, 'base64');
          fs.writeFileSync(destPath, keystoreBuffer);
          console.log('✅ [Android] Created release.keystore from ANDROID_KEYSTORE_BASE64');
          return config;
        } catch (error) {
          console.error('❌ [Android] Failed to decode ANDROID_KEYSTORE_BASE64:', error.message);
        }
      }

      // Option 2: Copy from project root
      const sourceLocations = [
        path.join(projectRoot, 'release.keystore'),
        path.join(projectRoot, 'android', 'release.keystore'),
        path.join(projectRoot, 'keystores', 'release.keystore'),
      ];

      for (const sourcePath of sourceLocations) {
        if (fs.existsSync(sourcePath)) {
          fs.copyFileSync(sourcePath, destPath);
          console.log(`✅ [Android] Copied release.keystore from ${path.relative(projectRoot, sourcePath)}`);
          return config;
        }
      }

      // Keystore not found
      console.warn('⚠️  [Android] release.keystore not found in any expected location:');
      sourceLocations.forEach((loc) => console.warn(`   - ${path.relative(projectRoot, loc)}`));
      console.warn('   Release builds will use debug signing and fail for production.');
      console.warn('');
      console.warn('   To create a new keystore:');
      console.warn('   keytool -genkeypair -v -storetype PKCS12 -keystore release.keystore \\');
      console.warn('     -alias tachyon-release -keyalg RSA -keysize 2048 -validity 10000');

      return config;
    },
  ]);
};

module.exports = withAndroidKeystore;
