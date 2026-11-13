import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowUpRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { BENCHMARK_REPORT, type MethodAggregateData } from '../data/types';
import { METHOD_ZH_MAP, PRESET_ZH_MAP, type SiteLocale } from '../i18n';
import { isMotionCapableBrowser } from '../utils/motion';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

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
  const barsContainerRef = useRef<HTMLDivElement | null>(null);

  const report = BENCHMARK_REPORT;
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

  useEffect(() => {
    if (!isMotionCapableBrowser()) return;
    const container = barsContainerRef.current;
    if (!container) return;

    const bars = container.querySelectorAll<HTMLElement>('[data-bench-bar]');
    if (!bars.length) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        bars,
        { scaleX: 0.15 },
        {
          scaleX: 1,
          duration: 0.7,
          stagger: 0.08,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: container,
            start: 'top 85%',
            once: true,
          },
        },
      );
    }, container);

    return () => ctx.revert();
  }, [chartMetric]);

  const getBarClass = (method: MethodAggregateData) => {
    if (method.methodId === 'anygrab-default') return 'bg-[#10B981]';
    if (method.methodId === 'anygrab-budget-600') return 'bg-[#FF4D1C]';
    return 'bg-[#3C4252]';
  };

  return (
    <section
      id="leaderboard"
      aria-label="AnyGrab-Bench Leaderboard"
      className="mx-auto max-w-[1160px] space-y-6 pt-4"
    >
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="font-mono text-[11px] font-semibold tracking-wider text-[var(--ag-accent)] uppercase">
            03 · ANYGRAB-BENCH v{report.benchmarkVersion}
          </div>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-[#F4F5F8] sm:text-3xl">
            {isZh ? '99.6 分 · 压缩 85%' : '99.6 Fidelity · -85% Tokens'}
          </h2>
        </div>

        <span className="font-mono text-xs text-[#7C8292]">
          {isZh ? '对比普通样式插件直降 89.3%' : '-89.3% vs Naive Picker · 0 API Cost'}
        </span>
      </div>

      {/* 4 Giant Tabular KPI Cells on Open Canvas */}
      <div className="ag-tabular grid divide-y divide-white/8 border-y border-white/8 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
        <div className="p-5">
          <div className="text-xs text-[#7C8292]">{isZh ? '测试样本集' : 'Suite'}</div>
          <div className="mt-1.5 text-2xl font-extrabold text-[#F4F5F8]">
            {isZh ? `${report.fixtureCount} 大真实场景` : `${report.fixtureCount} Archetypes`}
          </div>
        </div>

        <div className="p-5">
          <div className="text-xs text-[#7C8292]">{isZh ? '省流压缩率' : 'Budget Savings'}</div>
          <div className="mt-1.5 text-2xl font-extrabold text-[#FF4D1C]">
            -{anygrabBudget.compressionPct.toFixed(1)}%
          </div>
        </div>

        <div className="p-5">
          <div className="text-xs text-[#7C8292]">{isZh ? '界面还原总分' : 'UI Fidelity'}</div>
          <div className="mt-1.5 text-2xl font-extrabold text-[#10B981]">
            {anygrabDefault.avgFidelity.toFixed(1)}{' '}
            <span className="text-xs font-normal text-[#7C8292]">
              / 100 · vs {turndownSummary.avgFidelity.toFixed(1)}
            </span>
          </div>
        </div>

        <div className="p-5">
          <div className="text-xs text-[#7C8292]">{isZh ? '本地平均耗时' : 'Local Latency'}</div>
          <div className="mt-1.5 text-2xl font-extrabold text-[#F4F5F8]">
            {anygrabDefault.avgDurationMs.toFixed(2)} ms
          </div>
        </div>
      </div>

      {/* Horizontal Bar Race */}
      <div
        ref={barsContainerRef}
        className="rounded-2xl border border-white/10 bg-[#101217] p-5 sm:p-6"
      >
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-[#F4F5F8]">
            {isZh ? '五种提取策略客观对比' : 'Multi-Baseline Comparison'}
          </h3>

          <div className="inline-flex rounded-lg border border-white/8 bg-[#08090C] p-0.5">
            <button
              type="button"
              onClick={() => setChartMetric('fidelity')}
              className={`rounded-[6px] px-3 py-1 text-xs font-semibold transition ${
                chartMetric === 'fidelity'
                  ? 'bg-[#F4F5F8] text-[#08090C]'
                  : 'text-[#A1A7B5] hover:text-[#F4F5F8]'
              }`}
            >
              {isZh ? '还原分 (越高越好)' : 'Fidelity'}
            </button>
            <button
              type="button"
              onClick={() => setChartMetric('tokens')}
              className={`rounded-[6px] px-3 py-1 text-xs font-semibold transition ${
                chartMetric === 'tokens'
                  ? 'bg-[#F4F5F8] text-[#08090C]'
                  : 'text-[#A1A7B5] hover:text-[#F4F5F8]'
              }`}
            >
              {isZh ? 'Token 体积 (越短越省)' : 'Token Size'}
            </button>
          </div>
        </div>

        <div className="divide-y divide-white/8">
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
              <div key={m.methodId} className="py-3.5 first:pt-1 last:pb-1">
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span
                      className={`text-sm font-bold ${
                        isAnyGrab ? 'text-[#F4F5F8]' : 'text-[#A1A7B5]'
                      }`}
                    >
                      {displayName}
                    </span>
                    <span className="hidden text-xs text-[#7C8292] lg:inline">
                      · {displayDesc}
                    </span>
                  </div>

                  <div className="ag-tabular flex items-center gap-3 font-mono text-xs">
                    <span className="text-[#A1A7B5]">
                      <strong className="text-[#F4F5F8]">{m.avgTokens.toLocaleString()}</strong> tok
                    </span>
                    <span
                      className={
                        isAnyGrab ? 'font-bold text-[#10B981]' : 'text-[#A1A7B5]'
                      }
                    >
                      {m.avgFidelity.toFixed(1)}/100
                    </span>
                  </div>
                </div>

                <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#171A22]">
                  <div
                    data-bench-bar="true"
                    className={`h-full origin-left rounded-full transition-all duration-300 ${getBarClass(m)}`}
                    style={{ width: `${Math.min(100, widthPct)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Compact 10-Row Breakdown Matrix */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#101217]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 bg-[#171A22] px-4 py-3">
          <span className="text-xs font-bold text-[#F4F5F8]">
            {isZh ? '10 项测试样本成绩单' : '10-Fixture Breakdown'}
          </span>

          <div className="flex flex-wrap gap-1">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition ${
                  categoryFilter === cat
                    ? 'bg-[#F4F5F8] font-bold text-[#08090C]'
                    : 'border border-white/8 text-[#A1A7B5] hover:text-[#F4F5F8]'
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
              <tr className="border-b border-white/8 bg-[#0B0D12] font-mono text-[11px] text-[#7C8292] uppercase">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">{isZh ? '样本' : 'Fixture'}</th>
                <th className="px-3 py-3 text-right">{isZh ? '原始' : 'Raw'}</th>
                <th className="px-3 py-3 text-right">{isZh ? '样式插件' : 'Naive'}</th>
                <th className="px-3 py-3 text-right">AnyGrab</th>
                <th className="px-3 py-3 text-right text-[#FF4D1C]">AnyGrab 600</th>
                <th className="px-4 py-3 text-right">{isZh ? '实测' : 'Try'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/6">
              {filteredFixtures.map((row) => {
                const raw = row.results['raw-html'];
                const naive = row.results['naive-style-picker'];
                const ag = row.results['anygrab-default'];
                const ag600 = row.results['anygrab-budget-600'];
                const zhPreset = PRESET_ZH_MAP[row.fixtureId];
                const displayName = isZh && zhPreset ? zhPreset.name : row.name;

                return (
                  <tr key={row.fixtureId} className="transition hover:bg-[#171A22]">
                    <td className="px-4 py-2.5 font-mono text-[#7C8292]">{row.index}</td>
                    <td className="px-4 py-2.5 font-semibold text-[#F4F5F8]">{displayName}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-[#A1A7B5]">
                      {raw.tokens.toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-[#7C8292]">
                      {naive.tokens.toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold text-[#10B981]">
                      {ag.tokens.toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold text-[#FF4D1C]">
                      {ag600.tokens.toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        data-action="try-live"
                        aria-label={`Try Live ${row.name}`}
                        onClick={() => onOpenPresetInPlayground(row.fixtureId)}
                        className="inline-flex items-center gap-1 rounded-md border border-white/12 bg-[#08090C] px-2.5 py-1 text-[11px] font-semibold text-[#F4F5F8] transition hover:border-[var(--ag-accent)] hover:text-[var(--ag-accent)]"
                      >
                        <span>{isZh ? '实测' : 'Try Live'}</span>
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
