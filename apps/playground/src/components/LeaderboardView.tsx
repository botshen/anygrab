import { ArrowUpRight, Award, Cpu, Layers, ShieldCheck, Zap } from 'lucide-react';
import { useState } from 'react';
import { BENCHMARK_REPORT, type MethodAggregateData } from '../data/types';

interface LeaderboardViewProps {
  onOpenPresetInPlayground: (presetId: string) => void;
}

export function LeaderboardView({ onOpenPresetInPlayground }: LeaderboardViewProps) {
  const [chartMetric, setChartMetric] = useState<'tokens' | 'fidelity'>('fidelity');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const report = BENCHMARK_REPORT;
  const rawSummary = report.methods.find((m) => m.methodId === 'raw-html')!;
  const naiveSummary = report.methods.find((m) => m.methodId === 'naive-style-picker')!;
  const turndownSummary = report.methods.find((m) => m.methodId === 'turndown-gfm')!;
  const anygrabDefault = report.methods.find((m) => m.methodId === 'anygrab-default')!;
  const anygrabBudget = report.methods.find((m) => m.methodId === 'anygrab-budget-600')!;

  const maxAvgTokens = Math.max(...report.methods.map((m) => m.avgTokens), 1);

  const categories = ['ALL', ...Array.from(new Set(report.fixtures.map((f) => f.category)))];
  const filteredFixtures =
    categoryFilter === 'ALL'
      ? report.fixtures
      : report.fixtures.filter((f) => f.category === categoryFilter);

  const getBarStyle = (method: MethodAggregateData) => {
    if (method.methodId.startsWith('anygrab')) {
      return 'bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-400';
    }
    if (method.methodId === 'turndown-gfm') {
      return 'bg-amber-500/80';
    }
    if (method.methodId === 'naive-style-picker') {
      return 'bg-rose-500/80';
    }
    return 'bg-zinc-600';
  };

  return (
    <section aria-label="AnyGrab-Bench Leaderboard" className="space-y-6">
      {/* Executive Benchmark KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/70 p-4">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>DOM Torture Suite Scale</span>
            <Layers className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-white">
            {report.fixtureCount} Real Archetypes
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            {rawSummary.totalTokens.toLocaleString()} raw tokens vs{' '}
            {naiveSummary.totalTokens.toLocaleString()} naive style tokens
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-950/20 p-4">
          <div className="flex items-center justify-between text-xs text-emerald-300">
            <span>AnyGrab Token Compression</span>
            <Zap className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-emerald-300">
            {anygrabBudget.compressionPct >= 0
              ? `-${anygrabBudget.compressionPct.toFixed(1)}%`
              : `${anygrabBudget.compressionPct.toFixed(1)}%`}
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            Budget mode ({anygrabBudget.avgTokens.toLocaleString()} avg tok) · Default{' '}
            {anygrabDefault.avgTokens.toLocaleString()} avg tok
          </p>
        </div>

        <div className="rounded-2xl border border-indigo-500/25 bg-indigo-950/20 p-4">
          <div className="flex items-center justify-between text-xs text-indigo-300">
            <span>UI &amp; Table Fidelity Score</span>
            <Award className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-white">
            {anygrabDefault.avgFidelity.toFixed(1)}{' '}
            <span className="text-sm font-normal text-zinc-400">/ 100</span>
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            vs Turndown GFM {turndownSummary.avgFidelity.toFixed(1)}/100 (0% style recall)
          </p>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/70 p-4">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Mean Distillation Latency</span>
            <Cpu className="h-4 w-4 text-violet-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-white">
            {anygrabDefault.avgDurationMs.toFixed(2)} ms
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            Pure local TypeScript AST · $0 API cost
          </p>
        </div>
      </div>

      {/* Visual Horizontal Bar Comparison Chart */}
      <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/65 p-5">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white">
              Multi-Baseline Objective Comparison (AnyGrab-Bench v{report.benchmarkVersion})
            </h2>
            <p className="text-xs text-zinc-400">
              Fidelity Score (0–100) weights Key Text (30%), Layout/Style Signals (30%), Merged Table
              Integrity (20%), and Interactive Controls (20%).
            </p>
          </div>

          <div className="inline-flex rounded-xl border border-white/[0.08] bg-zinc-950 p-1">
            <button
              type="button"
              onClick={() => setChartMetric('fidelity')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                chartMetric === 'fidelity'
                  ? 'bg-indigo-600 text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              UI Fidelity Score (Higher = Better)
            </button>
            <button
              type="button"
              onClick={() => setChartMetric('tokens')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                chartMetric === 'tokens'
                  ? 'bg-indigo-600 text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Avg Token Footprint (Lower = Better)
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {report.methods.map((m) => {
            const widthPct =
              chartMetric === 'fidelity'
                ? Math.max(4, m.avgFidelity)
                : Math.max(3, (m.avgTokens / maxAvgTokens) * 100);

            return (
              <div
                key={m.methodId}
                className="rounded-xl border border-white/[0.05] bg-zinc-950/70 p-3.5"
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{m.methodName}</span>
                    {m.methodId.startsWith('anygrab') && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-semibold text-indigo-300">
                        <ShieldCheck className="h-3 w-3" /> Recommended
                      </span>
                    )}
                    <span className="hidden text-xs text-zinc-500 md:inline">
                      — {m.description}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 font-mono text-xs">
                    <span className="text-zinc-300">
                      Avg: <strong>{m.avgTokens.toLocaleString()}</strong> tok
                    </span>
                    <span className="text-emerald-300">
                      Fidelity: <strong>{m.avgFidelity.toFixed(1)}</strong>/100
                    </span>
                    <span className="text-zinc-400">{m.avgDurationMs.toFixed(2)} ms</span>
                  </div>
                </div>

                <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-900">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${getBarStyle(m)}`}
                    style={{ width: `${Math.min(100, widthPct)}%` }}
                  />
                </div>

                <div className="mt-2 flex flex-wrap gap-4 font-mono text-[11px] text-zinc-400">
                  <span>Text Recall: {m.avgTextScore.toFixed(1)}%</span>
                  <span>Style/Layout: {m.avgStyleScore.toFixed(1)}%</span>
                  <span>Tables/Landmarks: {m.avgTableScore.toFixed(1)}%</span>
                  <span>Interactive/ARIA: {m.avgControlScore.toFixed(1)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 10-Fixture Granular Breakdown Matrix */}
      <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-900/65">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] p-4">
          <div>
            <h3 className="text-sm font-bold text-white">
              Per-Fixture Breakdown Across All 10 DOM Torture Tests
            </h3>
            <p className="text-xs text-zinc-400">
              Click any fixture&apos;s &ldquo;Try Live&rdquo; button to inspect raw vs distilled
              sandbox rendering side by side.
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                  categoryFilter === cat
                    ? 'bg-indigo-600 text-white'
                    : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.08] bg-zinc-950/80 font-mono text-[11px] text-zinc-400 uppercase">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Fixture &amp; Torture Tags</th>
                <th className="px-3 py-3 text-right">Raw HTML</th>
                <th className="px-3 py-3 text-right">Naive Picker</th>
                <th className="px-3 py-3 text-right">Turndown GFM</th>
                <th className="bg-indigo-950/30 px-3 py-3 text-right text-indigo-300">
                  AnyGrab (Default)
                </th>
                <th className="bg-emerald-950/20 px-3 py-3 text-right text-emerald-300">
                  AnyGrab (B=600)
                </th>
                <th className="px-4 py-3 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {filteredFixtures.map((row) => {
                const raw = row.results['raw-html'];
                const naive = row.results['naive-style-picker'];
                const td = row.results['turndown-gfm'];
                const ag = row.results['anygrab-default'];
                const ag600 = row.results['anygrab-budget-600'];

                return (
                  <tr
                    key={row.fixtureId}
                    className="transition hover:bg-zinc-800/35"
                  >
                    <td className="px-4 py-3 font-mono text-zinc-500">{row.index}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-zinc-100">{row.name}</div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-300">
                          {row.category}
                        </span>
                        {row.tags.slice(0, 2).map((t) => (
                          <span
                            key={t}
                            className="rounded border border-white/[0.06] bg-zinc-950 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-zinc-300">
                      <div>{raw.tokens.toLocaleString()} tok</div>
                      <div className="text-[10px] text-zinc-500">
                        Fid {raw.fidelity.overall}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-rose-300">
                      <div>{naive.tokens.toLocaleString()} tok</div>
                      <div className="text-[10px] text-zinc-500">
                        Fid {naive.fidelity.overall}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-amber-300">
                      <div>{td.tokens.toLocaleString()} tok</div>
                      <div className="text-[10px] text-zinc-500">
                        Fid {td.fidelity.overall} · 0% CSS
                      </div>
                    </td>
                    <td className="bg-indigo-950/20 px-3 py-3 text-right font-mono">
                      <div className="font-bold text-indigo-200">
                        {ag.tokens.toLocaleString()} tok
                      </div>
                      <div className="text-[10px] text-indigo-300/90">
                        Fid {ag.fidelity.overall} · {ag.durationMs}ms
                      </div>
                    </td>
                    <td className="bg-emerald-950/15 px-3 py-3 text-right font-mono">
                      <div className="font-bold text-emerald-300">
                        {ag600.tokens.toLocaleString()} tok
                      </div>
                      <div className="text-[10px] text-emerald-400/90">
                        Fid {ag600.fidelity.overall} (-{ag600.compressionPct}%)
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => onOpenPresetInPlayground(row.fixtureId)}
                        className="inline-flex items-center gap-1 rounded-lg border border-indigo-500/35 bg-indigo-500/10 px-2.5 py-1 text-[11px] font-semibold text-indigo-300 transition hover:bg-indigo-600 hover:text-white"
                      >
                        <span>Try Live</span>
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
