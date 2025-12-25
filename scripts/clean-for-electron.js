const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const nodeModulesPath = path.join(projectRoot, 'node_modules');
const packageLockPath = path.join(projectRoot, 'package-lock.json');

// Patterns to remove from node_modules
const modulesToRemove = [
  'lightningcss',
  'lightningcss-win32-x64-msvc',
  'lightningcss-darwin-x64',
  'lightningcss-darwin-arm64',
  'lightningcss-linux-x64-gnu',
  'lightningcss-linux-arm64-gnu',
  'lightningcss-linux-arm64-musl',
  'lightningcss-linux-x64-musl',
  'lightningcss-linux-arm-gnueabihf',
  'lightningcss-freebsd-x64',
  'lightningcss-android-arm64',
  'lightningcss-win32-arm64-msvc',
  'sharp',
  '@img',
];

console.log('[clean-for-electron] Cleaning for Electron build...');

// Step 1: Remove modules from node_modules
let removedModules = 0;
for (const moduleName of modulesToRemove) {
  const modulePath = path.join(nodeModulesPath, moduleName);
  if (fs.existsSync(modulePath)) {
    try {
      fs.rmSync(modulePath, { recursive: true, force: true });
      console.log(`  Removed module: ${moduleName}`);
      removedModules++;
    } catch (err) {
      console.warn(`  Failed to remove ${moduleName}: ${err.message}`);
    }
  }
}

// Also check for sharp-* variants
try {
  const entries = fs.readdirSync(nodeModulesPath);
  for (const entry of entries) {
    if (entry.startsWith('sharp-') || entry.startsWith('lightningcss-')) {
      const fullPath = path.join(nodeModulesPath, entry);
      try {
        fs.rmSync(fullPath, { recursive: true, force: true });
        console.log(`  Removed module: ${entry}`);
        removedModules++;
      } catch (err) {
        console.warn(`  Failed to remove ${entry}: ${err.message}`);
      }
    }
  }
} catch (err) {
  // Ignore
}

console.log(`  Total modules removed: ${removedModules}`);

// Step 2: Clean package-lock.json to remove references to these packages
if (fs.existsSync(packageLockPath)) {
  console.log('[clean-for-electron] Cleaning package-lock.json...');

  try {
    const lockContent = fs.readFileSync(packageLockPath, 'utf8');
    const lockJson = JSON.parse(lockContent);

    let cleanedCount = 0;

    // Clean packages section (npm v2/v3 lockfile format)
    if (lockJson.packages) {
      const keysToDelete = [];
      for (const key of Object.keys(lockJson.packages)) {
        const shouldDelete = modulesToRemove.some(mod =>
          key === `node_modules/${mod}` ||
          key.startsWith(`node_modules/${mod}/`) ||
          key.includes(`/node_modules/${mod}`) ||
          (mod === 'lightningcss' && key.includes('lightningcss')) ||
          (mod === 'sharp' && key.includes('/sharp'))
        );
        if (shouldDelete) {
          keysToDelete.push(key);
        }
      }

      for (const key of keysToDelete) {
        delete lockJson.packages[key];
        cleanedCount++;
      }

      // Also clean optionalDependencies references in other packages
      for (const [pkgKey, pkgData] of Object.entries(lockJson.packages)) {
        if (pkgData && pkgData.optionalDependencies) {
          for (const mod of modulesToRemove) {
            if (pkgData.optionalDependencies[mod]) {
              delete pkgData.optionalDependencies[mod];
            }
            // Also delete lightningcss-* variants
            for (const depKey of Object.keys(pkgData.optionalDependencies)) {
              if (depKey.startsWith('lightningcss-') || depKey.startsWith('sharp-')) {
                delete pkgData.optionalDependencies[depKey];
              }
            }
          }
        }
      }
    }

    // Clean dependencies section (npm v1 lockfile format)
    if (lockJson.dependencies) {
      for (const mod of modulesToRemove) {
        if (lockJson.dependencies[mod]) {
          delete lockJson.dependencies[mod];
          cleanedCount++;
        }
      }
    }

    // Write cleaned lock file
    fs.writeFileSync(packageLockPath, JSON.stringify(lockJson, null, 2));
    console.log(`  Cleaned ${cleanedCount} entries from package-lock.json`);

  } catch (err) {
    console.warn(`  Failed to clean package-lock.json: ${err.message}`);
  }
}

console.log('[clean-for-electron] Done!');
