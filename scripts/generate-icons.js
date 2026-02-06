const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// ICO file structure constants
const ICO_HEADER_SIZE = 6;
const ICO_ENTRY_SIZE = 16;

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
    console.log('Generating icons from', inputPng);

    // Required sizes for Windows ICO (256 is critical for app icon)
    const sizes = [16, 24, 32, 48, 64, 128, 256];
    const pngBuffers = [];

    // Generate PNG buffers for each size
    for (const size of sizes) {
      const buffer = await sharp(inputPng)
        .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();
      pngBuffers.push({ size, buffer });
      console.log(`  Generated ${size}x${size}`);
    }

    // Create ICO file
    const icoBuffer = createIco(pngBuffers);
    fs.writeFileSync(path.join(outputDir, 'icon.ico'), icoBuffer);
    console.log('Created: electron/resources/icon.ico');

    // Copy original PNG for macOS/Linux
    fs.copyFileSync(inputPng, path.join(outputDir, 'icon.png'));
    console.log('Created: electron/resources/icon.png');

    // Generate white tray icon from icon_alpha.png (has transparent background)
    const trayIconSize = 32;
    const alphaIconPath = path.join(__dirname, '../assets/images/icon_alpha.png');

    // Use icon_alpha.png which should have transparent background
    const sourceIcon = fs.existsSync(alphaIconPath) ? alphaIconPath : inputPng;
    console.log('Using source for tray icon:', sourceIcon);

    // First trim transparent areas, then resize to fill the icon space
    const trayIconBuffer = await sharp(sourceIcon)
      .trim() // Remove transparent borders
      .resize(trayIconSize, trayIconSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Convert non-transparent pixels to white while keeping alpha
    const { data, info } = trayIconBuffer;
    const whiteData = Buffer.alloc(data.length);

    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3];
      if (alpha > 0) {
        // Only make visible pixels white
        whiteData[i] = 255;     // R
        whiteData[i + 1] = 255; // G
        whiteData[i + 2] = 255; // B
        whiteData[i + 3] = alpha; // A (keep original)
      } else {
        // Keep fully transparent pixels as-is
        whiteData[i] = 0;
        whiteData[i + 1] = 0;
        whiteData[i + 2] = 0;
        whiteData[i + 3] = 0;
      }
    }

    // Save white tray icon
    await sharp(whiteData, {
      raw: {
        width: info.width,
        height: info.height,
        channels: 4
      }
    })
      .png()
      .toFile(path.join(outputDir, 'tray-icon-white.png'));

    console.log('Created: electron/resources/tray-icon-white.png');

    console.log('\nIcons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error.message);
    process.exit(1);
  }
}

function createIco(images) {
  const numImages = images.length;

  // Calculate total size
  let dataOffset = ICO_HEADER_SIZE + (numImages * ICO_ENTRY_SIZE);
  const entries = [];

  for (const { size, buffer } of images) {
    entries.push({
      width: size === 256 ? 0 : size, // 0 means 256 in ICO format
      height: size === 256 ? 0 : size,
      size: buffer.length,
      offset: dataOffset,
      buffer
    });
    dataOffset += buffer.length;
  }

  // Create the ICO buffer
  const totalSize = dataOffset;
  const ico = Buffer.alloc(totalSize);

  // ICO Header
  ico.writeUInt16LE(0, 0);      // Reserved (0)
  ico.writeUInt16LE(1, 2);      // Image type (1 = ICO)
  ico.writeUInt16LE(numImages, 4); // Number of images

  // Write directory entries
  let entryOffset = ICO_HEADER_SIZE;
  for (const entry of entries) {
    ico.writeUInt8(entry.width, entryOffset);      // Width
    ico.writeUInt8(entry.height, entryOffset + 1); // Height
    ico.writeUInt8(0, entryOffset + 2);            // Color palette (0 = no palette)
    ico.writeUInt8(0, entryOffset + 3);            // Reserved
    ico.writeUInt16LE(1, entryOffset + 4);         // Color planes
    ico.writeUInt16LE(32, entryOffset + 6);        // Bits per pixel
    ico.writeUInt32LE(entry.size, entryOffset + 8);   // Image size
    ico.writeUInt32LE(entry.offset, entryOffset + 12); // Image offset
    entryOffset += ICO_ENTRY_SIZE;
  }

  // Write image data
  for (const entry of entries) {
    entry.buffer.copy(ico, entry.offset);
  }

  return ico;
}

generateIcons();
