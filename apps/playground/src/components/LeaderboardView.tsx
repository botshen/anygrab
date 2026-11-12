import { ArrowUpRight, Award, Cpu, Info, Layers, ShieldCheck, Zap } from 'lucide-react';
import { useState } from 'react';
import { BENCHMARK_REPORT, type MethodAggregateData } from '../data/types';
import { METHOD_ZH_MAP, PRESET_ZH_MAP, type SiteLocale } from '../i18n';

interface LeaderboardViewProps {
  locale: SiteLocale;
  onOpenPresetInPlayground: (presetId: string) => void;
}

export function LeaderboardView({
  locale,
  onOpenPresetInPlayground,
}: LeaderboardViewProps) {
  const isZh = locale === 'zh-CN';
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
  const categoryLabelZhMap: Record<string, string> = {};
  for (const f of report.fixtures) {
    const zh = PRESET_ZH_MAP[f.fixtureId];
    if (zh && !categoryLabelZhMap[f.category]) {
      categoryLabelZhMap[f.category] = zh.category;
    }
  }
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
      {/* Plain-Language Explainer Callout */}
      <div className="rounded-2xl border border-indigo-500/25 bg-indigo-950/25 p-5">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-indigo-400" />
          <div className="space-y-1.5 text-xs leading-relaxed text-zinc-200 sm:text-sm">
            <div className="font-bold text-white">
              {isZh
                ? '一分钟大白话读懂这份跑分榜：为什么 AnyGrab 既省钱又还原？'
                : 'Plain-English Guide to AnyGrab-Bench: Why Both Compression AND Fidelity Matter'}
            </div>
            <p className="text-zinc-300">
              {isZh
                ? `普通浏览器样式插件会把 10 个测试页面膨胀到 11.9 万 Token（膨胀 +280.8%，直接塞爆 AI 对话框）；纯文本 Markdown 工具虽然字数少，但颜色、圆角和栅格排版丢失率高达 100%（样式还原 0 分），跨行列财务大表还会错位。AnyGrab 在本地 4.2 毫秒内相比普通样式插件砍掉了 89.3% 垃圾代码（预算模式下相比原始网页直降 85.0%），却拿到了 99.6 / 100 接近满分的界面与表格还原度！`
                : `Naive computed-style extensions bloat 10 pages to 119,176 tokens (+280.8% overhead), choking LLM context windows. Plain Markdown tools save tokens but lose 100% of visual styles (0% style recall) and break merged tables. AnyGrab cuts 89.3% of style bloat vs naive pickers (-85.0% in budget mode) in ~4ms while achieving a 99.6 / 100 UI & table fidelity score!`}
            </p>
          </div>
        </div>
      </div>

      {/* Executive Benchmark KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/70 p-4">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>{isZh ? '真实高压测试样本' : 'DOM Torture Suite Scale'}</span>
            <Layers className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-white">
            {isZh ? `${report.fixtureCount} 大真实场景` : `${report.fixtureCount} Real Archetypes`}
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            {rawSummary.totalTokens.toLocaleString()} raw vs{' '}
            {naiveSummary.totalTokens.toLocaleString()} naive tok
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-950/20 p-4">
          <div className="flex items-center justify-between text-xs text-emerald-300">
            <span>{isZh ? 'Token 体积直降（省流模式）' : 'AnyGrab Token Compression'}</span>
            <Zap className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-emerald-300">
            -{anygrabBudget.compressionPct.toFixed(1)}%
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            {isZh
              ? `省流均 ${anygrabBudget.avgTokens.toLocaleString()} tok · 默认相比样式插件省 89.3%`
              : `Budget (${anygrabBudget.avgTokens.toLocaleString()} avg tok) · -89.3% vs Naive Picker`}
          </p>
        </div>

        <div className="rounded-2xl border border-indigo-500/25 bg-indigo-950/20 p-4">
          <div className="flex items-center justify-between text-xs text-indigo-300">
            <span>{isZh ? '界面与表格还原总分' : 'UI & Table Fidelity Score'}</span>
            <Award className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-white">
            {anygrabDefault.avgFidelity.toFixed(1)}{' '}
            <span className="text-sm font-normal text-zinc-400">/ 100</span>
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            {isZh
              ? `碾压纯文本方案的 ${turndownSummary.avgFidelity.toFixed(1)} 分（0% 样式分）`
              : `vs Turndown GFM ${turndownSummary.avgFidelity.toFixed(1)}/100 (0% style recall)`}
          </p>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/70 p-4">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>{isZh ? '平均本地提纯耗时' : 'Mean Distillation Latency'}</span>
            <Cpu className="h-4 w-4 text-violet-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold text-white">
            {anygrabDefault.avgDurationMs.toFixed(2)} ms
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            {isZh ? '纯本地瞬间完成 · 0 大模型费用' : 'Pure local TypeScript AST · $0 API cost'}
          </p>
        </div>
      </div>

      {/* Visual Horizontal Bar Comparison Chart */}
      <div className="rounded-2xl border border-white/[0.08] bg-zinc-900/65 p-5">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white">
              {isZh
                ? `四大方案同台客观对比（AnyGrab-Bench v${report.benchmarkVersion}）`
                : `Multi-Baseline Objective Comparison (AnyGrab-Bench v${report.benchmarkVersion})`}
            </h2>
            <p className="text-xs text-zinc-400">
              {isZh
                ? '还原度总分（0–100）客观检验：核心文字保留 (30%) + 样式布局还原 (30%) + 复杂表格完整度 (20%) + 按钮输入框保留 (20%)'
                : 'Fidelity Score (0–100) weights Key Text (30%), Layout/Style Signals (30%), Merged Table Integrity (20%), and Interactive Controls (20%).'}
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
              {isZh ? '看界面还原度（越高越好）' : 'UI Fidelity Score (Higher = Better)'}
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
              {isZh ? '看消耗字数 Token（越短越省）' : 'Avg Token Footprint (Lower = Better)'}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {report.methods.map((m) => {
            const widthPct =
              chartMetric === 'fidelity'
                ? Math.max(4, m.avgFidelity)
                : Math.max(3, (m.avgTokens / maxAvgTokens) * 100);
            const zhMeta = METHOD_ZH_MAP[m.methodId];
            const displayName = isZh && zhMeta ? zhMeta.name : m.methodName;
            const displayDesc = isZh && zhMeta ? zhMeta.desc : m.description;

            return (
              <div
                key={m.methodId}
                className="rounded-xl border border-white/[0.05] bg-zinc-950/70 p-3.5"
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{displayName}</span>
                    {m.methodId.startsWith('anygrab') && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-semibold text-indigo-300">
                        <ShieldCheck className="h-3 w-3" /> {isZh ? '推荐' : 'Recommended'}
                      </span>
                    )}
                    <span className="hidden text-xs text-zinc-500 xl:inline">
                      — {displayDesc}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 font-mono text-xs">
                    <span className="text-zinc-300">
                      {isZh ? '平均' : 'Avg'}: <strong>{m.avgTokens.toLocaleString()}</strong> tok
                    </span>
                    <span className="text-emerald-300">
                      {isZh ? '还原分' : 'Fidelity'}: <strong>{m.avgFidelity.toFixed(1)}</strong>/100
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
                  <span>
                    {isZh ? '文字保留' : 'Text Recall'}: {m.avgTextScore.toFixed(1)}%
                  </span>
                  <span>
                    {isZh ? '样式排版' : 'Style/Layout'}: {m.avgStyleScore.toFixed(1)}%
                  </span>
                  <span>
                    {isZh ? '表格结构' : 'Tables/Landmarks'}: {m.avgTableScore.toFixed(1)}%
                  </span>
                  <span>
                    {isZh ? '按钮控件' : 'Interactive/ARIA'}: {m.avgControlScore.toFixed(1)}%
                  </span>
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
              {isZh
                ? '10 大真实复杂网页组件逐项成绩单'
                : 'Per-Fixture Breakdown Across All 10 DOM Torture Tests'}
            </h3>
            <p className="text-xs text-zinc-400">
              {isZh
                ? '点击任意一行的「去体验台实测」按钮，立刻亲眼对比提纯前后的渲染画面！'
                : 'Click "Try Live" on any row to inspect raw vs distilled sandbox rendering side by side.'}
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
                {cat === 'ALL'
                  ? isZh
                    ? '全部 (10)'
                    : 'ALL'
                  : isZh
                    ? (categoryLabelZhMap[cat] ?? cat)
                    : cat}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.08] bg-zinc-950/80 font-mono text-[11px] text-zinc-400 uppercase">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">
                  {isZh ? '测试组件场景' : 'Fixture & Torture Tags'}
                </th>
                <th className="px-3 py-3 text-right">
                  {isZh ? '原始 HTML' : 'Raw HTML'}
                </th>
                <th className="px-3 py-3 text-right">
                  {isZh ? '普通样式插件' : 'Naive Picker'}
                </th>
                <th className="px-3 py-3 text-right">Turndown GFM</th>
                <th className="bg-indigo-950/30 px-3 py-3 text-right text-indigo-300">
                  AnyGrab (Default)
                </th>
                <th className="bg-emerald-950/20 px-3 py-3 text-right text-emerald-300">
                  AnyGrab (B=600)
                </th>
                <th className="px-4 py-3 text-right">
                  {isZh ? '在线实测' : 'Inspect'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {filteredFixtures.map((row) => {
                const raw = row.results['raw-html'];
                const naive = row.results['naive-style-picker'];
                const td = row.results['turndown-gfm'];
                const ag = row.results['anygrab-default'];
                const ag600 = row.results['anygrab-budget-600'];
                const zhPreset = PRESET_ZH_MAP[row.fixtureId];
                const displayName = isZh && zhPreset ? zhPreset.name : row.name;
                const displayCat = isZh && zhPreset ? zhPreset.category : row.category;

                return (
                  <tr key={row.fixtureId} className="transition hover:bg-zinc-800/35">
                    <td className="px-4 py-3 font-mono text-zinc-500">{row.index}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-zinc-100">{displayName}</div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-300">
                          {displayCat}
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
                      <div className="text-[10px] text-zinc-500">Fid {raw.fidelity.overall}</div>
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-rose-300">
                      <div>{naive.tokens.toLocaleString()} tok</div>
                      <div className="text-[10px] text-zinc-500">Fid {naive.fidelity.overall}</div>
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
                        data-action="try-live"
                        aria-label={`Try Live ${row.name}`}
                        onClick={() => onOpenPresetInPlayground(row.fixtureId)}
                        className="inline-flex items-center gap-1 rounded-lg border border-indigo-500/35 bg-indigo-500/10 px-2.5 py-1 text-[11px] font-semibold text-indigo-300 transition hover:bg-indigo-600 hover:text-white"
                      >
                        <span>{isZh ? '去体验台实测' : 'Try Live'}</span>
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
