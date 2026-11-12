import {
  ADAPTER_SHORT_ALIASES,
  arxivPaperAdapter,
  BUILTIN_ADAPTERS,
  docsMdxAdapter,
  githubUiAdapter,
  marketingPricingAdapter,
} from './adapters';
import { applyTokenBudgetPruning } from './budget-pruner';
import { distillDomTree } from './cleaner';
import {
  cloneIntoLiteNode,
  isDocumentLike,
  isElementLike,
  LiteElement,
  normalizeDomInput,
  parseHtmlFallback,
  queryFirstElement,
} from './dom-adapter';
import {
  formatJsx,
  formatMarkdown,
  formatPrompt,
  formatTailwindHtml,
} from './formatters';
import { parseCssStylesheet } from './style-differ';
import { isObfuscatedClassName, mapStylesToTailwind } from './tailwind-mapper';
import { DesignTokenCollector, extractDesignTokens } from './tokens';
import type {
  AdapterContext,
  AnyGrabAdapter,
  DesignTokens,
  GrabInput,
  GrabMetrics,
  GrabOptions,
  GrabResult,
  OutputFormat,
} from './types';

export * from './types';
export {
  extractDesignTokens,
  BUILTIN_ADAPTERS,
  docsMdxAdapter,
  githubUiAdapter,
  arxivPaperAdapter,
  marketingPricingAdapter,
  parseHtmlFallback,
  parseCssStylesheet,
  mapStylesToTailwind,
  isObfuscatedClassName,
};

export const VERSION = '0.1.0';

export const DEFAULT_GRAB_OPTIONS: Required<
  Pick<
    GrabOptions,
    'format' | 'compactSvg' | 'preserveTables' | 'includeHoverStyles' | 'includeDesignTokens'
  >
> = {
  format: 'prompt',
  compactSvg: true,
  preserveTables: true,
  includeHoverStyles: false,
  includeDesignTokens: true,
};

const adapterRegistry = new Map<string, AnyGrabAdapter>();

/**
 * Registers all built-in public standard adapters (`docs-mdx`, `github-ui`, `arxiv-paper`, `marketing-pricing`).
 */
export function registerBuiltinAdapters(): void {
  for (const adapter of BUILTIN_ADAPTERS) {
    adapterRegistry.set(adapter.name, adapter);
  }
}

// Register built-in adapters by default on package initialization
registerBuiltinAdapters();

/**
 * Estimates LLM token count using a fast deterministic heuristic (~4 chars/token for ASCII/code,
 * ~1.5 chars/token for CJK characters).
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  let cjkCount = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code >= 0x4e00 && code <= 0x9fff) {
      cjkCount++;
    }
  }
  const nonCjkCount = text.length - cjkCount;
  return Math.max(1, Math.ceil(nonCjkCount / 4 + cjkCount / 1.5));
}

/**
 * Registers a declarative `AnyGrabAdapter` in the global core registry.
 */
export function registerAdapter(adapter: AnyGrabAdapter): void {
  adapterRegistry.set(adapter.name, adapter);
}

/**
 * Returns all currently registered adapters sorted by descending priority.
 */
export function getAdapters(): AnyGrabAdapter[] {
  return Array.from(adapterRegistry.values()).sort(
    (a, b) => (b.priority ?? 0) - (a.priority ?? 0),
  );
}

/**
 * Clears custom registered adapters (primarily for isolated testing).
 */
export function clearAdapters(): void {
  adapterRegistry.clear();
}

/**
 * Creates an empty `DesignTokens` container.
 */
export function createEmptyDesignTokens(): DesignTokens {
  return {
    colors: [],
    fonts: [],
    radii: [],
    shadows: [],
    spacings: [],
  };
}

function doesAdapterMatch(
  adapter: AnyGrabAdapter,
  context: { url?: string; root?: Element | Document },
): boolean {
  const matcher = adapter.match;
  if (typeof matcher === 'function') {
    try {
      return Boolean(matcher(context));
    } catch {
      return false;
    }
  }
  if (matcher instanceof RegExp) {
    return Boolean(context.url && matcher.test(context.url));
  }
  if (Array.isArray(matcher)) {
    return Boolean(context.url && matcher.some((re) => re.test(context.url!)));
  }
  return false;
}

function resolveActiveAdapter(
  options: GrabOptions,
  rootCandidate?: Element | Document,
): { adapter?: AnyGrabAdapter; warning?: string } {
  const customList = options.customAdapters ?? [];
  const registeredList = getAdapters();
  const combined = [...customList, ...registeredList].sort(
    (a, b) => (b.priority ?? 0) - (a.priority ?? 0),
  );

  if (options.adapter) {
    const requested = options.adapter.trim();
    const canonical = ADAPTER_SHORT_ALIASES[requested.toLowerCase()] ?? requested;
    const found =
      combined.find((a) => a.name === requested || a.name === canonical) ??
      BUILTIN_ADAPTERS.find((a) => a.name === requested || a.name === canonical);
    if (found) return { adapter: found };
    return {
      warning: `Requested adapter "${options.adapter}" was not found; proceeding with default distillation.`,
    };
  }

  for (const candidate of combined) {
    if (doesAdapterMatch(candidate, { url: options.sourceUrl, root: rootCandidate })) {
      return { adapter: candidate };
    }
  }

  return {};
}

/**
 * Distills a DOM `Element`, `Document`, `DocumentFragment`, or raw HTML string into
 * token-budget-aware multi-format AI context (`prompt`, `tailwind-html`, `jsx`, `markdown`).
 */
export function grab(input: GrabInput, options: GrabOptions = {}): GrabResult {
  const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const format: OutputFormat = options.format ?? DEFAULT_GRAB_OPTIONS.format;
  const warnings: string[] = [];

  // Pre-match URL-based or explicit adapter before DOM scoping so `rootSelector` applies cleanly
  const initialAdapterLookup = resolveActiveAdapter(
    options,
    typeof input !== 'string' && (isElementLike(input) || isDocumentLike(input))
      ? input
      : undefined,
  );
  if (initialAdapterLookup.warning) {
    warnings.push(initialAdapterLookup.warning);
  }
  let activeAdapter = initialAdapterLookup.adapter;

  const normalized = normalizeDomInput(input, {
    selector: options.selector,
    rootSelector: !options.selector ? activeAdapter?.rootSelector : undefined,
  });
  warnings.push(...normalized.warnings);

  // If no adapter matched on URL alone (e.g. HTML string input), evaluate DOM-based adapter matchers
  if (!activeAdapter && !options.adapter) {
    const domLookup = resolveActiveAdapter(options, normalized.rootElement);
    if (domLookup.adapter) {
      activeAdapter = domLookup.adapter;
      if (!options.selector && activeAdapter.rootSelector) {
        const scoped = queryFirstElement(normalized.rootElement, activeAdapter.rootSelector);
        if (scoped) {
          normalized.rootElement = scoped;
          normalized.isSyntheticWrapper = false;
        }
      }
    }
  }

  const rawChars = normalized.rawHtml.length;
  const rawTokens = normalized.rawHtml ? estimateTokens(normalized.rawHtml) : 0;

  let workingRoot = normalized.rootElement;
  const adapterContext: AdapterContext = {
    sourceUrl: options.sourceUrl,
    root: workingRoot,
    options,
  };

  if (activeAdapter?.preprocess) {
    const cloned = cloneIntoLiteNode(workingRoot);
    if (cloned instanceof LiteElement) {
      const preprocessed = activeAdapter.preprocess(cloned as unknown as Element, adapterContext);
      workingRoot = (preprocessed ?? cloned) as unknown as Element;
      adapterContext.root = workingRoot;
    }
  }

  const stylesheet = parseCssStylesheet(normalized.extractedCssText);
  const tokenCollector = new DesignTokenCollector();

  const { root: distilledRoot, stats } = distillDomTree(workingRoot, {
    options,
    stylesheet,
    tokenCollector,
    adapter: activeAdapter,
    adapterContext,
    isSyntheticRootWrapper: normalized.isSyntheticWrapper,
  });

  const designTokens =
    (options.includeDesignTokens ?? DEFAULT_GRAB_OPTIONS.includeDesignTokens)
      ? tokenCollector.toDesignTokens()
      : createEmptyDesignTokens();

  let compactPromptMeta = false;

  if (options.maxTokens !== undefined && options.maxTokens > 0) {
    const measureTargetFormatTokens = (compactMeta: boolean): number => {
      switch (format) {
        case 'tailwind-html':
          return estimateTokens(formatTailwindHtml(distilledRoot));
        case 'jsx':
          return estimateTokens(formatJsx(distilledRoot));
        case 'markdown':
          return estimateTokens(formatMarkdown(distilledRoot));
        case 'prompt':
        default: {
          const html = formatTailwindHtml(distilledRoot);
          return estimateTokens(
            formatPrompt({
              root: distilledRoot,
              tailwindHtml: html,
              designTokens,
              sourceUrl: options.sourceUrl,
              adapterName: activeAdapter?.name,
              compactMode: compactMeta,
            }),
          );
        }
      }
    };

    const pruneResult = applyTokenBudgetPruning(
      distilledRoot,
      options.maxTokens,
      measureTargetFormatTokens,
    );
    stats.nodesPruned += pruneResult.prunedElementsCount;
    compactPromptMeta = pruneResult.compactPromptMeta;
    if (pruneResult.didFold) {
      warnings.push(
        `AST budget folding applied to fit within maxTokens (${options.maxTokens}) without breaking tag structure.`,
      );
    }
  }

  let tailwindHtml = formatTailwindHtml(distilledRoot) || '<div></div>';
  let jsx = formatJsx(distilledRoot) || '<div />';
  let markdown = formatMarkdown(distilledRoot);
  let promptOutput = formatPrompt({
    root: distilledRoot,
    tailwindHtml,
    designTokens,
    sourceUrl: options.sourceUrl,
    adapterName: activeAdapter?.name,
    compactMode: compactPromptMeta,
  });

  if (activeAdapter?.postprocess) {
    tailwindHtml = activeAdapter.postprocess(tailwindHtml, 'tailwind-html', adapterContext);
    jsx = activeAdapter.postprocess(jsx, 'jsx', adapterContext);
    markdown = activeAdapter.postprocess(markdown, 'markdown', adapterContext);
    promptOutput = activeAdapter.postprocess(promptOutput, 'prompt', adapterContext);
  }

  const formatMap: Record<OutputFormat, string> = {
    prompt: promptOutput,
    'tailwind-html': tailwindHtml,
    jsx,
    markdown,
  };

  const output = formatMap[format];
  const outputChars = output.length;
  const outputTokens = estimateTokens(output);

  const end = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const durationMs = Math.max(0, Number((end - start).toFixed(2)));
  const compressionRatio =
    rawTokens > 0 ? Number(((1 - outputTokens / rawTokens) * 100).toFixed(2)) : 0;

  const metrics: GrabMetrics = {
    rawChars,
    rawTokens,
    outputChars,
    outputTokens,
    compressionRatio,
    nodesVisited: stats.nodesVisited,
    nodesPruned: stats.nodesPruned,
    stylesStripped: stats.stylesStripped,
    durationMs,
  };

  return {
    output,
    format,
    tailwindHtml,
    jsx,
    markdown,
    designTokens,
    metrics,
    warnings,
  };
}
