import { afterEach, describe, expect, it } from 'vitest';
import {
  clearAdapters,
  estimateTokens,
  extractDesignTokens,
  getAdapters,
  grab,
  isObfuscatedClassName,
  parseHtmlFallback,
  registerAdapter,
  registerBuiltinAdapters,
} from '../index';
import type { AnyGrabAdapter, StyleResolver } from '../types';

/**
 * Verifies that every non-void opening HTML tag in `html` has a matching, properly nested closing tag.
 */
function assertBalancedHtmlTags(html: string): void {
  const voidTags = new Set([
    'area',
    'base',
    'br',
    'col',
    'embed',
    'hr',
    'img',
    'input',
    'link',
    'meta',
    'param',
    'source',
    'track',
    'wbr',
  ]);

  // Remove HTML comments and `<pre>...</pre>` inner code text before structural tag check
  const withoutComments = html.replace(/<!--[\s\S]*?-->/g, '');
  const stack: string[] = [];
  const tagRe = /<\/?([a-zA-Z][a-zA-Z0-9-]*)(\s[^>]*)?\s*(\/?)>/g;

  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(withoutComments)) !== null) {
    const full = m[0];
    const tag = m[1].toLowerCase();
    const selfClosed = m[3] === '/' || full.endsWith('/>');

    if (full.startsWith('</')) {
      expect(stack.length, `Unexpected closing </${tag}> in:\n${html}`).toBeGreaterThan(0);
      const top = stack.pop();
      expect(top, `Mismatched closing </${tag}> (expected </${top}>) in:\n${html}`).toBe(tag);
    } else if (!selfClosed && !voidTags.has(tag)) {
      stack.push(tag);
    }
  }
  expect(stack, `Unclosed tags [${stack.join(', ')}] in:\n${html}`).toEqual([]);
}

/**
 * Verifies JSX tag balance, self-closing void tags, `className` usage, and absence of raw HTML comments.
 */
function assertValidJsxSnippet(jsx: string): void {
  expect(jsx).not.toContain('<!--');
  expect(jsx).not.toMatch(/\sclass="/);

  // Strip JSX comments `{/* ... */}` and JSON stringified code blocks `{"..."}`
  const stripped = jsx
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\{(?:"(?:\\.|[^"\\])*")\}/g, 'CODE_TEXT');

  const stack: string[] = [];
  const tagRe = /<\/?([a-zA-Z][a-zA-Z0-9-]*)((?:[^/>]|\/(?!>))*?)\s*(\/?)>/g;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(stripped)) !== null) {
    const full = m[0];
    const tag = m[1];
    const isClosing = full.startsWith('</');
    const isSelfClosing = m[3] === '/';
    if (isClosing) {
      const top = stack.pop();
      expect(top, `JSX closing </${tag}> did not match <${top}> in:\n${jsx}`).toBe(tag);
    } else if (!isSelfClosing) {
      stack.push(tag);
    }
  }
  expect(stack, `Unclosed JSX tags [${stack.join(', ')}] in:\n${jsx}`).toEqual([]);
}

afterEach(() => {
  registerBuiltinAdapters();
});

// ============================================================================
// 1. Cross-Environment DOM Adapter & Pure-Node Fallback Tests
// ============================================================================

describe('1. dom-adapter: cross-environment HTML/DOM parsing & selector scoping', () => {
  it('1.1 parses raw HTML strings via environment DOMParser cleanly', () => {
    const res = grab('<article class="p-4"><h2>Hello World</h2><p>Clean paragraph</p></article>', {
      format: 'tailwind-html',
    });
    expect(res.output).toContain('<article class="p-4">');
    expect(res.output).toContain('<h2>Hello World</h2>');
    expect(res.output).toContain('<p>Clean paragraph</p>');
    assertBalancedHtmlTags(res.output);
  });

  it('1.2 falls back cleanly to zero-dependency parseHtmlFallback when DOMParser is absent (pure Node)', () => {
    const sample = `
      <style>
        .hero { display: flex; flex-direction: column; gap: 16px; background: #0f172a; color: #ffffff; padding: 24px; }
        .cta { background: #6366f1; border-radius: 8px; padding: 8px 16px; }
      </style>
      <section class="hero">
        <h1>Zero Dependency Engine</h1>
        <button class="cta">Launch &amp; Deploy &rarr;</button>
      </section>
    `;

    const withDomParser = grab(sample, { format: 'tailwind-html' });

    const originalDOMParser = globalThis.DOMParser;
    try {
      // Simulate pure Node.js environment without global DOMParser
      (globalThis as { DOMParser?: unknown }).DOMParser = undefined;
      const withFallback = grab(sample, { format: 'tailwind-html' });

      expect(withFallback.output).toContain('flex');
      expect(withFallback.output).toContain('flex-col');
      expect(withFallback.output).toContain('gap-4');
      expect(withFallback.output).toContain('bg-slate-900');
      expect(withFallback.output).toContain('Launch &amp; Deploy →');
      expect(withFallback.output).toBe(withDomParser.output);
    } finally {
      globalThis.DOMParser = originalDOMParser;
    }
  });

  it('1.3 parseHtmlFallback handles void tags, raw <script>/<style>, implicit auto-close, and selectors', () => {
    const messyHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>.box > p { color: #ef4444; }</style>
          <script>if (1 < 2 && 3 > 1) { console.log("<div>not a tag</div>"); }</script>
        </head>
        <body>
          <div id="main" class="box">
            <p>First unclosed paragraph
            <p>Second paragraph<br><img src="/logo.png" alt="Logo">
            <ul><li>One<li>Two</ul>
          </div>
        </body>
      </html>
    `;
    const doc = parseHtmlFallback(messyHtml);
    expect(doc.querySelectorAll('script').length).toBe(1);
    expect(doc.querySelectorAll('#main > p').length).toBe(2);
    expect(doc.querySelectorAll('ul > li').length).toBe(2);
    expect(doc.querySelector('img')?.getAttribute('alt')).toBe('Logo');
  });

  it('1.4 accepts live DOM Element directly without mutating the caller DOM tree', () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <div class="css-19x82a" data-testid="card" style="display: flex; padding: 16px;">
        <span style="font-weight: 600;">Immutable Live Node</span>
        <script>window.__bad = 1;</script>
      </div>
    `;
    const targetEl = container.firstElementChild!;
    const beforeHtml = targetEl.outerHTML;

    const res = grab(targetEl, { format: 'tailwind-html' });
    expect(targetEl.outerHTML).toBe(beforeHtml); // Zero mutation on live page!
    expect(res.output).toContain('flex');
    expect(res.output).toContain('p-4');
    expect(res.output).not.toContain('css-19x82a');
    expect(res.output).not.toContain('data-testid');
    expect(res.output).not.toContain('<script>');
  });

  it('1.5 accepts Document and DocumentFragment inputs', () => {
    const frag = document.createDocumentFragment();
    const btn = document.createElement('button');
    btn.setAttribute('style', 'background: #4f46e5; color: #fff; padding: 8px 16px;');
    btn.textContent = 'Save Changes';
    frag.appendChild(btn);

    const res = grab(frag, { format: 'jsx' });
    expect(res.output).toContain('<button');
    expect(res.output).toContain('bg-indigo-600');
    expect(res.output).toContain('Save Changes');
  });

  it('1.6 scopes subtree using options.selector and warns gracefully if selector misses', () => {
    const html = `
      <style>.tier { padding: 20px; background: #1e293b; }</style>
      <div>
        <header>Noise Header</header>
        <section id="pro-tier" class="tier"><h3>Pro Plan</h3><p>$29/mo</p></section>
        <footer>Noise Footer</footer>
      </div>
    `;
    const scoped = grab(html, { selector: '#pro-tier', format: 'tailwind-html' });
    expect(scoped.output).toContain('Pro Plan');
    expect(scoped.output).toContain('p-5');
    expect(scoped.output).toContain('bg-slate-800');
    expect(scoped.output).not.toContain('Noise Header');
    expect(scoped.warnings).toHaveLength(0);

    const missed = grab(html, { selector: '#non-existent', format: 'tailwind-html' });
    expect(missed.warnings.some((w) => w.includes('#non-existent'))).toBe(true);
  });

  it('1.7 handles SVG elements whose className property is an SVGAnimatedString object', () => {
    const fakeSvg = {
      nodeType: 1,
      tagName: 'svg',
      localName: 'svg',
      className: { baseVal: 'text-emerald-500 css-9988aa', animVal: '' },
      attributes: [
        { name: 'viewBox', value: '0 0 24 24' },
        { name: 'width', value: '20' },
        { name: 'height', value: '20' },
      ],
      getAttribute(name: string) {
        if (name === 'viewBox') return '0 0 24 24';
        if (name === 'width') return '20';
        if (name === 'height') return '20';
        return null;
      },
      childNodes: [],
      children: [],
    } as unknown as Element;

    const res = grab(fakeSvg, { format: 'tailwind-html' });
    expect(res.output).toContain('text-emerald-500');
    expect(res.output).toContain('size-5');
    expect(res.output).not.toContain('css-9988aa');
    expect(res.output).toContain('data-icon="svg"');
  });
});

// ============================================================================
// 2. Dual-Mode Style Differ, Cascade, CSS Variables & Default Subtraction
// ============================================================================

describe('2. style-differ: CSS cascade, var(--x), UA subtraction & inheritance dedup', () => {
  it('2.1 resolves selector specificity (#id > .class > tag), combinators, and !important', () => {
    const html = `
      <style>
        div p { color: #ef4444; padding: 8px; }
        .highlight { color: #3b82f6; padding: 16px !important; }
        #featured-text { color: #10b981; padding: 24px; }
      </style>
      <div>
        <p id="featured-text" class="highlight">Specificity Winner</p>
      </div>
    `;
    const res = grab(html, { format: 'tailwind-html' });
    // #featured-text wins color (`text-emerald-500`), `.highlight !important` wins padding (`p-4`)
    expect(res.output).toContain('text-emerald-500');
    expect(res.output).toContain('p-4');
    expect(res.output).not.toContain('text-red-500');
    expect(res.output).not.toContain('text-blue-500');
  });

  it('2.2 expands :root and cascaded element CSS variables var(--x) with fallbacks', () => {
    const html = `
      <style>
        :root {
          --surface: #0f172a;
          --brand: #6366f1;
          --radius-card: 16px;
        }
        .card {
          background-color: var(--surface);
          border: 1px solid var(--brand);
          border-radius: var(--radius-card);
          padding: var(--missing-pad, 24px);
        }
      </style>
      <div class="card"><span>Themed Card</span></div>
    `;
    const res = grab(html, { format: 'tailwind-html' });
    expect(res.output).toContain('bg-slate-900');
    expect(res.output).toContain('border');
    expect(res.output).toContain('border-indigo-500');
    expect(res.output).toContain('rounded-2xl');
    expect(res.output).toContain('p-6');
  });

  it('2.3 evaluates desktop @media rules properly and skips @keyframes / @media print / mobile max-width', () => {
    const html = `
      <style>
        @keyframes pulse { 0% { opacity: 0.5; } 100% { opacity: 1; } }
        .grid-wrap { display: grid; grid-template-columns: 1fr; gap: 16px; }
        @media (min-width: 768px) {
          .grid-wrap { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        }
        @media (max-width: 640px) {
          .grid-wrap { grid-template-columns: 1fr; gap: 8px; }
        }
        @media print {
          .grid-wrap { display: none; }
        }
      </style>
      <section class="grid-wrap">
        <article>Tier 1</article>
        <article>Tier 2</article>
        <article>Tier 3</article>
      </section>
    `;
    const res = grab(html, { format: 'tailwind-html' });
    expect(res.output).toContain('grid');
    expect(res.output).toContain('grid-cols-3');
    expect(res.output).toContain('gap-4');
  });

  it('2.4 strips browser UA default bloat (display:block, border:0px, margin:0, opacity:1, box-sizing) and counts stylesStripped', () => {
    const noisyInline = `
      <div style="display: block; position: static; margin: 0px; padding: 16px; border: 0px none rgb(0,0,0); background-color: rgba(0, 0, 0, 0); opacity: 1; visibility: visible; box-sizing: border-box; -webkit-font-smoothing: antialiased;">
        <span style="display: inline; font-weight: 400; text-decoration: none;">Clean Signal</span>
      </div>
    `;
    const res = grab(noisyInline, { format: 'tailwind-html' });
    expect(res.output).toContain('class="p-4"');
    expect(res.output).not.toContain('block');
    expect(res.output).not.toContain('static');
    expect(res.output).not.toContain('opacity');
    expect(res.output).not.toContain('border');
    expect(res.metrics.stylesStripped).toBeGreaterThanOrEqual(12);
  });

  it('2.5 deduplicates inherited typography properties (color, font-family, font-size, text-align) from parent', () => {
    const html = `
      <style>
        .parent { color: #f8fafc; font-family: Inter, sans-serif; font-size: 14px; text-align: center; padding: 16px; }
        .child-same { color: #f8fafc; font-family: Inter, sans-serif; font-size: 14px; text-align: center; margin-top: 8px; }
        .child-diff { color: #38bdf8; font-weight: 700; }
      </style>
      <div class="parent">
        <p class="child-same">Inherited Paragraph</p>
        <p class="child-diff">Accent Paragraph</p>
      </div>
    `;
    const res = grab(html, { format: 'tailwind-html' });
    // Parent gets text-slate-50, text-sm, text-center; child-same only gets mt-2!
    expect(res.output).toContain('<p class="mt-2">Inherited Paragraph</p>');
    expect(res.output).toContain('<p class="font-bold text-sky-400">Accent Paragraph</p>');
  });

  it('2.6 supports custom options.styleResolver (window.getComputedStyle compatible) and filters layout pixel widths', () => {
    const resolver: StyleResolver = (el) => {
      if (el.tagName.toLowerCase() === 'button') {
        return {
          getPropertyValue(prop: string) {
            const map: Record<string, string> = {
              display: 'inline-flex',
              'align-items': 'center',
              'background-color': 'rgb(79, 70, 229)',
              color: 'rgb(255, 255, 255)',
              'padding-top': '8px',
              'padding-bottom': '8px',
              'padding-left': '16px',
              'padding-right': '16px',
              'border-top-left-radius': '8px',
              'border-top-right-radius': '8px',
              'border-bottom-right-radius': '8px',
              'border-bottom-left-radius': '8px',
              width: '142.375px', // layout-measured fractional width -> should be stripped
            };
            return map[prop] ?? '';
          },
        };
      }
      return { display: 'block', width: '820.125px' };
    };

    const res = grab('<div><button>Deploy</button></div>', {
      styleResolver: resolver,
      format: 'tailwind-html',
    });
    expect(res.output).toContain('inline-flex');
    expect(res.output).toContain('items-center');
    expect(res.output).toContain('bg-indigo-600');
    expect(res.output).toContain('py-2');
    expect(res.output).toContain('px-4');
    expect(res.output).toContain('rounded-lg');
    expect(res.output).not.toContain('142.375px');
  });

  it('2.7 extracts hover:* classes only when includeHoverStyles is true', () => {
    const html = `
      <style>
        .btn { background: #4f46e5; color: #ffffff; padding: 8px 16px; }
        .btn:hover { background: #4338ca; transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.2); }
      </style>
      <button class="btn">Upgrade</button>
    `;
    const withoutHover = grab(html, { includeHoverStyles: false, format: 'tailwind-html' });
    expect(withoutHover.output).not.toContain('hover:');

    const withHover = grab(html, { includeHoverStyles: true, format: 'tailwind-html' });
    expect(withHover.output).toContain('hover:bg-indigo-700');
    expect(withHover.output).toContain('hover:-translate-y-0.5');
    expect(withHover.output).toContain('hover:shadow-lg');
  });
});

// ============================================================================
// 3. Deterministic CSS -> Tailwind v4 Compiler & Class Sanitizer
// ============================================================================

describe('3. tailwind-mapper: layout, spacing, typography, palette, gradients & class sanitizer', () => {
  it('3.1 maps standard 4px spacing scale, negative margins, mx-auto, and arbitrary non-scale values', () => {
    const html = `
      <div style="margin: 0 auto; max-width: 896px; padding: 13px;">
        <span style="margin-top: -8px; display: inline-block; width: 24px; height: 24px;">Badge</span>
      </div>
    `;
    const res = grab(html, { format: 'tailwind-html' });
    expect(res.output).toContain('mx-auto');
    expect(res.output).toContain('max-w-4xl');
    expect(res.output).toContain('p-[13px]');
    expect(res.output).toContain('-mt-2');
    expect(res.output).toContain('size-6');
  });

  it('3.2 collapses overflow:hidden + text-overflow:ellipsis + white-space:nowrap into truncate', () => {
    const html = `<p style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 384px;">Very long file path that truncates cleanly</p>`;
    const res = grab(html, { format: 'tailwind-html' });
    expect(res.output).toContain('truncate');
    expect(res.output).toContain('max-w-sm');
    expect(res.output).not.toContain('whitespace-nowrap');
  });

  it('3.3 maps rgba alpha opacity, custom brand hex, and linear-gradient stops accurately', () => {
    const html = `
      <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: rgba(255, 255, 255, 0.8); border: 1px solid #131620;">
        Gradient Hero
      </div>
    `;
    const res = grab(html, { format: 'tailwind-html' });
    expect(res.output).toContain('bg-gradient-to-br');
    expect(res.output).toContain('from-indigo-500');
    expect(res.output).toContain('to-violet-500');
    expect(res.output).toContain('text-white/80');
    expect(res.output).toContain('border-[#131620]');
  });

  it('3.4 maps backdrop-blur, opacity, font-mono, tracking, uppercase, and ring box-shadow', () => {
    const html = `
      <div style="backdrop-filter: blur(12px); opacity: 0.9; box-shadow: 0 0 0 1px rgba(255,255,255,0.1);">
        <code style="font-family: 'JetBrains Mono', monospace; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase;">API_KEY</code>
      </div>
    `;
    const res = grab(html, { format: 'tailwind-html' });
    expect(res.output).toContain('backdrop-blur-md');
    expect(res.output).toContain('opacity-90');
    expect(res.output).toContain('ring-1');
    expect(res.output).toContain('font-mono');
    expect(res.output).toContain('text-xs');
    expect(res.output).toContain('tracking-widest');
    expect(res.output).toContain('uppercase');
  });

  it('3.5 strips CSS-in-JS / CSS Modules hashes while preserving existing valid Tailwind & language-* classes', () => {
    expect(isObfuscatedClassName('css-19x82a')).toBe(true);
    expect(isObfuscatedClassName('sc-bdnxRM')).toBe(true);
    expect(isObfuscatedClassName('jsx-3928172')).toBe(true);
    expect(isObfuscatedClassName('_card_19x_1')).toBe(true);
    expect(isObfuscatedClassName('Pricing_tier__8f9a2')).toBe(true);
    expect(isObfuscatedClassName('svelte-1abc23')).toBe(true);

    expect(isObfuscatedClassName('flex')).toBe(false);
    expect(isObfuscatedClassName('bg-[#0f172a]')).toBe(false);
    expect(isObfuscatedClassName('hover:bg-indigo-500')).toBe(false);
    expect(isObfuscatedClassName('language-typescript')).toBe(false);
    expect(isObfuscatedClassName('card')).toBe(false);

    const html = `
      <style>.css-19x82a { display: flex; gap: 12px; }</style>
      <div class="css-19x82a sc-bdnxRM _card_19x_1 jsx-82716 rounded-xl shadow-md">
        <pre><code class="language-ts">const ok = true;</code></pre>
      </div>
    `;
    const res = grab(html, { format: 'tailwind-html' });
    expect(res.output).toContain('rounded-xl');
    expect(res.output).toContain('shadow-md');
    expect(res.output).toContain('flex');
    expect(res.output).toContain('gap-3');
    expect(res.output).toContain('language-ts');
    expect(res.output).not.toContain('css-19x82a');
    expect(res.output).not.toContain('sc-bdnxRM');
    expect(res.output).not.toContain('_card_19x_1');
  });
});

// ============================================================================
// 4. Cleaner, SVG Compaction & Lossless Complex Table Extraction
// ============================================================================

describe('4. cleaner & table-extractor: noise pruning, 20-div unwrapping, SVG compaction & merged tables', () => {
  it('4.1 prunes <script>, <style>, hidden, display:none, and decorative aria-hidden="true" glow blobs', () => {
    const html = `
      <section class="p-8">
        <script>alert("xss")</script>
        <noscript>Enable JS</noscript>
        <template><div>Ghost</div></template>
        <div aria-hidden="true" class="blur-3xl pointer-events-none"><div class="w-96 h-96"></div></div>
        <div hidden>Secret</div>
        <p style="display: none">Invisible</p>
        <h1>AI Workspace</h1>
        <button>Get Started</button>
      </section>
    `;
    const res = grab(html, { format: 'tailwind-html' });
    expect(res.output).toContain('<h1>AI Workspace</h1>');
    expect(res.output).toContain('<button>Get Started</button>');
    expect(res.output).not.toContain('alert');
    expect(res.output).not.toContain('Ghost');
    expect(res.output).not.toContain('blur-3xl');
    expect(res.output).not.toContain('Secret');
    expect(res.output).not.toContain('Invisible');
    expect(res.metrics.nodesPruned).toBeGreaterThanOrEqual(6);
  });

  it('4.2 strips tracking/hydration attributes, resolves relative URLs, and compacts huge base64 images', () => {
    const hugeBase64 = `data:image/png;base64,${'A'.repeat(600)}`;
    const html = `
      <div data-testid="hero" data-v-9911aa="" data-reactroot="" onclick="track()">
        <a href="/docs/quickstart" onmouseover="noop()">Read Docs</a>
        <img src="${hugeBase64}" alt="Avatar">
      </div>
    `;
    const res = grab(html, {
      sourceUrl: 'https://example.com/product',
      format: 'tailwind-html',
    });
    expect(res.output).toContain('href="https://example.com/docs/quickstart"');
    expect(res.output).toContain('src="data:image/placeholder"');
    expect(res.output).not.toContain('data-testid');
    expect(res.output).not.toContain('data-v-9911aa');
    expect(res.output).not.toContain('onclick');
    expect(res.output).not.toContain('AAAA');
  });

  it('4.3 collapses 20-layer redundant nested <div> wrappers into a single clean container', () => {
    let inner = '<div class="p-6 bg-slate-900 rounded-xl"><h3>KPI Revenue</h3><p>$142,800</p></div>';
    for (let i = 0; i < 20; i++) {
      inner = `<div>${inner}</div>`;
    }
    const res = grab(inner, { format: 'tailwind-html' });
    const divCount = (res.output.match(/<div\b/g) ?? []).length;
    expect(divCount).toBe(1);
    expect(res.metrics.nodesPruned).toBeGreaterThanOrEqual(20);
    expect(res.output).toContain('$142,800');
  });

  it('4.4 compacts verbose inline <svg> paths into semantic placeholder while respecting compactSvg: false', () => {
    const giantSvg = `
      <button class="flex items-center gap-2">
        <svg width="20" height="20" viewBox="0 0 24 24" class="text-emerald-400">
          <title>Checkmark</title>
          <defs><linearGradient id="g1"><stop offset="0%" stop-color="#fff"/></linearGradient></defs>
          <path d="${'M10 10 L20 20 '.repeat(120)}" stroke-width="2" stroke-linecap="round"></path>
        </svg>
        <span>Included in Pro</span>
      </button>
    `;

    const compacted = grab(giantSvg, { compactSvg: true, format: 'tailwind-html' });
    expect(compacted.output).toContain(
      '<svg class="text-emerald-400 size-5" viewBox="0 0 24 24" data-icon="svg" aria-label="Checkmark"></svg>',
    );
    expect(compacted.output).not.toContain('<path');
    expect(compacted.metrics.compressionRatio).toBeGreaterThan(80);

    const uncompactedJsx = grab(giantSvg, { compactSvg: false, format: 'jsx' });
    expect(uncompactedJsx.output).toContain('<path');
    expect(uncompactedJsx.output).toContain('strokeWidth="2"');
    expect(uncompactedJsx.output).toContain('strokeLinecap="round"');
  });

  it('4.5 preserves complex multi-level colspan + rowspan financial tables without shifting columns in GFM Markdown', () => {
    const financialTable = `
      <table>
        <caption>FY2026 Regional Revenue Breakdown</caption>
        <thead>
          <tr>
            <th rowspan="2">Region</th>
            <th colspan="2">Q1 2026</th>
            <th colspan="2">Q2 2026</th>
          </tr>
          <tr>
            <th>ARR</th>
            <th>YoY</th>
            <th>ARR</th>
            <th>YoY</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td rowspan="2">North America</td>
            <td>$12.4M</td>
            <td>+28%</td>
            <td>$14.9M</td>
            <td>+34%</td>
          </tr>
          <tr>
            <td>$4.1M</td>
            <td>+41%</td>
            <td>$5.3M</td>
            <td>+49%</td>
          </tr>
        </tbody>
      </table>
    `;

    const res = grab(financialTable, { format: 'markdown', preserveTables: true });
    expect(res.tailwindHtml).toContain('rowspan="2"');
    expect(res.tailwindHtml).toContain('colspan="2"');
    expect(res.jsx).toContain('rowSpan={2}');
    expect(res.jsx).toContain('colSpan={2}');

    const tableLines = res.markdown
      .split('\n')
      .filter((line) => line.trim().startsWith('|'));
    expect(tableLines.length).toBe(4); // 1 unified header + 1 separator + 2 data rows

    // Every single row MUST have 5 pipe-delimited columns (6 `|` characters)
    for (const line of tableLines) {
      const pipeCount = line.split('|').length - 1;
      expect(pipeCount, `Misaligned GFM table row: ${line}`).toBe(6);
    }

    expect(tableLines[0]).toContain('Region');
    expect(tableLines[0]).toContain('Q1 2026 / ARR');
    expect(tableLines[0]).toContain('Q1 2026 / YoY');
    expect(tableLines[0]).toContain('Q2 2026 / ARR');
    expect(tableLines[0]).toContain('Q2 2026 / YoY');
    // Row 2 (rowspan continuation) aligns $4.1M under Q1 2026 / ARR (column 2), NOT column 1!
    const secondDataRowCols = tableLines[3]
      .split('|')
      .slice(1, -1)
      .map((c) => c.trim());
    expect(secondDataRowCols).toEqual(['North America', '$4.1M', '+41%', '$5.3M', '+49%']);
  });

  it('4.6 preserves <pre><code> language fences and interactive ARIA form controls in Markdown & JSX', () => {
    const formAndCode = `
      <form aria-label="Sign in">
        <label for="work-email">Email</label>
        <input id="work-email" type="email" placeholder="you@company.com" required tabindex="1">
        <button type="submit" aria-busy="false">Continue with SSO</button>
        <pre><code class="language-typescript">export function greet(name: string) {\n  return { hello: name };\n}</code></pre>
      </form>
    `;
    const res = grab(formAndCode, { format: 'markdown' });
    expect(res.markdown).toContain('[Input (email): "you@company.com"]');
    expect(res.markdown).toContain('[Button: Continue with SSO]');
    expect(res.markdown).toContain('```typescript');
    expect(res.markdown).toContain('export function greet(name: string)');

    expect(res.jsx).toContain('htmlFor="work-email"');
    expect(res.jsx).toContain('tabIndex={1}');
    expect(res.jsx).toContain('required');
    expect(res.jsx).toContain('<input ');
    expect(res.jsx).toMatch(/<input[^>]*\/>/);
    assertValidJsxSnippet(res.jsx);
  });
});

// ============================================================================
// 5. AST Saliency-Scored Lossless Token Budget Pruner
// ============================================================================

describe('5. budget-pruner: saliency-scored AST folding with 100% intact closed tags', () => {
  it('5.1 folds >3 homologous Kanban cards and inserts exact omitted comment without breaking HTML/JSX tags', () => {
    const cards = Array.from(
      { length: 10 },
      (_, idx) => `
        <div class="p-4 bg-slate-900 rounded-lg border border-slate-800">
          <h4 class="font-semibold text-white">Task #${idx + 1}: Migrate edge service</h4>
          <p class="text-sm text-slate-400">Assigned to platform squad · Sprint 14 · Priority P1</p>
          <span class="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded">In Progress</span>
        </div>
      `,
    ).join('\n');

    const kanban = `
      <section class="p-6 bg-slate-950">
        <header class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-bold text-white">In Progress (10)</h2>
          <button class="px-3 py-1 bg-indigo-600 text-white rounded">Add Task</button>
        </header>
        <div class="flex flex-col gap-3">${cards}</div>
      </section>
    `;

    const res = grab(kanban, { format: 'tailwind-html', maxTokens: 320 });
    expect(res.metrics.outputTokens).toBeLessThanOrEqual(320);
    expect(res.output).toContain('In Progress (10)');
    expect(res.output).toContain('Add Task');
    expect(res.output).toContain('Task #1');
    expect(res.output).toMatch(/<!-- \+\d+ similar items omitted to fit token budget -->/);
    expect(res.jsx).toMatch(/\{\/\* \+\d+ similar items omitted to fit token budget \*\/\}/);
    expect(res.warnings.length).toBeGreaterThan(0);

    assertBalancedHtmlTags(res.tailwindHtml);
    assertValidJsxSnippet(res.jsx);
  });

  it('5.2 prunes low-saliency <footer>/<aside>/<nav> before high-saliency <h1>, prices, and CTA buttons', () => {
    const page = `
      <div>
        <nav><a href="/a">Link A</a><a href="/b">Link B</a><a href="/c">Link C</a><a href="/d">Link D</a></nav>
        <main>
          <h1>Enterprise Cloud Plan</h1>
          <p>$99/month per seat</p>
          <button>Start 14-Day Trial</button>
        </main>
        <aside><p>${'Related sidebar promotional copy '.repeat(15)}</p></aside>
        <footer><p>${'Copyright 2026 Legal terms privacy policy security compliance '.repeat(15)}</p></footer>
      </div>
    `;
    const res = grab(page, { format: 'tailwind-html', maxTokens: 120 });
    expect(res.metrics.outputTokens).toBeLessThanOrEqual(120);
    expect(res.output).toContain('Enterprise Cloud Plan');
    expect(res.output).toContain('$99/month');
    expect(res.output).toContain('Start 14-Day Trial');
    expect(res.output).not.toContain('Legal terms privacy policy');
    assertBalancedHtmlTags(res.output);
  });

  it('5.3 folds 20-row feature matrix under tight budget while keeping GFM Markdown table valid', () => {
    const rows = Array.from(
      { length: 20 },
      (_, i) =>
        `<tr><td>Feature Capability #${i + 1}</td><td>Basic</td><td>Unlimited</td><td>Custom SLA</td></tr>`,
    ).join('');
    const matrixHtml = `
      <table>
        <thead>
          <tr><th>Capability</th><th>Starter</th><th>Pro</th><th>Enterprise</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;

    const res = grab(matrixHtml, { format: 'markdown', maxTokens: 180 });
    expect(res.metrics.outputTokens).toBeLessThanOrEqual(180);
    expect(res.markdown).toContain('| Capability | Starter | Pro | Enterprise |');
    expect(res.markdown).toContain('Feature Capability #1');
    expect(res.markdown).toContain('omitted to fit token budget');
    assertBalancedHtmlTags(res.tailwindHtml);
  });

  it('5.4 enforces maxTokens ceiling across prompt, jsx, tailwind-html, and markdown without broken tags', () => {
    const bigHtml = `
      <section style="padding: 24px; background: #0f172a; color: #fff;">
        <h1>Platform Overview</h1>
        <ul>
          ${Array.from({ length: 15 }, (_, i) => `<li>Item ${i + 1}: High throughput telemetry pipeline module</li>`).join('')}
        </ul>
      </section>
    `;
    for (const fmt of ['prompt', 'tailwind-html', 'jsx', 'markdown'] as const) {
      const r = grab(bigHtml, { format: fmt, maxTokens: 160 });
      expect(r.metrics.outputTokens).toBeLessThanOrEqual(160);
      assertBalancedHtmlTags(r.tailwindHtml);
      assertValidJsxSnippet(r.jsx);
    }
  });
});

// ============================================================================
// 6. Design Tokens, Formatters, Built-in Adapters & <5ms Performance
// ============================================================================

describe('6. tokens, formatters, built-in adapters & <5ms benchmark guarantee', () => {
  it('6.1 extractDesignTokens deduplicates and ranks colors, fonts, radii, shadows, and spacings', () => {
    const themed = `
      <style>
        .card {
          background: #0f172a;
          color: #f8fafc;
          font-family: 'Inter', system-ui, sans-serif;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }
        .badge {
          background: #6366f1;
          border-radius: 9999px;
          padding: 4px 12px;
        }
      </style>
      <div class="card">
        <span class="badge">Popular</span>
      </div>
    `;

    const tokens = extractDesignTokens(themed);
    expect(tokens.colors).toContain('#0f172a');
    expect(tokens.colors).toContain('#f8fafc');
    expect(tokens.colors).toContain('#6366f1');
    expect(tokens.fonts).toContain('Inter');
    expect(tokens.radii).toContain('12px');
    expect(tokens.radii).toContain('9999px');
    expect(tokens.shadows.length).toBeGreaterThanOrEqual(1);
    expect(tokens.spacings).toContain('24px');

    const disabled = grab(themed, { includeDesignTokens: false });
    expect(disabled.designTokens.colors).toEqual([]);
  });

  it('6.2 registers all 4 built-in adapters by default (docs-mdx, github-ui, arxiv-paper, marketing-pricing)', () => {
    const names = getAdapters().map((a) => a.name);
    expect(names).toContain('docs-mdx');
    expect(names).toContain('github-ui');
    expect(names).toContain('arxiv-paper');
    expect(names).toContain('marketing-pricing');
  });

  it('6.3 docs-mdx adapter strips sidebar/TOC/nav clutter and scopes to article content', () => {
    const docsPage = `
      <div>
        <nav aria-label="Sidebar">Sidebar Links</nav>
        <article data-mdx-content="true">
          <h1>Getting Started<a class="header-anchor" href="#getting-started">#</a></h1>
          <p>Install AnyGrab in 10 seconds.</p>
        </article>
        <aside class="table-of-contents">On this page</aside>
      </div>
    `;
    const res = grab(docsPage, {
      sourceUrl: 'https://example.com/docs/getting-started',
      format: 'markdown',
    });
    expect(res.markdown).toContain('# Getting Started');
    expect(res.markdown).toContain('Install AnyGrab in 10 seconds.');
    expect(res.markdown).not.toContain('Sidebar Links');
    expect(res.markdown).not.toContain('On this page');
  });

  it('6.4 github-ui adapter cleans AppHeader, footer, and permalink anchor noise', () => {
    const ghPage = `
      <div>
        <header class="AppHeader">GitHub Global Nav</header>
        <main>
          <article class="markdown-body">
            <h2><a class="anchor" aria-hidden="true" href="#arch"></a>Architecture</h2>
            <p>Zero runtime dependencies.</p>
          </article>
        </main>
        <footer class="footer">© 2026 GitHub, Inc.</footer>
      </div>
    `;
    const res = grab(ghPage, {
      sourceUrl: 'https://github.com/botshen/anygrab',
      format: 'markdown',
    });
    expect(res.markdown).toContain('## Architecture');
    expect(res.markdown).toContain('Zero runtime dependencies.');
    expect(res.markdown).not.toContain('GitHub Global Nav');
    expect(res.markdown).not.toContain('GitHub, Inc.');
  });

  it('6.5 arxiv-paper adapter converts verbose MathML <math alttext> into compact inline LaTeX $...$', () => {
    const arxivHtml = `
      <div class="ltx_page_main">
        <nav class="ltx_TOC">Table of Contents</nav>
        <article class="ltx_document">
          <div class="ltx_theorem">
            <h3>Theorem 1 (Token Bound)</h3>
            <p>For any tree <math alttext="T = (V, E)"><mrow><mi>T</mi><mo>=</mo></mrow></math>, loss is bounded.</p>
          </div>
        </article>
      </div>
    `;
    const res = grab(arxivHtml, {
      sourceUrl: 'https://arxiv.org/html/2601.12345v1',
      format: 'markdown',
    });
    expect(res.markdown).toContain('Theorem 1 (Token Bound)');
    expect(res.markdown).toContain('$T = (V, E)$');
    expect(res.markdown).not.toContain('Table of Contents');
  });

  it('6.6 marketing-pricing adapter strips cookie/chat widgets and supports custom adapter lifecycle hooks', () => {
    const pricingHtml = `
      <div>
        <div id="cookie-banner">Accept all cookies</div>
        <div id="intercom-container">Chat with sales</div>
        <section class="pricing"><h2>Pro $29</h2></section>
      </div>
    `;
    const custom: AnyGrabAdapter = {
      name: 'custom-hook-test',
      priority: 100,
      match: () => false,
      postprocess: (out, fmt) => (fmt === 'markdown' ? `${out}\n\n<!-- verified -->` : out),
    };

    const resPricing = grab(pricingHtml, {
      sourceUrl: 'https://acme.dev/pricing',
      format: 'tailwind-html',
    });
    expect(resPricing.output).toContain('Pro $29');
    expect(resPricing.output).not.toContain('Accept all cookies');
    expect(resPricing.output).not.toContain('Chat with sales');

    const resCustom = grab('<p>Hooked</p>', {
      adapter: 'custom-hook-test',
      customAdapters: [custom],
      format: 'markdown',
    });
    expect(resCustom.output).toContain('<!-- verified -->');

    clearAdapters();
    expect(getAdapters()).toEqual([]);
  });

  it('6.7 format: prompt produces structured replication bundle and distills complex SaaS UI in <5ms average', () => {
    const saasFixture = `
      <style>
        :root { --bg: #0f172a; --accent: #6366f1; }
        .css-wrap99 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px; background: var(--bg); padding: 32px; }
        .css-card11 { display: flex; flex-direction: column; gap: 12px; padding: 24px; border: 1px solid #334155; border-radius: 16px; color: #f8fafc; }
        .css-btn22 { background: var(--accent); color: #ffffff; padding: 10px 20px; border-radius: 8px; font-weight: 600; }
      </style>
      <section class="css-wrap99" data-testid="pricing-section">
        ${['Starter · $0', 'Pro · $29', 'Enterprise · $99']
          .map(
            (tier) => `
          <div class="css-card11">
            <h3>${tier}</h3>
            <svg width="16" height="16" viewBox="0 0 24 24"><path d="${'M1 1 L9 9 '.repeat(40)}"/></svg>
            <button class="css-btn22" onclick="buy()">Choose ${tier}</button>
          </div>
        `,
          )
          .join('')}
      </section>
    `;

    // Warmup JIT
    grab(saasFixture);

    const iterations = 10;
    const t0 = performance.now();
    let last = grab(saasFixture, {
      format: 'prompt',
      sourceUrl: 'https://acme.ai/pricing',
    });
    for (let i = 1; i < iterations; i++) {
      last = grab(saasFixture, {
        format: 'prompt',
        sourceUrl: 'https://acme.ai/pricing',
      });
    }
    const avgMs = (performance.now() - t0) / iterations;

    expect(avgMs).toBeLessThan(5);
    expect(last.output).toContain('# AnyGrab Distilled UI Context');
    expect(last.output).toContain('Source: https://acme.ai/pricing');
    expect(last.output).toContain('## Design Tokens');
    expect(last.output).toContain('grid-cols-3');
    expect(last.output).toContain('bg-indigo-500');
    expect(estimateTokens('中文测试 Token 估算')).toBeGreaterThan(3);
  });
});
