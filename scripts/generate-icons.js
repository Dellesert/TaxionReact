const { default: pngToIco } = require('png-to-ico');
const fs = require('fs');
const path = require('path');

async function generateIcons() {
  const inputPng = path.join(__dirname, '../assets/images/icon.png');
  const outputDir = path.join(__dirname, '../electron/resources');

  // Check if source icon exists
  if (!fs.existsSync(inputPng)) {
    console.error('Error: Source icon not found at', inputPng);
    process.exit(1);
  }

  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log('Created directory:', outputDir);
  }

  try {
    // Generate .ico file for Windows
    console.log('Generating icon.ico from', inputPng);
    const icoBuffer = await pngToIco(inputPng);
    fs.writeFileSync(path.join(outputDir, 'icon.ico'), icoBuffer);
    console.log('Created: electron/resources/icon.ico');

    // Copy PNG for macOS/Linux
    fs.copyFileSync(inputPng, path.join(outputDir, 'icon.png'));
    console.log('Created: electron/resources/icon.png');

    console.log('\nIcons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error.message);
    process.exit(1);
  }
}

generateIcons();
