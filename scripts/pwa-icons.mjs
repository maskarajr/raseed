import { crc32, deflateSync } from "zlib";
import { writeFileSync } from "fs";

function chunk(type, data) {
  const t = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])) >>> 0);
  return Buffer.concat([len, t, data, crc]);
}

function inRoundRect(u, v, x, y, w, h, rx) {
  if (u < x || u > x + w || v < y || v > y + h) return false;
  const r = Math.min(rx, w / 2, h / 2);
  const cx = u < x + r ? x + r : u > x + w - r ? x + w - r : u;
  const cy = v < y + r ? y + r : v > y + h - r ? y + h - r : v;
  if (cx === u || cy === v) return true;
  const dx = u - cx;
  const dy = v - cy;
  return dx * dx + dy * dy <= r * r;
}

const COMPACT = [
  [1.5, 6.35, 21, 3.4, 1.7],
  [4.15, 9.75, 2.8, 3.4, 1.4],
  [17.05, 9.75, 2.8, 3.4, 1.4],
  [1.5, 13.15, 8.1, 4.4, 2.2],
  [14.4, 13.15, 8.1, 4.4, 2.2],
];

function glyphAt(u, v, scale) {
  const x = (u - 12) / scale + 12;
  const y = (v - 12) / scale + 12;
  return COMPACT.some((r) => inRoundRect(x, y, ...r));
}

/** Rasterise docs/design-handoff/brand app-icon / maskable / favicon. */
function png(size, { rounded, scale }) {
  const bg = [0x0b, 0x6e, 0x4f, 0xff];
  const fg = [0xff, 0xff, 0xff, 0xff];
  const stride = 1 + size * 4;
  const raw = Buffer.alloc(stride * size);
  const tileRx = rounded ? 5.4 : 0;
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0;
    for (let x = 0; x < size; x++) {
      const u = ((x + 0.5) / size) * 24;
      const v = ((y + 0.5) / size) * 24;
      const o = y * stride + 1 + x * 4;
      let c = [0, 0, 0, 0];
      if (inRoundRect(u, v, 0, 0, 24, 24, tileRx)) {
        c = glyphAt(u, v, scale) ? fg : bg;
      }
      raw[o] = c[0];
      raw[o + 1] = c[1];
      raw[o + 2] = c[2];
      raw[o + 3] = c[3];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const any = { rounded: true, scale: 0.72 };
const mask = { rounded: false, scale: 0.68 };
const fav = { rounded: true, scale: 0.86 };

writeFileSync("public/icon-192.png", png(192, any));
writeFileSync("public/icon-512.png", png(512, any));
writeFileSync("public/icon-maskable-192.png", png(192, mask));
writeFileSync("public/icon-maskable-512.png", png(512, mask));
writeFileSync("public/apple-touch-icon.png", png(180, any));
writeFileSync("public/favicon-32.png", png(32, fav));
console.log("wrote public PWA/favicon PNGs from brand geometry");
