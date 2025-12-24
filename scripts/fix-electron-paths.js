const fs = require('fs');
const path = require('path');

const distPath = path.join(__dirname, '../dist');
const indexPath = path.join(distPath, 'index.html');

console.log('[fix-electron-paths] Processing index.html...');

let html = fs.readFileSync(indexPath, 'utf8');

// Keep absolute paths - they work with app:// protocol
// Just ensure paths start with / (which they should already)
fs.writeFileSync(indexPath, html, 'utf8');
console.log('[fix-electron-paths] index.html done (no changes needed for app:// protocol)!');

console.log('[fix-electron-paths] Done!');
