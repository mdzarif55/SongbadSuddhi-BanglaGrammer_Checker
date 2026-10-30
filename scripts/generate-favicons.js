const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
    <linearGradient id="emerald" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#34d399"/>
      <stop offset="100%" stop-color="#059669"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.3"/>
    </filter>
  </defs>
  
  <!-- Rounded Base Background -->
  <rect width="64" height="64" rx="14" fill="url(#bg)"/>
  <rect x="0.75" y="0.75" width="62.5" height="62.5" rx="13.25" stroke="#334155" stroke-width="1.5"/>

  <!-- Newspaper / Document Body -->
  <path d="M14 17C14 14.7909 15.7909 13 18 13H42C44.2091 13 46 14.7909 46 17V45C46 47.2091 44.2091 49 42 49H18C15.7909 49 14 47.2091 14 45V17Z" fill="#1e293b" stroke="#475569" stroke-width="2"/>
  
  <!-- Newspaper Top Header Bar -->
  <path d="M14 17C14 14.7909 15.7909 13 18 13H42C44.2091 13 46 14.7909 46 17V22H14V17Z" fill="#334155"/>
  <line x1="18" y1="18" x2="30" y2="18" stroke="#38bdf8" stroke-width="2" stroke-linecap="round"/>

  <!-- Newspaper Photo / Lead Block -->
  <rect x="18" y="26" width="13" height="9" rx="1.5" fill="#38bdf8" fill-opacity="0.25" stroke="#38bdf8" stroke-width="1.2"/>
  
  <!-- Headline Lines next to photo -->
  <line x1="34" y1="28" x2="42" y2="28" stroke="#f1f5f9" stroke-width="2" stroke-linecap="round"/>
  <line x1="34" y1="33" x2="40" y2="33" stroke="#94a3b8" stroke-width="2" stroke-linecap="round"/>

  <!-- Editorial Text Lines below -->
  <line x1="18" y1="39" x2="33" y2="39" stroke="#cbd5e1" stroke-width="2" stroke-linecap="round"/>
  <line x1="18" y1="44" x2="29" y2="44" stroke="#94a3b8" stroke-width="2" stroke-linecap="round"/>

  <!-- Emerald Verification Checkmark Badge -->
  <g filter="url(#shadow)">
    <circle cx="45" cy="45" r="12" fill="url(#emerald)"/>
    <circle cx="45" cy="45" r="12" stroke="#0f172a" stroke-width="2.5"/>
    <path d="M40 45L43.5 48.5L50 41.5" stroke="#ffffff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>`;

// Function to construct a valid ICO binary from PNG buffers
function buildIco(images) {
  // images: array of { width, height, buffer }
  const count = images.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  let offset = headerSize + (count * dirEntrySize);

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = ICO
  header.writeUInt16LE(count, 4);

  const dirEntries = [];
  for (const img of images) {
    const entry = Buffer.alloc(dirEntrySize);
    entry.writeUInt8(img.width >= 256 ? 0 : img.width, 0);
    entry.writeUInt8(img.height >= 256 ? 0 : img.height, 1);
    entry.writeUInt8(0, 2); // color count
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(img.buffer.length, 8); // size of image data
    entry.writeUInt32LE(offset, 12); // offset of image data
    dirEntries.push(entry);
    offset += img.buffer.length;
  }

  return Buffer.concat([
    header,
    ...dirEntries,
    ...images.map(img => img.buffer)
  ]);
}

async function main() {
  const rootDir = path.resolve(__dirname, '..');
  const appDir = path.join(rootDir, 'app');
  const publicDir = path.join(rootDir, 'public');

  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // 1. Write app/icon.svg and public/icon.svg
  fs.writeFileSync(path.join(appDir, 'icon.svg'), svgIcon.trim());
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgIcon.trim());
  console.log('✓ Saved icon.svg');

  // 2. Generate PNG buffers at sizes 16, 32, 48
  const sizes = [16, 32, 48];
  const images = [];

  for (const size of sizes) {
    const buffer = await sharp(Buffer.from(svgIcon))
      .resize(size, size)
      .png()
      .toBuffer();
    images.push({ width: size, height: size, buffer });
  }

  // Also create apple-touch-icon (180x180) and 192x192, 512x512
  const appleIcon = await sharp(Buffer.from(svgIcon))
    .resize(180, 180)
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(appDir, 'apple-icon.png'), appleIcon);
  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleIcon);
  console.log('✓ Saved apple-touch-icon.png');

  // 3. Assemble proper multi-size ICO file
  const icoBuffer = buildIco(images);
  fs.writeFileSync(path.join(appDir, 'favicon.ico'), icoBuffer);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);
  console.log(`✓ Saved valid favicon.ico (${icoBuffer.length} bytes with sizes: ${sizes.join(', ')})`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
