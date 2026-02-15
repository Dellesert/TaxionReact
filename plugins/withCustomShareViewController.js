const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withCustomShareViewController = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const iosPath = config.modRequest.platformProjectRoot;
      const targetFile = path.join(iosPath, 'ShareExtension', 'ShareViewController.swift');
      const templateFile = path.join(
        config.modRequest.projectRoot,
        'templates',
        'ShareViewController.swift'
      );

      if (!fs.existsSync(templateFile)) {
        console.warn('[withCustomShareViewController] Template not found at:', templateFile);
        return config;
      }

      const targetDir = path.dirname(targetFile);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      let content = fs.readFileSync(templateFile, 'utf-8');

      const scheme = Array.isArray(config.scheme) ? config.scheme[0] : config.scheme || 'tachyon';
      const bundleId = config.ios?.bundleIdentifier || 'com.dellesert.tachyon-messenger';
      const appGroup = `group.${bundleId}`;

      content = content
        .replace(/<SCHEME>/g, scheme)
        .replace(/<GROUPIDENTIFIER>/g, appGroup);

      fs.writeFileSync(targetFile, content);
      console.log('[withCustomShareViewController] Custom ShareViewController.swift applied');

      return config;
    },
  ]);
};

module.exports = withCustomShareViewController;
