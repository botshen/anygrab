import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ICONS_DIR = resolve(__dirname, '../public/icons');
const ICON_SIZES = [16, 32, 48, 128];

/** Precomputed IEEE 802.3 CRC-32 lookup table for PNG chunks */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);

  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

/**
 * Encodes raw RGBA pixels (width * height * 4) into a valid standard PNG buffer.
 */
export function encodePngRgba(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8-bit channel depth
  ihdr[9] = 6; // RGBA color type
  ihdr[10] = 0; // Deflate compression
  ihdr[11] = 0; // Adaptive filtering
  ihdr[12] = 0; // No interlace

  const stride = width * 4;
  const rawScanlines = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    const rowStart = y * (stride + 1);
    rawScanlines[rowStart] = 0; // Filter type 0 (None)
    rgba.copy(rawScanlines, rowStart + 1, y * stride, (y + 1) * stride);
  }

  const compressed = deflateSync(rawScanlines, { level: 9 });
  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** Signed distance to a rounded box centered at (0.5, 0.5) in normalized [0, 1] coords */
function sdRoundedBox(nx, ny, halfW, halfH, radius) {
  const qx = Math.abs(nx - 0.5) - halfW + radius;
  const qy = Math.abs(ny - 0.5) - halfH + radius;
  const outDist = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
  const inDist = Math.min(Math.max(qx, qy), 0);
  return outDist + inDist - radius;
}

/**
 * Evaluates normalized subpixel color [r, g, b, a] (0..255) for AnyGrab's Optical Reticle brand mark:
 * - Matte carbon (#141413) rounded-square body
 * - Crisp archival off-white (#FAF9F5) corner reticle L-brackets
 * - International signal vermilion (#D94E28) center square target
 */
function sampleBrandPixel(nx, ny) {
  // Rounded square body matching rx="7" on 32x32 viewBox (~0.21875 radius)
  const bgDist = sdRoundedBox(nx, ny, 0.468, 0.468, 0.215);
  if (bgDist > 0.004) {
    return [0, 0, 0, 0];
  }

  // Matte carbon #141413 base with subtle top edge sheen (#1F1F1D)
  const topSheen = clamp01(1 - ny * 1.4) * 0.28;
  let r = lerp(20, 31, topSheen);
  let g = lerp(20, 31, topSheen);
  let b = lerp(19, 29, topSheen);

  // Subtle 1px inner border rim
  if (bgDist > -0.032 && bgDist <= 0) {
    const rim = (1 - Math.abs(bgDist + 0.016) / 0.016) * 0.12;
    r = lerp(r, 250, rim);
    g = lerp(g, 249, rim);
    b = lerp(b, 245, rim);
  }

  // 1) Four crisp corner L-brackets (#FAF9F5)
  const ax = Math.abs(nx - 0.5);
  const ay = Math.abs(ny - 0.5);
  const outer = 0.268;
  const stroke = 0.068;
  const inner = outer - stroke;
  const armMin = 0.108;

  const inBracketBand =
    ax <= outer &&
    ay <= outer &&
    ((ax >= inner && ay >= armMin) || (ay >= inner && ax >= armMin));

  if (inBracketBand) {
    const cornerDist = Math.hypot(
      Math.max(ax - (outer - 0.024), 0),
      Math.max(ay - (outer - 0.024), 0),
    );
    if (cornerDist <= 0.026) {
      return [250, 249, 245, 255];
    }
  }

  // 2) Center vermilion reticle square (#D94E28 -> rgb(217, 78, 40))
  const centerDist = sdRoundedBox(nx, ny, 0.082, 0.082, 0.032);
  if (centerDist <= 0) {
    return [217, 78, 40, 255];
  }

  return [Math.round(r), Math.round(g), Math.round(b), 255];
}

/**
 * Renders an anti-aliased RGBA icon of `size x size` using 4x4 supersampling.
 */
export function renderBrandIconPng(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const samples = 4;
  const totalSamples = samples * samples;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let sumR = 0;
      let sumG = 0;
      let sumB = 0;
      let sumA = 0;

      for (let sy = 0; sy < samples; sy++) {
        const ny = (y + (sy + 0.5) / samples) / size;
        for (let sx = 0; sx < samples; sx++) {
          const nx = (x + (sx + 0.5) / samples) / size;
          const [r, g, b, a] = sampleBrandPixel(nx, ny);
          const alphaWeight = a / 255;
          sumR += r * alphaWeight;
          sumG += g * alphaWeight;
          sumB += b * alphaWeight;
          sumA += a;
        }
      }

      const idx = (y * size + x) * 4;
      const avgA = sumA / totalSamples;
      if (avgA <= 0.5) {
        rgba[idx] = 0;
        rgba[idx + 1] = 0;
        rgba[idx + 2] = 0;
        rgba[idx + 3] = 0;
      } else {
        const totalAlphaWeight = sumA / 255;
        rgba[idx] = Math.min(255, Math.round(sumR / totalAlphaWeight));
        rgba[idx + 1] = Math.min(255, Math.round(sumG / totalAlphaWeight));
        rgba[idx + 2] = Math.min(255, Math.round(sumB / totalAlphaWeight));
        rgba[idx + 3] = Math.min(255, Math.round(avgA));
      }
    }
  }

  return encodePngRgba(size, size, rgba);
}

export function generateExtensionIcons(outputDir = DEFAULT_ICONS_DIR) {
  mkdirSync(outputDir, { recursive: true });
  const generated = [];
  for (const size of ICON_SIZES) {
    const filePath = resolve(outputDir, `icon-${size}.png`);
    const pngBuffer = renderBrandIconPng(size);
    writeFileSync(filePath, pngBuffer);
    generated.push({ size, filePath, bytes: pngBuffer.length });
  }
  return generated;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const files = generateExtensionIcons();
  for (const item of files) {
    console.log(`[AnyGrab Icons] Generated icon-${item.size}.png (${item.bytes} bytes)`);
  }
}
