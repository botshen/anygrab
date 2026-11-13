import { readFile } from 'node:fs/promises';
import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { GrabOptions } from '@anygrab/core';
import { parseHTML } from 'linkedom';

export const DEFAULT_FETCH_TIMEOUT_MS = 10_000;
export const DEFAULT_CSS_TIMEOUT_MS = 4_000;
const MAX_STYLESHEETS = 24;
const MAX_CSS_BYTES = 4 * 1024 * 1024;

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (compatible; AnyGrab/0.2; +https://github.com/botshen/anygrab)';

/**
 * Extended options for Node.js HTML, file, and URL loading in `anygrab`.
 */
export interface NodeGrabOptions extends GrabOptions {
  /**
   * Timeout in milliseconds when fetching the primary HTML document over HTTP(S).
   * @default 10000
   */
  fetchTimeoutMs?: number;
  /**
   * Timeout in milliseconds when fetching external `<link rel="stylesheet">` CSS files.
   * @default 4000
   */
  cssTimeoutMs?: number;
  /**
   * Automatically fetch/read and inline `<link rel="stylesheet">` CSS into `<style>` nodes.
   * @default true
   */
  inlineStylesheets?: boolean;
  /**
   * Custom `fetch` function override (useful for unit tests, custom proxies, or auth headers).
   */
  fetchImpl?: typeof fetch;
  /**
   * Additional HTTP request headers sent when fetching HTML or external CSS resources.
   */
  headers?: Record<string, string>;
}

export interface StylesheetInlineResult {
  inlinedCount: number;
  warnings: string[];
}

/**
 * Ensures arbitrary HTML fragments (including fragments beginning with `<style>`)
 * are wrapped in a complete `<html><head></head><body>...</body></html>` shell so
 * LinkeDOM always constructs a canonical `document.documentElement` (`HTML`).
 */
export function normalizeHtmlDocument(html: string): string {
  const trimmed = html.trim();
  if (!trimmed) {
    return '<!doctype html><html><head></head><body></body></html>';
  }
  if (/<html[\s>]/i.test(trimmed)) {
    return /<!doctype/i.test(trimmed) ? trimmed : `<!doctype html>\n${trimmed}`;
  }
  return `<!doctype html><html><head></head><body>${trimmed}</body></html>`;
}

/**
 * Parses an HTML document or fragment string into a canonical LinkeDOM `Document`.
 */
export function parseHtmlDocument(html: string): Document {
  const { document } = parseHTML(normalizeHtmlDocument(html));
  return document as unknown as Document;
}

/**
 * Decodes a `data:text/css...` URI into raw CSS text, or returns `null` if not a CSS data URI.
 */
export function decodeDataCssUri(href: string): string | null {
  const match = /^data:text\/css(?:;charset=[^;,]+)?(;base64)?,([\s\S]*)$/i.exec(href.trim());
  if (!match) return null;
  const isBase64 = Boolean(match[1]);
  const payload = match[2] ?? '';
  try {
    return isBase64 ? Buffer.from(payload, 'base64').toString('utf8') : decodeURIComponent(payload);
  } catch {
    return null;
  }
}

/**
 * Rewrites relative `url(...)` asset references inside an external stylesheet against its URL.
 */
export function rewriteRelativeCssUrls(cssText: string, stylesheetUrl: string): string {
  return cssText.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (full, quote: string, rawRef: string) => {
    const ref = rawRef.trim();
    if (
      !ref ||
      ref.startsWith('data:') ||
      ref.startsWith('#') ||
      ref.startsWith('http://') ||
      ref.startsWith('https://')
    ) {
      return full;
    }
    try {
      const resolved = new URL(ref, stylesheetUrl).href;
      return `url(${quote}${resolved}${quote})`;
    } catch {
      return full;
    }
  });
}

function findStylesheetLinks(document: Document): Element[] {
  const links = Array.from(document.querySelectorAll('link'));
  return links.filter((link) => {
    if (link.hasAttribute('disabled')) return false;
    const relTokens = (link.getAttribute('rel') ?? '')
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!relTokens.includes('stylesheet') || relTokens.includes('alternate')) {
      return false;
    }
    const media = (link.getAttribute('media') ?? '').trim().toLowerCase();
    if (media === 'print') {
      return false;
    }
    const href = (link.getAttribute('href') ?? '').trim();
    return href.length > 0;
  });
}

function replaceLinkWithStyle(
  document: Document,
  link: Element,
  cssText: string,
  sourceRef: string,
): void {
  const styleEl = document.createElement('style');
  styleEl.setAttribute('data-anygrab-inlined', sourceRef);
  styleEl.textContent = cssText;
  if (link.parentNode) {
    link.parentNode.replaceChild(styleEl, link);
  } else {
    (document.head ?? document.documentElement)?.appendChild(styleEl);
  }
}

export async function fetchTextWithTimeout(
  url: string,
  timeoutMs: number,
  fetchFn: typeof fetch = globalThis.fetch,
  extraHeaders?: Record<string, string>,
  accept = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
): Promise<{ text: string; finalUrl: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort(new Error(`Request timed out after ${timeoutMs}ms`));
  }, timeoutMs);

  try {
    const response = await fetchFn(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': DEFAULT_USER_AGENT,
        accept,
        ...extraHeaders,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`.trim());
    }

    const contentLength = Number(response.headers.get('content-length') ?? '0');
    if (contentLength > MAX_CSS_BYTES * 2) {
      throw new Error(`Response payload too large (${contentLength} bytes)`);
    }

    const text = await response.text();
    return {
      text,
      finalUrl: response.url || url,
    };
  } catch (error: unknown) {
    if (controller.signal.aborted) {
      throw new Error(`Timed out after ${timeoutMs}ms fetching ${url}`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Inlines `data:text/css` `<link rel="stylesheet">` nodes synchronously (used by `grabFromHtml`).
 */
export function inlineDataStylesheets(document: Document): number {
  let count = 0;
  for (const link of findStylesheetLinks(document)) {
    const href = (link.getAttribute('href') ?? '').trim();
    const cssText = decodeDataCssUri(href);
    if (cssText !== null) {
      replaceLinkWithStyle(document, link, cssText, 'data:text/css');
      count++;
    }
  }
  return count;
}

/**
 * Fetches and inlines external `<link rel="stylesheet">` stylesheets into `<style>` nodes
 * for a document loaded from an HTTP(S) URL.
 */
export async function inlineStylesheetsFromUrl(
  document: Document,
  baseUrl: string,
  options: NodeGrabOptions = {},
): Promise<StylesheetInlineResult> {
  if (options.inlineStylesheets === false) {
    return { inlinedCount: 0, warnings: [] };
  }

  const cssTimeoutMs = options.cssTimeoutMs ?? DEFAULT_CSS_TIMEOUT_MS;
  const fetchFn = options.fetchImpl ?? globalThis.fetch;
  const links = findStylesheetLinks(document).slice(0, MAX_STYLESHEETS);
  const warnings: string[] = [];
  let inlinedCount = 0;

  await Promise.all(
    links.map(async (link) => {
      const rawHref = (link.getAttribute('href') ?? '').trim();
      const dataCss = decodeDataCssUri(rawHref);
      if (dataCss !== null) {
        replaceLinkWithStyle(document, link, dataCss, 'data:text/css');
        inlinedCount++;
        return;
      }

      let resolvedUrl: URL;
      try {
        resolvedUrl = new URL(rawHref, baseUrl);
      } catch {
        warnings.push(`Skipped invalid stylesheet URL: ${rawHref}`);
        return;
      }

      if (resolvedUrl.protocol !== 'http:' && resolvedUrl.protocol !== 'https:') {
        return;
      }

      try {
        const { text, finalUrl } = await fetchTextWithTimeout(
          resolvedUrl.href,
          cssTimeoutMs,
          fetchFn,
          options.headers,
          'text/css,*/*;q=0.1',
        );
        if (text.length > MAX_CSS_BYTES) {
          warnings.push(`Skipped oversized stylesheet (${text.length} chars): ${finalUrl}`);
          return;
        }
        if (text.trim().length > 0) {
          const normalizedCss = rewriteRelativeCssUrls(text, finalUrl);
          replaceLinkWithStyle(document, link, normalizedCss, finalUrl);
          inlinedCount++;
        } else {
          link.parentNode?.removeChild(link);
        }
      } catch (error: unknown) {
        const reason = error instanceof Error ? error.message : String(error);
        warnings.push(`Failed to inline stylesheet ${resolvedUrl.href}: ${reason}`);
      }
    }),
  );

  return { inlinedCount, warnings };
}

/**
 * Reads local relative CSS files and fetches remote HTTP(S) `<link rel="stylesheet">`
 * stylesheets, inlining them into `<style>` nodes for a document loaded from disk.
 */
export async function inlineStylesheetsFromFile(
  document: Document,
  htmlFilePath: string,
  options: NodeGrabOptions = {},
): Promise<StylesheetInlineResult> {
  if (options.inlineStylesheets === false) {
    return { inlinedCount: 0, warnings: [] };
  }

  const baseDir = dirname(resolve(htmlFilePath));
  const cssTimeoutMs = options.cssTimeoutMs ?? DEFAULT_CSS_TIMEOUT_MS;
  const fetchFn = options.fetchImpl ?? globalThis.fetch;
  const links = findStylesheetLinks(document).slice(0, MAX_STYLESHEETS);
  const warnings: string[] = [];
  let inlinedCount = 0;

  await Promise.all(
    links.map(async (link) => {
      const rawHref = (link.getAttribute('href') ?? '').trim();
      const dataCss = decodeDataCssUri(rawHref);
      if (dataCss !== null) {
        replaceLinkWithStyle(document, link, dataCss, 'data:text/css');
        inlinedCount++;
        return;
      }

      if (/^(https?:)?\/\//i.test(rawHref)) {
        const remoteUrl = rawHref.startsWith('//') ? `https:${rawHref}` : rawHref;
        try {
          const { text, finalUrl } = await fetchTextWithTimeout(
            remoteUrl,
            cssTimeoutMs,
            fetchFn,
            options.headers,
            'text/css,*/*;q=0.1',
          );
          if (text.trim().length > 0 && text.length <= MAX_CSS_BYTES) {
            replaceLinkWithStyle(document, link, rewriteRelativeCssUrls(text, finalUrl), finalUrl);
            inlinedCount++;
          }
        } catch (error: unknown) {
          const reason = error instanceof Error ? error.message : String(error);
          warnings.push(`Failed to inline remote stylesheet ${remoteUrl}: ${reason}`);
        }
        return;
      }

      try {
        let localCssPath: string;
        if (rawHref.startsWith('file://')) {
          localCssPath = fileURLToPath(rawHref);
        } else {
          const cleanRel = rawHref.split(/[?#]/)[0] ?? '';
          if (!cleanRel) return;
          localCssPath = isAbsolute(cleanRel)
            ? resolve(baseDir, cleanRel.replace(/^\/+/, ''))
            : resolve(baseDir, cleanRel);
        }

        const cssText = await readFile(localCssPath, 'utf8');
        if (cssText.trim().length > 0 && cssText.length <= MAX_CSS_BYTES) {
          replaceLinkWithStyle(document, link, cssText, localCssPath);
          inlinedCount++;
        } else {
          link.parentNode?.removeChild(link);
        }
      } catch (error: unknown) {
        const reason = error instanceof Error ? error.message : String(error);
        warnings.push(`Failed to inline local stylesheet ${rawHref}: ${reason}`);
      }
    }),
  );

  return { inlinedCount, warnings };
}

/**
 * Scopes `document` to `selector` while preserving `<head><style>` rules and the ancestor
 * tag/class/id chain from `<body>` down to the matched element for accurate CSS cascade matching.
 */
export function scopeDocumentToSelector(document: Document, selector?: string): void {
  const trimmed = selector?.trim();
  if (!trimmed) return;

  let matched: Element | null;
  try {
    matched = document.querySelector(trimmed);
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid CSS selector "${trimmed}": ${detail}`);
  }

  if (!matched) {
    throw new Error(`No element matched CSS selector "${trimmed}".`);
  }

  if (
    matched === document.documentElement ||
    matched === document.body ||
    matched === document.head
  ) {
    return;
  }

  // Hoist any <style> tags located outside `matched` inside <body> into <head> before pruning.
  const head = document.head ?? document.documentElement;
  if (document.body && head) {
    for (const styleNode of Array.from(document.body.querySelectorAll('style'))) {
      if (!matched.contains(styleNode)) {
        head.appendChild(styleNode);
      }
    }
  }

  const ancestorSpine = new Set<Node>();
  let cursor: Node | null = matched;
  while (cursor) {
    ancestorSpine.add(cursor);
    cursor = cursor.parentNode;
  }

  let container: Node | null = document.body;
  while (container && container !== matched) {
    for (const child of Array.from(container.childNodes)) {
      if (!ancestorSpine.has(child)) {
        container.removeChild(child);
      }
    }
    const nextInSpine: ChildNode | undefined = Array.from(container.childNodes).find((child) =>
      ancestorSpine.has(child),
    );
    container = nextInSpine ?? null;
  }
}
