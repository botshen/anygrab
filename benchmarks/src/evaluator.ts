import { estimateTokens, grab } from '@anygrab/core';
import { parseHTML } from 'linkedom';
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import {
  BENCHMARK_FIXTURES,
  type BenchmarkFixture,
  type ControlExpectation,
  type StyleSignalCategory,
} from './fixtures';

export type BaselineId =
  | 'raw-html'
  | 'naive-style-picker'
  | 'turndown-gfm'
  | 'anygrab-default'
  | 'anygrab-budget-600';

export interface FidelityBreakdown {
  /** Composite 0–100 score */
  overall: number;
  /** Key domain text retention & noise hygiene (0–100) */
  textScore: number;
  /** Layout & visual style signal retention + hygiene (0–100) */
  styleScore: number;
  /** Complex table row/col/span or landmark closure integrity (0–100) */
  tableScore: number;
  /** Interactive form/button/ARIA affordance retention (0–100) */
  controlScore: number;
}

export interface MethodFixtureRun {
  methodId: BaselineId;
  methodName: string;
  fixtureId: string;
  fixtureName: string;
  category: string;
  chars: number;
  tokens: number;
  /** Percentage token reduction vs Raw HTML + CSS (negative means expansion) */
  compressionPct: number;
  durationMs: number;
  fidelity: FidelityBreakdown;
}

export interface MethodAggregateSummary {
  methodId: BaselineId;
  methodName: string;
  description: string;
  totalTokens: number;
  avgTokens: number;
  /** Token reduction vs total Raw HTML tokens (%) */
  compressionPct: number;
  avgDurationMs: number;
  avgFidelity: number;
  avgTextScore: number;
  avgStyleScore: number;
  avgTableScore: number;
  avgControlScore: number;
}

export interface FixtureComparisonRow {
  fixtureId: string;
  index: number;
  name: string;
  category: string;
  tags: string[];
  rawTokens: number;
  results: Record<BaselineId, MethodFixtureRun>;
}

export interface BenchmarkSuiteReport {
  benchmarkVersion: string;
  generatedAt: string;
  fixtureCount: number;
  methods: MethodAggregateSummary[];
  fixtures: FixtureComparisonRow[];
}

export const BASELINE_META: Record<BaselineId, { name: string; description: string }> = {
  'raw-html': {
    name: 'Raw HTML + CSS',
    description: 'Unfiltered source HTML, <style> blocks, scripts, SVG paths, and wrapper soup.',
  },
  'naive-style-picker': {
    name: 'Naive Style Picker',
    description: 'Typical browser DevTools/extension export dumping outerHTML + un-deduplicated computed styles.',
  },
  'turndown-gfm': {
    name: 'Turndown (GFM)',
    description: 'Plain-text GitHub-Flavored Markdown conversion (0% visual layout/style, fragile on merged tables).',
  },
  'anygrab-default': {
    name: 'AnyGrab (Default)',
    description: 'Lossless CSS-to-Tailwind distillation, SVG compaction, noise pruning & 100% merged table fidelity.',
  },
  'anygrab-budget-600': {
    name: 'AnyGrab (--budget 600)',
    description: 'AST saliency-guided sibling folding constrained to a strict ~600-token context budget.',
  },
};

function round2(val: number): number {
  return Number(val.toFixed(2));
}

function round1(val: number): number {
  return Number(val.toFixed(1));
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&ge;/gi, '≥')
    .replace(/&nbsp;/gi, ' ');
}

/**
 * Simulates a typical naive open-source "copy element with computed styles" tool
 * that serializes outerHTML with verbose un-deduplicated browser default styles on every node.
 */
export function simulateNaiveStylePicker(html: string): string {
  const { document } = parseHTML(html);
  const styleRules = new Map<string, string>();

  const styleEls = Array.from(document.querySelectorAll('style'));
  for (const styleEl of styleEls) {
    const cssText = styleEl.textContent ?? '';
    const ruleRegex = /([.#a-zA-Z0-9_-]+)\s*\{([^}]+)\}/g;
    let match: RegExpExecArray | null;
    while ((match = ruleRegex.exec(cssText)) !== null) {
      const selector = match[1].trim();
      const body = match[2].replace(/\s+/g, ' ').trim();
      styleRules.set(selector, body);
    }
  }

  const root = document.body ?? document.documentElement;
  if (!root) return html;

  const defaultComputedDump =
    'box-sizing: border-box; display: block; position: static; margin: 0px; padding: 0px; ' +
    'border: 0px solid rgb(226, 232, 240); font-family: Inter, system-ui, sans-serif; ' +
    'font-size: 14px; font-weight: 400; line-height: 21px; color: rgb(248, 250, 252); ' +
    'background-color: rgba(0, 0, 0, 0); opacity: 1; visibility: visible; pointer-events: auto;';

  const elements = [root, ...Array.from(root.querySelectorAll('*'))];
  for (const el of elements) {
    const tag = el.tagName.toLowerCase();
    if (tag === 'script' || tag === 'style') continue;

    const matchedCss: string[] = [defaultComputedDump];
    const tagRule = styleRules.get(tag);
    if (tagRule) matchedCss.push(tagRule);

    const classAttr = el.getAttribute('class') ?? '';
    for (const cls of classAttr.split(/\s+/).filter(Boolean)) {
      const rule = styleRules.get(`.${cls}`);
      if (rule) matchedCss.push(rule);
    }

    const idAttr = el.getAttribute('id');
    if (idAttr && styleRules.has(`#${idAttr}`)) {
      matchedCss.push(styleRules.get(`#${idAttr}`)!);
    }

    const existingInline = el.getAttribute('style');
    if (existingInline) matchedCss.push(existingInline);

    el.setAttribute('style', matchedCss.join(' '));
  }

  return root.outerHTML;
}

/**
 * Runs standard Turndown + GFM plugin after removing non-visual <script>/<style>/<template> tags.
 */
export function runTurndownGfm(html: string): string {
  const { document } = parseHTML(html);
  for (const noisy of Array.from(document.querySelectorAll('script, style, noscript, template'))) {
    noisy.remove();
  }
  const turndown = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
  });
  turndown.use(gfm);
  const targetHtml = document.body ? document.body.innerHTML : html;
  return turndown.turndown(targetHtml);
}

function hasStyleSignal(output: string, signal: StyleSignalCategory): boolean {
  switch (signal) {
    case 'flex':
      return /\b(inline-)?flex\b/i.test(output) || /display:\s*(inline-)?flex/i.test(output);
    case 'grid':
      return /\bgrid(-cols-\w+)?\b/i.test(output) || /display:\s*grid/i.test(output);
    case 'color':
      return (
        /\b(bg|text|border|from|via|to)-(slate|gray|zinc|neutral|indigo|violet|purple|blue|sky|cyan|emerald|green|amber|yellow|red|rose|white|black|\[#)/i.test(
          output,
        ) ||
        /(background(-color)?|color):\s*(#[0-9a-f]{3,8}|rgba?\(|var\(|linear-gradient)/i.test(output)
      );
    case 'spacing':
      return (
        /\b(p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|gap|space-[xy])-(\d+|\[.+?\])\b/.test(output) ||
        /\b(padding|margin|gap):\s*[1-9]/.test(output)
      );
    case 'radius':
      return /\brounded(-[a-z0-9]+|-\[.+?\])?\b/.test(output) || /border-radius:\s*[1-9]/i.test(output);
    case 'border':
      return (
        /\bborder(-[tblrxy]|-\d+|-[a-z]+|-\[.+?\])?\b/.test(output) ||
        /border(-(left|right|top|bottom))?:\s*[1-9]/i.test(output)
      );
    case 'typography':
      return (
        /\b(font-(medium|semibold|bold|extrabold|mono|serif)|text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl)|tracking-|leading-)\b/.test(
          output,
        ) || /(font-weight:\s*[5-9]00|font-size:\s*\d+px)/i.test(output)
      );
    case 'shadow':
      return /\bshadow(-[a-z0-9]+|-\[.+?\])?\b/.test(output) || /box-shadow:\s*[^n]/i.test(output);
  }
}

function scoreSingleControl(output: string, normalizedText: string, ctrl: ControlExpectation): number {
  const tokenLower = ctrl.token.toLowerCase();
  const hasToken = normalizedText.includes(tokenLower);

  switch (ctrl.kind) {
    case 'button': {
      const hasButtonTag = /<button\b/i.test(output) || /role=["']button["']/i.test(output);
      if (hasButtonTag && hasToken) return 1;
      if (hasButtonTag) return 0.6;
      if (hasToken) return 0.25;
      return 0;
    }
    case 'input': {
      const hasInputTag = /<input\b/i.test(output);
      if (hasInputTag && hasToken) return 1;
      if (hasInputTag) return 0.7;
      return 0;
    }
    case 'select': {
      const hasSelectTag = /<select\b/i.test(output);
      if (hasSelectTag && hasToken) return 1;
      if (hasSelectTag) return 0.65;
      if (hasToken) return 0.2;
      return 0;
    }
    case 'textarea': {
      const hasTextareaTag = /<textarea\b/i.test(output);
      if (hasTextareaTag && hasToken) return 1;
      if (hasTextareaTag) return 0.65;
      if (hasToken) return 0.2;
      return 0;
    }
    case 'link': {
      const hasHtmlLink = /<a\b[^>]*href=/i.test(output);
      const hasMdLink = /\[[^\]]+\]\([^)]+\)/.test(output);
      if ((hasHtmlLink || hasMdLink) && hasToken) return 1;
      if (hasHtmlLink || hasMdLink) return 0.6;
      if (hasToken) return 0.25;
      return 0;
    }
    case 'aria': {
      const hasAriaRole =
        new RegExp(`role=["']${ctrl.token}["']`, 'i').test(output) || /\baria-[a-z]+=/i.test(output);
      return hasAriaRole ? 1 : 0;
    }
  }
}

function hasBalancedMarkupClosure(output: string): boolean {
  const trimmed = output.trim();
  if (!trimmed) return false;
  // Detect mid-tag hard slice at the end of output
  const lastOpenBracket = trimmed.lastIndexOf('<');
  const lastCloseBracket = trimmed.lastIndexOf('>');
  if (lastOpenBracket > lastCloseBracket) {
    return false;
  }
  const openTables = (trimmed.match(/<table\b/gi) ?? []).length;
  const closeTables = (trimmed.match(/<\/table>/gi) ?? []).length;
  if (openTables !== closeTables) return false;
  return true;
}

/**
 * Evaluates objective 0–100 Fidelity Score across 4 sub-dimensions:
 * 1. Key Text Retention & Noise Hygiene (30%)
 * 2. Layout & Visual Style Signal Retention (30%)
 * 3. Table Row/Col/Merged-Cell or Structural Landmark Integrity (20%)
 * 4. Interactive Control & ARIA Affordance Retention (20%)
 */
export function evaluateFidelity(output: string, fixture: BenchmarkFixture): FidelityBreakdown {
  if (!output || !output.trim()) {
    return { overall: 0, textScore: 0, styleScore: 0, tableScore: 0, controlScore: 0 };
  }

  const normalized = decodeHtmlEntities(output).toLowerCase();
  const gt = fixture.groundTruth;

  // 1. Key Text Retention (30%)
  const matchedKeyCount = gt.expectedKeyTexts.filter((t) =>
    normalized.includes(decodeHtmlEntities(t).toLowerCase()),
  ).length;
  const keyRatio = gt.expectedKeyTexts.length > 0 ? matchedKeyCount / gt.expectedKeyTexts.length : 1;

  let textRatio = keyRatio;
  if (gt.secondaryTexts && gt.secondaryTexts.length > 0) {
    const matchedSec = gt.secondaryTexts.filter((t) =>
      normalized.includes(decodeHtmlEntities(t).toLowerCase()),
    ).length;
    const secRatio = matchedSec / gt.secondaryTexts.length;
    textRatio = keyRatio * 0.85 + secRatio * 0.15;
  }

  const leakedNoiseCount = gt.noiseTexts.filter((n) =>
    normalized.includes(decodeHtmlEntities(n).toLowerCase()),
  ).length;
  const noisePenalty = Math.min(12, leakedNoiseCount * 4);
  const textScore = round1(Math.max(0, Math.min(100, textRatio * 100 - noisePenalty)));

  // 2. Layout & Visual Style Signal Retention (30%)
  const matchedSignals = gt.expectedStyleSignals.filter((sig) => hasStyleSignal(output, sig)).length;
  const rawStyleRatio =
    gt.expectedStyleSignals.length > 0 ? matchedSignals / gt.expectedStyleSignals.length : 1;

  let styleScore = 0;
  if (matchedSignals > 0) {
    let hygienePenalty = 0;
    const mangledMatches =
      output.match(/\b(css-[a-z0-9_-]{4,}|sc-[a-zA-Z0-9_-]{4,}|jsx-[a-z0-9_-]{3,}|_[a-zA-Z0-9]+_\d+x_\d+)\b/g) ??
      [];
    if (mangledMatches.length > 0) {
      hygienePenalty += Math.min(18, 6 + Math.floor(mangledMatches.length / 3));
    }

    const resetBloatMatches =
      output.match(/(box-sizing:\s*border-box|position:\s*static|visibility:\s*visible|pointer-events:\s*auto)/gi) ??
      [];
    if (resetBloatMatches.length >= 4) {
      hygienePenalty += Math.min(34, 10 + Math.floor(resetBloatMatches.length / 4));
    }

    if (/<style[\s>]/i.test(output)) {
      hygienePenalty += 12;
    }

    const uncompactedSvgPaths = output.match(/<path\b[^>]*d=["'][^"']{120,}["']/gi) ?? [];
    if (uncompactedSvgPaths.length > 0) {
      hygienePenalty += Math.min(12, uncompactedSvgPaths.length * 3);
    }

    styleScore = round1(Math.max(0, Math.min(100, rawStyleRatio * 100 - hygienePenalty)));
  }

  // Structural pollution check (<script>, hidden nodes, unpruned wrapper soup)
  let structuralNoisePenalty = 0;
  if (/<script[\s>]/i.test(output)) structuralNoisePenalty += 8;
  if (/display:\s*none/i.test(output) || /<template[\s>]/i.test(output)) structuralNoisePenalty += 6;
  const ariaHiddenBlobs = output.match(/aria-hidden=["']true["']/gi) ?? [];
  if (ariaHiddenBlobs.length >= 3) structuralNoisePenalty += 8;
  const deepShellWrappers = output.match(/data-testid=["']layout-shell-\d+["']/gi) ?? [];
  if (deepShellWrappers.length >= 5) structuralNoisePenalty += 12;

  // 3. Table Row/Col/Span Integrity or Landmark Closure (20%)
  let tableScore = 0;
  const balanced = hasBalancedMarkupClosure(output);

  if (gt.expectedTable) {
    const spec = gt.expectedTable;
    const matchedCells = spec.sampleCells.filter((c) =>
      normalized.includes(decodeHtmlEntities(c).toLowerCase()),
    ).length;
    const cellPts = (matchedCells / Math.max(1, spec.sampleCells.length)) * 40;

    const hasHtmlTable = /<table\b[\s\S]*?<\/table>/i.test(output);
    const pipeLines = output
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.startsWith('|') && l.endsWith('|'));
    const hasGfmSeparator = pipeLines.some((l) => /\|\s*:?-{3,}:?\s*\|/.test(l));

    let structurePts = 0;
    let spanAlignmentPts = 0;

    if (hasHtmlTable) {
      const trCount = (output.match(/<tr\b/gi) ?? []).length;
      const budgetFolded = /omitted|budget|folded|\.\.\./i.test(output);
      const effectiveTargetRows = budgetFolded ? Math.min(4, spec.minRows) : spec.minRows;
      structurePts = Math.min(1, trCount / Math.max(1, effectiveTargetRows)) * 30;

      if (spec.hasMergedCells) {
        const hasColspan = /\bcolspan=["']?[2-9]/i.test(output);
        const hasRowspan = /\browspan=["']?[2-9]/i.test(output);
        spanAlignmentPts = (hasColspan ? 15 : 0) + (hasRowspan ? 15 : 0);
      } else {
        spanAlignmentPts = balanced ? 30 : 10;
      }
    } else if (pipeLines.length >= 3 && hasGfmSeparator) {
      structurePts = Math.min(1, (pipeLines.length - 1) / Math.max(1, spec.minRows)) * 30;
      const colCounts = pipeLines.map((l) => l.split('|').length - 2);
      const allConsistent = colCounts.every((c) => c === colCounts[0] && c >= spec.minCols);
      if (spec.hasMergedCells) {
        spanAlignmentPts = allConsistent ? 22 : 0;
      } else {
        spanAlignmentPts = allConsistent ? 28 : 8;
      }
    }

    tableScore = round1(
      Math.max(0, Math.min(100, cellPts + structurePts + spanAlignmentPts - structuralNoisePenalty)),
    );
  } else {
    const hasSemanticLandmark =
      /<(h[1-4]|section|article|main|form|header|ul|pre)\b/i.test(output) ||
      /^#{1,4}\s+\S+/m.test(output);
    const hasCodeIfExpected =
      fixture.html.includes('<pre') ? /<code\b/i.test(output) || /```/.test(output) : true;
    tableScore = round1(
      Math.max(
        0,
        (hasSemanticLandmark ? 45 : 15) +
          (hasCodeIfExpected ? 15 : 0) +
          (balanced ? 40 : 0) -
          structuralNoisePenalty,
      ),
    );
  }

  // 4. Interactive Controls & ARIA Retention (20%)
  let controlScore = 100;
  if (gt.expectedControls.length > 0) {
    const sum = gt.expectedControls.reduce(
      (acc, ctrl) => acc + scoreSingleControl(output, normalized, ctrl),
      0,
    );
    controlScore = round1((sum / gt.expectedControls.length) * 100);
  }

  const overall = round1(
    textScore * 0.3 + styleScore * 0.3 + tableScore * 0.2 + controlScore * 0.2,
  );

  return {
    overall,
    textScore,
    styleScore,
    tableScore,
    controlScore,
  };
}

function measureMethod(
  methodId: BaselineId,
  fixture: BenchmarkFixture,
  rawTokens: number,
  fn: () => string,
): MethodFixtureRun {
  const t0 = performance.now();
  const output = fn();
  const t1 = performance.now();
  const durationMs = round2(Math.max(0.01, t1 - t0));
  const tokens = estimateTokens(output);
  const compressionPct = rawTokens > 0 ? round1((1 - tokens / rawTokens) * 100) : 0;
  const fidelity = evaluateFidelity(output, fixture);

  return {
    methodId,
    methodName: BASELINE_META[methodId].name,
    fixtureId: fixture.id,
    fixtureName: fixture.name,
    category: fixture.category,
    chars: output.length,
    tokens,
    compressionPct,
    durationMs,
    fidelity,
  };
}

/**
 * Evaluates all 5 baseline configurations on a single `BenchmarkFixture`.
 */
export function evaluateSingleFixture(fixture: BenchmarkFixture): FixtureComparisonRow {
  const rawTokens = estimateTokens(fixture.html);

  const rawRun = measureMethod('raw-html', fixture, rawTokens, () => fixture.html);
  const naiveRun = measureMethod('naive-style-picker', fixture, rawTokens, () =>
    simulateNaiveStylePicker(fixture.html),
  );
  const turndownRun = measureMethod('turndown-gfm', fixture, rawTokens, () =>
    runTurndownGfm(fixture.html),
  );
  const anygrabDefaultRun = measureMethod('anygrab-default', fixture, rawTokens, () => {
    const { document } = parseHTML(fixture.html);
    const res = grab(document as unknown as Document, {
      format: 'tailwind-html',
      compactSvg: true,
      preserveTables: true,
      includeDesignTokens: true,
      sourceUrl: fixture.sourceUrl,
    });
    return res.output;
  });
  const anygrabBudgetRun = measureMethod('anygrab-budget-600', fixture, rawTokens, () => {
    const { document } = parseHTML(fixture.html);
    const res = grab(document as unknown as Document, {
      format: 'tailwind-html',
      maxTokens: 600,
      compactSvg: true,
      preserveTables: true,
      includeDesignTokens: true,
      sourceUrl: fixture.sourceUrl,
    });
    return res.output;
  });

  return {
    fixtureId: fixture.id,
    index: fixture.index,
    name: fixture.name,
    category: fixture.category,
    tags: fixture.tags,
    rawTokens,
    results: {
      'raw-html': rawRun,
      'naive-style-picker': naiveRun,
      'turndown-gfm': turndownRun,
      'anygrab-default': anygrabDefaultRun,
      'anygrab-budget-600': anygrabBudgetRun,
    },
  };
}

/**
 * Runs the full AnyGrab-Bench evaluation across all fixtures (or a custom subset)
 * with optional warmup pass to stabilize JIT timings.
 */
export function runBenchmarkSuite(
  fixtures: BenchmarkFixture[] = BENCHMARK_FIXTURES,
  options: { warmup?: boolean } = {},
): BenchmarkSuiteReport {
  if (options.warmup !== false && fixtures.length > 0) {
    const { document } = parseHTML(fixtures[0].html);
    grab(document as unknown as Document, { format: 'tailwind-html', maxTokens: 600 });
    runTurndownGfm(fixtures[0].html);
  }

  const fixtureRows = fixtures.map((f) => evaluateSingleFixture(f));
  const totalRawTokens = fixtureRows.reduce((sum, r) => sum + r.rawTokens, 0);

  const methodOrder: BaselineId[] = [
    'raw-html',
    'naive-style-picker',
    'turndown-gfm',
    'anygrab-default',
    'anygrab-budget-600',
  ];

  const methods: MethodAggregateSummary[] = methodOrder.map((methodId) => {
    const runs = fixtureRows.map((r) => r.results[methodId]);
    const count = Math.max(1, runs.length);
    const totalTokens = runs.reduce((s, x) => s + x.tokens, 0);
    const avgTokens = Math.round(totalTokens / count);
    const compressionPct =
      totalRawTokens > 0 ? round1((1 - totalTokens / totalRawTokens) * 100) : 0;
    const avgDurationMs = round2(runs.reduce((s, x) => s + x.durationMs, 0) / count);
    const avgFidelity = round1(runs.reduce((s, x) => s + x.fidelity.overall, 0) / count);
    const avgTextScore = round1(runs.reduce((s, x) => s + x.fidelity.textScore, 0) / count);
    const avgStyleScore = round1(runs.reduce((s, x) => s + x.fidelity.styleScore, 0) / count);
    const avgTableScore = round1(runs.reduce((s, x) => s + x.fidelity.tableScore, 0) / count);
    const avgControlScore = round1(runs.reduce((s, x) => s + x.fidelity.controlScore, 0) / count);

    return {
      methodId,
      methodName: BASELINE_META[methodId].name,
      description: BASELINE_META[methodId].description,
      totalTokens,
      avgTokens,
      compressionPct,
      avgDurationMs,
      avgFidelity,
      avgTextScore,
      avgStyleScore,
      avgTableScore,
      avgControlScore,
    };
  });

  return {
    benchmarkVersion: '0.1.0',
    generatedAt: new Date().toISOString(),
    fixtureCount: fixtureRows.length,
    methods,
    fixtures: fixtureRows,
  };
}

function padCell(val: string, width: number, align: 'left' | 'right' = 'left'): string {
  if (val.length >= width) return val;
  const pad = ' '.repeat(width - val.length);
  return align === 'right' ? `${pad}${val}` : `${val}${pad}`;
}

/**
 * Formats a clean, aligned GitHub-Flavored Markdown benchmark leaderboard table.
 */
export function formatMarkdownReport(report: BenchmarkSuiteReport): string {
  const lines: string[] = [];
  lines.push('# AnyGrab-Bench v0.1.0 — Objective Multi-Baseline Evaluation');
  lines.push('');
  lines.push(
    `Evaluated across **${report.fixtureCount} synthetic DOM Torture Suite fixtures** (0% external LLM calls).`,
  );
  lines.push('');

  const summaryHeaders = [
    'Baseline Method',
    'Total Tokens',
    'Avg Tokens',
    'Token Savings',
    'Avg Latency',
    'Fidelity (0-100)',
    'Style Recall',
    'Table/Struct',
  ];

  const summaryRows = report.methods.map((m) => [
    m.methodName,
    m.totalTokens.toLocaleString('en-US'),
    m.avgTokens.toLocaleString('en-US'),
    `${m.compressionPct >= 0 ? '-' : '+'}${Math.abs(m.compressionPct).toFixed(1)}%`,
    `${m.avgDurationMs.toFixed(2)} ms`,
    `${m.avgFidelity.toFixed(1)} / 100`,
    `${m.avgStyleScore.toFixed(1)}%`,
    `${m.avgTableScore.toFixed(1)}%`,
  ]);

  const colWidths = summaryHeaders.map((h, i) =>
    Math.max(h.length, ...summaryRows.map((r) => r[i].length)),
  );

  lines.push(
    `| ${summaryHeaders.map((h, i) => padCell(h, colWidths[i], i === 0 ? 'left' : 'right')).join(' | ')} |`,
  );
  lines.push(
    `| ${colWidths.map((w, i) => (i === 0 ? `:${'-'.repeat(w - 1)}` : `${'-'.repeat(w - 1)}:`)).join(' | ')} |`,
  );
  for (const row of summaryRows) {
    lines.push(
      `| ${row.map((c, i) => padCell(c, colWidths[i], i === 0 ? 'left' : 'right')).join(' | ')} |`,
    );
  }

  lines.push('');
  lines.push('## Per-Fixture Breakdown (Tokens / Fidelity Score)');
  lines.push('');

  const fixHeaders = [
    '#',
    'Fixture',
    'Raw HTML',
    'Naive Picker',
    'Turndown GFM',
    'AnyGrab Default',
    'AnyGrab (B=600)',
  ];
  const fixRows = report.fixtures.map((f) => {
    const raw = f.results['raw-html'];
    const naive = f.results['naive-style-picker'];
    const td = f.results['turndown-gfm'];
    const ag = f.results['anygrab-default'];
    const ag600 = f.results['anygrab-budget-600'];
    return [
      String(f.index),
      f.name,
      `${raw.tokens}t (${raw.fidelity.overall})`,
      `${naive.tokens}t (${naive.fidelity.overall})`,
      `${td.tokens}t (${td.fidelity.overall})`,
      `${ag.tokens}t (${ag.fidelity.overall})`,
      `${ag600.tokens}t (${ag600.fidelity.overall})`,
    ];
  });

  const fixWidths = fixHeaders.map((h, i) =>
    Math.max(h.length, ...fixRows.map((r) => r[i].length)),
  );
  lines.push(
    `| ${fixHeaders.map((h, i) => padCell(h, fixWidths[i], i <= 1 ? 'left' : 'right')).join(' | ')} |`,
  );
  lines.push(
    `| ${fixWidths.map((w, i) => (i <= 1 ? `:${'-'.repeat(Math.max(1, w - 1))}` : `${'-'.repeat(Math.max(1, w - 1))}:`)).join(' | ')} |`,
  );
  for (const row of fixRows) {
    lines.push(
      `| ${row.map((c, i) => padCell(c, fixWidths[i], i <= 1 ? 'left' : 'right')).join(' | ')} |`,
    );
  }

  return lines.join('\n');
}
