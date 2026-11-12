import type {
  AnyGrabAdapter,
  DesignTokens,
  GrabInput,
  GrabMetrics,
  GrabOptions,
  GrabResult,
  OutputFormat,
} from './types';

export * from './types';

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

function serializeRawInput(input: GrabInput): string {
  if (typeof input === 'string') {
    return input;
  }
  if ('outerHTML' in input && typeof input.outerHTML === 'string') {
    return input.outerHTML;
  }
  if ('documentElement' in input && input.documentElement) {
    return input.documentElement.outerHTML;
  }
  return input.textContent ?? '';
}

/**
 * Extracts `DesignTokens` from a target DOM node or HTML string.
 * (Placeholder implementation; full style/computed-token extraction implemented in `@anygrab/core`.)
 */
export function extractDesignTokens(_input: GrabInput, _options?: GrabOptions): DesignTokens {
  return createEmptyDesignTokens();
}

/**
 * Distills a DOM `Element`, `Document`, or raw HTML string into token-budget-aware
 * multi-format AI context (`prompt`, `tailwind-html`, `jsx`, `markdown`).
 */
export function grab(input: GrabInput, options: GrabOptions = {}): GrabResult {
  const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const format: OutputFormat = options.format ?? DEFAULT_GRAB_OPTIONS.format;
  const warnings: string[] = [];

  const rawHtml = serializeRawInput(input);
  const rawChars = rawHtml.length;
  const rawTokens = estimateTokens(rawHtml);

  const strippedText = rawHtml
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const tailwindHtml = rawHtml.trim() || '<div></div>';
  const jsx = tailwindHtml.replace(/\bclass=/g, 'className=');
  const markdown = strippedText;
  const designTokens =
    (options.includeDesignTokens ?? DEFAULT_GRAB_OPTIONS.includeDesignTokens)
      ? extractDesignTokens(input, options)
      : createEmptyDesignTokens();

  const formatMap: Record<OutputFormat, string> = {
    prompt: [
      options.sourceUrl ? `Source: ${options.sourceUrl}` : '',
      markdown ? `## Content\n${markdown}` : '',
      `## Structure\n\`\`\`html\n${tailwindHtml}\n\`\`\``,
    ]
      .filter(Boolean)
      .join('\n\n'),
    'tailwind-html': tailwindHtml,
    jsx,
    markdown,
  };

  let output = formatMap[format];
  if (options.maxTokens && options.maxTokens > 0) {
    const currentTokens = estimateTokens(output);
    if (currentTokens > options.maxTokens) {
      const targetChars = Math.max(32, options.maxTokens * 4);
      output = output.slice(0, targetChars);
      warnings.push(`Output truncated to fit maxTokens budget (${options.maxTokens}).`);
    }
  }

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
    nodesVisited: rawHtml ? 1 : 0,
    nodesPruned: 0,
    stylesStripped: 0,
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
