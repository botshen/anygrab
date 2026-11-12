import {
  compareSpecificity,
  computeSelectorSpecificity,
  getElementAttr,
  getLowerTag,
  matchesSingleSelector,
  parseInlineStyleMap,
  selectorHasHover,
  splitSelectorList,
  type SpecificityTuple,
} from './dom-adapter';
import type { ResolvedStyle, StyleResolver } from './types';

export type StyleMap = Record<string, string>;

export interface ParsedCssRule {
  selector: string;
  specificity: SpecificityTuple;
  order: number;
  isHover: boolean;
  declarations: StyleMap;
  importantProps: Set<string>;
}

export interface ParsedStylesheet {
  rules: ParsedCssRule[];
  rootVariables: StyleMap;
  /** Class names referenced by selectors in `<style>` blocks (consumed during Tailwind compilation) */
  definedClassNames: Set<string>;
}

const BLOCK_TAGS = new Set([
  'address',
  'article',
  'aside',
  'blockquote',
  'body',
  'details',
  'dialog',
  'dd',
  'div',
  'dl',
  'dt',
  'fieldset',
  'figcaption',
  'figure',
  'footer',
  'form',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'hgroup',
  'hr',
  'html',
  'main',
  'nav',
  'ol',
  'p',
  'pre',
  'search',
  'section',
  'ul',
]);

const INLINE_TAGS = new Set([
  'a',
  'abbr',
  'b',
  'bdi',
  'bdo',
  'cite',
  'code',
  'data',
  'del',
  'dfn',
  'em',
  'i',
  'ins',
  'kbd',
  'label',
  'mark',
  'output',
  'q',
  's',
  'samp',
  'small',
  'span',
  'strong',
  'sub',
  'sup',
  'time',
  'u',
  'var',
]);

const INLINE_BLOCK_TAGS = new Set([
  'audio',
  'button',
  'canvas',
  'img',
  'input',
  'meter',
  'progress',
  'select',
  'svg',
  'textarea',
  'video',
]);

const SPECIAL_TAG_DISPLAY: Record<string, string[]> = {
  table: ['table'],
  thead: ['table-header-group'],
  tbody: ['table-row-group'],
  tfoot: ['table-footer-group'],
  tr: ['table-row'],
  td: ['table-cell'],
  th: ['table-cell'],
  caption: ['table-caption'],
  colgroup: ['table-column-group'],
  col: ['table-column'],
  li: ['list-item'],
  summary: ['list-item'],
};

const FLOW_TEXT_TAGS = new Set([
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'span',
  'strong',
  'b',
  'em',
  'i',
  'li',
  'ul',
  'ol',
  'dl',
  'dt',
  'dd',
  'blockquote',
  'tr',
  'thead',
  'tbody',
  'tfoot',
]);

/**
 * Inheritable CSS properties deduplicated between parent and child elements.
 */
export const INHERITABLE_PROPERTIES = new Set([
  'color',
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'line-height',
  'letter-spacing',
  'text-align',
  'text-transform',
  'white-space',
  'visibility',
  'cursor',
  'list-style-type',
]);

/**
 * Curated list of visual & layout CSS properties queried from `CSSStyleDeclaration` / `getComputedStyle`.
 */
export const COMPUTED_STYLE_PROPERTIES = [
  'display',
  'position',
  'top',
  'right',
  'bottom',
  'left',
  'z-index',
  'flex-direction',
  'flex-wrap',
  'justify-content',
  'align-items',
  'align-content',
  'align-self',
  'flex-grow',
  'flex-shrink',
  'flex-basis',
  'grid-template-columns',
  'grid-template-rows',
  'grid-column',
  'grid-row',
  'row-gap',
  'column-gap',
  'gap',
  'width',
  'min-width',
  'max-width',
  'height',
  'min-height',
  'max-height',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'line-height',
  'letter-spacing',
  'text-align',
  'text-transform',
  'text-decoration-line',
  'text-decoration',
  'white-space',
  'text-overflow',
  'overflow-x',
  'overflow-y',
  'color',
  'background-color',
  'background-image',
  'border-top-width',
  'border-top-style',
  'border-top-color',
  'border-right-width',
  'border-right-style',
  'border-right-color',
  'border-bottom-width',
  'border-bottom-style',
  'border-bottom-color',
  'border-left-width',
  'border-left-style',
  'border-left-color',
  'border-top-left-radius',
  'border-top-right-radius',
  'border-bottom-right-radius',
  'border-bottom-left-radius',
  'box-shadow',
  'opacity',
  'visibility',
  'backdrop-filter',
  'transform',
  'cursor',
  'list-style-type',
  'object-fit',
  'box-sizing',
  'pointer-events',
  'user-select',
  'outline-style',
  'outline-width',
] as const;

/**
 * Universal CSS initial/default values stripped as browser noise.
 * Combined with tag-specific display/font/list defaults, covers 300+ tag x property pairs.
 */
const UNIVERSAL_DEFAULT_VALUES: Record<string, Set<string>> = {
  position: new Set(['static']),
  top: new Set(['auto']),
  right: new Set(['auto']),
  bottom: new Set(['auto']),
  left: new Set(['auto']),
  inset: new Set(['auto']),
  'z-index': new Set(['auto']),
  'flex-direction': new Set(['row']),
  'flex-wrap': new Set(['nowrap']),
  'justify-content': new Set(['normal', 'flex-start', 'start']),
  'align-items': new Set(['normal', 'stretch']),
  'align-content': new Set(['normal', 'stretch']),
  'align-self': new Set(['auto', 'normal']),
  'flex-grow': new Set(['0']),
  'flex-shrink': new Set(['1']),
  'flex-basis': new Set(['auto']),
  'grid-template-columns': new Set(['none']),
  'grid-template-rows': new Set(['none']),
  'grid-column': new Set(['auto', 'auto / auto']),
  'grid-row': new Set(['auto', 'auto / auto']),
  gap: new Set(['normal', '0', '0px']),
  'row-gap': new Set(['normal', '0', '0px']),
  'column-gap': new Set(['normal', '0', '0px']),
  width: new Set(['auto']),
  height: new Set(['auto']),
  'min-width': new Set(['0', '0px', 'auto']),
  'min-height': new Set(['0', '0px', 'auto']),
  'max-width': new Set(['none']),
  'max-height': new Set(['none']),
  'padding-top': new Set(['0', '0px']),
  'padding-right': new Set(['0', '0px']),
  'padding-bottom': new Set(['0', '0px']),
  'padding-left': new Set(['0', '0px']),
  'margin-top': new Set(['0', '0px']),
  'margin-right': new Set(['0', '0px']),
  'margin-bottom': new Set(['0', '0px']),
  'margin-left': new Set(['0', '0px']),
  'font-style': new Set(['normal']),
  'font-weight': new Set(['400', 'normal']),
  'letter-spacing': new Set(['normal', '0', '0px']),
  'text-align': new Set(['start', 'left']),
  'text-transform': new Set(['none']),
  'text-decoration': new Set(['none']),
  'text-decoration-line': new Set(['none']),
  'white-space': new Set(['normal']),
  'text-overflow': new Set(['clip']),
  'overflow-x': new Set(['visible']),
  'overflow-y': new Set(['visible']),
  overflow: new Set(['visible']),
  'background-color': new Set([
    'transparent',
    'rgba(0, 0, 0, 0)',
    'rgba(0,0,0,0)',
    'rgb(0 0 0 / 0)',
    'initial',
  ]),
  'background-image': new Set(['none']),
  'border-top-width': new Set(['0', '0px']),
  'border-right-width': new Set(['0', '0px']),
  'border-bottom-width': new Set(['0', '0px']),
  'border-left-width': new Set(['0', '0px']),
  'border-top-style': new Set(['none']),
  'border-right-style': new Set(['none']),
  'border-bottom-style': new Set(['none']),
  'border-left-style': new Set(['none']),
  'border-top-left-radius': new Set(['0', '0px']),
  'border-top-right-radius': new Set(['0', '0px']),
  'border-bottom-right-radius': new Set(['0', '0px']),
  'border-bottom-left-radius': new Set(['0', '0px']),
  'box-shadow': new Set(['none']),
  opacity: new Set(['1']),
  visibility: new Set(['visible']),
  'backdrop-filter': new Set(['none']),
  filter: new Set(['none']),
  transform: new Set(['none']),
  cursor: new Set(['auto', 'default']),
  'object-fit': new Set(['fill']),
  'box-sizing': new Set(['border-box', 'content-box']),
  float: new Set(['none']),
  clear: new Set(['none']),
  'pointer-events': new Set(['auto']),
  'user-select': new Set(['auto', 'text']),
  'outline-style': new Set(['none']),
  'outline-width': new Set(['0', '0px']),
};

const IGNORED_NOISE_PROPERTIES = new Set([
  '-webkit-font-smoothing',
  '-moz-osx-font-smoothing',
  '-webkit-tap-highlight-color',
  '-webkit-text-size-adjust',
  'text-rendering',
  'appearance',
  '-webkit-appearance',
  'transition',
  'transition-property',
  'transition-duration',
  'transition-timing-function',
  'transition-delay',
  'animation',
  'will-change',
  'contain',
  'isolation',
]);

// ============================================================================
// Stylesheet Block & Rule Parser
// ============================================================================

function stripCssComments(css: string): string {
  if (!css.includes('/*')) return css;
  let out = '';
  let i = 0;
  let quote: string | null = null;

  while (i < css.length) {
    const ch = css[i];
    if (quote) {
      out += ch;
      if (ch === quote && css[i - 1] !== '\\') quote = null;
      i++;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      out += ch;
      i++;
      continue;
    }
    if (ch === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2);
      if (end < 0) break;
      i = end + 2;
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

function shouldApplyMediaQuery(mediaQuery: string): boolean {
  const q = mediaQuery.trim().toLowerCase();
  if (!q) return true;
  if (/\bprint\b/.test(q) && !/\bscreen\b/.test(q)) return false;
  if (/\bprefers-reduced-motion\s*:\s*reduce\b/.test(q)) return false;

  // Evaluate desktop viewport width (1280px)
  const maxMatch = /max-width\s*:\s*([\d.]+)(px|rem|em)/.exec(q);
  if (maxMatch) {
    const num = Number.parseFloat(maxMatch[1]);
    const px = maxMatch[2] === 'px' ? num : num * 16;
    if (1280 > px) return false;
  }

  const minMatch = /min-width\s*:\s*([\d.]+)(px|rem|em)/.exec(q);
  if (minMatch) {
    const num = Number.parseFloat(minMatch[1]);
    const px = minMatch[2] === 'px' ? num : num * 16;
    if (1280 < px) return false;
  }

  return true;
}

function parseRuleDeclarationBlock(blockText: string): {
  declarations: StyleMap;
  importantProps: Set<string>;
} {
  const declarations: StyleMap = {};
  const importantProps = new Set<string>();

  let cur = '';
  let paren = 0;
  let quote: string | null = null;

  const commit = (raw: string): void => {
    const colon = raw.indexOf(':');
    if (colon <= 0) return;
    const rawProp = raw.slice(0, colon).trim();
    let val = raw.slice(colon + 1).trim();
    if (!rawProp || !val) return;
    const prop = rawProp.startsWith('--') ? rawProp : rawProp.toLowerCase();
    const isImportant = /!important\s*$/i.test(val);
    if (isImportant) {
      val = val.replace(/\s*!important\s*$/i, '').trim();
    }
    if (!val) return;
    if (importantProps.has(prop) && !isImportant) return;
    declarations[prop] = val;
    if (isImportant) importantProps.add(prop);
  };

  for (let i = 0; i < blockText.length; i++) {
    const ch = blockText[i];
    if (quote) {
      cur += ch;
      if (ch === quote && blockText[i - 1] !== '\\') quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      cur += ch;
      continue;
    }
    if (ch === '(') paren++;
    else if (ch === ')') paren = Math.max(0, paren - 1);

    if (ch === ';' && paren === 0) {
      commit(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) commit(cur);

  return { declarations, importantProps };
}

export function parseCssStylesheet(cssText: string): ParsedStylesheet {
  const rules: ParsedCssRule[] = [];
  const rootVariables: StyleMap = {};
  const definedClassNames = new Set<string>();
  if (!cssText || !cssText.trim()) {
    return { rules, rootVariables, definedClassNames };
  }

  const cleaned = stripCssComments(cssText);
  let orderCounter = 0;

  const parseSegment = (segment: string): void => {
    let i = 0;
    const len = segment.length;

    while (i < len) {
      while (i < len && /\s/.test(segment[i])) i++;
      if (i >= len) break;

      // Find next `{` or `;` at top-level
      let cursor = i;
      let quote: string | null = null;
      let paren = 0;
      while (cursor < len) {
        const c = segment[cursor];
        if (quote) {
          if (c === quote && segment[cursor - 1] !== '\\') quote = null;
        } else if (c === '"' || c === "'") {
          quote = c;
        } else if (c === '(') {
          paren++;
        } else if (c === ')') {
          paren = Math.max(0, paren - 1);
        } else if (paren === 0 && (c === '{' || c === ';')) {
          break;
        }
        cursor++;
      }

      if (cursor >= len) break;

      const prelude = segment.slice(i, cursor).trim();
      if (segment[cursor] === ';') {
        // Statement at-rule like `@import ...;` or `@charset ...;`
        i = cursor + 1;
        continue;
      }

      // Find matching `}` for `{` at `cursor`
      let braceDepth = 1;
      let bodyEnd = cursor + 1;
      quote = null;
      while (bodyEnd < len && braceDepth > 0) {
        const c = segment[bodyEnd];
        if (quote) {
          if (c === quote && segment[bodyEnd - 1] !== '\\') quote = null;
        } else if (c === '"' || c === "'") {
          quote = c;
        } else if (c === '{') {
          braceDepth++;
        } else if (c === '}') {
          braceDepth--;
        }
        bodyEnd++;
      }

      const body = segment.slice(cursor + 1, Math.max(cursor + 1, bodyEnd - 1));
      i = bodyEnd;

      if (!prelude) continue;

      if (prelude.startsWith('@')) {
        const atMatch = /^@([a-zA-Z-]+)\s*([\s\S]*)$/.exec(prelude);
        const atName = (atMatch?.[1] ?? '').toLowerCase();
        const atArg = (atMatch?.[2] ?? '').trim();

        if (
          atName === 'keyframes' ||
          atName === '-webkit-keyframes' ||
          atName === 'font-face' ||
          atName === 'page' ||
          atName === 'property' ||
          atName === 'counter-style'
        ) {
          continue;
        }
        if (atName === 'media') {
          if (shouldApplyMediaQuery(atArg)) {
            parseSegment(body);
          }
          continue;
        }
        if (atName === 'supports' || atName === 'layer' || atName === 'container') {
          parseSegment(body);
          continue;
        }
        continue;
      }

      const { declarations, importantProps } = parseRuleDeclarationBlock(body);
      if (Object.keys(declarations).length === 0) continue;

      const selectors = splitSelectorList(prelude);
      for (const single of selectors) {
        const trimmed = single.trim();
        if (!trimmed) continue;

        // Seed root custom variables from :root, html, body, or *
        if (
          trimmed === ':root' ||
          trimmed === 'html' ||
          trimmed === 'body' ||
          trimmed === '*'
        ) {
          for (const [k, v] of Object.entries(declarations)) {
            if (k.startsWith('--')) {
              rootVariables[k] = v;
            }
          }
        }

        for (const cm of trimmed.matchAll(/\.([a-zA-Z_-][a-zA-Z0-9_-]*)/g)) {
          definedClassNames.add(cm[1]);
        }

        rules.push({
          selector: trimmed,
          specificity: computeSelectorSpecificity(trimmed),
          order: orderCounter++,
          isHover: selectorHasHover(trimmed),
          declarations,
          importantProps,
        });
      }
    }
  };

  parseSegment(cleaned);
  return { rules, rootVariables, definedClassNames };
}

// ============================================================================
// CSS Variable (`var(--x, fallback)`) & Shorthand Expansion
// ============================================================================

export function resolveCssVariables(value: string, vars: StyleMap, depth = 0): string {
  if (!value || !value.includes('var(') || depth > 8) return value;

  let out = '';
  let i = 0;
  while (i < value.length) {
    const idx = value.indexOf('var(', i);
    if (idx < 0) {
      out += value.slice(i);
      break;
    }
    out += value.slice(i, idx);
    let paren = 1;
    let end = idx + 4;
    while (end < value.length && paren > 0) {
      if (value[end] === '(') paren++;
      else if (value[end] === ')') paren--;
      end++;
    }
    const inner = value.slice(idx + 4, end - 1).trim();
    const commaIdx = findTopLevelComma(inner);
    const varName = (commaIdx >= 0 ? inner.slice(0, commaIdx) : inner).trim();
    const fallback = commaIdx >= 0 ? inner.slice(commaIdx + 1).trim() : '';

    const resolvedVar = vars[varName];
    if (resolvedVar !== undefined) {
      out += resolveCssVariables(resolvedVar, vars, depth + 1);
    } else if (fallback) {
      out += resolveCssVariables(fallback, vars, depth + 1);
    }
    i = end;
  }

  return out.trim();
}

function findTopLevelComma(str: string): number {
  let paren = 0;
  let quote: string | null = null;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (quote) {
      if (ch === quote && str[i - 1] !== '\\') quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === '(') {
      paren++;
    } else if (ch === ')') {
      paren = Math.max(0, paren - 1);
    } else if (ch === ',' && paren === 0) {
      return i;
    }
  }
  return -1;
}

export function splitCssTokens(value: string): string[] {
  const tokens: string[] = [];
  let cur = '';
  let paren = 0;
  let quote: string | null = null;

  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (quote) {
      cur += ch;
      if (ch === quote && value[i - 1] !== '\\') quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      cur += ch;
      continue;
    }
    if (ch === '(') paren++;
    else if (ch === ')') paren = Math.max(0, paren - 1);

    if (/\s/.test(ch) && paren === 0) {
      if (cur) {
        tokens.push(cur);
        cur = '';
      }
      continue;
    }
    cur += ch;
  }
  if (cur) tokens.push(cur);
  return tokens;
}

function expandBoxQuad(raw: string): [string, string, string, string] {
  const parts = splitCssTokens(raw);
  if (parts.length === 1) return [parts[0], parts[0], parts[0], parts[0]];
  if (parts.length === 2) return [parts[0], parts[1], parts[0], parts[1]];
  if (parts.length === 3) return [parts[0], parts[1], parts[2], parts[1]];
  return [parts[0] ?? '0px', parts[1] ?? '0px', parts[2] ?? '0px', parts[3] ?? '0px'];
}

const BORDER_STYLES = new Set([
  'none',
  'hidden',
  'dotted',
  'dashed',
  'solid',
  'double',
  'groove',
  'ridge',
  'inset',
  'outset',
]);

function parseBorderShorthand(val: string): { width: string; style: string; color: string } {
  const trimmed = val.trim();
  if (trimmed === '0' || trimmed === 'none' || trimmed === '0px') {
    return { width: '0px', style: 'none', color: 'transparent' };
  }
  const tokens = splitCssTokens(trimmed);
  let width = '1px';
  let style = 'solid';
  let color = 'currentColor';

  for (const tok of tokens) {
    const lower = tok.toLowerCase();
    if (BORDER_STYLES.has(lower)) {
      style = lower;
    } else if (/^(\d+(\.\d+)?(px|rem|em)|0|thin|medium|thick)$/i.test(lower)) {
      width = lower === 'thin' ? '1px' : lower === 'medium' ? '3px' : lower === 'thick' ? '5px' : lower;
    } else {
      color = tok;
    }
  }
  return { width, style, color };
}

export function expandCssShorthands(rawMap: StyleMap): StyleMap {
  const out: StyleMap = {};

  for (const [prop, rawVal] of Object.entries(rawMap)) {
    if (prop.startsWith('--')) continue;
    const val = rawVal.trim();
    if (!val) continue;

    switch (prop) {
      case 'padding': {
        const [t, r, b, l] = expandBoxQuad(val);
        out['padding-top'] = t;
        out['padding-right'] = r;
        out['padding-bottom'] = b;
        out['padding-left'] = l;
        break;
      }
      case 'margin': {
        const [t, r, b, l] = expandBoxQuad(val);
        out['margin-top'] = t;
        out['margin-right'] = r;
        out['margin-bottom'] = b;
        out['margin-left'] = l;
        break;
      }
      case 'inset': {
        const [t, r, b, l] = expandBoxQuad(val);
        out['top'] = t;
        out['right'] = r;
        out['bottom'] = b;
        out['left'] = l;
        break;
      }
      case 'gap': {
        const parts = splitCssTokens(val);
        out['row-gap'] = parts[0] ?? val;
        out['column-gap'] = parts[1] ?? parts[0] ?? val;
        break;
      }
      case 'overflow': {
        const parts = splitCssTokens(val);
        out['overflow-x'] = parts[0] ?? val;
        out['overflow-y'] = parts[1] ?? parts[0] ?? val;
        break;
      }
      case 'border': {
        const { width, style, color } = parseBorderShorthand(val);
        for (const side of ['top', 'right', 'bottom', 'left'] as const) {
          out[`border-${side}-width`] = width;
          out[`border-${side}-style`] = style;
          out[`border-${side}-color`] = color;
        }
        break;
      }
      case 'border-top':
      case 'border-right':
      case 'border-bottom':
      case 'border-left': {
        const { width, style, color } = parseBorderShorthand(val);
        out[`${prop}-width`] = width;
        out[`${prop}-style`] = style;
        out[`${prop}-color`] = color;
        break;
      }
      case 'border-width': {
        const [t, r, b, l] = expandBoxQuad(val);
        out['border-top-width'] = t;
        out['border-right-width'] = r;
        out['border-bottom-width'] = b;
        out['border-left-width'] = l;
        break;
      }
      case 'border-style': {
        const [t, r, b, l] = expandBoxQuad(val);
        out['border-top-style'] = t;
        out['border-right-style'] = r;
        out['border-bottom-style'] = b;
        out['border-left-style'] = l;
        break;
      }
      case 'border-color': {
        const [t, r, b, l] = expandBoxQuad(val);
        out['border-top-color'] = t;
        out['border-right-color'] = r;
        out['border-bottom-color'] = b;
        out['border-left-color'] = l;
        break;
      }
      case 'border-radius': {
        const slashCleaned = val.split('/')[0].trim();
        const [tl, tr, br, bl] = expandBoxQuad(slashCleaned);
        out['border-top-left-radius'] = tl;
        out['border-top-right-radius'] = tr;
        out['border-bottom-right-radius'] = br;
        out['border-bottom-left-radius'] = bl;
        break;
      }
      case 'background': {
        if (val === 'none' || val === 'transparent') {
          out['background-color'] = 'transparent';
          out['background-image'] = 'none';
        } else if (/gradient\s*\(|url\s*\(/i.test(val)) {
          out['background-image'] = val;
        } else {
          const tokens = splitCssTokens(val);
          const colorTok = tokens.find(
            (t) =>
              t.startsWith('#') ||
              /^(rgba?|hsla?|oklch|color)\(/i.test(t) ||
              /^[a-zA-Z]+$/.test(t),
          );
          if (colorTok) {
            out['background-color'] = colorTok;
          }
        }
        break;
      }
      case 'flex': {
        if (val === 'none') {
          out['flex-grow'] = '0';
          out['flex-shrink'] = '0';
          out['flex-basis'] = 'auto';
        } else if (val === 'auto') {
          out['flex-grow'] = '1';
          out['flex-shrink'] = '1';
          out['flex-basis'] = 'auto';
        } else if (/^\d+(\.\d+)?$/.test(val)) {
          out['flex-grow'] = val;
          out['flex-shrink'] = '1';
          out['flex-basis'] = '0%';
        } else {
          const parts = splitCssTokens(val);
          if (parts[0]) out['flex-grow'] = parts[0];
          if (parts[1]) out['flex-shrink'] = parts[1];
          if (parts[2]) out['flex-basis'] = parts[2];
        }
        break;
      }
      case 'place-items': {
        const parts = splitCssTokens(val);
        out['align-items'] = parts[0] ?? val;
        if (parts[1]) out['justify-items'] = parts[1];
        break;
      }
      case 'place-content': {
        const parts = splitCssTokens(val);
        out['align-content'] = parts[0] ?? val;
        out['justify-content'] = parts[1] ?? parts[0] ?? val;
        break;
      }
      case 'font': {
        const fontMatch =
          /^(?:(italic|oblique)\s+)?(?:(\d{3}|bold|normal)\s+)?([\d.]+(?:px|rem|em|%))(?:\s*\/\s*([\d.]+(?:px|rem|em|%)?))?\s+(.+)$/i.exec(
            val,
          );
        if (fontMatch) {
          if (fontMatch[1]) out['font-style'] = fontMatch[1].toLowerCase();
          if (fontMatch[2]) out['font-weight'] = fontMatch[2].toLowerCase();
          out['font-size'] = fontMatch[3];
          if (fontMatch[4]) out['line-height'] = fontMatch[4];
          out['font-family'] = fontMatch[5].trim();
        }
        break;
      }
      case 'text-decoration': {
        const parts = splitCssTokens(val.toLowerCase());
        if (parts.includes('underline')) out['text-decoration-line'] = 'underline';
        else if (parts.includes('line-through')) out['text-decoration-line'] = 'line-through';
        else if (parts.includes('none')) out['text-decoration-line'] = 'none';
        else out['text-decoration-line'] = val;
        break;
      }
      default:
        out[prop] = val;
        break;
    }
  }

  return out;
}

// ============================================================================
// StyleResolver Reader + Dual-Mode Cascade + Default Subtraction
// ============================================================================

function camelToKebab(str: string): string {
  return str.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

export function readStyleFromResolver(resolved: ResolvedStyle | null | undefined): StyleMap {
  const raw: StyleMap = {};
  if (!resolved) return raw;

  if (typeof (resolved as { getPropertyValue?: unknown }).getPropertyValue === 'function') {
    const decl = resolved as { getPropertyValue(prop: string): string };
    for (const prop of COMPUTED_STYLE_PROPERTIES) {
      const val = decl.getPropertyValue(prop);
      if (typeof val === 'string' && val.trim()) {
        raw[prop] = val.trim();
      }
    }
    return expandCssShorthands(raw);
  }

  for (const [k, v] of Object.entries(resolved as Record<string, unknown>)) {
    if (typeof v === 'string' && v.trim()) {
      const kebab = k.startsWith('--') ? k : camelToKebab(k).toLowerCase();
      raw[kebab] = v.trim();
    }
  }
  return expandCssShorthands(raw);
}

function matchStylesheetCascade(
  el: Element,
  rules: ParsedCssRule[],
  inlineStyles: StyleMap,
  parentVars: StyleMap,
  hoverPass: boolean,
): { matched: StyleMap; mergedVars: StyleMap } {
  interface Candidate {
    specificity: SpecificityTuple;
    order: number;
    important: boolean;
    declarations: StyleMap;
    importantProps: Set<string>;
  }

  const candidates: Candidate[] = [];
  for (const rule of rules) {
    if (hoverPass) {
      // Hover pass matches rules containing :hover
      if (!rule.isHover) continue;
      if (matchesSingleSelector(el, rule.selector, { hoverState: true })) {
        candidates.push({
          specificity: rule.specificity,
          order: rule.order,
          important: rule.importantProps.size > 0,
          declarations: rule.declarations,
          importantProps: rule.importantProps,
        });
      }
    } else {
      if (rule.isHover) continue;
      if (matchesSingleSelector(el, rule.selector, { hoverState: false })) {
        candidates.push({
          specificity: rule.specificity,
          order: rule.order,
          important: rule.importantProps.size > 0,
          declarations: rule.declarations,
          importantProps: rule.importantProps,
        });
      }
    }
  }

  candidates.sort((a, b) => {
    const cmp = compareSpecificity(a.specificity, b.specificity);
    return cmp !== 0 ? cmp : a.order - b.order;
  });

  const normalProps: StyleMap = {};
  const importantOverrides: StyleMap = {};

  for (const c of candidates) {
    for (const [prop, val] of Object.entries(c.declarations)) {
      if (c.importantProps.has(prop)) {
        importantOverrides[prop] = val;
      } else {
        normalProps[prop] = val;
      }
    }
  }

  const combined: StyleMap = hoverPass
    ? { ...normalProps, ...importantOverrides }
    : { ...normalProps, ...inlineStyles, ...importantOverrides };

  // Build cascaded custom properties (`--*`)
  const mergedVars: StyleMap = { ...parentVars };
  for (const [k, v] of Object.entries(combined)) {
    if (k.startsWith('--')) {
      mergedVars[k] = v;
    }
  }

  // Resolve `var(--x)` across all declarations
  const resolved: StyleMap = {};
  for (const [k, v] of Object.entries(combined)) {
    if (k.startsWith('--')) continue;
    const expanded = resolveCssVariables(v, mergedVars);
    if (expanded) {
      resolved[k] = expanded;
    }
  }

  return {
    matched: expandCssShorthands(resolved),
    mergedVars,
  };
}

function isTagDefaultDisplay(tag: string, displayVal: string): boolean {
  const lower = displayVal.toLowerCase();
  if (SPECIAL_TAG_DISPLAY[tag]?.includes(lower)) return true;
  if (BLOCK_TAGS.has(tag) && lower === 'block') return true;
  if (INLINE_TAGS.has(tag) && lower === 'inline') return true;
  if (INLINE_BLOCK_TAGS.has(tag) && (lower === 'inline-block' || lower === 'inline')) return true;
  return false;
}

function normalizeStyleValueForCompare(prop: string, val: string): string {
  const v = val.trim().toLowerCase().replace(/\s+/g, ' ');
  if (prop === 'font-weight') {
    if (v === 'normal') return '400';
    if (v === 'bold') return '700';
  }
  return v;
}

export interface ElementStyleDiffResult {
  /** Whether element is visually hidden (`display: none` or `visibility: hidden`) */
  isHidden: boolean;
  /** Distilled non-default, non-inherited CSS properties */
  cleanStyles: StyleMap;
  /** Distilled `:hover` delta properties (populated when `includeHoverStyles: true`) */
  hoverStyles: StyleMap;
  /** Count of redundant/default/inherited CSS properties stripped on this element */
  strippedCount: number;
  /** Cascaded inheritable properties passed down to children */
  nextInherited: StyleMap;
  /** Cascaded CSS custom properties (`--*`) passed down to children */
  nextVariables: StyleMap;
}

export interface DiffElementStyleContext {
  stylesheet: ParsedStylesheet;
  styleResolver?: StyleResolver;
  includeHoverStyles?: boolean;
  parentInherited: StyleMap;
  parentVariables: StyleMap;
}

/**
 * Resolves an element's effective styles (via `styleResolver` or built-in `<style>` + inline cascade),
 * strips 300+ browser UA defaults, and deduplicates inherited typography properties from parent.
 */
export function diffElementStyles(
  el: Element,
  ctx: DiffElementStyleContext,
): ElementStyleDiffResult {
  const tag = getLowerTag(el);
  const inlineRaw = parseInlineStyleMap(getElementAttr(el, 'style'));
  const expandedInline = expandCssShorthands(inlineRaw);

  const { matched: ruleBaseStyles, mergedVars: nextVariables } = matchStylesheetCascade(
    el,
    ctx.stylesheet.rules,
    inlineRaw,
    ctx.parentVariables,
    false,
  );

  let rawBase: StyleMap;
  const usedExternalResolver = Boolean(ctx.styleResolver);

  if (ctx.styleResolver) {
    const resolved = readStyleFromResolver(ctx.styleResolver(el, null));
    // Merge `<style>` / inline fallback if resolver returned partial properties
    rawBase = Object.keys(resolved).length > 0 ? resolved : ruleBaseStyles;
  } else {
    rawBase = ruleBaseStyles;
  }

  const displayVal = (rawBase['display'] ?? '').toLowerCase();
  const visibilityVal = (rawBase['visibility'] ?? '').toLowerCase();
  if (displayVal === 'none' || visibilityVal === 'hidden') {
    return {
      isHidden: true,
      cleanStyles: {},
      hoverStyles: {},
      strippedCount: Object.keys(rawBase).length,
      nextInherited: ctx.parentInherited,
      nextVariables,
    };
  }

  let strippedCount = 0;
  const cleanStyles: StyleMap = {};
  const nextInherited: StyleMap = { ...ctx.parentInherited };

  // Pre-prune inactive border sides (when style is none or width is 0, border-color is UA noise)
  const working: StyleMap = { ...rawBase };
  for (const side of ['top', 'right', 'bottom', 'left'] as const) {
    const bw = (working[`border-${side}-width`] ?? '').toLowerCase();
    const bs = (working[`border-${side}-style`] ?? '').toLowerCase();
    const hasNoBorder =
      bs === 'none' ||
      bs === 'hidden' ||
      bw === '0' ||
      bw === '0px' ||
      (!bs && !bw && Boolean(working[`border-${side}-color`]));

    if (hasNoBorder) {
      for (const part of ['width', 'style', 'color'] as const) {
        const key = `border-${side}-${part}`;
        if (key in working) {
          delete working[key];
          strippedCount++;
        }
      }
    }
  }

  const isFlexContainer = displayVal === 'flex' || displayVal === 'inline-flex';
  const isGridContainer = displayVal === 'grid' || displayVal === 'inline-grid';

  for (const [prop, rawVal] of Object.entries(working)) {
    const val = rawVal.trim();
    if (!val) continue;
    const lowerVal = val.toLowerCase();

    // 1. Strip vendor / non-visual noise properties
    if (IGNORED_NOISE_PROPERTIES.has(prop) || prop.startsWith('-webkit-') || prop.startsWith('-moz-')) {
      strippedCount++;
      continue;
    }

    if (lowerVal === 'initial' || lowerVal === 'unset') {
      strippedCount++;
      continue;
    }

    // 2. Strip inactive flex/grid container properties on non-flex/non-grid elements
    if (
      !isFlexContainer &&
      !isGridContainer &&
      (prop === 'flex-direction' ||
        prop === 'flex-wrap' ||
        prop === 'justify-content' ||
        prop === 'align-items' ||
        prop === 'align-content' ||
        prop === 'row-gap' ||
        prop === 'column-gap' ||
        prop === 'gap')
    ) {
      strippedCount++;
      continue;
    }

    // 3. Guard against browser layout-measured pixel widths/heights from getComputedStyle
    if (usedExternalResolver && (prop === 'width' || prop === 'height')) {
      const hasExplicitAuthorSize =
        prop in expandedInline ||
        prop in ruleBaseStyles ||
        getElementAttr(el, prop) !== null;
      if (!hasExplicitAuthorSize) {
        if (/\.\d{2,}px$/i.test(lowerVal) || FLOW_TEXT_TAGS.has(tag) || BLOCK_TAGS.has(tag)) {
          strippedCount++;
          continue;
        }
      }
    }

    // 4. Tag-specific default display subtraction
    if (prop === 'display' && isTagDefaultDisplay(tag, lowerVal)) {
      strippedCount++;
      continue;
    }

    // 5. Tag-specific default bold/cursor/list-style subtraction
    if (prop === 'font-weight' && (tag === 'strong' || tag === 'b') && (lowerVal === '700' || lowerVal === 'bold')) {
      strippedCount++;
      continue;
    }
    if (prop === 'cursor' && (tag === 'a' || tag === 'button') && lowerVal === 'pointer') {
      strippedCount++;
      continue;
    }
    if (prop === 'list-style-type') {
      if ((tag === 'ul' && lowerVal === 'disc') || (tag === 'ol' && lowerVal === 'decimal')) {
        strippedCount++;
        continue;
      }
      if (tag !== 'ul' && tag !== 'ol' && tag !== 'li' && lowerVal === 'none') {
        strippedCount++;
        continue;
      }
    }

    // 6. Universal UA default value subtraction
    const defaultsForProp = UNIVERSAL_DEFAULT_VALUES[prop];
    if (defaultsForProp && defaultsForProp.has(lowerVal)) {
      // Keep inherited comparison accurate before stripping
      if (INHERITABLE_PROPERTIES.has(prop)) {
        const parentNorm = ctx.parentInherited[prop];
        const curNorm = normalizeStyleValueForCompare(prop, val);
        if (!parentNorm || parentNorm === curNorm) {
          strippedCount++;
          continue;
        }
      } else {
        strippedCount++;
        continue;
      }
    }

    // 7. Parent-child inherited property deduplication
    if (INHERITABLE_PROPERTIES.has(prop)) {
      const normalized = normalizeStyleValueForCompare(prop, val);
      const parentVal = ctx.parentInherited[prop];
      nextInherited[prop] = normalized;
      if (parentVal !== undefined && parentVal === normalized) {
        strippedCount++;
        continue;
      }
    }

    cleanStyles[prop] = val;
  }

  // Optional `:hover` delta computation
  const hoverStyles: StyleMap = {};
  if (ctx.includeHoverStyles) {
    let rawHover: StyleMap = {};
    if (ctx.styleResolver) {
      const resolvedHover = readStyleFromResolver(ctx.styleResolver(el, ':hover'));
      for (const [k, v] of Object.entries(resolvedHover)) {
        if (rawBase[k] !== v) {
          rawHover[k] = v;
        }
      }
    }
    if (Object.keys(rawHover).length === 0 && ctx.stylesheet.rules.length > 0) {
      rawHover = matchStylesheetCascade(
        el,
        ctx.stylesheet.rules,
        inlineRaw,
        nextVariables,
        true,
      ).matched;
    }

    for (const [prop, val] of Object.entries(rawHover)) {
      if (IGNORED_NOISE_PROPERTIES.has(prop)) continue;
      const baseComparable = rawBase[prop] ?? cleanStyles[prop];
      if (
        !baseComparable ||
        normalizeStyleValueForCompare(prop, baseComparable) !==
          normalizeStyleValueForCompare(prop, val)
      ) {
        hoverStyles[prop] = val;
      }
    }
  }

  return {
    isHidden: false,
    cleanStyles,
    hoverStyles,
    strippedCount,
    nextInherited,
    nextVariables,
  };
}
