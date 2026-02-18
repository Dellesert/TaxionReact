/**
 * Sync version from version.json to ios/<ProjectName>/Info.plist
 * This ensures iOS builds use the same version as other platforms
 * Dynamically finds Info.plist regardless of project folder name (Tahion, Dev, etc.)
 * Run: node scripts/sync-ios-version.js
 */

const fs = require('fs');
const path = require('path');

const VERSION_FILE = path.join(__dirname, '../version.json');
const IOS_DIR = path.join(__dirname, '../ios');

function findInfoPlist() {
  const entries = fs.readdirSync(IOS_DIR, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    // Skip known non-project directories
    if (['Pods', 'build', 'ShareExtension'].includes(entry.name)) continue;
    if (entry.name.endsWith('.xcodeproj') || entry.name.endsWith('.xcworkspace')) continue;

    const plistPath = path.join(IOS_DIR, entry.name, 'Info.plist');
    if (fs.existsSync(plistPath)) {
      return { plistPath, projectName: entry.name };
    }
  }
  return null;
}

try {
  // Read version.json
  const versionData = JSON.parse(fs.readFileSync(VERSION_FILE, 'utf8'));
  const version = versionData.version;
  const buildNumber = versionData.ios.buildNumber;

  console.log(`[Sync iOS] Reading version from version.json: ${version} (build ${buildNumber})`);

  // Find Info.plist
  const result = findInfoPlist();
  if (!result) {
    console.error('[Sync iOS] Error: Could not find Info.plist in ios/ directory');
    process.exit(1);
  }

  const { plistPath, projectName } = result;

  // Read Info.plist
  let plist = fs.readFileSync(plistPath, 'utf8');

  // Update CFBundleShortVersionString
  const versionRegex = /(<key>CFBundleShortVersionString<\/key>\s*<string>)(.*?)(<\/string>)/;
  const oldVersion = plist.match(versionRegex)?.[2];
  plist = plist.replace(versionRegex, `$1${version}$3`);

  // Update CFBundleVersion (build number)
  const buildRegex = /(<key>CFBundleVersion<\/key>\s*<string>)(.*?)(<\/string>)/;
  const oldBuild = plist.match(buildRegex)?.[2];
  plist = plist.replace(buildRegex, `$1${buildNumber}$3`);

  // Write back
  fs.writeFileSync(plistPath, plist, 'utf8');

  console.log(`[Sync iOS] Updated ios/${projectName}/Info.plist:`);
  console.log(`           version: ${oldVersion} -> ${version}`);
  console.log(`           buildNumber: ${oldBuild} -> ${buildNumber}`);
  console.log('[Sync iOS] Done!');
} catch (error) {
  console.error('[Sync iOS] Error:', error.message);
  process.exit(1);
}
