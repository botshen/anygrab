import { grab, type GrabOptions, type GrabResult } from '@anygrab/core';

export function grabElementInPage(element: Element, options: GrabOptions = {}): GrabResult {
  return grab(element, {
    ...options,
    sourceUrl: options.sourceUrl ?? window.location.href,
    styleResolver: options.styleResolver ?? ((el, pseudo) => window.getComputedStyle(el, pseudo)),
  });
}
