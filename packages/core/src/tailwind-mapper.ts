import { splitCssTokens, type StyleMap } from './style-differ';

// ============================================================================
// Standard Tailwind CSS v4 Color Palette (RGB/Hex <-> Token Name)
// ============================================================================

const RAW_TAILWIND_PALETTE: Record<string, Record<string, string>> = {
  slate: {
    '50': '#f8fafc',
    '100': '#f1f5f9',
    '200': '#e2e8f0',
    '300': '#cbd5e1',
    '400': '#94a3b8',
    '500': '#64748b',
    '600': '#475569',
    '700': '#334155',
    '800': '#1e293b',
    '900': '#0f172a',
    '950': '#020617',
  },
  gray: {
    '50': '#f9fafb',
    '100': '#f3f4f6',
    '200': '#e5e7eb',
    '300': '#d1d5db',
    '400': '#9ca3af',
    '500': '#6b7280',
    '600': '#4b5563',
    '700': '#374151',
    '800': '#1f2937',
    '900': '#111827',
    '950': '#030712',
  },
  zinc: {
    '50': '#fafafa',
    '100': '#f4f4f5',
    '200': '#e4e4e7',
    '300': '#d4d4d8',
    '400': '#a1a1aa',
    '500': '#71717a',
    '600': '#52525b',
    '700': '#3f3f46',
    '800': '#27272a',
    '900': '#18181b',
    '950': '#09090b',
  },
  neutral: {
    '50': '#fafafa',
    '100': '#f5f5f5',
    '200': '#e5e5e5',
    '300': '#d4d4d4',
    '400': '#a3a3a3',
    '500': '#737373',
    '600': '#525252',
    '700': '#404040',
    '800': '#262626',
    '900': '#171717',
    '950': '#0a0a0a',
  },
  red: {
    '50': '#fef2f2',
    '100': '#fee2e2',
    '200': '#fecaca',
    '300': '#fca5a5',
    '400': '#f87171',
    '500': '#ef4444',
    '600': '#dc2626',
    '700': '#b91c1c',
    '800': '#991b1b',
    '900': '#7f1d1d',
    '950': '#450a0a',
  },
  orange: {
    '50': '#fff7ed',
    '100': '#ffedd5',
    '200': '#fed7aa',
    '300': '#fdba74',
    '400': '#fb923c',
    '500': '#f97316',
    '600': '#ea580c',
    '700': '#c2410c',
    '800': '#9a3412',
    '900': '#7c2d12',
    '950': '#431407',
  },
  amber: {
    '50': '#fffbeb',
    '100': '#fef3c7',
    '200': '#fde68a',
    '300': '#fcd34d',
    '400': '#fbbf24',
    '500': '#f59e0b',
    '600': '#d97706',
    '700': '#b45309',
    '800': '#92400e',
    '900': '#78350f',
    '950': '#451a03',
  },
  yellow: {
    '50': '#fefce8',
    '100': '#fef9c3',
    '200': '#fef08a',
    '300': '#fde047',
    '400': '#facc15',
    '500': '#eab308',
    '600': '#ca8a04',
    '700': '#a16207',
    '800': '#854d0e',
    '900': '#713f12',
    '950': '#422006',
  },
  green: {
    '50': '#f0fdf4',
    '100': '#dcfce7',
    '200': '#bbf7d0',
    '300': '#86efac',
    '400': '#4ade80',
    '500': '#22c55e',
    '600': '#16a34a',
    '700': '#15803d',
    '800': '#166534',
    '900': '#14532d',
    '950': '#052e16',
  },
  emerald: {
    '50': '#ecfdf5',
    '100': '#d1fae5',
    '200': '#a7f3d0',
    '300': '#6ee7b7',
    '400': '#34d399',
    '500': '#10b981',
    '600': '#059669',
    '700': '#047857',
    '800': '#065f46',
    '900': '#064e3b',
    '950': '#022c22',
  },
  teal: {
    '50': '#f0fdfa',
    '100': '#ccfbf1',
    '200': '#99f6e4',
    '300': '#5eead4',
    '400': '#2dd4bf',
    '500': '#14b8a6',
    '600': '#0d9488',
    '700': '#0f766e',
    '800': '#115e59',
    '900': '#134e4a',
    '950': '#042f2e',
  },
  cyan: {
    '50': '#ecfeff',
    '100': '#cffafe',
    '200': '#a5f3fc',
    '300': '#67e8f9',
    '400': '#22d3ee',
    '500': '#06b6d4',
    '600': '#0891b2',
    '700': '#0e7490',
    '800': '#155e75',
    '900': '#164e63',
    '950': '#083344',
  },
  sky: {
    '50': '#f0f9ff',
    '100': '#e0f2fe',
    '200': '#bae6fd',
    '300': '#7dd3fc',
    '400': '#38bdf8',
    '500': '#0ea5e9',
    '600': '#0284c7',
    '700': '#0369a1',
    '800': '#075985',
    '900': '#0c4a6e',
    '950': '#082f49',
  },
  blue: {
    '50': '#eff6ff',
    '100': '#dbeafe',
    '200': '#bfdbfe',
    '300': '#93c5fd',
    '400': '#60a5fa',
    '500': '#3b82f6',
    '600': '#2563eb',
    '700': '#1d4ed8',
    '800': '#1e40af',
    '900': '#1e3a8a',
    '950': '#172554',
  },
  indigo: {
    '50': '#eef2ff',
    '100': '#e0e7ff',
    '200': '#c7d2fe',
    '300': '#a5b4fc',
    '400': '#818cf8',
    '500': '#6366f1',
    '600': '#4f46e5',
    '700': '#4338ca',
    '800': '#3730a3',
    '900': '#312e81',
    '950': '#1e1b4b',
  },
  violet: {
    '50': '#f5f3ff',
    '100': '#ede9fe',
    '200': '#ddd6fe',
    '300': '#c4b5fd',
    '400': '#a78bfa',
    '500': '#8b5cf6',
    '600': '#7c3aed',
    '700': '#6d28d9',
    '800': '#5b21b6',
    '900': '#4c1d95',
    '950': '#2e1065',
  },
  purple: {
    '50': '#faf5ff',
    '100': '#f3e8ff',
    '200': '#e9d5ff',
    '300': '#d8b4fe',
    '400': '#c084fc',
    '500': '#a855f7',
    '600': '#9333ea',
    '700': '#7e22ce',
    '800': '#6b21a8',
    '900': '#581c87',
    '950': '#3b0764',
  },
  fuchsia: {
    '50': '#fdf4ff',
    '100': '#fae8ff',
    '200': '#f5d0fe',
    '300': '#f0abfc',
    '400': '#e879f9',
    '500': '#d946ef',
    '600': '#c026d3',
    '700': '#a21caf',
    '800': '#86198f',
    '900': '#701a75',
    '950': '#4a044e',
  },
  pink: {
    '50': '#fdf2f8',
    '100': '#fce7f3',
    '200': '#fbcfe8',
    '300': '#f9a8d4',
    '400': '#f472b6',
    '500': '#ec4899',
    '600': '#db2777',
    '700': '#be185d',
    '800': '#9d174d',
    '900': '#831843',
    '950': '#500724',
  },
  rose: {
    '50': '#fff1f2',
    '100': '#ffe4e6',
    '200': '#fecdd3',
    '300': '#fda4af',
    '400': '#fb7185',
    '500': '#f43f5e',
    '600': '#e11d48',
    '700': '#be123c',
    '800': '#9f1239',
    '900': '#881337',
    '950': '#4c0519',
  },
};

export const TAILWIND_TOKEN_TO_HEX = new Map<string, string>([
  ['white', '#ffffff'],
  ['black', '#000000'],
]);

const HEX_TO_TAILWIND_TOKEN = new Map<string, string>([
  ['#ffffff', 'white'],
  ['#000000', 'black'],
]);

interface PaletteRgbEntry {
  token: string;
  r: number;
  g: number;
  b: number;
}

const PALETTE_RGB_ENTRIES: PaletteRgbEntry[] = [
  { token: 'white', r: 255, g: 255, b: 255 },
  { token: 'black', r: 0, g: 0, b: 0 },
];

for (const [family, shades] of Object.entries(RAW_TAILWIND_PALETTE)) {
  for (const [shade, hex] of Object.entries(shades)) {
    const token = `${family}-${shade}`;
    TAILWIND_TOKEN_TO_HEX.set(token, hex);
    if (!HEX_TO_TAILWIND_TOKEN.has(hex)) {
      HEX_TO_TAILWIND_TOKEN.set(hex, token);
      const r = Number.parseInt(hex.slice(1, 3), 16);
      const g = Number.parseInt(hex.slice(3, 5), 16);
      const b = Number.parseInt(hex.slice(5, 7), 16);
      PALETTE_RGB_ENTRIES.push({ token, r, g, b });
    }
  }
}

const CSS_NAMED_COLORS: Record<string, string> = {
  white: '#ffffff',
  black: '#000000',
  red: '#ff0000',
  green: '#008000',
  blue: '#0000ff',
  yellow: '#ffff00',
  cyan: '#00ffff',
  magenta: '#ff00ff',
  gray: '#808080',
  grey: '#808080',
  silver: '#c0c0c0',
  maroon: '#800000',
  olive: '#808000',
  purple: '#800080',
  teal: '#008080',
  navy: '#000080',
  orange: '#ffa500',
  rebeccapurple: '#663399',
};

export interface ParsedRgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

export function parseCssColor(raw: string): ParsedRgba | null {
  const s = raw.trim().toLowerCase();
  if (!s || s === 'none' || s === 'currentcolor' || s === 'inherit' || s === 'initial') {
    return null;
  }
  if (s === 'transparent') {
    return { r: 0, g: 0, b: 0, a: 0 };
  }
  if (CSS_NAMED_COLORS[s]) {
    return parseCssColor(CSS_NAMED_COLORS[s]);
  }

  // #rgb, #rgba, #rrggbb, #rrggbbaa
  if (s.startsWith('#')) {
    const hex = s.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      const r = Number.parseInt(hex[0] + hex[0], 16);
      const g = Number.parseInt(hex[1] + hex[1], 16);
      const b = Number.parseInt(hex[2] + hex[2], 16);
      const a = hex.length === 4 ? Number.parseInt(hex[3] + hex[3], 16) / 255 : 1;
      if ([r, g, b, a].some(Number.isNaN)) return null;
      return { r, g, b, a };
    }
    if (hex.length === 6 || hex.length === 8) {
      const r = Number.parseInt(hex.slice(0, 2), 16);
      const g = Number.parseInt(hex.slice(2, 4), 16);
      const b = Number.parseInt(hex.slice(4, 6), 16);
      const a = hex.length === 8 ? Number.parseInt(hex.slice(6, 8), 16) / 255 : 1;
      if ([r, g, b, a].some(Number.isNaN)) return null;
      return { r, g, b, a };
    }
    return null;
  }

  // rgb(...) / rgba(...) — both comma `rgba(15, 23, 42, 0.8)` and modern space `rgb(15 23 42 / 80%)`
  const rgbMatch = /^rgba?\(\s*([^)]+)\s*\)$/.exec(s);
  if (rgbMatch) {
    const inner = rgbMatch[1];
    const parts = inner.includes(',')
      ? inner.split(',').map((p) => p.trim())
      : inner
          .replace('/', ' ')
          .split(/\s+/)
          .filter(Boolean);
    if (parts.length < 3) return null;
    const parseChannel = (c: string): number => {
      if (c.endsWith('%')) return Math.round((Number.parseFloat(c) / 100) * 255);
      return Math.round(Number.parseFloat(c));
    };
    const r = clampByte(parseChannel(parts[0]));
    const g = clampByte(parseChannel(parts[1]));
    const b = clampByte(parseChannel(parts[2]));
    let a = 1;
    if (parts[3] !== undefined) {
      a = parts[3].endsWith('%')
        ? Number.parseFloat(parts[3]) / 100
        : Number.parseFloat(parts[3]);
    }
    if ([r, g, b, a].some(Number.isNaN)) return null;
    return { r, g, b, a: Math.max(0, Math.min(1, a)) };
  }

  // hsl(...) / hsla(...)
  const hslMatch = /^hsla?\(\s*([^)]+)\s*\)$/.exec(s);
  if (hslMatch) {
    const inner = hslMatch[1];
    const parts = inner.includes(',')
      ? inner.split(',').map((p) => p.trim())
      : inner
          .replace('/', ' ')
          .split(/\s+/)
          .filter(Boolean);
    if (parts.length < 3) return null;
    const h = ((Number.parseFloat(parts[0]) % 360) + 360) % 360;
    const sat = Math.max(0, Math.min(100, Number.parseFloat(parts[1]))) / 100;
    const light = Math.max(0, Math.min(100, Number.parseFloat(parts[2]))) / 100;
    let a = 1;
    if (parts[3] !== undefined) {
      a = parts[3].endsWith('%')
        ? Number.parseFloat(parts[3]) / 100
        : Number.parseFloat(parts[3]);
    }
    if ([h, sat, light, a].some(Number.isNaN)) return null;
    const { r, g, b } = hslToRgb(h, sat, light);
    return { r, g, b, a: Math.max(0, Math.min(1, a)) };
  }

  return null;
}

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, n));
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r1 = 0;
  let g1 = 0;
  let b1 = 0;
  if (h < 60) [r1, g1, b1] = [c, x, 0];
  else if (h < 120) [r1, g1, b1] = [x, c, 0];
  else if (h < 180) [r1, g1, b1] = [0, c, x];
  else if (h < 240) [r1, g1, b1] = [0, x, c];
  else if (h < 300) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];
  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const hex = (n: number) => clampByte(Math.round(n)).toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

export function normalizeCssColorToken(raw: string): string | null {
  const parsed = parseCssColor(raw);
  if (!parsed || parsed.a <= 0) return null;
  if (parsed.a >= 0.995) {
    return rgbToHex(parsed.r, parsed.g, parsed.b);
  }
  const alpha = Number(parsed.a.toFixed(2));
  return `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, ${alpha})`;
}

export function mapColorToTailwindUtility(
  prefix: 'bg' | 'text' | 'border' | 'from' | 'via' | 'to',
  rawColor: string,
): string | null {
  const trimmed = rawColor.trim();
  const lower = trimmed.toLowerCase();
  if (lower === 'currentcolor') return `${prefix}-current`;
  if (lower === 'transparent') return `${prefix}-transparent`;

  const rgba = parseCssColor(trimmed);
  if (!rgba) return null;
  if (rgba.a <= 0) return `${prefix}-transparent`;

  const hex = rgbToHex(rgba.r, rgba.g, rgba.b);
  let matchedToken = HEX_TO_TAILWIND_TOKEN.get(hex);

  // Minor tolerance (<= 3 channel units) for rgb rounding
  if (!matchedToken) {
    let bestDist = 10;
    for (const entry of PALETTE_RGB_ENTRIES) {
      const dist =
        Math.abs(entry.r - rgba.r) + Math.abs(entry.g - rgba.g) + Math.abs(entry.b - rgba.b);
      if (dist <= 4 && dist < bestDist) {
        bestDist = dist;
        matchedToken = entry.token;
      }
    }
  }

  const baseToken = matchedToken ?? `[${hex}]`;
  if (rgba.a >= 0.995) {
    return `${prefix}-${baseToken}`;
  }
  const pct = Math.round(rgba.a * 100);
  return `${prefix}-${baseToken}/${pct}`;
}

// ============================================================================
// Spacing, Sizing & Length Scale Conversion
// ============================================================================

const PX_TO_SPACING_SCALE: Record<number, string> = {
  0: '0',
  1: 'px',
  2: '0.5',
  4: '1',
  6: '1.5',
  8: '2',
  10: '2.5',
  12: '3',
  14: '3.5',
  16: '4',
  20: '5',
  24: '6',
  28: '7',
  32: '8',
  36: '9',
  40: '10',
  44: '11',
  48: '12',
  56: '14',
  64: '16',
  72: '18',
  80: '20',
  96: '24',
  112: '28',
  128: '32',
  144: '36',
  160: '40',
  176: '44',
  192: '48',
  208: '52',
  224: '56',
  240: '60',
  256: '64',
  288: '72',
  320: '80',
  384: '96',
};

export function parseCssLengthPx(raw: string): number | null {
  const s = raw.trim().toLowerCase();
  if (s === '0' || s === '0px' || s === '0rem') return 0;
  const pxMatch = /^(-?\d+(?:\.\d+)?)px$/.exec(s);
  if (pxMatch) return Number.parseFloat(pxMatch[1]);
  const remMatch = /^(-?\d+(?:\.\d+)?)rem$/.exec(s);
  if (remMatch) return Number.parseFloat(remMatch[1]) * 16;
  return null;
}

function mapSpacingToken(prefix: string, rawVal: string): string | null {
  const v = rawVal.trim().toLowerCase();
  if (!v) return null;
  if (v === 'auto') return `${prefix}-auto`;

  const px = parseCssLengthPx(v);
  if (px !== null) {
    if (px === 0) return null;
    const isNeg = px < 0;
    const absPx = Math.abs(px);
    const scale = PX_TO_SPACING_SCALE[absPx];
    if (scale) {
      return isNeg ? `-${prefix}-${scale}` : `${prefix}-${scale}`;
    }
    const cleanVal = v.startsWith('-') ? v.slice(1) : v;
    return isNeg ? `-${prefix}-[${cleanVal}]` : `${prefix}-[${cleanVal}]`;
  }

  if (v.startsWith('-')) {
    return `-${prefix}-[${v.slice(1).replace(/\s+/g, '_')}]`;
  }
  return `${prefix}-[${v.replace(/\s+/g, '_')}]`;
}

function mapDimensionToken(prefix: 'w' | 'h' | 'min-w' | 'min-h', rawVal: string): string | null {
  const v = rawVal.trim().toLowerCase();
  if (!v || v === 'auto') return null;
  if (v === '100%') return `${prefix}-full`;
  if (v === '100vw' && (prefix === 'w' || prefix === 'min-w')) return `${prefix}-screen`;
  if (v === '100vh' && (prefix === 'h' || prefix === 'min-h')) return `${prefix}-screen`;
  if (v === '100dvh' && (prefix === 'h' || prefix === 'min-h')) return `${prefix}-dvh`;
  if (v === 'fit-content') return `${prefix}-fit`;
  if (v === 'min-content') return `${prefix}-min`;
  if (v === 'max-content') return `${prefix}-max`;

  if (prefix === 'w') {
    if (v === '50%') return 'w-1/2';
    if (v === '25%') return 'w-1/4';
    if (v === '75%') return 'w-3/4';
    if (v === '33.33%' || v === '33.3333%' || v === '33.333333%') return 'w-1/3';
    if (v === '66.67%' || v === '66.6667%' || v === '66.666667%') return 'w-2/3';
  }

  const px = parseCssLengthPx(v);
  if (px !== null && px >= 0) {
    const scale = PX_TO_SPACING_SCALE[px];
    if (scale) return `${prefix}-${scale}`;
  }
  return `${prefix}-[${v.replace(/\s+/g, '_')}]`;
}

const MAX_WIDTH_SCALE: Record<number, string> = {
  320: 'max-w-xs',
  384: 'max-w-sm',
  448: 'max-w-md',
  512: 'max-w-lg',
  576: 'max-w-xl',
  672: 'max-w-2xl',
  768: 'max-w-3xl',
  896: 'max-w-4xl',
  1024: 'max-w-5xl',
  1152: 'max-w-6xl',
  1280: 'max-w-7xl',
};

function mapMaxWidthToken(rawVal: string): string | null {
  const v = rawVal.trim().toLowerCase();
  if (!v || v === 'none') return null;
  if (v === '100%') return 'max-w-full';
  if (v === '65ch') return 'max-w-prose';
  if (v === 'fit-content') return 'max-w-fit';
  if (v === 'min-content') return 'max-w-min';
  if (v === 'max-content') return 'max-w-max';

  const px = parseCssLengthPx(v);
  if (px !== null && MAX_WIDTH_SCALE[px]) {
    return MAX_WIDTH_SCALE[px];
  }
  return `max-w-[${v.replace(/\s+/g, '_')}]`;
}

// ============================================================================
// CSS-in-JS / CSS Modules Class Sanitizer
// ============================================================================

const KNOWN_SINGLE_WORD_TAILWIND = new Set([
  'block',
  'inline',
  'flex',
  'grid',
  'table',
  'hidden',
  'contents',
  'static',
  'fixed',
  'absolute',
  'relative',
  'sticky',
  'visible',
  'invisible',
  'collapse',
  'isolate',
  'container',
  'prose',
  'grow',
  'shrink',
  'truncate',
  'uppercase',
  'lowercase',
  'capitalize',
  'italic',
  'underline',
  'overline',
  'antialiased',
  'ordinal',
  'border',
  'rounded',
  'shadow',
  'ring',
  'outline',
  'blur',
  'invert',
  'grayscale',
  'sepia',
  'transition',
  'transform',
  'group',
  'peer',
  'dark',
]);

/**
 * Returns `true` when a class name is an auto-generated CSS-in-JS or CSS Modules hash
 * (e.g. `css-1a2b3c`, `sc-bdnxRM`, `jsx-981273`, `_card_19x_1`, `Card_root__x9A2z`, `svelte-1abc23`).
 */
export function isObfuscatedClassName(cls: string): boolean {
  if (!cls) return true;
  if (KNOWN_SINGLE_WORD_TAILWIND.has(cls)) return false;

  // Preserve code highlighting classes (`language-ts`, `lang-python`, `hljs`)
  if (/^(?:language|lang)-/i.test(cls) || cls === 'hljs') return false;

  // Emotion / Styled-Components / Styled-JSX / Svelte / Astro / Goober / RN-Web
  if (/^(?:css|emotion|sc|jsx|svelte|astro|tw-hash)-[a-zA-Z0-9_-]{3,}$/.test(cls)) return true;
  if (/^go\d{5,}$/.test(cls)) return true;
  if (/^r-[0-9a-z]{5,8}$/.test(cls) && /\d/.test(cls)) return true;
  if (/^c-[a-zA-Z0-9]+-[a-zA-Z0-9]{5,}-css$/.test(cls)) return true;

  // CSS Modules: `_card_19x_1`, `_btn_a8f92`, ` styles_card__1a2b3`
  if (/^_[a-zA-Z0-9_-]+_[a-zA-Z0-9]{2,}(?:_\d+)?$/.test(cls)) return true;
  if (/^[a-zA-Z0-9_-]+__[a-zA-Z0-9_-]*[0-9][a-zA-Z0-9_-]{2,}$/.test(cls)) return true;
  if (/^[a-zA-Z0-9]+_[a-zA-Z0-9]+__[a-zA-Z0-9_-]{4,}$/.test(cls)) return true;

  // Standalone random hashes (mixed case + digits or hex >= 6 chars without Tailwind structure)
  if (!cls.includes('-') && !cls.includes(':') && !cls.includes('[')) {
    if (/^[a-f0-9]{6,}$/i.test(cls)) return true;
    if (cls.length >= 6 && /[a-z]/.test(cls) && /[A-Z]/.test(cls) && /\d/.test(cls)) return true;
    if (/^[a-z]{1,2}\d[a-z0-9]{4,}$/i.test(cls)) return true;
  }

  return false;
}

const TAILWIND_PREFIX_RE =
  /^-?(?:p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|space-x|space-y|w|min-w|max-w|h|min-h|max-h|size|flex|inline-flex|grid|inline-grid|col|row|gap|justify|items|content|self|place|order|font|text|leading|tracking|whitespace|break|bg|from|via|to|border|divide|outline|ring|rounded|shadow|opacity|mix-blend|blur|backdrop|transition|duration|ease|delay|animate|scale|rotate|translate|skew|origin|cursor|select|pointer-events|resize|scroll|snap|touch|will-change|z|inset|top|right|bottom|left|overflow|overscroll|object|aspect|columns|sr-only|not-sr-only|line-clamp)(?:-|$)/;

export function isLikelyTailwindUtility(cls: string): boolean {
  if (!cls) return false;
  const base = cls.includes(':') ? cls.slice(cls.lastIndexOf(':') + 1) : cls;
  if (KNOWN_SINGLE_WORD_TAILWIND.has(base)) return true;
  if (/^(?:language|lang)-/i.test(base) || base === 'hljs') return true;
  return TAILWIND_PREFIX_RE.test(base);
}

export function sanitizeClassList(
  rawClassAttr: string,
  consumedStylesheetClasses?: Set<string>,
): {
  keptClasses: string[];
  strippedClasses: number;
} {
  if (!rawClassAttr || !rawClassAttr.trim()) {
    return { keptClasses: [], strippedClasses: 0 };
  }
  const keptClasses: string[] = [];
  let strippedClasses = 0;
  const seen = new Set<string>();

  for (const token of rawClassAttr.trim().split(/\s+/)) {
    if (!token) continue;
    if (isObfuscatedClassName(token)) {
      strippedClasses++;
      continue;
    }
    if (
      consumedStylesheetClasses?.has(token) &&
      !isLikelyTailwindUtility(token)
    ) {
      strippedClasses++;
      continue;
    }
    if (!seen.has(token)) {
      seen.add(token);
      keptClasses.push(token);
    }
  }
  return { keptClasses, strippedClasses };
}

// ============================================================================
// Deterministic CSS Properties -> Tailwind CSS v4 Utilities Compiler
// ============================================================================

export function mapStylesToTailwind(styles: StyleMap): string[] {
  const classes: string[] = [];
  const push = (cls: string | null | undefined): void => {
    if (cls) classes.push(cls);
  };

  // 1. Display
  const display = styles['display']?.toLowerCase();
  if (display) {
    const displayMap: Record<string, string> = {
      flex: 'flex',
      'inline-flex': 'inline-flex',
      grid: 'grid',
      'inline-grid': 'inline-grid',
      block: 'block',
      'inline-block': 'inline-block',
      inline: 'inline',
      none: 'hidden',
      contents: 'contents',
      table: 'table',
      'flow-root': 'flow-root',
    };
    push(displayMap[display]);
  }

  // 2. Position & Inset
  const position = styles['position']?.toLowerCase();
  if (position && ['relative', 'absolute', 'fixed', 'sticky'].includes(position)) {
    push(position);
  }

  const top = styles['top'];
  const right = styles['right'];
  const bottom = styles['bottom'];
  const left = styles['left'];
  if (top !== undefined && top === right && top === bottom && top === left) {
    if (parseCssLengthPx(top) === 0) push('inset-0');
    else push(mapSpacingToken('inset', top));
  } else {
    if (top !== undefined && top === bottom) {
      if (parseCssLengthPx(top) === 0) push('inset-y-0');
      else push(mapSpacingToken('inset-y', top));
    } else {
      if (top !== undefined) {
        if (parseCssLengthPx(top) === 0) push('top-0');
        else if (top === '50%') push('top-1/2');
        else push(mapSpacingToken('top', top));
      }
      if (bottom !== undefined) {
        if (parseCssLengthPx(bottom) === 0) push('bottom-0');
        else push(mapSpacingToken('bottom', bottom));
      }
    }
    if (left !== undefined && left === right) {
      if (parseCssLengthPx(left) === 0) push('inset-x-0');
      else push(mapSpacingToken('inset-x', left));
    } else {
      if (left !== undefined) {
        if (parseCssLengthPx(left) === 0) push('left-0');
        else if (left === '50%') push('left-1/2');
        else push(mapSpacingToken('left', left));
      }
      if (right !== undefined) {
        if (parseCssLengthPx(right) === 0) push('right-0');
        else push(mapSpacingToken('right', right));
      }
    }
  }

  const zIndex = styles['z-index'];
  if (zIndex) {
    if (['0', '10', '20', '30', '40', '50'].includes(zIndex)) {
      push(`z-${zIndex}`);
    } else {
      push(`z-[${zIndex}]`);
    }
  }

  // 3. Flexbox & Grid
  const flexDir = styles['flex-direction']?.toLowerCase();
  if (flexDir === 'column') push('flex-col');
  else if (flexDir === 'row-reverse') push('flex-row-reverse');
  else if (flexDir === 'column-reverse') push('flex-col-reverse');

  const flexWrap = styles['flex-wrap']?.toLowerCase();
  if (flexWrap === 'wrap') push('flex-wrap');
  else if (flexWrap === 'wrap-reverse') push('flex-wrap-reverse');

  const alignItems = styles['align-items']?.toLowerCase();
  if (alignItems) {
    const map: Record<string, string> = {
      center: 'items-center',
      'flex-start': 'items-start',
      start: 'items-start',
      'flex-end': 'items-end',
      end: 'items-end',
      baseline: 'items-baseline',
      stretch: 'items-stretch',
    };
    push(map[alignItems]);
  }

  const justifyContent = styles['justify-content']?.toLowerCase();
  if (justifyContent) {
    const map: Record<string, string> = {
      center: 'justify-center',
      'flex-start': 'justify-start',
      start: 'justify-start',
      'flex-end': 'justify-end',
      end: 'justify-end',
      'space-between': 'justify-between',
      'space-around': 'justify-around',
      'space-evenly': 'justify-evenly',
    };
    push(map[justifyContent]);
  }

  const alignSelf = styles['align-self']?.toLowerCase();
  if (alignSelf) {
    const map: Record<string, string> = {
      center: 'self-center',
      'flex-start': 'self-start',
      start: 'self-start',
      'flex-end': 'self-end',
      end: 'self-end',
      stretch: 'self-stretch',
    };
    push(map[alignSelf]);
  }

  const flexGrow = styles['flex-grow'];
  const flexShrink = styles['flex-shrink'];
  const flexBasis = styles['flex-basis'];
  if (flexGrow === '1' && flexShrink === '1' && (flexBasis === '0%' || flexBasis === '0px' || flexBasis === '0')) {
    push('flex-1');
  } else if (flexGrow === '1' && flexShrink === '1' && flexBasis === 'auto') {
    push('flex-auto');
  } else if (flexGrow === '0' && flexShrink === '0' && flexBasis === 'auto') {
    push('flex-none');
  } else {
    if (flexGrow === '1') push('grow');
    if (flexShrink === '0') push('shrink-0');
  }

  const gridCols = styles['grid-template-columns'];
  if (gridCols) {
    push(mapGridColumns(gridCols));
  }

  const gridColSpan = styles['grid-column'];
  if (gridColSpan) {
    const spanMatch = /span\s+(\d+)/i.exec(gridColSpan);
    if (gridColSpan.replace(/\s+/g, '') === '1/-1') push('col-span-full');
    else if (spanMatch) push(`col-span-${spanMatch[1]}`);
  }

  const gridRowSpan = styles['grid-row'];
  if (gridRowSpan) {
    const spanMatch = /span\s+(\d+)/i.exec(gridRowSpan);
    if (spanMatch) push(`row-span-${spanMatch[1]}`);
  }

  const rowGap = styles['row-gap'];
  const colGap = styles['column-gap'];
  if (rowGap !== undefined && rowGap === colGap) {
    push(mapSpacingToken('gap', rowGap));
  } else {
    if (colGap !== undefined) push(mapSpacingToken('gap-x', colGap));
    if (rowGap !== undefined) push(mapSpacingToken('gap-y', rowGap));
  }

  // 4. Sizing (`size-*`, `w-*`, `h-*`, `max-w-*`, `min-h-*`)
  const width = styles['width'];
  const height = styles['height'];
  if (width && height && width === height) {
    const px = parseCssLengthPx(width);
    if (px !== null && px > 0 && px <= 96 && PX_TO_SPACING_SCALE[px]) {
      push(`size-${PX_TO_SPACING_SCALE[px]}`);
    } else {
      push(mapDimensionToken('w', width));
      push(mapDimensionToken('h', height));
    }
  } else {
    if (width) push(mapDimensionToken('w', width));
    if (height) push(mapDimensionToken('h', height));
  }
  if (styles['min-width']) push(mapDimensionToken('min-w', styles['min-width']));
  if (styles['max-width']) push(mapMaxWidthToken(styles['max-width']));
  if (styles['min-height']) push(mapDimensionToken('min-h', styles['min-height']));
  if (styles['max-height'] && styles['max-height'] !== 'none') {
    const mh = styles['max-height'];
    const px = parseCssLengthPx(mh);
    if (px !== null && PX_TO_SPACING_SCALE[px]) push(`max-h-${PX_TO_SPACING_SCALE[px]}`);
    else push(`max-h-[${mh.replace(/\s+/g, '_')}]`);
  }

  // 5. Spacing (`padding`, `margin`)
  emitBoxSpacing(classes, 'p', {
    top: styles['padding-top'],
    right: styles['padding-right'],
    bottom: styles['padding-bottom'],
    left: styles['padding-left'],
  });
  emitBoxSpacing(classes, 'm', {
    top: styles['margin-top'],
    right: styles['margin-right'],
    bottom: styles['margin-bottom'],
    left: styles['margin-left'],
  });

  // 6. Truncate combo check (`overflow: hidden` + `text-overflow: ellipsis` + `white-space: nowrap`)
  const ox = styles['overflow-x']?.toLowerCase();
  const oy = styles['overflow-y']?.toLowerCase();
  const textOverflow = styles['text-overflow']?.toLowerCase();
  const whiteSpace = styles['white-space']?.toLowerCase();
  const isTruncate =
    ox === 'hidden' && oy === 'hidden' && textOverflow === 'ellipsis' && whiteSpace === 'nowrap';

  if (isTruncate) {
    push('truncate');
  } else {
    if (ox && ox === oy) {
      if (['hidden', 'auto', 'scroll', 'clip'].includes(ox)) push(`overflow-${ox}`);
    } else {
      if (ox && ['hidden', 'auto', 'scroll'].includes(ox)) push(`overflow-x-${ox}`);
      if (oy && ['hidden', 'auto', 'scroll'].includes(oy)) push(`overflow-y-${oy}`);
    }
    if (whiteSpace === 'nowrap') push('whitespace-nowrap');
    else if (whiteSpace === 'pre') push('whitespace-pre');
    else if (whiteSpace === 'pre-wrap') push('whitespace-pre-wrap');
  }

  // 7. Typography
  const fontFamily = styles['font-family'];
  if (fontFamily) {
    const ff = fontFamily.toLowerCase();
    if (/mono|jetbrains|fira\s*code|consolas|menlo|courier/.test(ff)) {
      push('font-mono');
    } else if (/serif/.test(ff) && !/sans-serif/.test(ff)) {
      push('font-serif');
    }
  }

  const fontSize = styles['font-size'];
  if (fontSize) {
    push(mapFontSizeToken(fontSize));
  }

  const fontWeight = styles['font-weight']?.toLowerCase();
  if (fontWeight) {
    const fwMap: Record<string, string> = {
      '100': 'font-thin',
      '200': 'font-extralight',
      '300': 'font-light',
      '500': 'font-medium',
      medium: 'font-medium',
      '600': 'font-semibold',
      semibold: 'font-semibold',
      '700': 'font-bold',
      bold: 'font-bold',
      '800': 'font-extrabold',
      '900': 'font-black',
    };
    push(fwMap[fontWeight]);
  }

  if (styles['font-style']?.toLowerCase() === 'italic') push('italic');

  const lineHeight = styles['line-height'];
  if (lineHeight) {
    push(mapLineHeightToken(lineHeight, fontSize));
  }

  const letterSpacing = styles['letter-spacing'];
  if (letterSpacing) {
    push(mapLetterSpacingToken(letterSpacing));
  }

  const textAlign = styles['text-align']?.toLowerCase();
  if (textAlign === 'center') push('text-center');
  else if (textAlign === 'right' || textAlign === 'end') push('text-right');
  else if (textAlign === 'justify') push('text-justify');

  const textTransform = styles['text-transform']?.toLowerCase();
  if (textTransform === 'uppercase' || textTransform === 'lowercase' || textTransform === 'capitalize') {
    push(textTransform);
  }

  const textDeco = (styles['text-decoration-line'] ?? styles['text-decoration'] ?? '').toLowerCase();
  if (textDeco.includes('underline')) push('underline');
  else if (textDeco.includes('line-through')) push('line-through');

  // 8. Text & Background Colors + Gradients
  if (styles['color']) {
    push(mapColorToTailwindUtility('text', styles['color']));
  }
  if (styles['background-color']) {
    push(mapColorToTailwindUtility('bg', styles['background-color']));
  }
  if (styles['background-image']) {
    for (const cls of mapGradientToTailwind(styles['background-image'])) {
      push(cls);
    }
  }

  // 9. Borders & Border Radius
  emitBorderUtilities(classes, styles);
  emitRadiusUtilities(classes, styles);

  // 10. Shadows, Backdrop Blur, Opacity, Transform, Cursor, Object-Fit
  if (styles['box-shadow']) {
    for (const cls of mapBoxShadowToTailwind(styles['box-shadow'])) {
      push(cls);
    }
  }

  if (styles['backdrop-filter']) {
    const blurMatch = /blur\(\s*([\d.]+)px\s*\)/i.exec(styles['backdrop-filter']);
    if (blurMatch) {
      const b = Number.parseFloat(blurMatch[1]);
      if (b <= 4) push('backdrop-blur-sm');
      else if (b <= 8) push('backdrop-blur');
      else if (b <= 12) push('backdrop-blur-md');
      else if (b <= 16) push('backdrop-blur-lg');
      else if (b <= 24) push('backdrop-blur-xl');
      else push('backdrop-blur-2xl');
    }
  }

  if (styles['opacity']) {
    const op = Number.parseFloat(styles['opacity']);
    if (Number.isFinite(op) && op < 1) {
      push(`opacity-${Math.round(op * 100)}`);
    }
  }

  if (styles['transform']) {
    for (const cls of mapTransformToTailwind(styles['transform'])) {
      push(cls);
    }
  }

  const cursor = styles['cursor']?.toLowerCase();
  if (cursor === 'pointer') push('cursor-pointer');
  else if (cursor === 'not-allowed') push('cursor-not-allowed');

  const objFit = styles['object-fit']?.toLowerCase();
  if (objFit && ['cover', 'contain', 'none', 'scale-down'].includes(objFit)) {
    push(`object-${objFit}`);
  }

  return classes;
}

function mapGridColumns(gridCols: string): string {
  const s = gridCols.trim();
  const repeatMatch = /^repeat\(\s*(\d+)\s*,\s*(?:minmax\(\s*0(?:px)?\s*,\s*1fr\s*\)|1fr)\s*\)$/i.exec(
    s,
  );
  if (repeatMatch) {
    return `grid-cols-${repeatMatch[1]}`;
  }
  const parts = splitCssTokens(s);
  if (parts.length >= 1 && parts.every((p) => p.toLowerCase() === '1fr')) {
    return `grid-cols-${parts.length}`;
  }
  return `grid-cols-[${s.replace(/\s+/g, '_')}]`;
}

function emitBoxSpacing(
  classes: string[],
  prefix: 'p' | 'm',
  sides: { top?: string; right?: string; bottom?: string; left?: string },
): void {
  const { top, right, bottom, left } = sides;
  if (top !== undefined && top === right && top === bottom && top === left) {
    const tok = mapSpacingToken(prefix, top);
    if (tok) classes.push(tok);
    return;
  }

  const handledY = top !== undefined && top === bottom;
  const handledX = left !== undefined && left === right;

  if (handledY && top) {
    const tok = mapSpacingToken(`${prefix}y`, top);
    if (tok) classes.push(tok);
  } else {
    if (top) {
      const tok = mapSpacingToken(`${prefix}t`, top);
      if (tok) classes.push(tok);
    }
    if (bottom) {
      const tok = mapSpacingToken(`${prefix}b`, bottom);
      if (tok) classes.push(tok);
    }
  }

  if (handledX && left) {
    const tok = mapSpacingToken(`${prefix}x`, left);
    if (tok) classes.push(tok);
  } else {
    if (right) {
      const tok = mapSpacingToken(`${prefix}r`, right);
      if (tok) classes.push(tok);
    }
    if (left) {
      const tok = mapSpacingToken(`${prefix}l`, left);
      if (tok) classes.push(tok);
    }
  }
}

function mapFontSizeToken(rawVal: string): string | null {
  const px = parseCssLengthPx(rawVal);
  if (px !== null) {
    const map: Record<number, string> = {
      12: 'text-xs',
      14: 'text-sm',
      16: 'text-base',
      18: 'text-lg',
      20: 'text-xl',
      24: 'text-2xl',
      30: 'text-3xl',
      36: 'text-4xl',
      48: 'text-5xl',
      60: 'text-6xl',
      72: 'text-7xl',
      96: 'text-8xl',
    };
    if (map[px]) return map[px];
  }
  return `text-[${rawVal.trim().replace(/\s+/g, '_')}]`;
}

function mapLineHeightToken(rawVal: string, fontSize?: string): string | null {
  const v = rawVal.trim().toLowerCase();
  if (v === 'normal') return null;
  if (/^\d+(\.\d+)?$/.test(v)) {
    const num = Number.parseFloat(v);
    if (num === 1) return 'leading-none';
    if (Math.abs(num - 1.25) < 0.03) return 'leading-tight';
    if (Math.abs(num - 1.375) < 0.03) return 'leading-snug';
    if (Math.abs(num - 1.5) < 0.03) return null; // normal default readability
    if (Math.abs(num - 1.625) < 0.04) return 'leading-relaxed';
    if (Math.abs(num - 2) < 0.05) return 'leading-loose';
    return `leading-[${v}]`;
  }
  const lhPx = parseCssLengthPx(v);
  const fsPx = fontSize ? parseCssLengthPx(fontSize) : null;
  if (lhPx !== null && fsPx !== null && fsPx > 0) {
    const ratio = lhPx / fsPx;
    if (Math.abs(ratio - 1) < 0.05) return 'leading-none';
    if (Math.abs(ratio - 1.25) < 0.06) return 'leading-tight';
    if (Math.abs(ratio - 1.5) < 0.08) return null;
    if (Math.abs(ratio - 1.625) < 0.08) return 'leading-relaxed';
  }
  if (lhPx !== null && PX_TO_SPACING_SCALE[lhPx]) {
    return `leading-${PX_TO_SPACING_SCALE[lhPx]}`;
  }
  return `leading-[${v}]`;
}

function mapLetterSpacingToken(rawVal: string): string | null {
  const v = rawVal.trim().toLowerCase();
  if (v === '0' || v === '0px' || v === 'normal') return null;
  const emMatch = /^(-?\d+(?:\.\d+)?)em$/.exec(v);
  if (emMatch) {
    const em = Number.parseFloat(emMatch[1]);
    if (em <= -0.04) return 'tracking-tighter';
    if (em < 0) return 'tracking-tight';
    if (em >= 0.08) return 'tracking-widest';
    if (em >= 0.04) return 'tracking-wider';
    if (em > 0) return 'tracking-wide';
  }
  const px = parseCssLengthPx(v);
  if (px !== null) {
    if (px <= -0.8) return 'tracking-tighter';
    if (px < 0) return 'tracking-tight';
    if (px >= 1.2) return 'tracking-widest';
    if (px >= 0.6) return 'tracking-wider';
    if (px > 0) return 'tracking-wide';
  }
  return `tracking-[${v}]`;
}

function mapGradientToTailwind(bgImage: string): string[] {
  const s = bgImage.trim();
  const linMatch = /^linear-gradient\(\s*([\s\S]+)\s*\)$/i.exec(s);
  if (linMatch) {
    const args = splitGradientArgs(linMatch[1]);
    if (args.length >= 2) {
      let dirClass = 'bg-gradient-to-b';
      let colorStartIdx = 0;
      const first = args[0].toLowerCase().trim();

      if (first.startsWith('to ') || first.endsWith('deg')) {
        colorStartIdx = 1;
        if (first === 'to right' || first === '90deg') dirClass = 'bg-gradient-to-r';
        else if (first === 'to left' || first === '270deg' || first === '-90deg')
          dirClass = 'bg-gradient-to-l';
        else if (first === 'to top' || first === '0deg') dirClass = 'bg-gradient-to-t';
        else if (first === 'to bottom' || first === '180deg') dirClass = 'bg-gradient-to-b';
        else if (first === 'to bottom right' || first === '135deg') dirClass = 'bg-gradient-to-br';
        else if (first === 'to top right' || first === '45deg') dirClass = 'bg-gradient-to-tr';
        else if (first === 'to bottom left' || first === '225deg') dirClass = 'bg-gradient-to-bl';
        else if (first === 'to top left' || first === '315deg') dirClass = 'bg-gradient-to-tl';
      }

      const stops = args.slice(colorStartIdx).map((stop) => extractStopColor(stop));
      if (stops.length === 2 && stops[0] && stops[1]) {
        const fromCls = mapColorToTailwindUtility('from', stops[0]);
        const toCls = mapColorToTailwindUtility('to', stops[1]);
        if (fromCls && toCls) return [dirClass, fromCls, toCls];
      }
      if (stops.length === 3 && stops[0] && stops[1] && stops[2]) {
        const fromCls = mapColorToTailwindUtility('from', stops[0]);
        const viaCls = mapColorToTailwindUtility('via', stops[1]);
        const toCls = mapColorToTailwindUtility('to', stops[2]);
        if (fromCls && viaCls && toCls) return [dirClass, fromCls, viaCls, toCls];
      }
    }
  }
  if (/gradient\(/i.test(s)) {
    return [`bg-[${s.replace(/\s+/g, '_')}]`];
  }
  return [];
}

function splitGradientArgs(inner: string): string[] {
  const out: string[] = [];
  let cur = '';
  let paren = 0;
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (ch === '(') paren++;
    else if (ch === ')') paren = Math.max(0, paren - 1);
    if (ch === ',' && paren === 0) {
      if (cur.trim()) out.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function extractStopColor(stop: string): string | null {
  const tokens = splitCssTokens(stop);
  return tokens[0] ?? null;
}

function emitBorderUtilities(classes: string[], styles: StyleMap): void {
  const sides = ['top', 'right', 'bottom', 'left'] as const;
  const sideShort: Record<(typeof sides)[number], string> = {
    top: 't',
    right: 'r',
    bottom: 'b',
    left: 'l',
  };

  const widths = sides.map((s) => styles[`border-${s}-width`]);
  const bStyles = sides.map((s) => styles[`border-${s}-style`]);
  const colors = sides.map((s) => styles[`border-${s}-color`]);

  const activeSides = sides.filter((_, idx) => {
    const w = widths[idx];
    const st = bStyles[idx];
    return Boolean((w && parseCssLengthPx(w) !== 0) || (st && st !== 'none'));
  });
  if (activeSides.length === 0) return;

  const mapWidthSuffix = (w: string | undefined): string => {
    const px = w ? parseCssLengthPx(w) : 1;
    if (px === null || px === 1) return '';
    if (px === 2 || px === 4 || px === 8) return `-${px}`;
    return `-[${w}]`;
  };

  if (activeSides.length === 4 && widths.every((w) => w === widths[0])) {
    const suffix = mapWidthSuffix(widths[0]);
    classes.push(`border${suffix}`);
  } else {
    for (const s of activeSides) {
      const idx = sides.indexOf(s);
      const suffix = mapWidthSuffix(widths[idx]);
      classes.push(`border-${sideShort[s]}${suffix}`);
    }
  }

  const firstStyle = bStyles.find((st) => st && st !== 'solid' && st !== 'none');
  if (firstStyle === 'dashed' || firstStyle === 'dotted' || firstStyle === 'double') {
    classes.push(`border-${firstStyle}`);
  }

  const firstColor = colors.find(Boolean);
  if (firstColor && firstColor.toLowerCase() !== 'currentcolor') {
    const colorCls = mapColorToTailwindUtility('border', firstColor);
    if (colorCls) classes.push(colorCls);
  }
}

function emitRadiusUtilities(classes: string[], styles: StyleMap): void {
  const tl = styles['border-top-left-radius'];
  const tr = styles['border-top-right-radius'];
  const br = styles['border-bottom-right-radius'];
  const bl = styles['border-bottom-left-radius'];

  const mapRadius = (prefix: string, val: string): string | null => {
    const v = val.trim().toLowerCase();
    if (v === '50%' || v === '9999px' || v === '999px') return `${prefix}-full`;
    const px = parseCssLengthPx(v);
    if (px !== null) {
      if (px === 0) return null;
      if (px <= 2) return `${prefix}-sm`;
      if (px <= 4) return prefix;
      if (px <= 6) return `${prefix}-md`;
      if (px <= 8) return `${prefix}-lg`;
      if (px <= 12) return `${prefix}-xl`;
      if (px <= 16) return `${prefix}-2xl`;
      if (px <= 24) return `${prefix}-3xl`;
      if (px >= 999) return `${prefix}-full`;
    }
    return `${prefix}-[${v}]`;
  };

  if (tl && tl === tr && tl === br && tl === bl) {
    const cls = mapRadius('rounded', tl);
    if (cls) classes.push(cls);
    return;
  }
  if (tl) {
    const cls = mapRadius('rounded-tl', tl);
    if (cls) classes.push(cls);
  }
  if (tr) {
    const cls = mapRadius('rounded-tr', tr);
    if (cls) classes.push(cls);
  }
  if (br) {
    const cls = mapRadius('rounded-br', br);
    if (cls) classes.push(cls);
  }
  if (bl) {
    const cls = mapRadius('rounded-bl', bl);
    if (cls) classes.push(cls);
  }
}

function mapBoxShadowToTailwind(shadow: string): string[] {
  const s = shadow.trim();
  if (!s || s.toLowerCase() === 'none') return [];
  if (/\binset\b/i.test(s)) return ['shadow-inner'];

  // Ring-style outline shadow `0 0 0 1px ...`
  const ringMatch = /^0(?:px)?\s+0(?:px)?\s+0(?:px)?\s+(\d+)px\s+(.+)$/i.exec(s);
  if (ringMatch) {
    const ringW = ringMatch[1];
    return [ringW === '1' ? 'ring-1' : ringW === '2' ? 'ring-2' : `ring-[${ringW}px]`];
  }

  // Classify standard elevation by max blur radius
  const pxNums = Array.from(s.matchAll(/(-?\d+(?:\.\d+)?)px/g)).map((m) =>
    Math.abs(Number.parseFloat(m[1])),
  );
  const maxBlur = pxNums.length >= 3 ? Math.max(...pxNums) : 6;
  if (maxBlur <= 3) return ['shadow-sm'];
  if (maxBlur <= 6) return ['shadow'];
  if (maxBlur <= 10) return ['shadow-md'];
  if (maxBlur <= 18) return ['shadow-lg'];
  if (maxBlur <= 28) return ['shadow-xl'];
  return ['shadow-2xl'];
}

function mapTransformToTailwind(transform: string): string[] {
  const out: string[] = [];
  const tyMatch = /translateY\(\s*(-?\d+(?:\.\d+)?)px\s*\)/i.exec(transform);
  if (tyMatch) {
    const px = Number.parseFloat(tyMatch[1]);
    const tok = mapSpacingToken('translate-y', `${px}px`);
    if (tok) out.push(tok);
  }
  const scaleMatch = /scale\(\s*(\d+(?:\.\d+)?)\s*\)/i.exec(transform);
  if (scaleMatch) {
    const pct = Math.round(Number.parseFloat(scaleMatch[1]) * 100);
    if ([95, 100, 105, 110].includes(pct)) out.push(`scale-${pct}`);
    else out.push(`scale-[${scaleMatch[1]}]`);
  }
  return out;
}

/**
 * Merges preserved element classes with newly reverse-compiled Tailwind utilities
 * and optional `hover:*` utilities without duplicates.
 */
export function compileElementTailwindClasses(params: {
  rawClassAttr: string;
  cleanStyles: StyleMap;
  hoverStyles?: StyleMap;
  includeHoverStyles?: boolean;
  consumedStylesheetClasses?: Set<string>;
}): { classes: string[]; strippedClassCount: number } {
  const { keptClasses, strippedClasses } = sanitizeClassList(
    params.rawClassAttr,
    params.consumedStylesheetClasses,
  );
  const baseUtilities = mapStylesToTailwind(params.cleanStyles);

  const hoverUtilities: string[] = [];
  if (params.includeHoverStyles && params.hoverStyles && Object.keys(params.hoverStyles).length > 0) {
    for (const cls of mapStylesToTailwind(params.hoverStyles)) {
      hoverUtilities.push(`hover:${cls}`);
    }
  }

  const merged: string[] = [];
  const seen = new Set<string>();
  for (const cls of [...keptClasses, ...baseUtilities, ...hoverUtilities]) {
    if (cls && !seen.has(cls)) {
      seen.add(cls);
      merged.push(cls);
    }
  }

  return {
    classes: merged,
    strippedClassCount: strippedClasses,
  };
}
