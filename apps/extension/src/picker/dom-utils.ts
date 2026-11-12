import { estimateTokens, type OutputFormat } from '@anygrab/core';
import { FORMAT_SHORT_LABELS, HOST_ID, type ExtensionLocale } from '../shared/types';

const NON_PICKABLE_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'LINK',
  'META',
  'HEAD',
  'TITLE',
  'NOSCRIPT',
  'TEMPLATE',
  'BASE',
]);

const GENERATED_CLASS_RE =
  /^(css|sc|jsx|emotion|svelte|tw)-[a-z0-9_-]{4,}$|^_[a-z0-9]+_[a-z0-9]+_\d+$/i;

/**
 * Returns `true` if `target` is `#__anygrab-host__` or lives inside its Light/Shadow DOM.
 */
export function isHostOrInsideHost(
  target: EventTarget | Node | null | undefined,
  hostEl?: Element | null,
): boolean {
  if (!target || typeof target !== 'object') {
    return false;
  }

  let current: Node | null = 'nodeType' in target ? (target as Node) : null;
  while (current) {
    if (current === hostEl) {
      return true;
    }
    if (current.nodeType === 1 && (current as Element).id === HOST_ID) {
      return true;
    }
    if (current.parentNode) {
      current = current.parentNode;
      continue;
    }
    const root = typeof current.getRootNode === 'function' ? current.getRootNode() : null;
    if (root && 'host' in root && (root as ShadowRoot).host) {
      current = (root as ShadowRoot).host;
      continue;
    }
    break;
  }

  return false;
}

/**
 * Determines whether an `Element` is eligible to be highlighted/picked on the page.
 */
export function isPickableElement(
  el: Element | null | undefined,
  hostEl?: Element | null,
): boolean {
  if (!el || el.nodeType !== 1) {
    return false;
  }
  if (isHostOrInsideHost(el, hostEl)) {
    return false;
  }
  if (NON_PICKABLE_TAGS.has(el.tagName.toUpperCase())) {
    return false;
  }
  if (el.hasAttribute('data-anygrab-clipboard-fallback')) {
    return false;
  }
  return true;
}

/**
 * Finds the topmost pickable page element at `(clientX, clientY)`, strictly ignoring `#__anygrab-host__`.
 */
export function resolveTargetAtPoint(
  clientX: number,
  clientY: number,
  doc: Document = document,
  hostEl?: Element | null,
): Element | null {
  if (typeof doc.elementsFromPoint === 'function') {
    try {
      const candidates = doc.elementsFromPoint(clientX, clientY);
      for (const candidate of candidates) {
        if (isPickableElement(candidate, hostEl)) {
          return candidate;
        }
      }
    } catch {
      // Fall back to elementFromPoint below
    }
  }

  if (typeof doc.elementFromPoint === 'function') {
    try {
      let hit = doc.elementFromPoint(clientX, clientY);
      if (hit && isHostOrInsideHost(hit, hostEl) && hostEl instanceof HTMLElement) {
        const prevVisibility = hostEl.style.visibility;
        hostEl.style.visibility = 'hidden';
        try {
          hit = doc.elementFromPoint(clientX, clientY);
        } finally {
          hostEl.style.visibility = prevVisibility;
        }
      }
      if (isPickableElement(hit, hostEl)) {
        return hit;
      }
    } catch {
      // Ignore layout errors in synthetic DOM environments
    }
  }

  return null;
}

/**
 * Resolves the target element for a pointer/mouse event, combining hit-testing at `(clientX, clientY)`
 * with fallback to `event.target` for synthetic DOM environments (e.g. `happy-dom` without layout engine).
 */
export function resolvePointerTarget(
  event: MouseEvent,
  doc: Document = document,
  hostEl?: Element | null,
): Element | null {
  const fromPoint = resolveTargetAtPoint(event.clientX, event.clientY, doc, hostEl);
  if (fromPoint) {
    return fromPoint;
  }

  const rawTarget = event.target;
  if (rawTarget && typeof rawTarget === 'object' && 'nodeType' in rawTarget) {
    const node = rawTarget as Node;
    const candidate = node.nodeType === 1 ? (node as Element) : node.parentElement;
    if (isPickableElement(candidate, hostEl)) {
      return candidate;
    }
  }

  return null;
}

/**
 * Walks upward to the nearest pickable parent container (stopping cleanly at `document.body` / `documentElement`).
 */
export function getParentCandidate(
  el: Element,
  hostEl?: Element | null,
): Element | null {
  const doc = el.ownerDocument;
  if (el === doc?.body || el === doc?.documentElement) {
    return null;
  }

  let parent = el.parentElement;
  while (parent) {
    if (isPickableElement(parent, hostEl)) {
      return parent;
    }
    if (parent === doc?.body) {
      break;
    }
    parent = parent.parentElement;
  }
  return null;
}

function isElementVisiblyRendered(el: Element): boolean {
  if ((el as HTMLElement).hidden || el.getAttribute('aria-hidden') === 'true') {
    return false;
  }
  const win = el.ownerDocument?.defaultView;
  if (win && typeof win.getComputedStyle === 'function') {
    try {
      const style = win.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') {
        return false;
      }
    } catch {
      // Ignore computed style errors
    }
  }
  return true;
}

/**
 * Finds the best direct child element when stepping inward with `ArrowDown`.
 */
export function getFirstChildCandidate(
  el: Element,
  hostEl?: Element | null,
): Element | null {
  const children = Array.from(el.children);
  let fallback: Element | null = null;

  for (const child of children) {
    if (!isPickableElement(child, hostEl)) {
      continue;
    }
    if (!fallback) {
      fallback = child;
    }
    if (isElementVisiblyRendered(child)) {
      return child;
    }
  }

  return fallback;
}

/**
 * Formats `<tag.primaryClass>` (or `<tag#id>` / `<tag>`) for the floating capsule badge & history.
 */
export function formatElementTagIdentifier(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const classes = Array.from(el.classList ?? []).filter(Boolean);

  if (classes.length > 0) {
    const cleanClass = classes.find((cls) => !GENERATED_CLASS_RE.test(cls)) ?? classes[0];
    if (cleanClass) {
      return `${tag}.${cleanClass}`;
    }
  }

  const id = el.id?.trim();
  if (id && id !== HOST_ID) {
    return `${tag}#${id}`;
  }

  return tag;
}

/**
 * Builds the live floating badge caption: `<tag.primaryClass> · W×H px · ~N tokens`
 */
export function formatHoverBadgeText(
  el: Element,
  rect: Pick<DOMRectReadOnly, 'width' | 'height'>,
  estimatedTokens: number,
  locale: ExtensionLocale = 'en',
): string {
  const tagId = formatElementTagIdentifier(el);
  const w = Math.max(0, Math.round(rect.width));
  const h = Math.max(0, Math.round(rect.height));
  const tok = Math.max(1, Math.round(estimatedTokens)).toLocaleString('en-US');
  if (locale === 'zh-CN') {
    return `<${tagId}> · ${w}×${h} px · 约 ~${tok} tokens`;
  }
  return `<${tagId}> · ${w}×${h} px · ~${tok} tokens`;
}

/**
 * Fast cached approximation of distilled token count for 60fps hover previews.
 */
export function estimateElementDistilledTokens(
  el: Element,
  cache?: WeakMap<Element, number>,
): number {
  const cached = cache?.get(el);
  if (typeof cached === 'number') {
    return cached;
  }

  const rawHtml = el.outerHTML ?? '';
  const sample = rawHtml.length > 65536 ? rawHtml.slice(0, 65536) : rawHtml;
  const scale = rawHtml.length > 65536 ? rawHtml.length / 65536 : 1;

  const cleaned = sample
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '<svg icon/>')
    .replace(/\s+/g, ' ');

  const estimated = Math.max(1, Math.round(estimateTokens(cleaned) * scale * 0.45));
  cache?.set(el, estimated);
  return estimated;
}

/**
 * Formats the top-right success toast message with clear AI workflow guidance:
 * - `zh-CN`: `✅ 已复制！已为你剔除 95% 网页垃圾代码 — 现在切到【反重力 / Codex】直接按 Cmd+V 粘贴回车即可！`
 * - `en`:    `Copied JSX · 12,400 → 460 tokens (-96.3%) — Paste (Cmd+V) into Antigravity / Codex!`
 */
export function formatGrabToastSummary(
  format: OutputFormat,
  rawTokens: number,
  outputTokens: number,
  compressionRatio: number,
  locale: ExtensionLocale = 'en',
): string {
  const normalizedRatio = Number.isFinite(compressionRatio) ? compressionRatio : 0;

  if (locale === 'zh-CN') {
    const savedPct =
      normalizedRatio > 0 ? Math.min(99, Math.max(1, Math.round(normalizedRatio))) : 90;
    return `✅ 已复制！已为你剔除 ${savedPct}% 网页垃圾代码 — 现在切到【反重力 / Codex】直接按 Cmd+V 粘贴回车即可！`;
  }

  const label = FORMAT_SHORT_LABELS[format] ?? format.toUpperCase();
  const rawStr = Math.max(0, Math.round(rawTokens)).toLocaleString('en-US');
  const outStr = Math.max(0, Math.round(outputTokens)).toLocaleString('en-US');
  const pctStr = normalizedRatio > 0 ? `-${normalizedRatio.toFixed(1)}%` : '0.0%';

  return `Copied ${label} · ${rawStr} → ${outStr} tokens (${pctStr}) — Paste (Cmd+V) into Antigravity / Codex!`;
}

export function extractDomainFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'chrome-extension:') {
      return 'AnyGrab Practice Arena';
    }
    return parsed.hostname ? parsed.hostname.replace(/^www\./i, '') : 'local-page';
  } catch {
    return 'local-page';
  }
}
