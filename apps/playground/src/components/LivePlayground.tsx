import { grab, type OutputFormat } from '@anygrab/core';
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

  const activeZhPreset = PRESET_ZH_MAP[activePreset.id];
  const activeDescription =
    isZh && activeZhPreset ? activeZhPreset.description : activePreset.description;

  return (
    <section
      id="playground"
      aria-label="Live Distillation Playground"
      className="mx-auto max-w-[1160px] space-y-5 pt-4"
    >
      {/* Compact Instrument Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="font-mono text-[11px] font-semibold tracking-wider text-[var(--ag-accent)] uppercase">
            02 · LIVE WORKBENCH
          </div>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-[#F4F5F8] sm:text-3xl">
            {isZh ? '双沙盒实时提纯台' : 'Live Dual-Sandbox Lab'}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-[#A1A7B5]">{activeDescription}</span>
          {isEditedFromPreset && (
            <button
              type="button"
              onClick={handleResetPreset}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-[#171A22] px-3 py-1 text-xs font-medium text-[#F4F5F8] transition hover:border-white/25"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>{isZh ? '还原' : 'Reset'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 5x2 Specimen Grid */}
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-5">
        {PLAYGROUND_PRESETS.map((preset) => {
          const isSelected = preset.id === activePreset.id;
          const zhMeta = PRESET_ZH_MAP[preset.id];
          const displayName = isZh && zhMeta ? zhMeta.name : preset.name;
          const displayCat = isZh && zhMeta ? zhMeta.category : preset.category;

          return (
            <button
              key={preset.id}
              type="button"
              data-preset-id={preset.id}
              onClick={() => handlePresetClick(preset)}
              className={`rounded-[10px] border px-3 py-2 text-left transition ${
                isSelected
                  ? 'border-[var(--ag-accent)]/70 bg-[#171A22] text-[#F4F5F8] shadow-[0_0_18px_-6px_rgba(255,77,28,0.4)]'
                  : 'border-white/8 bg-[#101217] text-[#A1A7B5] hover:border-white/20 hover:text-[#F4F5F8]'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span
                  className={`ag-tabular shrink-0 font-mono text-[11px] font-bold ${
                    isSelected ? 'text-[var(--ag-accent)]' : 'text-[#7C8292]'
                  }`}
                >
                  #{String(preset.index).padStart(2, '0')}
                </span>
                <span className="truncate text-xs font-semibold text-[#F4F5F8]">
                  {displayName}
                </span>
              </div>
              <div className="mt-0.5 truncate text-[11px] text-[#7C8292]">{displayCat}</div>
            </button>
          );
        })}
      </div>

      {/* Controls Bar: Format Pills + Token Budget Slider + Flags */}
      <div className="flex flex-col justify-between gap-3 rounded-xl border border-white/10 bg-[#101217] p-3 xl:flex-row xl:items-center">
        <div
          className="inline-flex flex-wrap gap-1 rounded-lg border border-white/8 bg-[#08090C] p-1"
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
              className={`rounded-[6px] px-3 py-1.5 text-xs font-semibold transition ${
                format === opt.id
                  ? 'bg-[#F4F5F8] text-[#08090C]'
                  : 'text-[#A1A7B5] hover:text-[#F4F5F8]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-white/8 bg-[#08090C] px-3 py-1.5">
            <button
              type="button"
              onClick={() => setBudgetEnabled((prev) => !prev)}
              aria-pressed={budgetEnabled}
              className="ag-tabular font-mono text-xs font-semibold text-[#F4F5F8]"
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
              className={`h-1.5 w-24 cursor-pointer accent-[#FF4D1C] transition sm:w-28 ${
                budgetEnabled ? 'opacity-100' : 'opacity-45'
              }`}
            />

            <div className="hidden items-center gap-1 sm:flex">
              {QUICK_BUDGETS.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => {
                    setBudgetEnabled(true);
                    setBudgetTokens(val);
                  }}
                  className={`ag-tabular rounded px-1.5 py-0.5 font-mono text-[11px] transition ${
                    budgetEnabled && budgetTokens === val
                      ? 'bg-[var(--ag-accent)] font-bold text-white'
                      : 'text-[#A1A7B5] hover:bg-white/8 hover:text-[#F4F5F8]'
                  }`}
                >
                  {val}
                </button>
              ))}
              <button
                type="button"
                data-budget="unlimited"
                onClick={() => setBudgetEnabled(false)}
                className={`rounded px-2 py-0.5 font-mono text-[11px] transition ${
                  !budgetEnabled
                    ? 'bg-[#F4F5F8] font-bold text-[#08090C]'
                    : 'text-[#A1A7B5] hover:bg-white/8 hover:text-[#F4F5F8]'
                }`}
              >
                {isZh ? '不限制' : 'No Limit'}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-[#A1A7B5]">
            <label className="inline-flex cursor-pointer items-center gap-1.5 select-none hover:text-[#F4F5F8]">
              <input
                type="checkbox"
                checked={compactSvg}
                onChange={(e) => setCompactSvg(e.target.checked)}
                className="h-3.5 w-3.5 rounded accent-[#FF4D1C]"
              />
              <span>{isZh ? '压缩 SVG' : 'Compact SVG'}</span>
            </label>

            <label className="inline-flex cursor-pointer items-center gap-1.5 select-none hover:text-[#F4F5F8]">
              <input
                type="checkbox"
                checked={includeHoverStyles}
                onChange={(e) => setIncludeHoverStyles(e.target.checked)}
                className="h-3.5 w-3.5 rounded accent-[#FF4D1C]"
              />
              <span>{isZh ? ':hover 态' : ':hover'}</span>
            </label>
          </div>
        </div>
      </div>

      {/* Dual Sandbox Stage */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* LEFT PANEL */}
        <div className="flex h-[540px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#101217]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/8 bg-[#171A22] px-4 py-2.5">
            <div className="inline-flex items-center gap-1 rounded-lg bg-[#08090C] p-0.5">
              <button
                type="button"
                data-left-view="preview"
                aria-label="Original Sandbox Preview"
                onClick={() => setLeftMode('preview')}
                className={`inline-flex items-center gap-1.5 rounded-[6px] px-2.5 py-1 text-xs font-semibold transition ${
                  leftMode === 'preview'
                    ? 'bg-[#222631] text-[#F4F5F8]'
                    : 'text-[#A1A7B5] hover:text-[#F4F5F8]'
                }`}
              >
                <Eye className="h-3.5 w-3.5 text-[var(--ag-accent)]" />
                <span>{isZh ? '原始画面' : 'Original'}</span>
              </button>
              <button
                type="button"
                data-left-view="code"
                onClick={() => setLeftMode('code')}
                className={`inline-flex items-center gap-1.5 rounded-[6px] px-2.5 py-1 text-xs font-semibold transition ${
                  leftMode === 'code'
                    ? 'bg-[#222631] text-[#F4F5F8]'
                    : 'text-[#A1A7B5] hover:text-[#F4F5F8]'
                }`}
              >
                <Code2 className="h-3.5 w-3.5" />
                <span>{isZh ? '脏源码 HTML' : 'Dirty HTML'}</span>
              </button>
            </div>

            <span className="ag-tabular font-mono text-[11px] text-[#7C8292]">
              ~{result.metrics.rawTokens.toLocaleString()} tok
            </span>
          </div>

          <div className="relative flex-1 overflow-hidden">
            {leftMode === 'preview' ? (
              <div className="relative h-full w-full">
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute top-3 left-3 z-10 h-4 w-4 border-t-2 border-l-2 border-[var(--ag-accent)]"
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute top-3 right-3 z-10 h-4 w-4 border-t-2 border-r-2 border-[var(--ag-accent)]"
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-3 left-3 z-10 h-4 w-4 border-b-2 border-l-2 border-[var(--ag-accent)]"
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute right-3 bottom-3 z-10 h-4 w-4 border-r-2 border-b-2 border-[var(--ag-accent)]"
                />
                <iframe
                  title="Raw HTML Sandbox Preview"
                  sandbox="allow-same-origin"
                  srcDoc={rawSandboxSrcDoc}
                  className="h-full w-full border-0 bg-[#090d16]"
                />
              </div>
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
                className="h-full w-full resize-none bg-[#08090C] p-4 font-mono text-xs leading-[1.6] text-[#D8DCE6] focus:outline-none"
              />
            )}
          </div>

          <div className="flex items-center justify-between border-t border-white/8 bg-[#171A22] px-4 py-2 text-[11px] text-[#7C8292]">
            <span className="truncate font-mono">{activePreset.sourceUrl}</span>
            <span className="shrink-0 font-mono">RAW TARGET</span>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="flex h-[540px] flex-col overflow-hidden rounded-2xl border border-white/14 bg-[#101217]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/8 bg-[#171A22] px-4 py-2.5">
            <div className="inline-flex items-center gap-1 rounded-lg bg-[#08090C] p-0.5">
              <button
                type="button"
                data-right-view="code"
                onClick={() => setRightMode('code')}
                className={`inline-flex items-center gap-1.5 rounded-[6px] px-2.5 py-1 text-xs font-semibold transition ${
                  rightMode === 'code'
                    ? 'bg-[#222631] text-[#F4F5F8]'
                    : 'text-[#A1A7B5] hover:text-[#F4F5F8]'
                }`}
              >
                <span className="h-2 w-2 rounded-[2px] bg-[var(--ag-emerald)]" />
                <span>{isZh ? `提纯对照 (${format})` : `Distilled Code (${format})`}</span>
              </button>
              <button
                type="button"
                data-right-view="preview"
                aria-label="Tailwind Sandbox Preview"
                onClick={() => setRightMode('preview')}
                className={`inline-flex items-center gap-1.5 rounded-[6px] px-2.5 py-1 text-xs font-semibold transition ${
                  rightMode === 'preview'
                    ? 'bg-[#222631] text-[#F4F5F8]'
                    : 'text-[#A1A7B5] hover:text-[#F4F5F8]'
                }`}
              >
                <Eye className="h-3.5 w-3.5" />
                <span>{isZh ? '1:1 渲染预览' : 'Tailwind Preview'}</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCopyPureOutput}
                aria-label={isZh ? '复制纯净输出' : 'Copy raw output'}
                className="inline-flex items-center justify-center rounded-lg border border-white/12 bg-[#08090C] p-1.5 text-[#A1A7B5] transition hover:text-[#F4F5F8]"
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
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF4D1C] px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110"
              >
                {copiedAgent ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>{isZh ? '已复制' : 'Copied'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>
                      {isZh ? '复制给 反重力 / Codex' : 'Copy for Antigravity'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="flex flex-1 flex-col overflow-hidden">
            <div
              className={`relative overflow-hidden transition-all ${
                rightMode === 'preview'
                  ? 'flex-1'
                  : 'h-[185px] shrink-0 border-b border-white/10'
              }`}
            >
              <span className="pointer-events-none absolute top-2 right-2.5 z-10 rounded bg-[#08090C]/85 px-2 py-0.5 font-mono text-[11px] text-[#A1A7B5]">
                {isZh ? 'Tailwind 实时渲染' : 'Tailwind Render'}
              </span>
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
                className="flex-1 overflow-y-auto bg-[#08090C] p-4 font-mono text-[11.5px] leading-[1.6] whitespace-pre-wrap break-words text-[#D8DCE6]"
              >
                <code>{result.output}</code>
              </pre>
            )}
          </div>

          {/* Swatches + Compression Telemetry Footer */}
          <div className="space-y-2 border-t border-white/8 bg-[#171A22] px-4 py-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <div className="flex flex-wrap items-center gap-1.5">
                {paletteColors.length > 0 ? (
                  paletteColors.slice(0, 6).map((color) => (
                    <span
                      key={color}
                      className="inline-flex items-center gap-1 rounded border border-white/10 bg-[#08090C] px-1.5 py-0.5 font-mono text-[11px] text-[#F4F5F8]"
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-[2px] border border-white/20"
                        style={{ backgroundColor: color }}
                      />
                      <span>{color}</span>
                    </span>
                  ))
                ) : (
                  <span className="text-[#7C8292]">
                    {isZh ? '无显式色值' : 'No explicit tokens'}
                  </span>
                )}
              </div>

              {result.designTokens.fonts.length > 0 && (
                <span className="font-mono text-[11px] text-[#7C8292]">
                  {result.designTokens.fonts[0]}
                </span>
              )}
            </div>

            <div className="ag-tabular flex flex-wrap items-center justify-between gap-2 border-t border-white/8 pt-1.5 font-mono text-[11px] text-[#A1A7B5]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-[#10B981]">
                  {result.metrics.compressionRatio >= 0
                    ? `-${result.metrics.compressionRatio}%`
                    : `${Math.abs(result.metrics.compressionRatio)}%`}
                </span>
                <span>
                  {result.metrics.rawTokens.toLocaleString()} →{' '}
                  <strong className="text-[#F4F5F8]">
                    {result.metrics.outputTokens.toLocaleString()}
                  </strong>{' '}
                  tok
                </span>
                <span>·</span>
                <span>{result.metrics.durationMs} ms</span>
                <span>·</span>
                <span>{result.metrics.nodesPruned} pruned</span>
              </div>

              {result.warnings.length > 0 && (
                <span
                  title={result.warnings.join(' ')}
                  className="inline-flex items-center gap-1 font-medium text-[var(--ag-accent)]"
                >
                  <AlertTriangle className="h-3 w-3" />
                  <span>{isZh ? '已智能折叠' : 'Folded'}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
