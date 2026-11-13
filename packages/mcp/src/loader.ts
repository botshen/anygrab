import { parseHTML } from 'linkedom';

export const DEFAULT_FETCH_TIMEOUT_MS = 10_000;
export const DEFAULT_CSS_TIMEOUT_MS = 4_000;
const MAX_STYLESHEETS = 24;
const MAX_CSS_BYTES = 4 * 1024 * 1024;

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (compatible; AnyGrab-MCP/0.2; +https://github.com/botshen/anygrab)';

export interface McpLoaderOptions {
  fetchTimeoutMs?: number;
  cssTimeoutMs?: number;
  fetchImpl?: typeof fetch;
  headers?: Record<string, string>;
}

export interface LoadedUrlDocument {
  document: Document;
  finalUrl: string;
  inlinedStylesheets: number;
  warnings: string[];
}

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

export function parseHtmlDocument(html: string): Document {
  const { document } = parseHTML(normalizeHtmlDocument(html));
  return document as unknown as Document;
}

function decodeDataCssUri(href: string): string | null {
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

function rewriteRelativeCssUrls(cssText: string, stylesheetUrl: string): string {
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
  return Array.from(document.querySelectorAll('link')).filter((link) => {
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
    return Boolean((link.getAttribute('href') ?? '').trim());
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

async function fetchTextWithTimeout(
  url: string,
  timeoutMs: number,
  fetchFn: typeof fetch,
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
    return { text, finalUrl: response.url || url };
  } catch (error: unknown) {
    if (controller.signal.aborted) {
      throw new Error(`Timed out after ${timeoutMs}ms fetching ${url}`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function loadUrlDocument(
  url: string,
  options: McpLoaderOptions = {},
): Promise<LoadedUrlDocument> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error(`Invalid URL "${url}". Expected an http:// or https:// URL.`);
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new Error(`Unsupported URL protocol "${parsedUrl.protocol}". Expected http: or https:.`);
  }

  const fetchFn = options.fetchImpl ?? globalThis.fetch;
  const fetchTimeoutMs = options.fetchTimeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
  const cssTimeoutMs = options.cssTimeoutMs ?? DEFAULT_CSS_TIMEOUT_MS;

  const { text: html, finalUrl } = await fetchTextWithTimeout(
    parsedUrl.href,
    fetchTimeoutMs,
    fetchFn,
    options.headers,
  );

  const document = parseHtmlDocument(html);
  const links = findStylesheetLinks(document).slice(0, MAX_STYLESHEETS);
  const warnings: string[] = [];
  let inlinedStylesheets = 0;

  await Promise.all(
    links.map(async (link) => {
      const rawHref = (link.getAttribute('href') ?? '').trim();
      const dataCss = decodeDataCssUri(rawHref);
      if (dataCss !== null) {
        replaceLinkWithStyle(document, link, dataCss, 'data:text/css');
        inlinedStylesheets++;
        return;
      }

      let resolvedCssUrl: URL;
      try {
        resolvedCssUrl = new URL(rawHref, finalUrl);
      } catch {
        warnings.push(`Skipped invalid stylesheet URL: ${rawHref}`);
        return;
      }

      if (resolvedCssUrl.protocol !== 'http:' && resolvedCssUrl.protocol !== 'https:') {
        return;
      }

      try {
        const { text: cssText, finalUrl: cssFinalUrl } = await fetchTextWithTimeout(
          resolvedCssUrl.href,
          cssTimeoutMs,
          fetchFn,
          options.headers,
          'text/css,*/*;q=0.1',
        );
        if (cssText.length > MAX_CSS_BYTES) {
          warnings.push(`Skipped oversized stylesheet (${cssText.length} chars): ${cssFinalUrl}`);
          return;
        }
        if (cssText.trim().length > 0) {
          replaceLinkWithStyle(
            document,
            link,
            rewriteRelativeCssUrls(cssText, cssFinalUrl),
            cssFinalUrl,
          );
          inlinedStylesheets++;
        } else {
          link.parentNode?.removeChild(link);
        }
      } catch (error: unknown) {
        const reason = error instanceof Error ? error.message : String(error);
        warnings.push(`Failed to inline stylesheet ${resolvedCssUrl.href}: ${reason}`);
      }
    }),
  );

  return {
    document,
    finalUrl,
    inlinedStylesheets,
    warnings,
  };
}

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
