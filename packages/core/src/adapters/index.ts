import {
  getClassString,
  getElementAttr,
  getLowerTag,
  LiteElement,
  LiteText,
  queryFirstElement,
} from '../dom-adapter';
import type { AnyGrabAdapter } from '../types';

/**
 * 1. `docs-mdx`: Technical documentation sites (Docusaurus, VitePress, Nextra, Mintlify, Starlight, ReadTheDocs).
 * Strips sidebar navigation, table-of-contents chrome, breadcrumbs, and heading anchor `#` clutter.
 */
export const docsMdxAdapter: AnyGrabAdapter = {
  name: 'docs-mdx',
  description: 'Technical documentation & MDX content distillation (strips nav/sidebar/TOC clutter)',
  priority: 20,
  match: ({ url, root }) => {
    if (
      url &&
      /(?:\/\/docs\.|\/docs(?:\/|$)|readthedocs|docusaurus|vitepress|mintlify|nextra)/i.test(url)
    ) {
      return true;
    }
    if (root) {
      return Boolean(
        queryFirstElement(
          root,
          '[data-mdx-content], .theme-doc-markdown, .vp-doc, article.docs-content',
        ),
      );
    }
    return false;
  },
  excludeSelectors: [
    'nav',
    'aside',
    '[role="navigation"]',
    '.sidebar',
    '.docs-sidebar',
    '.toc',
    '.table-of-contents',
    '.breadcrumbs',
    '.edit-this-page',
    '.pagination-nav',
    'a.header-anchor',
    'a.hash-link',
  ],
  rootSelector:
    '[data-mdx-content], .theme-doc-markdown, .vp-doc, article, [role="main"], main',
  transformNode: (node) => {
    const cls = getClassString(node);
    if (/\b(?:admonition|callout)\b/i.test(cls) && !getElementAttr(node, 'role')) {
      if (typeof node.setAttribute === 'function') {
        try {
          const clone = new LiteElement(getLowerTag(node));
          for (const attr of Array.from((node as { attributes?: ArrayLike<{ name: string; value: string }> }).attributes ?? [])) {
            clone.setAttribute(attr.name, attr.value);
          }
          clone.setAttribute('role', 'note');
          // Keep original node if live DOM; only annotate when needed
          void clone;
        } catch {
          // Ignore immutable elements
        }
      }
    }
    return undefined;
  },
};

/**
 * 2. `github-ui`: Public GitHub READMEs, Issues, PRs, and Code Views.
 * Strips global AppHeader/footer/tooltip chrome and heading permalink anchor clutter.
 */
export const githubUiAdapter: AnyGrabAdapter = {
  name: 'github-ui',
  description: 'Public GitHub markdown, issues, pull requests, and UI views',
  priority: 30,
  match: /^https?:\/\/(?:www\.)?github\.com\//i,
  excludeSelectors: [
    'header.AppHeader',
    'footer.footer',
    '.js-header-wrapper',
    'tool-tip',
    'anchored-position',
    '.zeroclipboard-container',
    'a.anchor[aria-hidden="true"]',
  ],
  rootSelector: '.markdown-body, [data-hpc], main, #repo-content-pjax-container',
};

/**
 * 3. `arxiv-paper`: Academic HTML papers (arXiv LaTeXML `.ltx_document` & abstracts).
 * Converts verbose MathML `<math alttext="...">` subtrees into clean inline `$latex$` notation!
 */
export const arxivPaperAdapter: AnyGrabAdapter = {
  name: 'arxiv-paper',
  description: 'arXiv & LaTeXML academic papers (preserves theorems, tables, and compact LaTeX math)',
  priority: 30,
  match: ({ url, root }) => {
    if (url && /^https?:\/\/(?:www\.|export\.)?arxiv\.org\/(?:html|abs)\//i.test(url)) {
      return true;
    }
    if (root) {
      return Boolean(queryFirstElement(root, '.ltx_document, .ltx_page_main, .ltx_theorem'));
    }
    return false;
  },
  excludeSelectors: [
    '.ltx_page_header',
    '.ltx_page_footer',
    '.ltx_page_navbar',
    'nav.ltx_TOC',
    '.package-alerts',
  ],
  rootSelector: 'article.ltx_document, .ltx_page_main, #abs, main',
  transformNode: (node) => {
    const tag = getLowerTag(node);
    if (tag === 'math') {
      const altText =
        getElementAttr(node, 'alttext') ??
        getElementAttr(node, 'aria-label') ??
        (node.textContent ?? '').trim();
      if (altText) {
        const span = new LiteElement('span');
        span.setAttribute('data-math', 'latex');
        span.appendChild(new LiteText(`$${altText.trim()}$`));
        return span as unknown as Element;
      }
    }
    return undefined;
  },
};

/**
 * 4. `marketing-pricing`: SaaS landing & pricing tier pages.
 * Strips cookie banners and live-chat widgets while preserving pricing tiers, badges, CTAs, and feature matrices.
 */
export const marketingPricingAdapter: AnyGrabAdapter = {
  name: 'marketing-pricing',
  description: 'SaaS pricing cards & comparison matrices (strips cookie/chat overlays)',
  priority: 15,
  match: ({ url }) => Boolean(url && /\/pricing(?:\/|$|\?)/i.test(url)),
  excludeSelectors: [
    '#cookie-banner',
    '[id*="cookie-consent" i]',
    '[class*="cookie-banner" i]',
    '#intercom-container',
    '.crisp-client',
    '#hubspot-messages-iframe-container',
  ],
};

export const BUILTIN_ADAPTERS: readonly AnyGrabAdapter[] = [
  githubUiAdapter,
  arxivPaperAdapter,
  docsMdxAdapter,
  marketingPricingAdapter,
];

export const ADAPTER_SHORT_ALIASES: Record<string, string> = {
  docs: 'docs-mdx',
  mdx: 'docs-mdx',
  github: 'github-ui',
  arxiv: 'arxiv-paper',
  pricing: 'marketing-pricing',
};
