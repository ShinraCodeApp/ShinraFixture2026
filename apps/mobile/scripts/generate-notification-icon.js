/**
 * Generates a monochrome (white silhouette on transparent) notification icon for Android.
 * Android requires notification icons to be white on transparent background.
 *
 * Uses only Node.js built-ins (zlib + fs). No external dependencies needed.
 * Produces a 96x96 white circle (soccer ball feel) PNG.
 *
 * Usage: node scripts/generate-notification-icon.js
 */
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const OUTPUT = path.join(__dirname, '../assets/notification-icon.png');
const SIZE = 96;

function writePng(width, height, pixels) {
  // pixels: Uint8Array of RGBA values (width*height*4)
  function crc32(buf) {
    let crc = -1;
    const table = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
    for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    return (crc ^ -1) >>> 0;
  }

  function chunk(type, data) {
    const typeBytes = Buffer.from(type, 'ascii');
    const body = Buffer.concat([typeBytes, data]);
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(body), 0);
    return Buffer.concat([len, body, crcBuf]);
  }

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // IDAT — filter byte 0 (None) before each row
  const raw = [];
  for (let y = 0; y < height; y++) {
    raw.push(0); // filter type None
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      raw.push(pixels[i], pixels[i + 1], pixels[i + 2], pixels[i + 3]);
    }
  }
  const compressed = zlib.deflateSync(Buffer.from(raw));

  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Draw white circle (soccer-style) on transparent background
const pixels = new Uint8Array(SIZE * SIZE * 4);
const cx = SIZE / 2;
const cy = SIZE / 2;
const r = SIZE / 2 - 4; // outer circle
const rInner = r * 0.35; // center pentagon-ish

for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const i = (y * SIZE + x) * 4;

    let alpha = 0;

    if (dist <= r) {
      // Anti-aliased outer ring
      const edge = r - dist;
      const aa = Math.min(1, Math.max(0, edge));

      // Outer ring (always solid white)
      if (dist >= r * 0.72) {
        alpha = Math.round(255 * aa);
      } else {
        // Inner pentagon patches pattern (simplified as 5 "spots")
        let inPatch = false;
        for (let p = 0; p < 5; p++) {
          const angle = (p * 2 * Math.PI) / 5 - Math.PI / 2;
          const px = cx + rInner * Math.cos(angle);
          const py = cy + rInner * Math.sin(angle);
          const pd = Math.sqrt((x - px) ** 2 + (y - py) ** 2);
          if (pd < rInner * 0.55) { inPatch = true; break; }
        }
        // Center patch
        if (dist < rInner * 0.4) inPatch = true;

        alpha = inPatch ? Math.round(255 * aa) : 0;
      }
    }

    pixels[i + 0] = 255; // R
    pixels[i + 1] = 255; // G
    pixels[i + 2] = 255; // B
    pixels[i + 3] = alpha;
  }
}

const pngBuffer = writePng(SIZE, SIZE, pixels);
fs.writeFileSync(OUTPUT, pngBuffer);
console.log(`✓ Notification icon saved: ${OUTPUT} (${SIZE}x${SIZE} monochrome white)`);
