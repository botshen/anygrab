import type { ResolvedStyle, StyleResolver } from '@anygrab/core';
import type { FetchExternalCssResponse } from './types';

export interface HoverCssRule {
  baseSelector: string;
  declarations: Record<string, string>;
}

const externalCssCache = new Map<string, string>();

function kebabToCamel(prop: string): string {
  return prop.replace(/-([a-z])/g, (_, ch: string) => ch.toUpperCase());
}

export function parseDeclarationsBlock(block: string): Record<string, string> {
  const declarations: Record<string, string> = {};
  const parts = block.split(';');
  for (const rawPart of parts) {
    const colonIdx = rawPart.indexOf(':');
    if (colonIdx <= 0) continue;
    const rawProp = rawPart.slice(0, colonIdx).trim();
    const prop = rawProp.startsWith('--') ? rawProp : rawProp.toLowerCase();
    const val = rawPart
      .slice(colonIdx + 1)
      .replace(/!important\s*$/i, '')
      .trim();
    if (prop && val) {
      declarations[prop] = val;
    }
  }
  return declarations;
}

function findTopLevelComma(input: string): number {
  let depth = 0;
  let quote: string | null = null;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quote) {
      if (ch === quote && input[i - 1] !== '\\') {
        quote = null;
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === '(') {
      depth++;
    } else if (ch === ')') {
      depth = Math.max(0, depth - 1);
    } else if (ch === ',' && depth === 0) {
      return i;
    }
  }
  return -1;
}

/**
 * Recursively expands `var(--custom-prop, fallback)` expressions using
 * local `:hover` custom property overrides and `window.getComputedStyle(element)`.
 */
export function resolveCssVariablesForElement(
  rawValue: string,
  element: Element,
  win: Window = window,
  localVars: Record<string, string> = {},
  depth = 0,
): string {
  if (!rawValue || !rawValue.includes('var(') || depth > 8) {
    return rawValue;
  }

  const computed = win.getComputedStyle(element);
  const rootEl = element.ownerDocument?.documentElement;
  const rootComputed =
    rootEl && rootEl !== element ? win.getComputedStyle(rootEl) : null;

  let result = '';
  let cursor = 0;

  while (cursor < rawValue.length) {
    const varStart = rawValue.indexOf('var(', cursor);
    if (varStart === -1) {
      result += rawValue.slice(cursor);
      break;
    }

    result += rawValue.slice(cursor, varStart);

    // Find matching closing `)` for `var(`
    let parenDepth = 1;
    let i = varStart + 4;
    let quote: string | null = null;
    while (i < rawValue.length && parenDepth > 0) {
      const ch = rawValue[i];
      if (quote) {
        if (ch === quote && rawValue[i - 1] !== '\\') {
          quote = null;
        }
      } else if (ch === '"' || ch === "'") {
        quote = ch;
      } else if (ch === '(') {
        parenDepth++;
      } else if (ch === ')') {
        parenDepth--;
      }
      i++;
    }

    if (parenDepth !== 0) {
      // Malformed `var(` without closing paren — preserve remainder verbatim
      result += rawValue.slice(varStart);
      break;
    }

    const inner = rawValue.slice(varStart + 4, i - 1).trim();
    const commaIdx = findTopLevelComma(inner);
    const varName = (commaIdx === -1 ? inner : inner.slice(0, commaIdx)).trim();
    const fallback = commaIdx === -1 ? '' : inner.slice(commaIdx + 1).trim();

    let resolved = '';
    if (varName.startsWith('--')) {
      resolved =
        localVars[varName]?.trim() ||
        computed.getPropertyValue(varName).trim() ||
        rootComputed?.getPropertyValue(varName).trim() ||
        '';
    }

    if (resolved) {
      result += resolveCssVariablesForElement(resolved, element, win, localVars, depth + 1);
    } else if (fallback) {
      result += resolveCssVariablesForElement(fallback, element, win, localVars, depth + 1);
    }

    cursor = i;
  }

  return result.trim();
}

/**
 * Parses `:hover` CSS rules from raw stylesheet text (used for both same-origin rules
 * and cross-origin stylesheets fetched by the background worker via `FETCH_EXTERNAL_CSS`).
 */
export function parseHoverRulesFromCss(cssText: string): HoverCssRule[] {
  if (!cssText || !cssText.includes(':hover')) {
    return [];
  }

  const cleaned = cssText.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules: HoverCssRule[] = [];
  // Match leaf `selector { declarations }` blocks (including inside @media blocks)
  const ruleRegex = /([^{}@]+)\{([^{}]+)\}/g;
  let match: RegExpExecArray | null;

  while ((match = ruleRegex.exec(cleaned)) !== null) {
    const selectorGroup = match[1]?.trim() ?? '';
    const declBlock = match[2]?.trim() ?? '';
    if (!selectorGroup.includes(':hover') || !declBlock) {
      continue;
    }

    const declarations = parseDeclarationsBlock(declBlock);
    if (Object.keys(declarations).length === 0) {
      continue;
    }

    for (const rawSel of selectorGroup.split(',')) {
      const sel = rawSel.trim();
      if (!/:hover(?![a-zA-Z0-9_-])/.test(sel)) continue;
      // Convert `.btn:hover` -> `.btn` (or `:hover` -> `*`)
      const baseSelector = sel.replace(/:hover(?![a-zA-Z0-9_-])/g, '').trim() || '*';
      rules.push({ baseSelector, declarations });
    }
  }

  return rules;
}

export async function fetchExternalCssViaBackground(url: string): Promise<string | null> {
  if (externalCssCache.has(url)) {
    return externalCssCache.get(url) ?? null;
  }

  if (
    typeof globalThis === 'undefined' ||
    !('chrome' in globalThis) ||
    !globalThis.chrome?.runtime?.sendMessage
  ) {
    return null;
  }

  return new Promise<string | null>((resolve) => {
    try {
      globalThis.chrome.runtime.sendMessage(
        { type: 'FETCH_EXTERNAL_CSS', url },
        (response?: FetchExternalCssResponse) => {
          const runtimeErr = globalThis.chrome?.runtime?.lastError;
          if (runtimeErr || !response?.ok || typeof response.cssText !== 'string') {
            resolve(null);
            return;
          }
          externalCssCache.set(url, response.cssText);
          resolve(response.cssText);
        },
      );
    } catch {
      resolve(null);
    }
  });
}

/**
 * Collects `:hover` rules across `document.styleSheets`.
 * When a cross-origin `<link rel="stylesheet">` throws `SecurityError`, delegates
 * to `fetchExternalCss` (`FETCH_EXTERNAL_CSS` in background service worker).
 */
export async function collectHoverRulesFromDocument(
  doc: Document,
  fetchExternalCss: (url: string) => Promise<string | null> = fetchExternalCssViaBackground,
): Promise<HoverCssRule[]> {
  const collected: HoverCssRule[] = [];
  const sheets = Array.from(doc.styleSheets ?? []);

  for (const sheet of sheets) {
    try {
      const cssRules = sheet.cssRules;
      if (!cssRules) continue;
      extractHoverFromRuleList(cssRules, collected);
    } catch {
      // Cross-origin stylesheet threw SecurityError — request public CSS via background
      const href = sheet.href;
      if (href && /^https?:\/\//i.test(href)) {
        const externalText = await fetchExternalCss(href);
        if (externalText) {
          collected.push(...parseHoverRulesFromCss(externalText));
        }
      }
    }
  }

  return collected;
}

function extractHoverFromRuleList(ruleList: CSSRuleList, target: HoverCssRule[]): void {
  for (let i = 0; i < ruleList.length; i++) {
    const rule = ruleList[i];
    if (!rule) continue;
    if ('selectorText' in rule && typeof (rule as CSSStyleRule).selectorText === 'string') {
      const styleRule = rule as CSSStyleRule;
      if (styleRule.selectorText.includes(':hover')) {
        target.push(...parseHoverRulesFromCss(styleRule.cssText));
      }
    } else if ('cssRules' in rule && (rule as CSSGroupingRule).cssRules) {
      extractHoverFromRuleList((rule as CSSGroupingRule).cssRules, target);
    }
  }
}

/**
 * Builds the `StyleResolver` passed to `@anygrab/core`'s `grab()`.
 * - Standard calls `(el, pseudo)` delegate directly to `window.getComputedStyle(el, pseudo)`.
 * - When `pseudo === ':hover'` and `hoverRules` are provided, resolves matched `:hover`
 *   stylesheet declarations (including recursive `var(--xxx, fallback)` expansion via
 *   `window.getComputedStyle(element)`) so `hover:*` Tailwind classes are distilled accurately!
 */
export function createPageStyleResolver(
  win: Window = window,
  hoverRules: readonly HoverCssRule[] = [],
): StyleResolver {
  return (element: Element, pseudoElt?: string | null): ResolvedStyle | null | undefined => {
    if (pseudoElt === ':hover') {
      if (hoverRules.length === 0) {
        return null;
      }

      const rawMatched: Record<string, string> = {};
      const localVars: Record<string, string> = {};
      let hasMatch = false;

      for (const rule of hoverRules) {
        try {
          if (element.matches(rule.baseSelector)) {
            for (const [prop, val] of Object.entries(rule.declarations)) {
              if (prop.startsWith('--')) {
                localVars[prop] = val;
              } else {
                rawMatched[prop] = val;
              }
            }
            hasMatch = true;
          }
        } catch {
          // Ignore invalid selector syntax from third-party CSS
        }
      }

      if (!hasMatch) {
        return null;
      }

      const resolvedMatched: Record<string, string> = {};
      for (const [kebabProp, rawVal] of Object.entries(rawMatched)) {
        const expanded = resolveCssVariablesForElement(rawVal, element, win, localVars);
        if (!expanded) continue;
        resolvedMatched[kebabProp] = expanded;
        const camel = kebabToCamel(kebabProp);
        if (camel !== kebabProp) {
          resolvedMatched[camel] = expanded;
        }
      }

      return Object.keys(resolvedMatched).length > 0 ? resolvedMatched : null;
    }

    return win.getComputedStyle(element, pseudoElt ?? null);
  };
}

export function clearExternalCssCacheForTests(): void {
  externalCssCache.clear();
}
