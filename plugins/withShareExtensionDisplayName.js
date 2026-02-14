const { withXcodeProject } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');
const plist = require('@expo/plist').default;

/**
 * Config plugin to set a custom display name for the iOS Share Extension.
 * This is needed because expo-share-intent strips non-ASCII characters
 * from iosShareExtensionName for the Xcode target name, which breaks
 * Cyrillic names entirely.
 *
 * IMPORTANT: This plugin must be registered BEFORE expo-share-intent
 * in the plugins array. Expo mods execute in LIFO order, so a plugin
 * registered earlier runs its action AFTER one registered later.
 * This ensures expo-share-intent creates the files first, then
 * this plugin modifies CFBundleDisplayName.
 */
const withShareExtensionDisplayName = (config, { displayName }) => {
  return withXcodeProject(config, async (config) => {
    const iosPath = config.modRequest.platformProjectRoot;
    const infoPlistPath = path.join(iosPath, 'ShareExtension', 'ShareExtension-Info.plist');

    if (!fs.existsSync(infoPlistPath)) {
      console.warn('⚠️  ShareExtension-Info.plist not found, skipping display name override');
      return config;
    }

    const contents = fs.readFileSync(infoPlistPath, 'utf-8');
    const parsed = plist.parse(contents);
    parsed.CFBundleDisplayName = displayName;
    fs.writeFileSync(infoPlistPath, plist.build(parsed));
    console.log(`✅ Share Extension display name set to: ${displayName}`);

    return config;
  });
};

module.exports = withShareExtensionDisplayName;
