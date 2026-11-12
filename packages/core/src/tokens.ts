import { getClassString, getElementChildren, normalizeDomInput } from './dom-adapter';
import { diffElementStyles, parseCssStylesheet, type StyleMap } from './style-differ';
import {
  normalizeCssColorToken,
  parseCssLengthPx,
  TAILWIND_TOKEN_TO_HEX,
} from './tailwind-mapper';
import type { DesignTokens, GrabInput, GrabOptions } from './types';

const GENERIC_FONT_FAMILIES = new Set([
  'sans-serif',
  'serif',
  'monospace',
  'system-ui',
  '-apple-system',
  'blinkmacsystemfont',
  'ui-sans-serif',
  'ui-serif',
  'ui-monospace',
  'cursive',
  'fantasy',
  'inherit',
  'initial',
]);

const TAILWIND_RADIUS_TO_PX: Record<string, string> = {
  'rounded-sm': '2px',
  rounded: '4px',
  'rounded-md': '6px',
  'rounded-lg': '8px',
  'rounded-xl': '12px',
  'rounded-2xl': '16px',
  'rounded-3xl': '24px',
  'rounded-full': '9999px',
};

const TAILWIND_SHADOW_TO_CSS: Record<string, string> = {
  'shadow-sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  shadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
  'shadow-md': '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  'shadow-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  'shadow-xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  'shadow-2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  'shadow-inner': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
};

const TAILWIND_SCALE_TO_PX: Record<string, string> = {
  px: '1px',
  '0.5': '2px',
  '1': '4px',
  '1.5': '6px',
  '2': '8px',
  '2.5': '10px',
  '3': '12px',
  '3.5': '14px',
  '4': '16px',
  '5': '20px',
  '6': '24px',
  '7': '28px',
  '8': '32px',
  '9': '36px',
  '10': '40px',
  '11': '44px',
  '12': '48px',
  '14': '56px',
  '16': '64px',
  '20': '80px',
  '24': '96px',
};

export class DesignTokenCollector {
  private colors = new Map<string, number>();
  private fonts = new Map<string, number>();
  private radii = new Map<string, number>();
  private shadows = new Map<string, number>();
  private spacings = new Map<string, number>();

  private bump(map: Map<string, number>, val: string | null | undefined): void {
    if (!val) return;
    const clean = val.trim();
    if (!clean) return;
    map.set(clean, (map.get(clean) ?? 0) + 1);
  }

  recordStyles(cleanStyles: StyleMap): void {
    // 1. Colors (`color`, `background-color`, `border-*-color`, gradient color stops)
    const colorProps = [
      'color',
      'background-color',
      'border-top-color',
      'border-right-color',
      'border-bottom-color',
      'border-left-color',
    ];
    for (const p of colorProps) {
      if (cleanStyles[p]) {
        this.bump(this.colors, normalizeCssColorToken(cleanStyles[p]));
      }
    }

    if (cleanStyles['background-image']) {
      const bgImg = cleanStyles['background-image'];
      const colorMatches = bgImg.match(
        /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]+\)|hsla?\([^)]+\)/g,
      );
      if (colorMatches) {
        for (const c of colorMatches) {
          this.bump(this.colors, normalizeCssColorToken(c));
        }
      }
    }

    // 2. Fonts
    if (cleanStyles['font-family']) {
      const families = cleanStyles['font-family']
        .split(',')
        .map((f) => f.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean);
      const named = families.find((f) => !GENERIC_FONT_FAMILIES.has(f.toLowerCase()));
      if (named) {
        this.bump(this.fonts, named);
      } else if (families[0]) {
        this.bump(this.fonts, families[0]);
      }
    }

    // 3. Radii
    const radiusSet = new Set<string>();
    for (const rProp of [
      'border-top-left-radius',
      'border-top-right-radius',
      'border-bottom-right-radius',
      'border-bottom-left-radius',
    ]) {
      const rv = cleanStyles[rProp];
      if (!rv) continue;
      const px = parseCssLengthPx(rv);
      if (px !== null && px > 0) {
        radiusSet.add(`${Number(px.toFixed(2))}px`);
      } else if (rv === '50%' || rv === '9999px') {
        radiusSet.add('9999px');
      }
    }
    for (const r of radiusSet) this.bump(this.radii, r);

    // 4. Shadows
    if (cleanStyles['box-shadow'] && cleanStyles['box-shadow'].toLowerCase() !== 'none') {
      this.bump(this.shadows, cleanStyles['box-shadow'].replace(/\s+/g, ' ').trim());
    }

    // 5. Spacings (`padding-*`, `margin-*`, `row-gap`, `column-gap`)
    const spacingSet = new Set<string>();
    for (const sProp of [
      'padding-top',
      'padding-right',
      'padding-bottom',
      'padding-left',
      'margin-top',
      'margin-right',
      'margin-bottom',
      'margin-left',
      'row-gap',
      'column-gap',
    ]) {
      const sv = cleanStyles[sProp];
      if (!sv || sv === 'auto') continue;
      const px = parseCssLengthPx(sv);
      if (px !== null && px > 0) {
        spacingSet.add(`${Number(px.toFixed(2))}px`);
      }
    }
    for (const s of spacingSet) this.bump(this.spacings, s);
  }

  recordUtilityClasses(classes: string[]): void {
    for (const rawCls of classes) {
      // Strip responsive/state prefix (`hover:bg-indigo-500` -> `bg-indigo-500`)
      const base = rawCls.includes(':') ? rawCls.slice(rawCls.lastIndexOf(':') + 1) : rawCls;

      // Color utilities: `bg-*`, `text-*`, `border-*`, `from-*`, `via-*`, `to-*`
      const colorMatch = /^(?:bg|text|border|from|via|to)-(.+?)(?:\/\d+)?$/.exec(base);
      if (colorMatch) {
        const token = colorMatch[1];
        if (token.startsWith('[') && token.endsWith(']')) {
          const inner = token.slice(1, -1);
          this.bump(this.colors, normalizeCssColorToken(inner));
        } else if (TAILWIND_TOKEN_TO_HEX.has(token)) {
          this.bump(this.colors, TAILWIND_TOKEN_TO_HEX.get(token)!);
        }
      }

      // Font utilities
      if (base === 'font-mono') this.bump(this.fonts, 'monospace');
      else if (base === 'font-serif') this.bump(this.fonts, 'serif');

      // Radius utilities
      if (TAILWIND_RADIUS_TO_PX[base]) {
        this.bump(this.radii, TAILWIND_RADIUS_TO_PX[base]);
      } else {
        const arbRad = /^rounded-\[([^\]]+)\]$/.exec(base);
        if (arbRad) this.bump(this.radii, arbRad[1]);
      }

      // Shadow utilities
      if (TAILWIND_SHADOW_TO_CSS[base]) {
        this.bump(this.shadows, TAILWIND_SHADOW_TO_CSS[base]);
      }

      // Spacing utilities (`p-6`, `px-4`, `py-3`, `gap-4`, `m-4`)
      const spMatch = /^(?:p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|gap-x|gap-y)-(.+)$/.exec(
        base,
      );
      if (spMatch) {
        const spTok = spMatch[1];
        if (TAILWIND_SCALE_TO_PX[spTok]) {
          this.bump(this.spacings, TAILWIND_SCALE_TO_PX[spTok]);
        } else if (spTok.startsWith('[') && spTok.endsWith(']')) {
          const px = parseCssLengthPx(spTok.slice(1, -1));
          if (px !== null && px > 0) this.bump(this.spacings, `${Number(px.toFixed(2))}px`);
        }
      }
    }
  }

  toDesignTokens(maxPerCategory = 16): DesignTokens {
    const rank = (map: Map<string, number>): string[] =>
      Array.from(map.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, maxPerCategory)
        .map(([k]) => k);

    return {
      colors: rank(this.colors),
      fonts: rank(this.fonts),
      radii: rank(this.radii),
      shadows: rank(this.shadows),
      spacings: rank(this.spacings),
    };
  }
}

/**
 * Extracts high-frequency visual `DesignTokens` (`colors`, `fonts`, `radii`, `shadows`, `spacings`)
 * from a DOM node or HTML+CSS string.
 */
export function extractDesignTokens(input: GrabInput, options: GrabOptions = {}): DesignTokens {
  const normalized = normalizeDomInput(input, {
    selector: options.selector,
  });
  const stylesheet = parseCssStylesheet(normalized.extractedCssText);
  const collector = new DesignTokenCollector();

  const walk = (el: Element, parentInherited: StyleMap, parentVars: StyleMap): void => {
    const tag = el.tagName?.toLowerCase?.() ?? '';
    if (tag === 'script' || tag === 'style' || tag === 'noscript' || tag === 'template') {
      return;
    }

    const diff = diffElementStyles(el, {
      stylesheet,
      styleResolver: options.styleResolver,
      includeHoverStyles: options.includeHoverStyles,
      parentInherited,
      parentVariables: parentVars,
    });

    if (diff.isHidden) return;

    collector.recordStyles(diff.cleanStyles);
    const rawCls = getClassString(el).trim();
    if (rawCls) {
      collector.recordUtilityClasses(rawCls.split(/\s+/));
    }

    for (const child of getElementChildren(el)) {
      walk(child, diff.nextInherited, diff.nextVariables);
    }
  };

  walk(normalized.rootElement, {}, stylesheet.rootVariables);
  return collector.toDesignTokens();
}
