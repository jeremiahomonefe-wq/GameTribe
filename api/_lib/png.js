/*
 * Tiny PNG writer for QR codes: 1-bit black & white, no dependencies
 * (emails need a PNG; many mail apps do not show SVG).
 */
import zlib from 'zlib';

const TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = TABLE[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/* isDark(row, col) -> boolean for a modules x modules grid. Returns a PNG Buffer. */
export function modulesToPng(isDark, modules, scale = 8, border = 4) {
  const size = (modules + border * 2) * scale;
  const rowBytes = Math.ceil(size / 8);
  const raw = Buffer.alloc((rowBytes + 1) * size, 0xff); /* all white */
  for (let y = 0; y < size; y++) {
    const off = y * (rowBytes + 1);
    raw[off] = 0; /* filter type 0 */
    const my = Math.floor(y / scale) - border;
    if (my < 0 || my >= modules) continue;
    for (let x = 0; x < size; x++) {
      const mx = Math.floor(x / scale) - border;
      if (mx >= 0 && mx < modules && isDark(my, mx)) {
        raw[off + 1 + (x >> 3)] &= ~(0x80 >> (x & 7)); /* 0 bit = black */
      }
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 1; /* bit depth */
  ihdr[9] = 0; /* greyscale */
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
}
