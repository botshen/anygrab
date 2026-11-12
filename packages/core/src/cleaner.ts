import {
  getChildNodeArray,
  getClassString,
  getElementAttr,
  getElementAttrs,
  getElementChildren,
  getLowerTag,
  isCommentLike,
  isElementLike,
  isTextLike,
  matchesSelector,
} from './dom-adapter';
import { diffElementStyles, type ParsedStylesheet, type StyleMap } from './style-differ';
import { compileElementTailwindClasses, parseCssLengthPx } from './tailwind-mapper';
import type { DesignTokenCollector } from './tokens';
import type { AdapterContext, AnyGrabAdapter, GrabOptions } from './types';

export type DistilledNode = DistilledElement | DistilledText | DistilledComment;

export interface DistilledElement {
  kind: 'element';
  tag: string;
  classes: string[];
  attrs: Record<string, string>;
  children: DistilledNode[];
}

export interface DistilledText {
  kind: 'text';
  text: string;
}

export interface DistilledComment {
  kind: 'comment';
  text: string;
}

export interface DistillStats {
  nodesVisited: number;
  nodesPruned: number;
  stylesStripped: number;
}

export interface CleanTreeContext {
  options: GrabOptions;
  stylesheet: ParsedStylesheet;
  tokenCollector: DesignTokenCollector;
  adapter?: AnyGrabAdapter;
  adapterContext: AdapterContext;
  isSyntheticRootWrapper?: boolean;
}

const NOISE_PRUNE_TAGS = new Set([
  'script',
  'style',
  'noscript',
  'template',
  'meta',
  'link',
  'head',
  'base',
  'param',
  ' object',
  'embed',
]);

const PRESERVE_WHITESPACE_TAGS = new Set(['pre', 'code', 'textarea']);

const STRUCTURAL_SEMANTIC_TAGS = new Set([
  'main',
  'article',
  'section',
  'nav',
  'aside',
  'header',
  'footer',
  'form',
  'fieldset',
  'legend',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'th',
  'td',
  'caption',
  'ul',
  'ol',
  'li',
  'dl',
  'dt',
  'dd',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'blockquote',
  'pre',
  'code',
  'button',
  'a',
  'input',
  'select',
  'option',
  'textarea',
  'label',
  'img',
  'svg',
  'figure',
  'figcaption',
  'details',
  'summary',
  'dialog',
  'hr',
  'br',
]);

const VISUAL_BOX_CLASS_RE =
  /^(?:bg-|border|ring|shadow|rounded|p-|px-|py-|pt-|pr-|pb-|pl-|m-|mx-|my-|mt-|mr-|mb-|ml-|w-|h-|size-|min-w-|min-h-|max-w-|grid|flex|inline-flex|inline-grid|gap-|col-span-|row-span-|absolute|fixed|sticky)/;

function countSubtreeElements(el: Element): number {
  let count = 1;
  for (const child of getElementChildren(el)) {
    count += countSubtreeElements(child);
  }
  return count;
}

function isTrackingOrNoiseAttr(name: string): boolean {
  const lower = name.toLowerCase();
  if (lower === 'class' || lower === 'style') return true;
  if (lower.startsWith('on')) return true; // inline event handlers (`onclick`, `onload`, etc.)
  if (
    lower === 'jsaction' ||
    lower === 'jscontroller' ||
    lower === 'jsname' ||
    lower === 'jsmodel' ||
    lower === 'v-cloak' ||
    lower === 'xmlns:xlink' ||
    lower.startsWith('_ngcontent') ||
    lower.startsWith('_nghost') ||
    lower.startsWith('ng-') ||
    lower.startsWith('x-on:')
  ) {
    return true;
  }

  if (lower.startsWith('data-')) {
    // Keep lightweight semantic icon/language/state hints, strip framework/test/analytics bloat
    if (
      lower === 'data-icon' ||
      lower === 'data-language' ||
      lower === 'data-lang' ||
      lower === 'data-theme' ||
      lower === 'data-callout'
    ) {
      return false;
    }
    if (
      lower === 'data-testid' ||
      lower === 'data-test' ||
      lower.startsWith('data-test-') ||
      lower.startsWith('data-testing-') ||
      lower === 'data-cy' ||
      lower === 'data-qa' ||
      lower.startsWith('data-v-') ||
      lower.startsWith('data-react') ||
      lower.startsWith('data-radix-') ||
      lower.startsWith('data-rbd-') ||
      lower.startsWith('data-dnd-') ||
      lower.startsWith('data-headlessui-') ||
      lower.startsWith('data-sentry-') ||
      lower.startsWith('data-gtm') ||
      lower.startsWith('data-ga') ||
      lower.startsWith('data-track') ||
      lower.startsWith('data-analytics') ||
      lower.startsWith('data-emotion') ||
      lower.startsWith('data-styled') ||
      lower.startsWith('data-slot') ||
      lower.startsWith('data-orientation')
    ) {
      return true;
    }
  }
  return false;
}

function resolveRelativeUrl(rawUrl: string, sourceUrl?: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  if (/^javascript:/i.test(trimmed)) return '#';
  if (/^data:image\/[^;]+;base64,/i.test(trimmed) && trimmed.length > 180) {
    return 'data:image/placeholder';
  }
  if (
    !sourceUrl ||
    trimmed.startsWith('#') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('tel:') ||
    trimmed.startsWith('data:') ||
    /^https?:\/\//i.test(trimmed)
  ) {
    return trimmed;
  }
  try {
    return new URL(trimmed, sourceUrl).href;
  } catch {
    return trimmed;
  }
}

function sanitizeElementAttributes(
  el: Element,
  tag: string,
  sourceUrl?: string,
): Record<string, string> {
  const cleaned: Record<string, string> = {};
  for (const { name, value } of getElementAttrs(el)) {
    if (isTrackingOrNoiseAttr(name)) continue;
    const lower = name.toLowerCase();

    // Strip ephemeral auto-generated hashes on `id` (`:r1:`, `radix-:r0:`)
    if (lower === 'id' && (/^:r[0-9a-z]+:$/i.test(value) || /^radix-:/i.test(value))) {
      continue;
    }

    if (lower === 'href' || lower === 'src') {
      const resolved = resolveRelativeUrl(value, sourceUrl);
      if (resolved) cleaned[lower] = resolved;
      continue;
    }

    // Drop redundant `colspan="1"` / `rowspan="1"`
    if ((lower === 'colspan' || lower === 'rowspan') && value.trim() === '1') {
      continue;
    }

    // Preserve exact SVG attribute casing (`viewBox`) where relevant
    if (lower === 'viewbox') {
      cleaned['viewBox'] = value;
      continue;
    }

    // Omit giant `d="..."` on non-compacted paths if empty, keep normal attrs
    if (tag === 'svg' && lower === 'xmlns') {
      continue;
    }

    cleaned[name] = value;
  }
  return cleaned;
}

function isDecorativeAriaHidden(el: Element, tag: string): boolean {
  if (tag === 'img') return false;
  const ariaHidden = getElementAttr(el, 'aria-hidden');
  if (ariaHidden?.toLowerCase() !== 'true') return false;

  if (tag === 'svg') {
    const wAttr = Number.parseFloat(getElementAttr(el, 'width') ?? '0');
    const hAttr = Number.parseFloat(getElementAttr(el, 'height') ?? '0');
    const inlineStyle = (getElementAttr(el, 'style') ?? '').toLowerCase();
    // Large decorative background grid/mesh SVGs (`width >= 200` or `position: absolute` + `pointer-events: none`)
    if (
      wAttr >= 200 ||
      hAttr >= 200 ||
      (inlineStyle.includes('position: absolute') && inlineStyle.includes('pointer-events: none'))
    ) {
      return true;
    }
    return false;
  }

  // Check if it contains meaningful alphanumeric text or embedded media
  const rawText = (el.textContent ?? '').trim();
  if (/[a-zA-Z0-9\u4e00-\u9fff]/.test(rawText)) return false;

  const hasMediaDescendant = (node: Element): boolean => {
    for (const child of getElementChildren(node)) {
      const ct = getLowerTag(child);
      if (ct === 'img' || ct === 'svg' || ct === 'input' || ct === 'button') return true;
      if (hasMediaDescendant(child)) return true;
    }
    return false;
  };

  return !hasMediaDescendant(el);
}

function mapSvgSizeClasses(
  el: Element,
  existingClasses: string[],
): string[] {
  const hasExplicitSizeClass = existingClasses.some((c) =>
    /^(?:size-|w-|h-)/.test(c),
  );
  if (hasExplicitSizeClass) return existingClasses;

  const wAttr = getElementAttr(el, 'width');
  const hAttr = getElementAttr(el, 'height');
  const wPx = wAttr ? parseCssLengthPx(wAttr.endsWith('px') ? wAttr : `${wAttr}px`) : null;
  const hPx = hAttr ? parseCssLengthPx(hAttr.endsWith('px') ? hAttr : `${hAttr}px`) : null;

  const scaleMap: Record<number, string> = {
    12: '3',
    14: '3.5',
    16: '4',
    20: '5',
    24: '6',
    28: '7',
    32: '8',
    40: '10',
    48: '12',
  };

  const out = [...existingClasses];
  if (wPx !== null && hPx !== null && wPx === hPx && wPx > 0) {
    if (scaleMap[wPx]) out.push(`size-${scaleMap[wPx]}`);
    else out.push(`w-[${wPx}px]`, `h-[${hPx}px]`);
  } else {
    if (wPx !== null && wPx > 0) {
      out.push(scaleMap[wPx] ? `w-${scaleMap[wPx]}` : `w-[${wPx}px]`);
    }
    if (hPx !== null && hPx > 0) {
      out.push(scaleMap[hPx] ? `h-${scaleMap[hPx]}` : `h-[${hPx}px]`);
    }
  }
  return out;
}

function extractSvgLabel(el: Element, rawClassAttr: string): string | null {
  const ariaLabel = getElementAttr(el, 'aria-label');
  if (ariaLabel && ariaLabel.trim()) return ariaLabel.trim();

  for (const child of getElementChildren(el)) {
    if (getLowerTag(child) === 'title') {
      const t = (child.textContent ?? '').trim();
      if (t) return t;
    }
  }

  const lucideMatch = /\blucide-([a-z0-9-]+)\b/i.exec(rawClassAttr);
  if (lucideMatch) return lucideMatch[1];

  return null;
}

function buildCompactSvgNode(
  el: Element,
  classes: string[],
  rawClassAttr: string,
  stats: DistillStats,
): DistilledElement {
  // Count all internal SVG child elements (`<path>`, `<g>`, `<defs>`, `<circle>`, etc.) as visited & pruned
  for (const child of getElementChildren(el)) {
    const subCount = countSubtreeElements(child);
    stats.nodesVisited += subCount;
    stats.nodesPruned += subCount;
  }

  const sizedClasses = mapSvgSizeClasses(el, classes);
  const attrs: Record<string, string> = {};
  const viewBox = getElementAttr(el, 'viewBox') ?? getElementAttr(el, 'viewbox');
  if (viewBox) {
    attrs['viewBox'] = viewBox;
  }
  attrs['data-icon'] = 'svg';

  const label = extractSvgLabel(el, rawClassAttr);
  if (label) {
    attrs['aria-label'] = label;
  }

  return {
    kind: 'element',
    tag: 'svg',
    classes: sizedClasses,
    attrs,
    children: [],
  };
}

function hasSemanticAttrs(attrs: Record<string, string>): boolean {
  for (const k of Object.keys(attrs)) {
    if (
      k === 'id' ||
      k === 'role' ||
      k === 'href' ||
      k === 'src' ||
      k === 'type' ||
      k === 'name' ||
      k === 'for' ||
      k.startsWith('aria-') ||
      k.startsWith('data-')
    ) {
      return true;
    }
  }
  return false;
}

function canUnwrapRedundantDiv(node: DistilledElement, isRoot: boolean): boolean {
  if (isRoot) return false;
  if (node.tag !== 'div' && node.tag !== 'span') return false;
  if (hasSemanticAttrs(node.attrs)) return false;

  // Case 1: Wrapper with NO classes and only 1 child element (and no text siblings)
  if (node.classes.length === 0) {
    const nonEmptyChildren = node.children.filter(
      (c) => c.kind !== 'text' || c.text.trim().length > 0,
    );
    if (nonEmptyChildren.length === 1 && nonEmptyChildren[0].kind === 'element') {
      return true;
    }
  }
  return false;
}

function isEmptyDisposableBox(node: DistilledElement, isRoot: boolean): boolean {
  if (isRoot) return false;
  if (STRUCTURAL_SEMANTIC_TAGS.has(node.tag)) return false;
  if (node.tag !== 'div' && node.tag !== 'span') return false;
  if (node.children.length > 0) return false;
  if (hasSemanticAttrs(node.attrs)) return false;
  // Keep decorative visual boxes only if they have explicit dimensions AND background/border
  const hasExplicitSize = node.classes.some((c) => /^(?:size-|w-\d|h-\d|w-\[|h-\[)/.test(c));
  const hasFill = node.classes.some((c) => /^(?:bg-|border)/.test(c));
  return !(hasExplicitSize && hasFill);
}

/**
 * Distills a DOM subtree into a clean, noise-free `DistilledElement` AST while
 * recording style subtraction, SVG compaction, and wrapper-collapsing telemetry.
 */
export function distillDomTree(
  rootEl: Element,
  ctx: CleanTreeContext,
): { root: DistilledElement; stats: DistillStats } {
  const stats: DistillStats = {
    nodesVisited: 0,
    nodesPruned: 0,
    stylesStripped: 0,
  };

  const compactSvg = ctx.options.compactSvg ?? true;
  const preserveTables = ctx.options.preserveTables ?? true;
  const excludeSelectors = ctx.adapter?.excludeSelectors ?? [];

  const distillNode = (
    el: Element,
    parentInherited: StyleMap,
    parentVars: StyleMap,
    inPreformatted: boolean,
    isRoot: boolean,
  ): DistilledNode[] => {
    const rawTag = getLowerTag(el);
    stats.nodesVisited++;

    // 1. Noise tag pruning (`<script>`, `<style>`, `<noscript>`, `<template>`, etc.)
    if (NOISE_PRUNE_TAGS.has(rawTag)) {
      const subCount = countSubtreeElements(el);
      stats.nodesVisited += subCount - 1;
      stats.nodesPruned += subCount;
      return [];
    }

    // 2. Adapter `excludeSelectors` check (never prune root itself)
    if (!isRoot && excludeSelectors.length > 0) {
      for (const sel of excludeSelectors) {
        if (matchesSelector(el, sel)) {
          const subCount = countSubtreeElements(el);
          stats.nodesVisited += subCount - 1;
          stats.nodesPruned += subCount;
          return [];
        }
      }
    }

    // 3. Adapter `transformNode` hook
    if (ctx.adapter?.transformNode) {
      const transformed = ctx.adapter.transformNode(el, ctx.adapterContext);
      if (transformed === 'prune' || transformed === null) {
        const subCount = countSubtreeElements(el);
        stats.nodesVisited += subCount - 1;
        stats.nodesPruned += subCount;
        return [];
      }
      if (transformed === 'unwrap') {
        stats.nodesPruned++;
        const unwrapped: DistilledNode[] = [];
        for (const child of getChildNodeArray(el)) {
          if (isElementLike(child)) {
            unwrapped.push(
              ...distillNode(child, parentInherited, parentVars, inPreformatted, false),
            );
          } else if (isTextLike(child)) {
            const t = normalizeTextContent(child.textContent ?? '', inPreformatted);
            if (t) unwrapped.push({ kind: 'text', text: t });
          }
        }
        return unwrapped;
      }
      if (transformed && isElementLike(transformed) && transformed !== el) {
        return distillNode(transformed, parentInherited, parentVars, inPreformatted, isRoot);
      }
    }

    // 4. Hidden attribute & decorative `aria-hidden="true"` pruning
    if (getElementAttr(el, 'hidden') !== null) {
      const subCount = countSubtreeElements(el);
      stats.nodesVisited += subCount - 1;
      stats.nodesPruned += subCount;
      return [];
    }

    if (!isRoot && isDecorativeAriaHidden(el, rawTag)) {
      const subCount = countSubtreeElements(el);
      stats.nodesVisited += subCount - 1;
      stats.nodesPruned += subCount;
      return [];
    }

    // 5. Dual-mode CSS cascade, UA default subtraction & parent inheritance deduplication
    const styleDiff = diffElementStyles(el, {
      stylesheet: ctx.stylesheet,
      styleResolver: ctx.options.styleResolver,
      includeHoverStyles: ctx.options.includeHoverStyles,
      parentInherited,
      parentVariables: parentVars,
    });

    stats.stylesStripped += styleDiff.strippedCount;

    if (styleDiff.isHidden) {
      const subCount = countSubtreeElements(el);
      stats.nodesVisited += subCount - 1;
      stats.nodesPruned += subCount;
      return [];
    }

    // 6. Reverse-compile CSS -> Tailwind v4 & clean CSS-in-JS obfuscated classes
    const rawClassAttr = getClassString(el);
    const { classes, strippedClassCount } = compileElementTailwindClasses({
      rawClassAttr,
      cleanStyles: styleDiff.cleanStyles,
      hoverStyles: styleDiff.hoverStyles,
      includeHoverStyles: ctx.options.includeHoverStyles,
      consumedStylesheetClasses: ctx.stylesheet.definedClassNames,
    });
    stats.stylesStripped += strippedClassCount;

    // 7. Collect Design Tokens
    ctx.tokenCollector.recordStyles(styleDiff.cleanStyles);
    if (classes.length > 0) {
      ctx.tokenCollector.recordUtilityClasses(classes);
    }

    // 8. Compact SVG (`compactSvg: true`)
    if (rawTag === 'svg' && compactSvg) {
      return [buildCompactSvgNode(el, classes, rawClassAttr, stats)];
    }

    // Normalize `<body>` / `<html>` container tags to `<div>` for valid standalone HTML/JSX snippets
    let tag = rawTag === 'body' || rawTag === 'html' ? 'div' : rawTag;

    // Optional flattening if `preserveTables: false`
    if (!preserveTables) {
      if (tag === 'table' || tag === 'thead' || tag === 'tbody' || tag === 'tfoot') tag = 'div';
      else if (tag === 'tr') {
        tag = 'div';
        if (!classes.includes('flex')) classes.push('flex', 'gap-2');
      } else if (tag === 'th' || tag === 'td') {
        tag = 'span';
      }
    }

    const attrs = sanitizeElementAttributes(el, tag, ctx.options.sourceUrl);
    const nextPreformatted = inPreformatted || PRESERVE_WHITESPACE_TAGS.has(tag);

    // 9. Recursively distill child nodes
    const children: DistilledNode[] = [];
    for (const child of getChildNodeArray(el)) {
      if (isCommentLike(child)) {
        continue;
      }
      if (isTextLike(child)) {
        const text = normalizeTextContent(child.textContent ?? '', nextPreformatted);
        if (text) {
          // Merge adjacent text nodes cleanly
          const prev = children[children.length - 1];
          if (prev && prev.kind === 'text' && !nextPreformatted) {
            prev.text = `${prev.text} ${text}`.replace(/\s+/g, ' ');
          } else {
            children.push({ kind: 'text', text });
          }
        }
        continue;
      }
      if (isElementLike(child)) {
        const childDistilled = distillNode(
          child,
          styleDiff.nextInherited,
          styleDiff.nextVariables,
          nextPreformatted,
          false,
        );
        children.push(...childDistilled);
      }
    }

    const distilledEl: DistilledElement = {
      kind: 'element',
      tag,
      classes,
      attrs,
      children,
    };

    // 10. Bottom-up redundant `<div>` unwrapping & empty noise wrapper pruning
    // Case A: Outer `<div class="...">` wrapping a single plain `<div>` with no classes/attrs -> unwrap inner `<div>`
    while (
      distilledEl.children.length === 1 &&
      distilledEl.children[0].kind === 'element' &&
      distilledEl.children[0].tag === 'div' &&
      distilledEl.children[0].classes.length === 0 &&
      !hasSemanticAttrs(distilledEl.children[0].attrs)
    ) {
      distilledEl.children = distilledEl.children[0].children;
      stats.nodesPruned++;
    }

    // Case B: Current node is a plain `<div>` with no classes/attrs and a single element child -> promote child!
    if (canUnwrapRedundantDiv(distilledEl, isRoot && !ctx.isSyntheticRootWrapper)) {
      const onlyChild = distilledEl.children.find(
        (c): c is DistilledElement => c.kind === 'element',
      );
      if (onlyChild) {
        stats.nodesPruned++;
        return [onlyChild];
      }
    }

    // Case C: Empty non-semantic `<div>`/`<span>` with no visual box styling -> prune!
    if (isEmptyDisposableBox(distilledEl, isRoot)) {
      stats.nodesPruned++;
      return [];
    }

    // Also collapse root `<div>` wrapper if it has no visual classes/attrs and wraps a single element
    if (
      isRoot &&
      distilledEl.tag === 'div' &&
      !distilledEl.classes.some((c) => VISUAL_BOX_CLASS_RE.test(c)) &&
      !hasSemanticAttrs(distilledEl.attrs)
    ) {
      const nonWs = distilledEl.children.filter(
        (c) => c.kind !== 'text' || c.text.trim().length > 0,
      );
      if (nonWs.length === 1 && nonWs[0].kind === 'element') {
        if (!ctx.isSyntheticRootWrapper) {
          stats.nodesPruned++;
        } else {
          // Synthetic wrapper wasn't a real author node -> subtract synthetic root visit
          stats.nodesVisited = Math.max(1, stats.nodesVisited - 1);
        }
        return [nonWs[0]];
      }
    }

    return [distilledEl];
  };

  const resultNodes = distillNode(
    rootEl,
    {},
    ctx.stylesheet.rootVariables,
    false,
    true,
  );

  if (ctx.isSyntheticRootWrapper && resultNodes.length === 1 && resultNodes[0].kind === 'element') {
    return { root: resultNodes[0], stats };
  }

  if (resultNodes.length === 1 && resultNodes[0].kind === 'element') {
    return { root: resultNodes[0], stats };
  }

  return {
    root: {
      kind: 'element',
      tag: 'div',
      classes: [],
      attrs: {},
      children: resultNodes,
    },
    stats,
  };
}

function normalizeTextContent(raw: string, preformatted: boolean): string {
  if (!raw) return '';
  if (preformatted) {
    return raw;
  }
  const collapsed = raw.replace(/\s+/g, ' ');
  return collapsed.trim() ? collapsed.trim() : '';
}
