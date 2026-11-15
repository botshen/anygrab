import { grab, type OutputFormat } from 'anygrab-core';
import {
  AlertTriangle,
  Check,
  Code2,
  Copy,
  Eye,
  RotateCcw,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { PLAYGROUND_PRESETS, type PlaygroundPreset } from '../data/types';
import { PRESET_ZH_MAP, type SiteLocale } from '../i18n';
import {
  buildAgentCopyPayload,
  buildRawSandboxDoc,
  buildTailwindSandboxDoc,
  extractFallbackColors,
} from '../utils/sandbox';

interface LivePlaygroundProps {
  locale: SiteLocale;
  selectedPresetId: string;
  onSelectPreset: (presetId: string) => void;
}

const QUICK_BUDGETS = [400, 600, 1200, 2400];

export function LivePlayground({
  locale,
  selectedPresetId,
  onSelectPreset,
}: LivePlaygroundProps) {
  const isZh = locale === 'zh-CN';
  const initialPreset =
    PLAYGROUND_PRESETS.find((p) => p.id === selectedPresetId) ?? PLAYGROUND_PRESETS[0];

  const [rawHtml, setRawHtml] = useState<string>(initialPreset.html);
  const [lastSyncedPresetId, setLastSyncedPresetId] = useState<string>(initialPreset.id);
  const [format, setFormat] = useState<OutputFormat>('prompt');
  const [budgetEnabled, setBudgetEnabled] = useState<boolean>(false);
  const [budgetTokens, setBudgetTokens] = useState<number>(1200);
  const [compactSvg, setCompactSvg] = useState<boolean>(true);
  const [includeHoverStyles, setIncludeHoverStyles] = useState<boolean>(false);

  const [leftMode, setLeftMode] = useState<'code' | 'preview'>('preview');
  const [rightMode, setRightMode] = useState<'code' | 'preview'>('code');
  const [copiedAgent, setCopiedAgent] = useState<boolean>(false);
  const [copiedRawOut, setCopiedRawOut] = useState<boolean>(false);

  const activePreset: PlaygroundPreset =
    PLAYGROUND_PRESETS.find((p) => p.id === selectedPresetId) ?? PLAYGROUND_PRESETS[0];

  if (lastSyncedPresetId !== activePreset.id) {
    setLastSyncedPresetId(activePreset.id);
    setRawHtml(activePreset.html);
  }

  const isEditedFromPreset = rawHtml !== activePreset.html;

  const formatOptions: Array<{
    id: OutputFormat;
    label: string;
  }> = [
    { id: 'prompt', label: isZh ? 'AI 复刻指令' : 'AI Prompt' },
    { id: 'tailwind-html', label: 'Tailwind' },
    { id: 'jsx', label: 'React JSX' },
    { id: 'markdown', label: 'Markdown' },
  ];

  const handlePresetClick = (preset: PlaygroundPreset) => {
    onSelectPreset(preset.id);
    setLastSyncedPresetId(preset.id);
    setRawHtml(preset.html);
  };

  const handleResetPreset = () => {
    setRawHtml(activePreset.html);
  };

  const result = useMemo(
    () =>
      grab(rawHtml, {
        format,
        locale,
        maxTokens: budgetEnabled ? budgetTokens : undefined,
        compactSvg,
        includeHoverStyles,
        preserveTables: true,
        includeDesignTokens: true,
        sourceUrl: activePreset.sourceUrl,
      }),
    [
      rawHtml,
      format,
      locale,
      budgetEnabled,
      budgetTokens,
      compactSvg,
      includeHoverStyles,
      activePreset.sourceUrl,
    ],
  );

  const rawSandboxSrcDoc = useMemo(() => buildRawSandboxDoc(rawHtml), [rawHtml]);
  const tailwindSandboxSrcDoc = useMemo(
    () => buildTailwindSandboxDoc(result.tailwindHtml, rightMode === 'code'),
    [result.tailwindHtml, rightMode],
  );

  const paletteColors = useMemo(
    () => extractFallbackColors(rawHtml, result.designTokens.colors),
    [rawHtml, result.designTokens.colors],
  );

  const handleCopyForAgents = () => {
    const payload = buildAgentCopyPayload(result.output, format, activePreset.sourceUrl, locale);
    try {
      void navigator.clipboard?.writeText(payload)?.catch(() => {});
    } catch {
      // Ignore in headless test env
    }
    setCopiedAgent(true);
    setTimeout(() => setCopiedAgent(false), 2000);
  };

  const handleCopyPureOutput = () => {
    try {
      void navigator.clipboard?.writeText(result.output)?.catch(() => {});
    } catch {
      // Ignore
    }
    setCopiedRawOut(true);
    setTimeout(() => setCopiedRawOut(false), 1600);
  };

  return (
    <section
      id="playground"
      aria-label="Live Distillation Playground"
      className="bg-[var(--ag-bg-alt)] py-14 sm:py-20"
    >
      <div className="ag-wrap space-y-6">
        {/* Two-sentence editorial heading (copy.md) */}
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h2 className="text-[clamp(1.75rem,2.4vw,2.65rem)] leading-[1.12] font-medium tracking-[-0.032em] text-[var(--ag-ink)]">
            {isZh ? '双沙盒实时提纯。' : 'Live distillation sandbox.'}{' '}
            <span className="text-[var(--ag-muted)]">
              {isZh
                ? '粘贴任意网页，即刻对比源码与渲染。'
                : 'Paste raw HTML and compare output side by side.'}
            </span>
          </h2>

          {isEditedFromPreset && (
            <button
              type="button"
              onClick={handleResetPreset}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-[var(--ag-line-strong)] bg-[var(--ag-panel)] px-3.5 text-[13px] font-medium text-[var(--ag-ink)] transition-colors hover:border-[var(--ag-accent)]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>{isZh ? '还原样本' : 'Reset'}</span>
            </button>
          )}
        </div>

        {/* Clean Single-Line Specimen Chips (eliminates 10 bulky 2-line cards) */}
        <div className="flex flex-wrap items-center gap-2">
          {PLAYGROUND_PRESETS.map((preset) => {
            const isSelected = preset.id === activePreset.id;
            const zhMeta = PRESET_ZH_MAP[preset.id];
            const displayName = isZh && zhMeta ? zhMeta.name : preset.name;

            return (
              <button
                key={preset.id}
                type="button"
                data-preset-id={preset.id}
                onClick={() => handlePresetClick(preset)}
                className={`min-h-[36px] rounded-full border px-3.5 text-[13px] font-medium transition-colors ${
                  isSelected
                    ? 'border-[var(--ag-ink)] bg-[var(--ag-ink)] text-[var(--ag-bg)]'
                    : 'border-[var(--ag-line)] bg-[var(--ag-panel)] text-[var(--ag-ink-secondary)] hover:border-[var(--ag-line-strong)] hover:text-[var(--ag-ink)]'
                }`}
              >
                {displayName}
              </button>
            );
          })}
        </div>

        {/* Unified Controls Toolbar */}
        <div className="flex flex-col justify-between gap-3 rounded-[14px] border border-[var(--ag-line)] bg-[var(--ag-panel)] p-3 xl:flex-row xl:items-center">
          <div
            className="inline-flex flex-wrap gap-1 rounded-lg bg-[var(--ag-panel-muted)] p-1"
            role="group"
            aria-label="Output Format"
          >
            {formatOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                data-format={opt.id}
                onClick={() => setFormat(opt.id)}
                aria-pressed={format === opt.id}
                className={`min-h-[34px] rounded-[6px] px-3 text-[13px] font-medium transition-colors ${
                  format === opt.id
                    ? 'bg-[var(--ag-panel)] text-[var(--ag-ink)] shadow-[0_1px_2px_rgba(0,0,0,0.08)]'
                    : 'text-[var(--ag-muted)] hover:text-[var(--ag-ink)]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--ag-line)] bg-[var(--ag-code-bg)] px-3 py-1.5">
              <button
                type="button"
                onClick={() => setBudgetEnabled((prev) => !prev)}
                aria-pressed={budgetEnabled}
                className="ag-tabular font-mono text-[13px] font-medium text-[var(--ag-ink)]"
              >
                {budgetEnabled
                  ? isZh
                    ? `上限: ${budgetTokens.toLocaleString()} tok`
                    : `Budget: ${budgetTokens.toLocaleString()} tok`
                  : isZh
                    ? '不限 Token'
                    : 'Budget: No Limit'}
              </button>

              <input
                type="range"
                aria-label="Token Budget Slider"
                min={200}
                max={4000}
                step={50}
                value={budgetEnabled ? budgetTokens : 4000}
                onChange={(e) => {
                  setBudgetEnabled(true);
                  setBudgetTokens(Number(e.target.value));
                }}
                className={`h-1.5 w-24 cursor-pointer accent-[var(--ag-accent)] transition-opacity sm:w-28 ${
                  budgetEnabled ? 'opacity-100' : 'opacity-45'
                }`}
              />

              <div className="flex flex-wrap items-center gap-1">
                {QUICK_BUDGETS.map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      setBudgetEnabled(true);
                      setBudgetTokens(val);
                    }}
                    className={`ag-tabular rounded px-2 py-0.5 font-mono text-[12px] transition-colors ${
                      budgetEnabled && budgetTokens === val
                        ? 'bg-[var(--ag-accent)] font-medium text-white'
                        : 'text-[var(--ag-muted)] hover:text-[var(--ag-ink)]'
                    }`}
                  >
                    {val}
                  </button>
                ))}
                <button
                  type="button"
                  data-budget="unlimited"
                  onClick={() => setBudgetEnabled(false)}
                  className={`rounded px-2 py-0.5 font-mono text-[12px] transition-colors ${
                    !budgetEnabled
                      ? 'bg-[var(--ag-ink)] font-medium text-[var(--ag-bg)]'
                      : 'text-[var(--ag-muted)] hover:text-[var(--ag-ink)]'
                  }`}
                >
                  {isZh ? '不限' : 'All'}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 text-[13px] text-[var(--ag-ink-secondary)]">
              <label className="inline-flex cursor-pointer items-center gap-1.5 select-none hover:text-[var(--ag-ink)]">
                <input
                  type="checkbox"
                  checked={compactSvg}
                  onChange={(e) => setCompactSvg(e.target.checked)}
                  className="h-4 w-4 rounded accent-[var(--ag-accent)]"
                />
                <span>{isZh ? '压缩 SVG' : 'Compact SVG'}</span>
              </label>

              <label className="inline-flex cursor-pointer items-center gap-1.5 select-none hover:text-[var(--ag-ink)]">
                <input
                  type="checkbox"
                  checked={includeHoverStyles}
                  onChange={(e) => setIncludeHoverStyles(e.target.checked)}
                  className="h-4 w-4 rounded accent-[var(--ag-accent)]"
                />
                <span>:hover</span>
              </label>
            </div>
          </div>
        </div>

        {/* Dual Sandbox App Frame */}
        <div className="grid gap-5 lg:grid-cols-2">
          {/* LEFT PANEL: Raw HTML / Original Preview */}
          <div className="ag-window flex h-[520px] flex-col overflow-hidden rounded-[16px] border border-[var(--ag-line)]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--ag-line)] bg-[var(--ag-panel-muted)] px-4 py-2.5">
              <div className="inline-flex items-center gap-1 rounded-lg bg-[var(--ag-bg)] p-0.5">
                <button
                  type="button"
                  data-left-view="preview"
                  aria-label="Original Sandbox Preview"
                  onClick={() => setLeftMode('preview')}
                  className={`inline-flex min-h-[30px] items-center gap-1.5 rounded-[6px] px-2.5 text-[13px] font-medium transition-colors ${
                    leftMode === 'preview'
                      ? 'bg-[var(--ag-panel)] text-[var(--ag-ink)] shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                      : 'text-[var(--ag-muted)] hover:text-[var(--ag-ink)]'
                  }`}
                >
                  <Eye className="h-3.5 w-3.5 text-[var(--ag-accent)]" />
                  <span>{isZh ? '原始画面' : 'Original'}</span>
                </button>
                <button
                  type="button"
                  data-left-view="code"
                  onClick={() => setLeftMode('code')}
                  className={`inline-flex min-h-[30px] items-center gap-1.5 rounded-[6px] px-2.5 text-[13px] font-medium transition-colors ${
                    leftMode === 'code'
                      ? 'bg-[var(--ag-panel)] text-[var(--ag-ink)] shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                      : 'text-[var(--ag-muted)] hover:text-[var(--ag-ink)]'
                  }`}
                >
                  <Code2 className="h-3.5 w-3.5" />
                  <span>{isZh ? '原始 HTML' : 'Raw HTML'}</span>
                </button>
              </div>

              <span className="ag-tabular font-mono text-[13px] text-[var(--ag-muted)]">
                ~{result.metrics.rawTokens.toLocaleString()} tok
              </span>
            </div>

            <div className="relative flex-1 overflow-hidden">
              {leftMode === 'preview' ? (
                <iframe
                  title="Raw HTML Sandbox Preview"
                  sandbox="allow-same-origin"
                  srcDoc={rawSandboxSrcDoc}
                  className="h-full w-full border-0 bg-[#090d16]"
                />
              ) : (
                <textarea
                  aria-label="Raw Dirty HTML Editor"
                  spellCheck={false}
                  value={rawHtml}
                  onChange={(e) => setRawHtml(e.target.value)}
                  placeholder={
                    isZh
                      ? '粘贴任意网页 HTML + <style> 源码…'
                      : 'Paste any raw HTML + <style> snippet...'
                  }
                  className="h-full w-full resize-none bg-[var(--ag-code-bg)] p-4 font-mono text-[13px] leading-[1.6] text-[var(--ag-code-ink)] focus:outline-none"
                />
              )}
            </div>

            <div className="flex items-center justify-between border-t border-[var(--ag-line)] bg-[var(--ag-panel-muted)] px-4 py-2 font-mono text-[12px] text-[var(--ag-muted)]">
              <span className="truncate">{activePreset.sourceUrl}</span>
              <span className="shrink-0">{isZh ? '输入源' : 'Source'}</span>
            </div>
          </div>

          {/* RIGHT PANEL: Distilled Output + Live Tailwind Preview */}
          <div className="ag-window flex h-[520px] flex-col overflow-hidden rounded-[16px] border border-[var(--ag-line-strong)]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--ag-line)] bg-[var(--ag-panel-muted)] px-4 py-2.5">
              <div className="inline-flex items-center gap-1 rounded-lg bg-[var(--ag-bg)] p-0.5">
                <button
                  type="button"
                  data-right-view="code"
                  onClick={() => setRightMode('code')}
                  className={`inline-flex min-h-[30px] items-center gap-1.5 rounded-[6px] px-2.5 text-[13px] font-medium transition-colors ${
                    rightMode === 'code'
                      ? 'bg-[var(--ag-panel)] text-[var(--ag-ink)] shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                      : 'text-[var(--ag-muted)] hover:text-[var(--ag-ink)]'
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-[var(--ag-emerald)]" />
                  <span>{isZh ? `提纯输出 (${format})` : `Distilled Code (${format})`}</span>
                </button>
                <button
                  type="button"
                  data-right-view="preview"
                  aria-label="Tailwind Sandbox Preview"
                  onClick={() => setRightMode('preview')}
                  className={`inline-flex min-h-[30px] items-center gap-1.5 rounded-[6px] px-2.5 text-[13px] font-medium transition-colors ${
                    rightMode === 'preview'
                      ? 'bg-[var(--ag-panel)] text-[var(--ag-ink)] shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                      : 'text-[var(--ag-muted)] hover:text-[var(--ag-ink)]'
                  }`}
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>{isZh ? '渲染预览' : 'Preview'}</span>
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCopyPureOutput}
                  aria-label={isZh ? '复制纯净输出' : 'Copy raw output'}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--ag-line)] bg-[var(--ag-panel)] text-[var(--ag-ink-secondary)] transition-colors hover:border-[var(--ag-line-strong)] hover:text-[var(--ag-ink)]"
                >
                  {copiedRawOut ? (
                    <Check className="h-3.5 w-3.5 text-[var(--ag-emerald)]" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>

                <button
                  type="button"
                  data-action="copy-for-agent"
                  onClick={handleCopyForAgents}
                  className="inline-flex min-h-[32px] items-center gap-1.5 rounded-lg bg-[var(--ag-accent)] px-3 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
                >
                  {copiedAgent ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span>{isZh ? '已复制' : 'Copied'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>{isZh ? '复制给 AI' : 'Copy for Agent'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="flex flex-1 flex-col overflow-hidden">
              <div
                className={`relative overflow-hidden ${
                  rightMode === 'preview'
                    ? 'flex-1'
                    : 'h-[175px] shrink-0 border-b border-[var(--ag-line)]'
                }`}
              >
                <iframe
                  title="Distilled Tailwind Sandbox Preview"
                  sandbox="allow-scripts"
                  srcDoc={tailwindSandboxSrcDoc}
                  className="h-full w-full border-0 bg-[#090d16]"
                />
              </div>

              {rightMode === 'code' && (
                <pre
                  aria-label="Distilled Output Code"
                  className="flex-1 overflow-y-auto bg-[var(--ag-code-bg)] p-4 font-mono text-[12.5px] leading-[1.6] whitespace-pre-wrap break-words text-[var(--ag-code-ink)]"
                >
                  <code>{result.output}</code>
                </pre>
              )}
            </div>

            {/* Clean Single-Row Telemetry & Swatches Footer */}
            <div className="ag-tabular flex flex-wrap items-center justify-between gap-2 border-t border-[var(--ag-line)] bg-[var(--ag-panel-muted)] px-4 py-2 font-mono text-[12px] text-[var(--ag-muted)]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-[var(--ag-emerald)]">
                  {result.metrics.compressionRatio >= 0
                    ? `-${result.metrics.compressionRatio}%`
                    : `${Math.abs(result.metrics.compressionRatio)}%`}
                </span>
                <span>
                  {result.metrics.rawTokens.toLocaleString()} →{' '}
                  <strong className="font-medium text-[var(--ag-ink)]">
                    {result.metrics.outputTokens.toLocaleString()}
                  </strong>{' '}
                  tok
                </span>
                <span>·</span>
                <span>{result.metrics.durationMs} ms</span>
                {result.warnings.length > 0 && (
                  <span
                    title={result.warnings.join(' ')}
                    className="inline-flex items-center gap-1 font-medium text-[var(--ag-accent)]"
                  >
                    <AlertTriangle className="h-3 w-3" />
                    <span>{isZh ? '已折叠' : 'Folded'}</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                {paletteColors.slice(0, 5).map((color) => (
                  <span
                    key={color}
                    title={color}
                    className="h-3 w-3 rounded-[2px] border border-[var(--ag-line-strong)]"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
