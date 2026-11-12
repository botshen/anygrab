import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { grab, type GrabOptions, type GrabResult } from '@anygrab/core';
import {
  DEFAULT_CSS_TIMEOUT_MS,
  DEFAULT_FETCH_TIMEOUT_MS,
  fetchTextWithTimeout,
  inlineDataStylesheets,
  inlineStylesheetsFromFile,
  inlineStylesheetsFromUrl,
  normalizeHtmlDocument,
  parseHtmlDocument,
  scopeDocumentToSelector,
  type NodeGrabOptions,
  type StylesheetInlineResult,
} from './loader';

export * from '@anygrab/core';
export {
  DEFAULT_CSS_TIMEOUT_MS,
  DEFAULT_FETCH_TIMEOUT_MS,
  inlineStylesheetsFromFile,
  inlineStylesheetsFromUrl,
  normalizeHtmlDocument,
  parseHtmlDocument,
  scopeDocumentToSelector,
  type NodeGrabOptions,
  type StylesheetInlineResult,
};

function stripNodeOnlyOptions(options: NodeGrabOptions): GrabOptions {
  const {
    fetchTimeoutMs: _fetchTimeoutMs,
    cssTimeoutMs: _cssTimeoutMs,
    inlineStylesheets: _inlineStylesheets,
    fetchImpl: _fetchImpl,
    headers: _headers,
    ...coreOptions
  } = options;
  return coreOptions;
}

/**
 * Parses a raw HTML document or fragment string with LinkeDOM and runs AnyGrab distillation.
 */
export function grabFromHtml(html: string, options: NodeGrabOptions = {}): GrabResult {
  const document = parseHtmlDocument(html);
  inlineDataStylesheets(document);
  scopeDocumentToSelector(document, options.selector);
  return grab(document, stripNodeOnlyOptions(options));
}

/**
 * Reads a local HTML file, automatically inlines local/public `<link rel="stylesheet">` CSS
 * into `<style>` nodes, parses with LinkeDOM, and runs AnyGrab distillation.
 */
export async function grabFromFile(
  filePath: string,
  options: NodeGrabOptions = {},
): Promise<GrabResult> {
  const absPath = resolve(filePath);
  let html: string;
  try {
    html = await readFile(absPath, 'utf8');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to read HTML file "${filePath}": ${message}`);
  }

  const document = parseHtmlDocument(html);
  const { warnings: cssWarnings } = await inlineStylesheetsFromFile(document, absPath, options);
  scopeDocumentToSelector(document, options.selector);

  const result = grab(document, stripNodeOnlyOptions(options));
  if (cssWarnings.length > 0) {
    result.warnings = [...result.warnings, ...cssWarnings];
  }
  return result;
}

/**
 * Fetches a public webpage URL, automatically fetches and inlines `<link rel="stylesheet">`
 * external/same-origin CSS into `<style>` nodes within timeout (default 4s), parses with LinkeDOM,
 * and runs AnyGrab distillation.
 */
export async function grabFromUrl(url: string, options: NodeGrabOptions = {}): Promise<GrabResult> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error(`Invalid URL "${url}". Expected an http:// or https:// URL.`);
  }
  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new Error(`Unsupported URL protocol "${parsedUrl.protocol}". Expected http: or https:.`);
  }

  const fetchTimeoutMs = options.fetchTimeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
  const fetchFn = options.fetchImpl ?? globalThis.fetch;

  let html: string;
  let finalUrl: string;
  try {
    const fetched = await fetchTextWithTimeout(
      parsedUrl.href,
      fetchTimeoutMs,
      fetchFn,
      options.headers,
    );
    html = fetched.text;
    finalUrl = fetched.finalUrl;
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to fetch URL "${url}": ${detail}`);
  }

  const document = parseHtmlDocument(html);
  const { warnings: cssWarnings } = await inlineStylesheetsFromUrl(document, finalUrl, options);
  scopeDocumentToSelector(document, options.selector);

  const coreOptions = stripNodeOnlyOptions(options);
  const result = grab(document, {
    ...coreOptions,
    sourceUrl: coreOptions.sourceUrl ?? finalUrl,
  });

  if (cssWarnings.length > 0) {
    result.warnings = [...result.warnings, ...cssWarnings];
  }
  return result;
}
