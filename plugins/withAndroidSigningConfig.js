const { withAppBuildGradle } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Config plugin to add release signing configuration to Android build.gradle
 *
 * Credentials can be provided via:
 * 1. Environment variables (recommended for CI/CD):
 *    - ANDROID_KEYSTORE_PASSWORD
 *    - ANDROID_KEY_ALIAS
 *    - ANDROID_KEY_PASSWORD
 * 2. Plugin options (for local development - not recommended for production)
 * 3. Без credentials — signing config не добавляется (с предупреждением)
 */

const withAndroidSigningConfig = (config, options = {}) => {
  return withAppBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    // Get credentials from environment or options (NO hardcoded fallbacks)
    const keystorePassword = process.env.ANDROID_KEYSTORE_PASSWORD || options.storePassword;
    const keyAlias = process.env.ANDROID_KEY_ALIAS || options.keyAlias || 'tachyon-release';
    const keyPassword = process.env.ANDROID_KEY_PASSWORD || options.keyPassword;

    if (!keystorePassword || !keyPassword) {
      console.warn('⚠️ [Android] Release signing credentials not provided. '
        + 'Set ANDROID_KEYSTORE_PASSWORD and ANDROID_KEY_PASSWORD env vars for release builds.');
      return config;
    }

    // Check if release signing config already exists in signingConfigs block
    // Look for "signingConfigs" followed by "release" with storeFile
    const hasReleaseSigningConfig = /signingConfigs\s*\{[\s\S]*?release\s*\{[\s\S]*?storeFile/.test(contents);

    if (hasReleaseSigningConfig) {
      console.log('✅ [Android] Release signing config already exists');
      return config;
    }

    // Release signing config to add
    const releaseSigningConfig = `
        release {
            storeFile file('release.keystore')
            storePassword '${keystorePassword}'
            keyAlias '${keyAlias}'
            keyPassword '${keyPassword}'
        }`;

    // Check if signingConfigs block exists
    if (contents.includes('signingConfigs {')) {
      // Add release config inside existing signingConfigs block (after debug config)
      const debugConfigEndRegex = /(signingConfigs\s*\{[\s\S]*?debug\s*\{[\s\S]*?\n\s{8}\})/;
      const match = contents.match(debugConfigEndRegex);

      if (match) {
        contents = contents.replace(
          debugConfigEndRegex,
          `$1${releaseSigningConfig}`
        );
        console.log('✅ [Android] Added release signing config to existing signingConfigs');
      }
    } else {
      // Create entire signingConfigs block
      const signingConfigBlock = `
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }${releaseSigningConfig}
    }`;

      // Insert after defaultConfig block
      const defaultConfigMatch = contents.match(/defaultConfig\s*\{[\s\S]*?\n\s{4}\}/);
      if (defaultConfigMatch) {
        const insertPosition = contents.indexOf(defaultConfigMatch[0]) + defaultConfigMatch[0].length;
        contents = contents.slice(0, insertPosition) + signingConfigBlock + contents.slice(insertPosition);
        console.log('✅ [Android] Added signingConfigs block with release config');
      }
    }

    // Update release buildType to use signingConfigs.release instead of signingConfigs.debug
    if (contents.includes('signingConfig signingConfigs.debug') && contents.includes('buildTypes')) {
      // Find the release buildType and replace its signingConfig
      // Match: release { ... signingConfig signingConfigs.debug ... }
      const releaseBuildTypeRegex = /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/;

      if (releaseBuildTypeRegex.test(contents)) {
        contents = contents.replace(
          releaseBuildTypeRegex,
          '$1signingConfig signingConfigs.release'
        );
        console.log('✅ [Android] Updated release buildType to use release signing');
      }
    }

    config.modResults.contents = contents;
    return config;
  });
};

module.exports = withAndroidSigningConfig;
