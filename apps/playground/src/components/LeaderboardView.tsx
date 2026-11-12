import { ArrowUpRight } from 'lucide-react';
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
    if (method.methodId === 'anygrab-default') {
      return 'bg-[#D94E28]';
    }
    if (method.methodId === 'anygrab-budget-600') {
      return 'bg-[#141413]';
    }
    return 'bg-[#B8B4A8]';
  };

  return (
    <section aria-label="AnyGrab-Bench Leaderboard" className="space-y-8">
      {/* Editorial Intro + Plain-Language Summary */}
      <div className="space-y-2">
        <div className="font-mono text-[11px] font-semibold tracking-wider text-[var(--ag-accent)] uppercase">
          ANYGRAB-BENCH v{report.benchmarkVersion}
        </div>
        <h1 className="text-2xl leading-[1.3] font-extrabold tracking-[-0.02em] text-[#141413] sm:text-3xl">
          {isZh
            ? '一分钟大白话读懂这份跑分榜：为什么 AnyGrab 既省额度又还原？'
            : 'AnyGrab-Bench Objective Evaluation: Compression Meets UI Fidelity'}
        </h1>
        <p className="max-w-4xl text-sm leading-[1.7] text-[var(--ag-text-secondary)]">
          {isZh
            ? `普通浏览器样式插件会把 10 个测试页面膨胀到 11.9 万 Token（膨胀 +280.8%）；纯文本 Markdown 工具虽然字数少，但颜色、圆角和栅格排版丢失率达 100%（样式还原 0 分）。AnyGrab 在本地 4.2 毫秒内相比普通样式插件剔除了 89.3% 冗余代码（省流模式下相比原始网页直降 85.0%），同时取得 99.6 / 100 的界面与表格还原总分。`
            : `Naive computed-style extensions bloat 10 pages to 119,176 tokens (+280.8% overhead). Plain Markdown tools save tokens but lose 100% of visual styles (0% style recall) and break merged tables. AnyGrab cuts 89.3% of style bloat vs naive pickers (-85.0% in budget mode) in ~4ms while achieving a 99.6 / 100 fidelity score.`}
        </p>
      </div>

      {/* Unified 4-Cell Architectural KPI Strip */}
      <div className="ag-tabular grid divide-y divide-[var(--ag-border)] overflow-hidden rounded-[12px] border border-[var(--ag-border)] bg-white sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
        <div className="p-5">
          <div className="text-xs font-medium text-[var(--ag-text-muted)]">
            {isZh ? '高压测试样本集' : 'DOM Torture Suite'}
          </div>
          <div className="mt-2 text-2xl font-extrabold tracking-tight text-[#141413]">
            {isZh ? `${report.fixtureCount} 大真实场景` : `${report.fixtureCount} Archetypes`}
          </div>
          <div className="mt-1 font-mono text-[11px] leading-[1.5] text-[var(--ag-text-secondary)]">
            {rawSummary.totalTokens.toLocaleString()} raw vs {naiveSummary.totalTokens.toLocaleString()} naive tok
          </div>
        </div>

        <div className="p-5">
          <div className="text-xs font-medium text-[var(--ag-text-muted)]">
            {isZh ? '省流模式体积压缩' : 'Budget Token Compression'}
          </div>
          <div className="mt-2 text-2xl font-extrabold tracking-tight text-[var(--ag-accent)]">
            -{anygrabBudget.compressionPct.toFixed(1)}%
          </div>
          <div className="mt-1 font-mono text-[11px] leading-[1.5] text-[var(--ag-text-secondary)]">
            {isZh
              ? `均值 ${anygrabBudget.avgTokens.toLocaleString()} tok · 较样式插件省 89.3%`
              : `Avg ${anygrabBudget.avgTokens.toLocaleString()} tok · -89.3% vs Naive`}
          </div>
        </div>

        <div className="p-5">
          <div className="text-xs font-medium text-[var(--ag-text-muted)]">
            {isZh ? '界面与表格还原总分' : 'UI & Table Fidelity'}
          </div>
          <div className="mt-2 text-2xl font-extrabold tracking-tight text-[#141413]">
            {anygrabDefault.avgFidelity.toFixed(1)}{' '}
            <span className="text-sm font-normal text-[var(--ag-text-muted)]">/ 100</span>
          </div>
          <div className="mt-1 font-mono text-[11px] leading-[1.5] text-[var(--ag-text-secondary)]">
            {isZh
              ? `对比纯文本方案 ${turndownSummary.avgFidelity.toFixed(1)} 分 (0% 样式)`
              : `vs Turndown GFM ${turndownSummary.avgFidelity.toFixed(1)}/100`}
          </div>
        </div>

        <div className="p-5">
          <div className="text-xs font-medium text-[var(--ag-text-muted)]">
            {isZh ? '平均本地提纯耗时' : 'Mean Local Latency'}
          </div>
          <div className="mt-2 text-2xl font-extrabold tracking-tight text-[#141413]">
            {anygrabDefault.avgDurationMs.toFixed(2)} ms
          </div>
          <div className="mt-1 font-mono text-[11px] leading-[1.5] text-[var(--ag-text-secondary)]">
            {isZh ? '纯本地 AST · 0 大模型开销' : 'Pure local AST · $0 API cost'}
          </div>
        </div>
      </div>

      {/* Horizontal Bar Comparison */}
      <div className="rounded-[12px] border border-[var(--ag-border)] bg-white p-5 sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-[#141413]">
              {isZh ? '五种处理方式客观指标对比' : 'Multi-Baseline Objective Comparison'}
            </h2>
            <p className="mt-0.5 text-xs leading-[1.6] text-[var(--ag-text-secondary)]">
              {isZh
                ? '还原度总分权重：核心文字保留 (30%) + 样式布局还原 (30%) + 复杂表格完整度 (20%) + 交互控件保留 (20%)'
                : 'Fidelity weights Key Text (30%), Layout/Style (30%), Merged Tables (20%), and Interactive Controls (20%).'}
            </p>
          </div>

          <div className="inline-flex rounded-[8px] border border-[var(--ag-border)] bg-[var(--ag-bg-subtle)] p-0.5">
            <button
              type="button"
              onClick={() => setChartMetric('fidelity')}
              className={`rounded-[5px] px-3 py-1.5 text-xs font-semibold transition ${
                chartMetric === 'fidelity'
                  ? 'bg-white text-[#141413] shadow-[0_1px_2px_rgba(20,20,19,0.08)]'
                  : 'text-[var(--ag-text-secondary)] hover:text-[#141413]'
              }`}
            >
              {isZh ? '界面还原分（越高越好）' : 'Fidelity Score'}
            </button>
            <button
              type="button"
              onClick={() => setChartMetric('tokens')}
              className={`rounded-[5px] px-3 py-1.5 text-xs font-semibold transition ${
                chartMetric === 'tokens'
                  ? 'bg-white text-[#141413] shadow-[0_1px_2px_rgba(20,20,19,0.08)]'
                  : 'text-[var(--ag-text-secondary)] hover:text-[#141413]'
              }`}
            >
              {isZh ? '平均 Token 消耗（越短越省）' : 'Token Footprint'}
            </button>
          </div>
        </div>

        <div className="divide-y divide-[var(--ag-border)]">
          {report.methods.map((m) => {
            const widthPct =
              chartMetric === 'fidelity'
                ? Math.max(4, m.avgFidelity)
                : Math.max(3, (m.avgTokens / maxAvgTokens) * 100);
            const zhMeta = METHOD_ZH_MAP[m.methodId];
            const displayName = isZh && zhMeta ? zhMeta.name : m.methodName;
            const displayDesc = isZh && zhMeta ? zhMeta.desc : m.description;
            const isAnyGrab = m.methodId.startsWith('anygrab');

            return (
              <div key={m.methodId} className="py-4 first:pt-1 last:pb-1">
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span
                      className={`text-sm font-bold ${
                        isAnyGrab ? 'text-[#141413]' : 'text-[var(--ag-text-secondary)]'
                      }`}
                    >
                      {displayName}
                    </span>
                    <span className="hidden text-xs leading-[1.55] text-[var(--ag-text-muted)] xl:inline">
                      — {displayDesc}
                    </span>
                  </div>

                  <div className="ag-tabular flex items-center gap-3 font-mono text-xs">
                    <span className="text-[var(--ag-text-secondary)]">
                      <strong>{m.avgTokens.toLocaleString()}</strong> tok
                    </span>
                    <span
                      className={
                        isAnyGrab ? 'font-bold text-[var(--ag-accent)]' : 'text-[var(--ag-text-secondary)]'
                      }
                    >
                      <strong>{m.avgFidelity.toFixed(1)}</strong>/100
                    </span>
                    <span className="text-[var(--ag-text-muted)]">{m.avgDurationMs.toFixed(2)} ms</span>
                  </div>
                </div>

                <div className="h-2.5 w-full overflow-hidden rounded-[4px] bg-[var(--ag-bg-subtle)]">
                  <div
                    className={`h-full rounded-[4px] transition-all duration-300 ${getBarStyle(m)}`}
                    style={{ width: `${Math.min(100, widthPct)}%` }}
                  />
                </div>

                <div className="ag-tabular mt-2 flex flex-wrap gap-4 font-mono text-[11px] text-[var(--ag-text-muted)]">
                  <span>
                    {isZh ? '文字' : 'Text'}: {m.avgTextScore.toFixed(1)}%
                  </span>
                  <span>
                    {isZh ? '样式' : 'Style'}: {m.avgStyleScore.toFixed(1)}%
                  </span>
                  <span>
                    {isZh ? '表格' : 'Tables'}: {m.avgTableScore.toFixed(1)}%
                  </span>
                  <span>
                    {isZh ? '控件' : 'Controls'}: {m.avgControlScore.toFixed(1)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 10-Fixture Granular Breakdown Matrix */}
      <div className="overflow-hidden rounded-[12px] border border-[var(--ag-border)] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--ag-border)] bg-[#FAF9F5] p-4 sm:px-5">
          <div>
            <h3 className="text-sm font-bold text-[#141413]">
              {isZh
                ? '10 组真实网页组件逐项成绩单'
                : 'Per-Fixture Breakdown Across All 10 DOM Torture Tests'}
            </h3>
            <p className="mt-0.5 text-xs leading-[1.6] text-[var(--ag-text-secondary)]">
              {isZh
                ? '点击任意一行右侧按钮，可直接跳转到在线体验台查看提纯前后对比。'
                : 'Click "Try Live" on any row to inspect raw vs distilled rendering side by side.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-1">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`rounded-[5px] px-2.5 py-1 text-xs font-medium transition ${
                  categoryFilter === cat
                    ? 'bg-[#141413] text-white'
                    : 'border border-[var(--ag-border)] bg-white text-[var(--ag-text-secondary)] hover:text-[#141413]'
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
          <table className="ag-tabular w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--ag-border)] bg-[var(--ag-bg-subtle)]/70 font-mono text-[11px] text-[var(--ag-text-secondary)] uppercase">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">{isZh ? '测试组件场景' : 'Fixture'}</th>
                <th className="px-3 py-3 text-right">{isZh ? '原始 HTML' : 'Raw HTML'}</th>
                <th className="px-3 py-3 text-right">{isZh ? '普通样式插件' : 'Naive Picker'}</th>
                <th className="px-3 py-3 text-right">Turndown</th>
                <th className="bg-[#FAF9F5] px-3 py-3 text-right font-bold text-[#141413]">
                  AnyGrab
                </th>
                <th className="bg-[#FAF9F5] px-3 py-3 text-right font-bold text-[var(--ag-accent)]">
                  AnyGrab (600)
                </th>
                <th className="px-4 py-3 text-right">{isZh ? '实测' : 'Inspect'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--ag-border)]">
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
                  <tr key={row.fixtureId} className="transition hover:bg-[#FAF9F5]">
                    <td className="px-4 py-3 font-mono text-[var(--ag-text-muted)]">{row.index}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-[#141413]">{displayName}</div>
                      <div className="mt-0.5 text-[11px] text-[var(--ag-text-muted)]">
                        {displayCat} · {row.tags.slice(0, 2).join(' · ')}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-[var(--ag-text-secondary)]">
                      <div>{raw.tokens.toLocaleString()} tok</div>
                      <div className="text-[10px] text-[var(--ag-text-muted)]">
                        Fid {raw.fidelity.overall}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-[var(--ag-text-secondary)]">
                      <div>{naive.tokens.toLocaleString()} tok</div>
                      <div className="text-[10px] text-[var(--ag-text-muted)]">
                        Fid {naive.fidelity.overall}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-[var(--ag-text-secondary)]">
                      <div>{td.tokens.toLocaleString()} tok</div>
                      <div className="text-[10px] text-[var(--ag-text-muted)]">
                        Fid {td.fidelity.overall} · 0% CSS
                      </div>
                    </td>
                    <td className="bg-[#FAF9F5]/80 px-3 py-3 text-right font-mono">
                      <div className="font-bold text-[#141413]">{ag.tokens.toLocaleString()} tok</div>
                      <div className="text-[10px] text-[var(--ag-text-secondary)]">
                        Fid {ag.fidelity.overall} · {ag.durationMs}ms
                      </div>
                    </td>
                    <td className="bg-[#FAF9F5]/80 px-3 py-3 text-right font-mono">
                      <div className="font-bold text-[var(--ag-accent)]">
                        {ag600.tokens.toLocaleString()} tok
                      </div>
                      <div className="text-[10px] text-[var(--ag-text-secondary)]">
                        Fid {ag600.fidelity.overall} (-{ag600.compressionPct}%)
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        data-action="try-live"
                        aria-label={`Try Live ${row.name}`}
                        onClick={() => onOpenPresetInPlayground(row.fixtureId)}
                        className="inline-flex items-center gap-1 rounded-[5px] border border-[var(--ag-border-strong)] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#141413] transition hover:bg-[#141413] hover:text-white"
                      >
                        <span>{isZh ? '去体验台实测' : 'Try Live'}</span>
                        <ArrowUpRight className="h-3 w-3" />
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
