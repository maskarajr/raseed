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

/** Rounded green tile with a white R — matches --accent / rmark. */
function png(size) {
  const bg = [0x0b, 0x6e, 0x4f, 0xff];
  const fg = [0xff, 0xff, 0xff, 0xff];
  const stride = 1 + size * 4;
  const raw = Buffer.alloc(stride * size);
  const r = Math.round(size * 0.22);
  function insideRoundRect(x, y) {
    const xi = x < r ? r - x : x > size - 1 - r ? x - (size - 1 - r) : 0;
    const yi = y < r ? r - y : y > size - 1 - r ? y - (size - 1 - r) : 0;
    if (xi && yi) return xi * xi + yi * yi <= r * r;
    return true;
  }
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0;
    for (let x = 0; x < size; x++) {
      const o = y * stride + 1 + x * 4;
      const c = insideRoundRect(x, y) ? bg : [0, 0, 0, 0];
      raw[o] = c[0];
      raw[o + 1] = c[1];
      raw[o + 2] = c[2];
      raw[o + 3] = c[3];
    }
  }
  const glyph = [
    "11110",
    "10001",
    "10001",
    "11110",
    "10100",
    "10010",
    "10001",
  ];
  const cell = Math.floor(size / 11);
  const gx = Math.floor((size - 5 * cell) / 2);
  const gy = Math.floor((size - 7 * cell) / 2);
  for (let gyi = 0; gyi < 7; gyi++) {
    for (let gxi = 0; gxi < 5; gxi++) {
      if (glyph[gyi][gxi] !== "1") continue;
      for (let yy = 0; yy < cell; yy++) {
        for (let xx = 0; xx < cell; xx++) {
          const x = gx + gxi * cell + xx;
          const y = gy + gyi * cell + yy;
          const o = y * stride + 1 + x * 4;
          raw[o] = fg[0];
          raw[o + 1] = fg[1];
          raw[o + 2] = fg[2];
          raw[o + 3] = fg[3];
        }
      }
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const body = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  return body;
}

writeFileSync("public/icon-192.png", png(192));
writeFileSync("public/icon-512.png", png(512));
console.log("wrote public/icon-192.png public/icon-512.png");
