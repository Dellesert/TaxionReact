#!/usr/bin/env node
/**
 * Patch zustand package.json to remove ESM exports
 * This prevents Metro bundler web from trying to use import.meta
 *
 * Native platforms (iOS/Android) use MMKV for storage
 * Web platform uses AsyncStorage (this patch ensures web compatibility)
 */

const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, '../node_modules/zustand/package.json');

try {
  if (!fs.existsSync(packageJsonPath)) {
    console.log('⏭️  zustand not installed yet, skipping patch');
    process.exit(0);
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  // Remove "import" field from exports to force CommonJS on web
  if (packageJson.exports) {
    let hasChanges = false;

    // Main export
    if (packageJson.exports['.'] && packageJson.exports['.'].import) {
      delete packageJson.exports['.'].import;
      hasChanges = true;
    }

    // Wildcard exports
    if (packageJson.exports['./*'] && packageJson.exports['./*'].import) {
      delete packageJson.exports['./*'].import;
      hasChanges = true;
    }

    if (hasChanges) {
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
      console.log('✅ Successfully patched zustand package.json to use CommonJS only');
      console.log('   Native platforms: MMKV (fast, synchronous)');
      console.log('   Web platform: AsyncStorage (browser compatible)');
    } else {
      console.log('✅ zustand already patched');
    }
  } else {
    console.log('⚠️  zustand package.json has no exports field');
  }
} catch (error) {
  console.error('❌ Failed to patch zustand:', error.message);
  // Don't fail the installation
  process.exit(0);
}
