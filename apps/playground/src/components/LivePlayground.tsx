import { grab, type OutputFormat } from '@anygrab/core';
import {
  AlertTriangle,
  Check,
  Code2,
  Copy,
  Eye,
  Gauge,
  Palette,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { PLAYGROUND_PRESETS, type PlaygroundPreset } from '../data/types';
import {
  buildAgentCopyPayload,
  buildRawSandboxDoc,
  buildTailwindSandboxDoc,
  extractFallbackColors,
} from '../utils/sandbox';

interface LivePlaygroundProps {
  selectedPresetId: string;
  onSelectPreset: (presetId: string) => void;
}

const FORMAT_OPTIONS: Array<{ id: OutputFormat; label: string; badge: string }> = [
  { id: 'prompt', label: 'AI Prompt', badge: 'Agent Pack' },
  { id: 'tailwind-html', label: 'Tailwind HTML', badge: 'v4' },
  { id: 'jsx', label: 'React JSX', badge: 'TSX' },
  { id: 'markdown', label: 'Markdown', badge: 'GFM' },
];

const QUICK_BUDGETS = [400, 600, 1200, 2400];

export function LivePlayground({ selectedPresetId, onSelectPreset }: LivePlaygroundProps) {
  const initialPreset =
    PLAYGROUND_PRESETS.find((p) => p.id === selectedPresetId) ?? PLAYGROUND_PRESETS[0];

  const [rawHtml, setRawHtml] = useState<string>(initialPreset.html);
  const [lastSyncedPresetId, setLastSyncedPresetId] = useState<string>(initialPreset.id);
  const [format, setFormat] = useState<OutputFormat>('tailwind-html');
  const [budgetEnabled, setBudgetEnabled] = useState<boolean>(false);
  const [budgetTokens, setBudgetTokens] = useState<number>(1200);
  const [compactSvg, setCompactSvg] = useState<boolean>(true);
  const [includeHoverStyles, setIncludeHoverStyles] = useState<boolean>(false);

  const [leftMode, setLeftMode] = useState<'code' | 'preview'>('code');
  const [rightMode, setRightMode] = useState<'code' | 'preview'>('code');
  const [copiedAgent, setCopiedAgent] = useState<boolean>(false);
  const [copiedRawOut, setCopiedRawOut] = useState<boolean>(false);

  const activePreset: PlaygroundPreset =
    PLAYGROUND_PRESETS.find((p) => p.id === selectedPresetId) ?? PLAYGROUND_PRESETS[0];

  // Sync editor HTML when parent switches preset (e.g. from Leaderboard "Inspect in Playground")
  if (lastSyncedPresetId !== activePreset.id) {
    setLastSyncedPresetId(activePreset.id);
    setRawHtml(activePreset.html);
  }

  const isEditedFromPreset = rawHtml !== activePreset.html;

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
        maxTokens: budgetEnabled ? budgetTokens : undefined,
        compactSvg,
        includeHoverStyles,
        preserveTables: true,
        includeDesignTokens: true,
        sourceUrl: activePreset.sourceUrl,
      }),
    [rawHtml, format, budgetEnabled, budgetTokens, compactSvg, includeHoverStyles, activePreset.sourceUrl],
  );

  const rawSandboxSrcDoc = useMemo(() => buildRawSandboxDoc(rawHtml), [rawHtml]);
  const tailwindSandboxSrcDoc = useMemo(
    () => buildTailwindSandboxDoc(result.tailwindHtml),
    [result.tailwindHtml],
  );

  const paletteColors = useMemo(
    () => extractFallbackColors(rawHtml, result.designTokens.colors),
    [rawHtml, result.designTokens.colors],
  );

  const handleCopyForAgents = async () => {
    const payload = buildAgentCopyPayload(result.output, format, activePreset.sourceUrl);
    try {
      await navigator.clipboard?.writeText(payload);
    } catch {
      // Ignore in headless test env
    }
    setCopiedAgent(true);
    setTimeout(() => setCopiedAgent(false), 1800);
  };

  const handleCopyPureOutput = async () => {
    try {
      await navigator.clipboard?.writeText(result.output);
    } catch {
      // Ignore
    }
    setCopiedRawOut(true);
    setTimeout(() => setCopiedRawOut(false), 1600);
  };

  return (
    <section aria-label="Live Distillation Playground" className="space-y-4">
      {/* 1. Preset Sample Selector Bar */}
      <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/55 p-3.5 shadow-sm">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-indigo-400" />
            <span className="text-xs font-semibold tracking-wide text-zinc-300 uppercase">
              DOM Torture Suite Presets ({PLAYGROUND_PRESETS.length})
            </span>
            <span className="hidden text-xs text-zinc-500 sm:inline">
              — Click any dirty webpage component or paste custom HTML + &lt;style&gt; below
            </span>
          </div>

          {isEditedFromPreset && (
            <button
              type="button"
              onClick={handleResetPreset}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-300 transition hover:bg-amber-500/20"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset Custom Edits</span>
            </button>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1.5">
          {PLAYGROUND_PRESETS.map((preset) => {
            const isSelected = preset.id === activePreset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handlePresetClick(preset)}
                className={`group shrink-0 rounded-xl border px-3 py-2 text-left transition ${
                  isSelected
                    ? 'border-indigo-500/70 bg-indigo-950/60 text-white shadow-sm shadow-indigo-500/15'
                    : 'border-white/[0.06] bg-zinc-950/70 text-zinc-400 hover:border-white/[0.15] hover:text-zinc-200'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px] font-bold text-indigo-400">
                    #{preset.index}
                  </span>
                  <span className="text-xs font-semibold">{preset.name}</span>
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-[10px] text-zinc-500">
                  <span>{preset.category}</span>
                  <span>·</span>
                  <span className="text-zinc-400">{preset.tags[0]}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Preset Context Strip */}
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.05] pt-2.5 text-xs text-zinc-400">
          <p className="truncate">{activePreset.description}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {activePreset.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-md border border-white/[0.07] bg-zinc-950 px-2 py-0.5 font-mono text-[10px] text-zinc-300"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Top Distillation Control Bar */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-white/[0.08] bg-zinc-900/75 p-3.5 xl:flex-row xl:items-center">
        {/* Format Switcher */}
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Output Format">
          <span className="mr-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400">
            <SlidersHorizontal className="h-3.5 w-3.5 text-indigo-400" />
            Format:
          </span>
          {FORMAT_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setFormat(opt.id)}
              aria-pressed={format === opt.id}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                format === opt.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'border border-white/[0.06] bg-zinc-950/80 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span>{opt.label}</span>
              <span
                className={`rounded px-1 py-0.2 font-mono text-[10px] ${
                  format === opt.id ? 'bg-indigo-500/50 text-indigo-100' : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                {opt.badge}
              </span>
            </button>
          ))}
        </div>

        {/* Token Budget Slider + Toggles */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Token Budget Control */}
          <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-white/[0.07] bg-zinc-950/80 px-3 py-1.5">
            <button
              type="button"
              onClick={() => setBudgetEnabled((prev) => !prev)}
              aria-pressed={budgetEnabled}
              className={`rounded-md px-2 py-0.5 text-xs font-semibold transition ${
                budgetEnabled
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                  : 'bg-zinc-800 text-zinc-300 border border-white/[0.06]'
              }`}
            >
              {budgetEnabled ? `Budget: ${budgetTokens.toLocaleString()} tok` : 'Budget: No Limit'}
            </button>

            <input
              type="range"
              aria-label="Token Budget Slider"
              min={200}
              max={4000}
              step={50}
              value={budgetTokens}
              onChange={(e) => {
                setBudgetEnabled(true);
                setBudgetTokens(Number(e.target.value));
              }}
              className="h-1.5 w-28 cursor-pointer accent-indigo-500 sm:w-36"
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
                  className={`rounded px-1.5 py-0.5 font-mono text-[10px] transition ${
                    budgetEnabled && budgetTokens === val
                      ? 'bg-indigo-600 text-white'
                      : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                  }`}
                >
                  {val}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setBudgetEnabled(false)}
                className={`rounded px-1.5 py-0.5 font-mono text-[10px] transition ${
                  !budgetEnabled
                    ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/30'
                    : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                }`}
              >
                No Limit
              </button>
            </div>
          </div>

          {/* Compact SVGs & Hover Switch */}
          <div className="flex items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-zinc-300 select-none">
              <input
                type="checkbox"
                checked={compactSvg}
                onChange={(e) => setCompactSvg(e.target.checked)}
                className="h-3.5 w-3.5 rounded accent-indigo-500"
              />
              <span>Compact SVGs</span>
            </label>

            <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-zinc-300 select-none">
              <input
                type="checkbox"
                checked={includeHoverStyles}
                onChange={(e) => setIncludeHoverStyles(e.target.checked)}
                className="h-3.5 w-3.5 rounded accent-indigo-500"
              />
              <span>:hover CSS</span>
            </label>
          </div>
        </div>
      </div>

      {/* 3. Side-by-Side Split Workbench */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* LEFT PANEL: Raw Dirty HTML + Live Raw Sandbox */}
        <div className="flex h-[580px] flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-950 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] bg-zinc-900/90 px-3.5 py-2.5">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setLeftMode('code')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  leftMode === 'code'
                    ? 'bg-zinc-800 text-white shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Code2 className="h-3.5 w-3.5 text-rose-400" />
                <span>Dirty HTML + CSS</span>
              </button>
              <button
                type="button"
                onClick={() => setLeftMode('preview')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  leftMode === 'preview'
                    ? 'bg-zinc-800 text-white shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Eye className="h-3.5 w-3.5 text-sky-400" />
                <span>Original Sandbox Preview</span>
              </button>
            </div>

            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span className="rounded-md border border-rose-500/25 bg-rose-500/10 px-2 py-0.5 text-rose-300">
                {result.metrics.rawChars.toLocaleString()} chars · ~
                {result.metrics.rawTokens.toLocaleString()} tokens
              </span>
            </div>
          </div>

          <div className="relative flex-1 overflow-hidden">
            {leftMode === 'code' ? (
              <textarea
                aria-label="Raw Dirty HTML Editor"
                spellCheck={false}
                value={rawHtml}
                onChange={(e) => setRawHtml(e.target.value)}
                placeholder="Paste any dirty HTML + <style> snippet here..."
                className="h-full w-full resize-none bg-[#070709] p-4 font-mono text-xs leading-relaxed text-zinc-300 focus:outline-none"
              />
            ) : (
              <iframe
                title="Raw HTML Sandbox Preview"
                sandbox="allow-same-origin"
                srcDoc={rawSandboxSrcDoc}
                className="h-full w-full border-0 bg-[#090d16]"
              />
            )}
          </div>

          <div className="flex items-center justify-between border-t border-white/[0.06] bg-zinc-900/60 px-3.5 py-2 text-[11px] text-zinc-400">
            <span>Source URL hint: {activePreset.sourceUrl}</span>
            <span>Editable · Zero network requests</span>
          </div>
        </div>

        {/* RIGHT PANEL: Distilled Output + Live Tailwind Sandbox + Design Tokens */}
        <div className="flex h-[580px] flex-col overflow-hidden rounded-2xl border border-indigo-500/30 bg-zinc-950 shadow-xl shadow-indigo-950/15">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] bg-zinc-900/90 px-3.5 py-2.5">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setRightMode('code')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  rightMode === 'code'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Distilled Code ({format})</span>
              </button>
              <button
                type="button"
                onClick={() => setRightMode('preview')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                  rightMode === 'preview'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Tailwind Sandbox Preview</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCopyPureOutput}
                title="Copy raw distilled code"
                className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] bg-zinc-800/80 px-2 py-1 text-[11px] font-medium text-zinc-300 transition hover:bg-zinc-700"
              >
                {copiedRawOut ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>

              <button
                type="button"
                onClick={handleCopyForAgents}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:from-indigo-500 hover:to-violet-500"
              >
                {copiedAgent ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-300" />
                    <span>Copied for Agent!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy for Codex / Antigravity / Cursor</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Code or Live Tailwind Sandbox */}
          <div className="relative flex-1 overflow-hidden">
            {rightMode === 'code' ? (
              <pre
                aria-label="Distilled Output Code"
                className="h-full w-full overflow-auto bg-[#070709] p-4 font-mono text-xs leading-relaxed text-emerald-100/95"
              >
                <code>{result.output}</code>
              </pre>
            ) : (
              <iframe
                title="Distilled Tailwind Sandbox Preview"
                sandbox="allow-scripts"
                srcDoc={tailwindSandboxSrcDoc}
                className="h-full w-full border-0 bg-[#090d16]"
              />
            )}
          </div>

          {/* Bottom Design Tokens Swatches & Telemetry Bar */}
          <div className="space-y-2 border-t border-white/[0.08] bg-zinc-900/90 px-3.5 py-2.5">
            {/* Design Tokens Swatch Strip */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 font-semibold text-zinc-400">
                  <Palette className="h-3.5 w-3.5 text-violet-400" />
                  <span>Design Tokens:</span>
                </span>
                {paletteColors.length > 0 ? (
                  paletteColors.slice(0, 7).map((color) => (
                    <span
                      key={color}
                      title={`Design Token Color: ${color}`}
                      className="inline-flex items-center gap-1 rounded border border-white/[0.08] bg-zinc-950 px-1.5 py-0.5 font-mono text-[10px] text-zinc-300"
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-xs border border-white/20"
                        style={{ backgroundColor: color }}
                      />
                      <span>{color}</span>
                    </span>
                  ))
                ) : (
                  <span className="text-zinc-500">No explicit color tokens</span>
                )}
              </div>

              {result.designTokens.fonts.length > 0 && (
                <span className="rounded bg-zinc-950 px-2 py-0.5 font-mono text-[10px] text-zinc-400">
                  Font: {result.designTokens.fonts[0]}
                </span>
              )}
            </div>

            {/* Compression Telemetry Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.05] pt-2 font-mono text-[11px]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 font-bold text-emerald-300">
                  <Gauge className="h-3 w-3" />
                  {result.metrics.compressionRatio >= 0
                    ? `-${result.metrics.compressionRatio}% tokens`
                    : `${Math.abs(result.metrics.compressionRatio)}% tokens`}
                </span>
                <span className="text-zinc-300">
                  {result.metrics.rawTokens.toLocaleString()} →{' '}
                  <strong className="text-white">
                    {result.metrics.outputTokens.toLocaleString()}
                  </strong>{' '}
                  tok
                </span>
                <span className="text-zinc-600">·</span>
                <span className="text-indigo-300">{result.metrics.durationMs} ms</span>
                <span className="text-zinc-600">·</span>
                <span className="text-zinc-400">
                  {result.metrics.stylesStripped} styles stripped
                </span>
                <span className="text-zinc-600">·</span>
                <span className="text-zinc-400">
                  {result.metrics.nodesPruned} nodes pruned
                </span>
              </div>

              {result.warnings.length > 0 && (
                <span
                  title={result.warnings.join(' ')}
                  className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-2 py-0.5 text-[10px] text-amber-300"
                >
                  <AlertTriangle className="h-3 w-3" />
                  <span>Budget Folded</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
