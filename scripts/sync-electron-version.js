/**
 * Sync version from version.json to electron/package.json
 * This ensures Electron builds use the same version as mobile apps
 * Run: node scripts/sync-electron-version.js
 */

const fs = require('fs');
const path = require('path');

const VERSION_FILE = path.join(__dirname, '../version.json');
const ELECTRON_PACKAGE = path.join(__dirname, '../electron/package.json');

try {
  // Read version.json
  const versionData = JSON.parse(fs.readFileSync(VERSION_FILE, 'utf8'));
  const version = versionData.version;

  // Use windows versionCode if available, otherwise use android versionCode
  const buildNumber = versionData.windows?.versionCode ?? versionData.android?.versionCode ?? 1;

  console.log(`[Sync] Reading version from version.json: ${version} (build ${buildNumber})`);

  // Read electron/package.json
  const electronPackage = JSON.parse(fs.readFileSync(ELECTRON_PACKAGE, 'utf8'));

  // Update version and buildNumber
  const oldVersion = electronPackage.version;
  const oldBuildNumber = electronPackage.buildNumber;

  electronPackage.version = version;
  electronPackage.buildNumber = buildNumber;

  // Write back
  fs.writeFileSync(ELECTRON_PACKAGE, JSON.stringify(electronPackage, null, 2) + '\n', 'utf8');

  console.log(`[Sync] Updated electron/package.json:`);
  console.log(`       version: ${oldVersion} -> ${version}`);
  console.log(`       buildNumber: ${oldBuildNumber} -> ${buildNumber}`);
  console.log('[Sync] Done!');
} catch (error) {
  console.error('[Sync] Error:', error.message);
  process.exit(1);
}
