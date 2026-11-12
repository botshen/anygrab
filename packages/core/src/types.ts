/**
 * Target serialization format produced by AnyGrab.
 * - `'prompt'`: Structured AI-ready context bundle (tokens + layout + code/markdown)
 * - `'tailwind-html'`: Clean semantic HTML annotated with minimal utility classes
 * - `'jsx'`: Valid React JSX component snippet (`className`, camelCase SVG/style attrs)
 * - `'markdown'`: High-fidelity GitHub-Flavored Markdown (preserving complex tables & code)
 */
export type OutputFormat = 'prompt' | 'tailwind-html' | 'jsx' | 'markdown';

/**
 * Output UI/prompt language locale supported by AnyGrab.
 * - `'en'`: English replication prompt (default)
 * - `'zh-CN'`: Simplified Chinese zero-jargon replication prompt ready for Antigravity / Codex / Cursor
 */
export type GrabLocale = 'en' | 'zh-CN';

/**
 * Input target accepted by AnyGrab's core distillation pipeline.
 * Supports live Browser DOM nodes, LinkeDOM / Happy-DOM nodes, or raw HTML strings.
 */
export type GrabInput = Element | Document | DocumentFragment | string;

/**
 * Style map or CSSStyleDeclaration-compatible object returned by a `StyleResolver`.
 * Works seamlessly with browser `window.getComputedStyle(el)` as well as
 * lightweight stylesheet/inline rule matchers in Node/CLI environments.
 */
export type ResolvedStyle =
  | CSSStyleDeclaration
  | {
      getPropertyValue(property: string): string;
      [property: string]: unknown;
    }
  | Record<string, string | undefined>;

/**
 * Resolves computed or matched CSS styles for a given DOM element.
 * - Browser: `(el, pseudo) => window.getComputedStyle(el, pseudo)`
 * - Node/CLI: custom CSS rule / inline style resolver
 */
export type StyleResolver = (
  element: Element,
  pseudoElt?: string | null,
) => ResolvedStyle | null | undefined;

/**
 * Extracted visual design primitives from the target subtree.
 */
export interface DesignTokens {
  colors: string[];
  fonts: string[];
  radii: string[];
  shadows: string[];
  spacings: string[];
}

/**
 * Telemetry and compression metrics for a single `grab()` execution.
 */
export interface GrabMetrics {
  rawChars: number;
  rawTokens: number;
  outputChars: number;
  outputTokens: number;
  compressionRatio: number;
  nodesVisited: number;
  nodesPruned: number;
  stylesStripped: number;
  durationMs: number;
}

/**
 * Complete multi-format result returned by `grab()`.
 */
export interface GrabResult {
  /** Primary formatted output corresponding to `format` */
  output: string;
  /** Resolved output format */
  format: OutputFormat;
  /** Distilled semantic HTML with utility classes */
  tailwindHtml: string;
  /** Distilled JSX snippet ready for React / AI IDEs */
  jsx: string;
  /** Distilled GFM Markdown preserving tables, code blocks, and hierarchy */
  markdown: string;
  /** Extracted design tokens from the target subtree */
  designTokens: DesignTokens;
  /** Token compression and traversal telemetry */
  metrics: GrabMetrics;
  /** Non-fatal diagnostics (e.g., budget truncation notices, missing DOM parser hints) */
  warnings: string[];
}

/**
 * Configuration options for `grab()`.
 */
export interface GrabOptions {
  /** Primary output format (`output` field). Default: `'prompt'` */
  format?: OutputFormat;
  /** Language locale for generated AI replication prompt (`'en' | 'zh-CN'`). Default: `'en'` */
  locale?: GrabLocale;
  /** Token budget ceiling (e.g., `1200`). Low-priority subtrees fold first to stay within budget. */
  maxTokens?: number;
  /** Replace verbose inline `<svg>` path data with compact semantic placeholders. Default: `true` */
  compactSvg?: boolean;
  /** Preserve complex table structure (`colspan`/`rowspan`/headers) without flattening. Default: `true` */
  preserveTables?: boolean;
  /** Capture interactive/hover state hints when supported by `styleResolver`. Default: `false` */
  includeHoverStyles?: boolean;
  /** Extract `DesignTokens` (`colors`, `fonts`, `radii`, `shadows`, `spacings`). Default: `true` */
  includeDesignTokens?: boolean;
  /** Explicit adapter name to apply (e.g., `'docs'`, `'github'`, `'arxiv'`). Auto-detected if omitted. */
  adapter?: string;
  /** Source page URL used for relative link resolution and adapter auto-matching. */
  sourceUrl?: string;
  /** Optional CSS selector to scope extraction to a specific element within a document/HTML input. */
  selector?: string;
  /** Custom style resolver (`window.getComputedStyle` in browsers or CSS rule resolver in Node/CLI). */
  styleResolver?: StyleResolver;
  /** Additional ad-hoc adapters evaluated alongside registered adapters for this call. */
  customAdapters?: AnyGrabAdapter[];
}

/**
 * Context passed into `AnyGrabAdapter` lifecycle hooks.
 */
export interface AdapterContext {
  sourceUrl?: string;
  root: Element | Document;
  options: GrabOptions;
}

/**
 * Return value from `AnyGrabAdapter.transformNode`:
 * - `Element`: replace current element with the returned element
 * - `'prune'` or `null`: remove this element and its subtree
 * - `'unwrap'`: replace this element with its child nodes
 * - `void` / `undefined`: keep current element
 */
export type NodeTransformResult = Element | 'prune' | 'unwrap' | null | void;

/**
 * Declarative site / UI framework adapter contract for community PR extensions.
 * Adapters must operate strictly on public, standard DOM structures.
 */
export interface AnyGrabAdapter {
  /** Unique adapter identifier (kebab-case recommended, e.g., `'docs-mdx'`, `'arxiv-paper'`) */
  name: string;
  /** Short human-readable summary of target sites/frameworks */
  description?: string;
  /** Evaluation priority when auto-matching; higher numbers run first (default: `0`) */
  priority?: number;
  /** URL pattern(s) or predicate determining whether this adapter activates */
  match:
    | RegExp
    | RegExp[]
    | ((context: { url?: string; root?: Element | Document }) => boolean);
  /** Optional CSS selectors stripped prior to distillation */
  excludeSelectors?: string[];
  /** Optional preferred content root selector when distilling full documents */
  rootSelector?: string;
  /** Optional hook executed on the cloned root element before main traversal */
  preprocess?: (root: Element, context: AdapterContext) => Element | void;
  /** Optional per-element transformation hook during tree distillation */
  transformNode?: (node: Element, context: AdapterContext) => NodeTransformResult;
  /** Optional post-formatting hook */
  postprocess?: (output: string, format: OutputFormat, context: AdapterContext) => string;
}
