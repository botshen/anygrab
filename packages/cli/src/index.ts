import { grab, type GrabOptions, type GrabResult } from '@anygrab/core';
import { parseHTML } from 'linkedom';

export * from '@anygrab/core';

/**
 * Parses a raw HTML document string with LinkeDOM and runs AnyGrab distillation.
 */
export function grabFromHtml(html: string, options: GrabOptions = {}): GrabResult {
  const { document } = parseHTML(html);
  const target = options.selector
    ? (document.querySelector(options.selector) ?? document)
    : document;
  return grab(target as unknown as Document, options);
}
