const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let c = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c ^= buf[n];
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const typeAndData = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(typeAndData), 0);
  return Buffer.concat([len, typeAndData, crcBuf]);
}

function generatePNG(width, height, colorRgba, accentRgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  const lineSize = 1 + width * 4;
  const rawData = Buffer.alloc(height * lineSize);
  
  const [br, bg, bb, ba] = colorRgba;
  const [ar, ag, ab, aa] = accentRgba;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * lineSize;
    rawData[rowOffset] = 0;
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const cx = width / 2;
      const cy = height / 2;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      const radius = width * 0.38;

      if (dist < radius) {
        const factor = dist / radius;
        rawData[pxOffset] = Math.round(ar + factor * (244 - ar));
        rawData[pxOffset + 1] = Math.round(ag + factor * (63 - ag));
        rawData[pxOffset + 2] = Math.round(ab + factor * (94 - ab));
        rawData[pxOffset + 3] = aa;
      } else {
        rawData[pxOffset] = br;
        rawData[pxOffset + 1] = bg;
        rawData[pxOffset + 2] = bb;
        rawData[pxOffset + 3] = ba;
      }
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressedData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate FitPulse PNG Icons (Dark zinc background + Crimson Red & Cyan accents)
fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), generatePNG(192, 192, [15, 23, 42, 255], [244, 63, 94, 255]));
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), generatePNG(512, 512, [15, 23, 42, 255], [244, 63, 94, 255]));
fs.writeFileSync(path.join(iconsDir, 'icon-maskable-192.png'), generatePNG(192, 192, [24, 24, 27, 255], [244, 63, 94, 255]));
fs.writeFileSync(path.join(iconsDir, 'badge-96.png'), generatePNG(96, 96, [244, 63, 94, 255], [6, 182, 212, 255]));

console.log('FitPulse PNG icons created successfully!');
