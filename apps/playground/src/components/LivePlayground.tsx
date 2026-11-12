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

  // Visual-first default: Left renders the live webpage specimen immediately!
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
    hint: string;
  }> = [
    {
      id: 'prompt',
      label: isZh ? 'AI 复刻指令' : 'AI Prompt',
      hint: isZh
        ? '自带中文提示词 + 设计色板 + 代码，复制后去反重力/Codex 直接粘贴回车即可'
        : 'Ready-to-paste prompt with Design Tokens + code for Antigravity/Codex',
    },
    {
      id: 'tailwind-html',
      label: isZh ? 'Tailwind HTML' : 'Tailwind HTML',
      hint: isZh ? '纯净的 HTML + Tailwind 样式类名' : 'Clean HTML with Tailwind v4 utilities',
    },
    {
      id: 'jsx',
      label: isZh ? 'React JSX' : 'React JSX',
      hint: isZh ? '适合直接放进 React / Next.js 项目' : 'Valid JSX component snippet',
    },
    {
      id: 'markdown',
      label: isZh ? 'Markdown 表格' : 'Markdown',
      hint: isZh ? '保留复杂合并表格与代码块，适合喂资料给 AI' : 'GFM Markdown with merged tables',
    },
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
    <section aria-label="Live Distillation Playground" className="space-y-4">
      {/* Open Archival Instrument Header (No Clipped Horizontal Scrollbar — All 10 Presets Visible) */}
      <div className="space-y-3 border-b border-[var(--ag-border-strong)] pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-[2px] bg-[var(--ag-accent)]" />
            <span className="text-xs leading-[1.6] font-bold text-[#141413]">
              {isZh
                ? `内置 10 组真实网页靶标（点击切换，也可切到源码模式粘贴任意 HTML）`
                : `DOM Torture Suite (${PLAYGROUND_PRESETS.length} Samples) — Click to switch or paste custom HTML`}
            </span>
          </div>

          {isEditedFromPreset && (
            <button
              type="button"
              onClick={handleResetPreset}
              className="inline-flex items-center gap-1.5 rounded-[5px] border border-[var(--ag-border-strong)] bg-white px-2.5 py-1 text-xs font-medium text-[#141413] transition hover:bg-[var(--ag-bg-subtle)]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>{isZh ? '恢复预设原样' : 'Reset Custom Edits'}</span>
            </button>
          )}
        </div>

        {/* Clean 5x2 Grid on Desktop so ZERO preset cards are chopped at the right edge */}
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
                className={`rounded-[8px] border px-2.5 py-2 text-left transition ${
                  isSelected
                    ? 'border-[#141413] bg-[#141413] text-white shadow-xs'
                    : 'border-[var(--ag-border)] bg-white text-[#141413] hover:border-[var(--ag-border-strong)]'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className={`ag-tabular shrink-0 font-mono text-[10.5px] font-bold ${
                      isSelected ? 'text-[#FF7A59]' : 'text-[var(--ag-accent)]'
                    }`}
                  >
                    #{String(preset.index).padStart(2, '0')}
                  </span>
                  <span className="truncate text-xs font-semibold">{displayName}</span>
                </div>
                <div
                  className={`mt-0.5 truncate text-[10.5px] leading-[1.4] ${
                    isSelected ? 'text-[#C9C6BA]' : 'text-[var(--ag-text-muted)]'
                  }`}
                >
                  {displayCat}
                </div>
              </button>
            );
          })}
        </div>

        {/* Parameter Bar: Format + Self-Consistent Token Budget Slider + Toggles */}
        <div className="flex flex-col justify-between gap-3 pt-1 xl:flex-row xl:items-center">
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Output Format">
            <span className="text-xs font-semibold text-[var(--ag-text-secondary)]">
              {isZh ? '输出格式' : 'Format'}
            </span>
            <div className="inline-flex flex-wrap gap-1 rounded-[8px] border border-[var(--ag-border)] bg-[var(--ag-bg-subtle)] p-0.5">
              {formatOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  data-format={opt.id}
                  title={opt.hint}
                  onClick={() => setFormat(opt.id)}
                  aria-pressed={format === opt.id}
                  className={`rounded-[5px] px-2.5 py-1.5 text-xs font-semibold transition ${
                    format === opt.id
                      ? 'bg-white text-[#141413] shadow-[0_1px_2px_rgba(20,20,19,0.08)]'
                      : 'text-[var(--ag-text-secondary)] hover:text-[#141413]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3.5">
            {/* Self-Consistent Token Budget Control: When Unlimited, slider sits at 100% muted */}
            <div className="flex flex-wrap items-center gap-2 rounded-[8px] border border-[var(--ag-border)] bg-white px-3 py-1.5">
              <button
                type="button"
                onClick={() => setBudgetEnabled((prev) => !prev)}
                aria-pressed={budgetEnabled}
                className="ag-tabular font-mono text-xs font-semibold text-[#141413]"
              >
                {budgetEnabled
                  ? isZh
                    ? `字数上限: ${budgetTokens.toLocaleString()} tok`
                    : `Budget: ${budgetTokens.toLocaleString()} tok`
                  : isZh
                    ? '字数上限: 不限制'
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
                className={`h-1.5 w-24 cursor-pointer transition sm:w-28 ${
                  budgetEnabled
                    ? 'accent-[var(--ag-accent)] opacity-100'
                    : 'accent-[#8C897E] opacity-40'
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
                    className={`ag-tabular rounded-[5px] px-1.5 py-0.5 font-mono text-[10.5px] transition ${
                      budgetEnabled && budgetTokens === val
                        ? 'bg-[var(--ag-accent)] font-semibold text-white'
                        : 'text-[var(--ag-text-secondary)] hover:bg-[var(--ag-bg-subtle)] hover:text-[#141413]'
                    }`}
                  >
                    {val}
                  </button>
                ))}
                <button
                  type="button"
                  data-budget="unlimited"
                  onClick={() => setBudgetEnabled(false)}
                  className={`rounded-[5px] px-2 py-0.5 font-mono text-[10.5px] transition ${
                    !budgetEnabled
                      ? 'bg-[#141413] font-semibold text-white'
                      : 'text-[var(--ag-text-secondary)] hover:bg-[var(--ag-bg-subtle)] hover:text-[#141413]'
                  }`}
                >
                  {isZh ? '不限制' : 'No Limit'}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-[#141413] select-none">
                <input
                  type="checkbox"
                  checked={compactSvg}
                  onChange={(e) => setCompactSvg(e.target.checked)}
                  className="h-3.5 w-3.5 rounded accent-[#141413]"
                />
                <span>{isZh ? '压缩大图标' : 'Compact SVGs'}</span>
              </label>

              <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-[#141413] select-none">
                <input
                  type="checkbox"
                  checked={includeHoverStyles}
                  onChange={(e) => setIncludeHoverStyles(e.target.checked)}
                  className="h-3.5 w-3.5 rounded accent-[#141413]"
                />
                <span>{isZh ? '保留 :hover' : ':hover CSS'}</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <p className="text-xs leading-[1.6] text-[var(--ag-text-secondary)]">{activeDescription}</p>

      {/* Side-by-Side Split Workbench: Visual Specimen (Left) ↔ 1:1 Rendered Output + Wrapped Code (Right) */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* LEFT PANEL: Live Optical Target Specimen (Defaults to Visual Preview!) */}
        <div className="flex h-[560px] flex-col overflow-hidden rounded-[12px] border border-[var(--ag-border)] bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--ag-border)] bg-[#FAF9F5] px-4 py-2.5">
            <div className="inline-flex items-center gap-1 rounded-[8px] bg-[var(--ag-bg-subtle)] p-0.5">
              <button
                type="button"
                data-left-view="preview"
                aria-label="Original Sandbox Preview"
                onClick={() => setLeftMode('preview')}
                className={`inline-flex items-center gap-1.5 rounded-[5px] px-2.5 py-1 text-xs font-semibold transition ${
                  leftMode === 'preview'
                    ? 'bg-white text-[#141413] shadow-[0_1px_2px_rgba(20,20,19,0.08)]'
                    : 'text-[var(--ag-text-secondary)] hover:text-[#141413]'
                }`}
              >
                <Eye className="h-3.5 w-3.5 text-[var(--ag-accent)]" />
                <span>{isZh ? '原始画面预览' : 'Original Sandbox Preview'}</span>
              </button>
              <button
                type="button"
                data-left-view="code"
                onClick={() => setLeftMode('code')}
                className={`inline-flex items-center gap-1.5 rounded-[5px] px-2.5 py-1 text-xs font-semibold transition ${
                  leftMode === 'code'
                    ? 'bg-white text-[#141413] shadow-[0_1px_2px_rgba(20,20,19,0.08)]'
                    : 'text-[var(--ag-text-secondary)] hover:text-[#141413]'
                }`}
              >
                <Code2 className="h-3.5 w-3.5" />
                <span>{isZh ? '原始杂乱 HTML' : 'Dirty HTML + CSS'}</span>
              </button>
            </div>

            <span className="ag-tabular font-mono text-[11px] text-[var(--ag-text-muted)]">
              {result.metrics.rawChars.toLocaleString()} chars · ~
              {result.metrics.rawTokens.toLocaleString()} tok
            </span>
          </div>

          <div className="relative flex-1 overflow-hidden">
            {leftMode === 'preview' ? (
              <div className="relative h-full w-full">
                {/* Optical Reticle Corner Framing Over Live Target */}
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
                    ? '在此粘贴任何网页的 HTML + <style> 源码，右侧会瞬间自动提纯…'
                    : 'Paste any dirty HTML + <style> snippet here...'
                }
                className="h-full w-full resize-none bg-[#181816] p-4 font-mono text-xs leading-[1.65] text-[#D8D6CE] focus:outline-none"
              />
            )}
          </div>

          <div className="flex items-center justify-between border-t border-[var(--ag-border)] bg-[#FAF9F5] px-4 py-2 text-[11px] text-[var(--ag-text-muted)]">
            <span className="truncate font-mono">{activePreset.sourceUrl}</span>
            <span className="shrink-0">{isZh ? '光学取景目标 · 本地运算' : 'Optical Target · Local AST'}</span>
          </div>
        </div>

        {/* RIGHT PANEL: Simultaneous 1:1 Rendered Preview + Clean Wrapped Distilled Code */}
        <div className="flex h-[560px] flex-col overflow-hidden rounded-[12px] border border-[#141413]/25 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--ag-border)] bg-[#FAF9F5] px-4 py-2.5">
            <div className="inline-flex items-center gap-1 rounded-[8px] bg-[var(--ag-bg-subtle)] p-0.5">
              <button
                type="button"
                data-right-view="code"
                onClick={() => setRightMode('code')}
                className={`inline-flex items-center gap-1.5 rounded-[5px] px-2.5 py-1 text-xs font-semibold transition ${
                  rightMode === 'code'
                    ? 'bg-white text-[#141413] shadow-[0_1px_2px_rgba(20,20,19,0.08)]'
                    : 'text-[var(--ag-text-secondary)] hover:text-[#141413]'
                }`}
              >
                <span className="h-2 w-2 rounded-[2px] bg-[var(--ag-accent)]" />
                <span>{isZh ? `提纯对照 (${format})` : `Distilled Code (${format})`}</span>
              </button>
              <button
                type="button"
                data-right-view="preview"
                aria-label="Tailwind Sandbox Preview"
                onClick={() => setRightMode('preview')}
                className={`inline-flex items-center gap-1.5 rounded-[5px] px-2.5 py-1 text-xs font-semibold transition ${
                  rightMode === 'preview'
                    ? 'bg-white text-[#141413] shadow-[0_1px_2px_rgba(20,20,19,0.08)]'
                    : 'text-[var(--ag-text-secondary)] hover:text-[#141413]'
                }`}
              >
                <Eye className="h-3.5 w-3.5" />
                <span>{isZh ? '还原效果全屏' : 'Tailwind Sandbox Preview'}</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCopyPureOutput}
                title={isZh ? '仅复制纯净输出内容' : 'Copy raw distilled output'}
                className="inline-flex items-center gap-1 rounded-[8px] border border-[var(--ag-border)] bg-white px-2.5 py-1.5 text-xs font-medium text-[#141413] transition hover:bg-[var(--ag-bg-subtle)]"
              >
                {copiedRawOut ? (
                  <Check className="h-3.5 w-3.5 text-[var(--ag-success)]" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-[var(--ag-text-secondary)]" />
                )}
              </button>

              <button
                type="button"
                data-action="copy-for-agent"
                onClick={handleCopyForAgents}
                className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#141413] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#292926]"
              >
                {copiedAgent ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-[#4ADE80]" />
                    <span>{isZh ? '已复制，去反重力 / Codex 粘贴' : 'Copied for Agent'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>
                      {isZh ? '复制给 反重力 / Codex' : 'Copy for Antigravity / Codex'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Single Tailwind Sandbox iframe: Split top preview in 'code' mode, full height in 'preview' mode */}
          <div className="flex flex-1 flex-col overflow-hidden">
            <div
              className={`relative overflow-hidden transition-all ${
                rightMode === 'preview'
                  ? 'flex-1'
                  : 'h-[195px] shrink-0 border-b border-white/15'
              }`}
            >
              <span className="pointer-events-none absolute top-2 right-2.5 z-10 rounded-[4px] bg-[#141413]/85 px-2 py-0.5 font-mono text-[10px] text-[#E5E4DF]">
                {isZh ? 'Tailwind 1:1 实时渲染' : 'Tailwind v4 Live Render'}
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
                className="flex-1 overflow-y-auto bg-[var(--ag-bg-stage)] p-4 font-mono text-[11.5px] leading-[1.62] whitespace-pre-wrap break-words text-[#EEEDE8]"
              >
                <code>{result.output}</code>
              </pre>
            )}
          </div>

          {/* Bottom Design Tokens & Telemetry Strip */}
          <div className="space-y-2 border-t border-[var(--ag-border)] bg-[#FAF9F5] px-4 py-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-semibold text-[#141413]">
                  {isZh ? '提取色板：' : 'Tokens:'}
                </span>
                {paletteColors.length > 0 ? (
                  paletteColors.slice(0, 6).map((color) => (
                    <span
                      key={color}
                      className="inline-flex items-center gap-1 rounded-[5px] border border-[var(--ag-border)] bg-white px-1.5 py-0.5 font-mono text-[10px] text-[#141413]"
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-[2px] border border-black/15"
                        style={{ backgroundColor: color }}
                      />
                      <span>{color}</span>
                    </span>
                  ))
                ) : (
                  <span className="text-[var(--ag-text-muted)]">
                    {isZh ? '无显式色值' : 'No explicit color tokens'}
                  </span>
                )}
              </div>

              {result.designTokens.fonts.length > 0 && (
                <span className="font-mono text-[10.5px] text-[var(--ag-text-muted)]">
                  {result.designTokens.fonts[0]}
                </span>
              )}
            </div>

            <div className="ag-tabular flex flex-wrap items-center justify-between gap-2 border-t border-[var(--ag-border)]/70 pt-1.5 font-mono text-[11px] text-[var(--ag-text-secondary)]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-[var(--ag-accent)]">
                  {result.metrics.compressionRatio >= 0
                    ? isZh
                      ? `立省 ${result.metrics.compressionRatio}%`
                      : `-${result.metrics.compressionRatio}% tokens`
                    : `${Math.abs(result.metrics.compressionRatio)}%`}
                </span>
                <span>
                  {result.metrics.rawTokens.toLocaleString()} →{' '}
                  <strong className="text-[#141413]">
                    {result.metrics.outputTokens.toLocaleString()}
                  </strong>{' '}
                  tok
                </span>
                <span>·</span>
                <span>{result.metrics.durationMs} ms</span>
                <span>·</span>
                <span>
                  {isZh
                    ? `清理 ${result.metrics.nodesPruned} 节点`
                    : `${result.metrics.nodesPruned} nodes pruned`}
                </span>
              </div>

              {result.warnings.length > 0 && (
                <span
                  title={result.warnings.join(' ')}
                  className="inline-flex items-center gap-1 font-medium text-[var(--ag-accent)]"
                >
                  <AlertTriangle className="h-3 w-3" />
                  <span>{isZh ? '已智能折叠重复项' : 'Budget Folded'}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
