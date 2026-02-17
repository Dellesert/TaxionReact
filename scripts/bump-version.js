#!/usr/bin/env node

/**
 * Version Bump Script
 *
 * Updates version.json with new version/build numbers
 *
 * Usage:
 *   node scripts/bump-version.js              # Bump both iOS and Android build numbers
 *   node scripts/bump-version.js --ios        # Bump iOS build number only
 *   node scripts/bump-version.js --android    # Bump Android version code only
 *   node scripts/bump-version.js --version 1.0.2  # Set new version number
 *   node scripts/bump-version.js --minor      # Bump minor version (1.0.1 -> 1.1.0)
 *   node scripts/bump-version.js --major      # Bump major version (1.0.1 -> 2.0.0)
 *   node scripts/bump-version.js --patch      # Bump patch version (1.0.1 -> 1.0.2)
 */

const fs = require('fs');
const path = require('path');

const versionFilePath = path.join(__dirname, '..', 'version.json');

function readVersion() {
  const content = fs.readFileSync(versionFilePath, 'utf8');
  return JSON.parse(content);
}

function writeVersion(config) {
  fs.writeFileSync(versionFilePath, JSON.stringify(config, null, 2) + '\n');
}

function bumpSemver(version, type) {
  const parts = version.split('.').map(Number);

  switch (type) {
    case 'major':
      parts[0]++;
      parts[1] = 0;
      parts[2] = 0;
      break;
    case 'minor':
      parts[1]++;
      parts[2] = 0;
      break;
    case 'patch':
      parts[2]++;
      break;
  }

  return parts.join('.');
}

function main() {
  const args = process.argv.slice(2);
  const config = readVersion();

  const originalConfig = JSON.stringify(config);

  let bumpIos = false;
  let bumpAndroid = false;
  let setVersion = null;
  let semverBump = null;

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--ios') {
      bumpIos = true;
    } else if (arg === '--android') {
      bumpAndroid = true;
    } else if (arg === '--version' && args[i + 1]) {
      setVersion = args[++i];
    } else if (arg === '--major') {
      semverBump = 'major';
    } else if (arg === '--minor') {
      semverBump = 'minor';
    } else if (arg === '--patch') {
      semverBump = 'patch';
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Version Bump Script

Usage:
  node scripts/bump-version.js              # Bump both iOS and Android build numbers
  node scripts/bump-version.js --ios        # Bump iOS build number only
  node scripts/bump-version.js --android    # Bump Android version code only
  node scripts/bump-version.js --version 1.0.2  # Set new version number
  node scripts/bump-version.js --minor      # Bump minor version (1.0.1 -> 1.1.0)
  node scripts/bump-version.js --major      # Bump major version (1.0.1 -> 2.0.0)
  node scripts/bump-version.js --patch      # Bump patch version (1.0.1 -> 1.0.2)

Current version: ${config.version}
iOS buildNumber: ${config.ios.buildNumber}
Android versionCode: ${config.android.versionCode}
`);
      process.exit(0);
    }
  }

  // Default: bump both if no platform specified
  if (!bumpIos && !bumpAndroid && !setVersion && !semverBump) {
    bumpIos = true;
    bumpAndroid = true;
  }

  // Apply version changes
  if (setVersion) {
    config.version = setVersion;
    console.log(`✅ Version set to: ${setVersion}`);
  }

  if (semverBump) {
    const oldVersion = config.version;
    config.version = bumpSemver(oldVersion, semverBump);
    console.log(`✅ Version bumped: ${oldVersion} -> ${config.version}`);
  }

  if (bumpIos) {
    const oldBuild = config.ios.buildNumber;
    config.ios.buildNumber = String(parseInt(oldBuild, 10) + 1);
    console.log(`✅ iOS buildNumber: ${oldBuild} -> ${config.ios.buildNumber}`);
  }

  if (bumpAndroid) {
    const oldCode = config.android.versionCode;
    config.android.versionCode = oldCode + 1;
    console.log(`✅ Android versionCode: ${oldCode} -> ${config.android.versionCode}`);
  }

  // Save if changed
  if (JSON.stringify(config) !== originalConfig) {
    writeVersion(config);
    console.log(`\n📦 version.json updated!`);
    console.log(`   Version: ${config.version}`);
    console.log(`   iOS build: ${config.ios.buildNumber}`);
    console.log(`   Android code: ${config.android.versionCode}`);
  } else {
    console.log('No changes made.');
  }
}

main();
