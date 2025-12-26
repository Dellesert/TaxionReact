/**
 * Auto-increment build number before each build
 * Run: node scripts/increment-build.js
 */

const fs = require('fs');
const path = require('path');

const CONSTANTS_FILE = path.join(__dirname, '../src/features/profile/utils/aboutConstants.ts');

try {
  let content = fs.readFileSync(CONSTANTS_FILE, 'utf8');

  // Find current build number
  const buildMatch = content.match(/APP_BUILD\s*=\s*['"](\d+)['"]/);

  if (buildMatch) {
    const currentBuild = parseInt(buildMatch[1], 10);
    const newBuild = currentBuild + 1;

    // Replace build number
    content = content.replace(
      /APP_BUILD\s*=\s*['"](\d+)['"]/,
      `APP_BUILD = '${newBuild}'`
    );

    fs.writeFileSync(CONSTANTS_FILE, content, 'utf8');
    console.log(`[Build] Incremented build number: ${currentBuild} -> ${newBuild}`);
  } else {
    console.error('[Build] Could not find APP_BUILD in constants file');
    process.exit(1);
  }
} catch (error) {
  console.error('[Build] Error:', error.message);
  process.exit(1);
}
