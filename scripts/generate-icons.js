const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 implementation for PNG chunks
function makeCRCTable() {
  let c;
  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    crcTable[n] = c;
  }
  return crcTable;
}

const crcTable = makeCRCTable();

function crc32(buf) {
  let crc = 0 ^ -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

function createChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);

  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);

  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);

  return Buffer.concat([len, body, crc]);
}

function createPng(width, height, drawPixel) {
  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  const ihdrChunk = createChunk('IHDR', ihdrData);

  // Raw image data with 1 filter byte per line
  const rawBytes = Buffer.alloc(height * (width * 4 + 1));
  let pos = 0;

  for (let y = 0; y < height; y++) {
    rawBytes[pos++] = 0; // filter type None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = drawPixel(x, y, width, height);
      rawBytes[pos++] = r;
      rawBytes[pos++] = g;
      rawBytes[pos++] = b;
      rawBytes[pos++] = a;
    }
  }

  const deflated = zlib.deflateSync(rawBytes);
  const idatChunk = createChunk('IDAT', deflated);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

// Draw a modern radar / music wave logo with dark background (#090a0f) and brand crimson/rose accents (#f43f5e)
function iconPainter(x, y, w, h) {
  const cx = w / 2;
  const cy = h / 2;
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const maxR = w * 0.45;

  // Background gradient: dark slate (#090a0f to #171923)
  let r = 9 + Math.floor((14 * y) / h);
  let g = 10 + Math.floor((15 * y) / h);
  let b = 15 + Math.floor((20 * y) / h);
  let a = 255;

  // Concentric radar circles
  const r1 = maxR * 0.35;
  const r2 = maxR * 0.65;
  const r3 = maxR * 0.95;

  const ringThickness = Math.max(2, Math.floor(w * 0.015));

  const onRing = (ringRadius) => Math.abs(dist - ringRadius) < ringThickness;

  if (onRing(r1) || onRing(r2) || onRing(r3)) {
    // Rose accent #f43f5e
    return [244, 63, 94, 255];
  }

  // Crosshairs: horizontal and vertical lines inside the outer ring
  if (dist < r3) {
    if (Math.abs(dx) < ringThickness / 2 || Math.abs(dy) < ringThickness / 2) {
      return [100, 116, 139, 200];
    }
  }

  // Center glowing core / play dot
  if (dist < maxR * 0.18) {
    return [244, 63, 94, 255];
  }

  // Radar sweep sweep-line (angle between -45 and 0 deg)
  const angle = Math.atan2(dy, dx);
  if (dist < r3 && angle >= -0.8 && angle <= 0) {
    const sweepIntensity = (angle + 0.8) / 0.8;
    return [
      Math.min(255, r + Math.floor(180 * sweepIntensity)),
      Math.min(255, g + Math.floor(30 * sweepIntensity)),
      Math.min(255, b + Math.floor(60 * sweepIntensity)),
      255,
    ];
  }

  return [r, g, b, a];
}

const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. Generate icon-192.png
const png192 = createPng(192, 192, iconPainter);
fs.writeFileSync(path.join(publicDir, 'icon-192.png'), png192);
console.log('✓ Generated icon-192.png (' + png192.length + ' bytes)');

// 2. Generate icon-512.png
const png512 = createPng(512, 512, iconPainter);
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), png512);
console.log('✓ Generated icon-512.png (' + png512.length + ' bytes)');

// 3. Generate apple-touch-icon.png (180x180)
const pngApple = createPng(180, 180, iconPainter);
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), pngApple);
console.log('✓ Generated apple-touch-icon.png (' + pngApple.length + ' bytes)');

// 4. Generate favicon.ico (using 32x32 PNG)
const png32 = createPng(32, 32, iconPainter);
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), png32);
console.log('✓ Generated favicon.ico (' + png32.length + ' bytes)');
