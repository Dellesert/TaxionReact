const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const exePath = path.join(__dirname, '../dist-electron/win-unpacked/Tachyon Messenger.exe');
const icoPath = path.join(__dirname, '../electron/resources/icon.ico');

// Check if files exist
if (!fs.existsSync(exePath)) {
  console.error('Error: EXE not found at', exePath);
  console.log('Run "npm run electron:pack:win" first');
  process.exit(1);
}

if (!fs.existsSync(icoPath)) {
  console.error('Error: ICO not found at', icoPath);
  console.log('Run "npm run generate:icons" first');
  process.exit(1);
}

// Try to find rcedit
let rceditPath;
const possiblePaths = [
  path.join(__dirname, '../node_modules/rcedit/bin/rcedit-x64.exe'),
  path.join(__dirname, '../node_modules/.bin/rcedit.cmd'),
];

// Install rcedit if not found
try {
  console.log('Installing rcedit...');
  execSync('npm install rcedit --save-dev', {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit'
  });
  rceditPath = path.join(__dirname, '../node_modules/rcedit/bin/rcedit-x64.exe');
} catch (e) {
  console.error('Failed to install rcedit:', e.message);
  process.exit(1);
}

if (!fs.existsSync(rceditPath)) {
  console.error('Error: rcedit not found');
  process.exit(1);
}

console.log('Applying icon to EXE...');
console.log('  EXE:', exePath);
console.log('  ICO:', icoPath);

try {
  execSync(`"${rceditPath}" "${exePath}" --set-icon "${icoPath}"`, {
    stdio: 'inherit'
  });
  console.log('\nIcon applied successfully!');
  console.log('Note: You may need to clear Windows icon cache to see the change.');
  console.log('Run: ie4uinit.exe -show');
} catch (error) {
  console.error('Failed to apply icon:', error.message);
  process.exit(1);
}
