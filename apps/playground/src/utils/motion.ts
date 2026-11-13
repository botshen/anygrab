/**
 * Motion capability guard for GSAP ScrollTrigger & Lenis.
 *
 * Ensures headless/test DOM environments (happy-dom, jsdom) and users with
 * `prefers-reduced-motion: reduce` render immediately without pinning/scrubbing
 * or leaving elements invisible.
 */
export function isMotionCapableBrowser(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }

  const win = window as unknown as { happyDOM?: unknown };
  if (win.happyDOM) {
    return false;
  }

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent || '' : '';
  if (/HappyDOM|jsdom/i.test(ua)) {
    return false;
  }

  if (typeof window.matchMedia === 'function') {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return false;
    }
  }

  return true;
}

export function isDesktopViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth >= 768;
}
