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
 * Evaluates normalized subpixel color [r, g, b, a] (0..255) for AnyGrab's brand icon:
 * - Deep violet -> indigo -> electric cyan squircle background
 * - Crisp white selection viewfinder corner brackets
 * - Center 4-point AI prism star representing instant DOM-to-context distillation
 */
function sampleBrandPixel(nx, ny) {
  // Squircle body
  const bgDist = sdRoundedBox(nx, ny, 0.455, 0.455, 0.215);
  if (bgDist > 0.004) {
    return [0, 0, 0, 0];
  }

  // Diagonal gradient: #4338ca (top-left) -> #6366f1 (mid) -> #8b5cf6 / #0ea5e9 accent (bottom-right)
  const diag = clamp01((nx * 0.62 + ny * 0.68) / 1.15);
  let r, g, b;
  if (diag < 0.55) {
    const t = diag / 0.55;
    r = lerp(67, 99, t);
    g = lerp(56, 102, t);
    b = lerp(202, 241, t);
  } else {
    const t = (diag - 0.55) / 0.45;
    r = lerp(99, 56, t);
    g = lerp(102, 189, t);
    b = lerp(241, 248, t);
  }

  // Subtle top-left glow + violet warmth at top-right
  const glowTop = Math.max(0, 1 - Math.hypot(nx - 0.26, ny - 0.2) * 1.65);
  r = clamp01((r + glowTop * 46) / 255) * 255;
  g = clamp01((g + glowTop * 42) / 255) * 255;
  b = clamp01((b + glowTop * 55) / 255) * 255;

  const violetGlow = Math.max(0, 1 - Math.hypot(nx - 0.78, ny - 0.24) * 1.9);
  r = lerp(r, 168, violetGlow * 0.42);
  g = lerp(g, 85, violetGlow * 0.28);
  b = lerp(b, 247, violetGlow * 0.42);

  // Subtle inner glass rim highlight
  if (bgDist > -0.028 && bgDist <= 0) {
    const rim = (1 - Math.abs(bgDist + 0.014) / 0.014) * (1 - ny * 0.55) * 0.32;
    r = lerp(r, 255, rim);
    g = lerp(g, 255, rim);
    b = lerp(b, 255, rim);
  }

  // Foreground geometric motif:
  // 1) Four viewfinder corner L-brackets
  const ax = Math.abs(nx - 0.5);
  const ay = Math.abs(ny - 0.5);
  const outer = 0.285;
  const stroke = 0.064;
  const inner = outer - stroke;
  const armMin = 0.115;

  const inBracketBand =
    ax <= outer &&
    ay <= outer &&
    ((ax >= inner && ay >= armMin) || (ay >= inner && ax >= armMin));

  // Round outer corners of the L-brackets slightly
  let fgMask = 0;
  if (inBracketBand) {
    const cornerDist = Math.hypot(Math.max(ax - (outer - 0.032), 0), Math.max(ay - (outer - 0.032), 0));
    if (cornerDist <= 0.034) {
      fgMask = 1;
    }
  }

  // 2) Center 4-point AI sparkle / prism target
  // Concave astroid curve: (|dx|/s)^0.68 + (|dy|/s)^0.68 <= 1
  const starRadius = 0.15;
  const sx = ax / starRadius;
  const sy = ay / starRadius;
  if (sx <= 1 && sy <= 1) {
    const astroid = Math.pow(sx, 0.68) + Math.pow(sy, 0.68);
    if (astroid <= 1.0) {
      fgMask = Math.max(fgMask, 1);
    }
  }

  if (fgMask > 0) {
    // Pure luminous white with subtle ice-blue tint near bottom
    const fgR = lerp(255, 240, ny * 0.18);
    const fgG = lerp(255, 249, ny * 0.12);
    const fgB = 255;
    r = lerp(r, fgR, fgMask);
    g = lerp(g, fgG, fgMask);
    b = lerp(b, fgB, fgMask);
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
