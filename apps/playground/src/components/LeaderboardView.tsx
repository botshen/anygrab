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

  const report = BENCHMARK_REPORT;
  const anygrabDefault = report.methods.find((m) => m.methodId === 'anygrab-default')!;
  const anygrabBudget = report.methods.find((m) => m.methodId === 'anygrab-budget-600')!;
  const maxAvgTokens = Math.max(...report.methods.map((m) => m.avgTokens), 1);

  const getBarColor = (method: MethodAggregateData) => {
    if (method.methodId === 'anygrab-default') return 'bg-[var(--ag-emerald)]';
    if (method.methodId === 'anygrab-budget-600') return 'bg-[var(--ag-accent)]';
    return 'bg-[var(--ag-bar-neutral)]';
  };

  return (
    <section
      id="leaderboard"
      aria-label="AnyGrab-Bench Leaderboard"
      className="py-14 sm:py-20"
    >
      <div className="ag-wrap space-y-8">
        {/* Two-sentence heading */}
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h2 className="text-[clamp(1.75rem,2.4vw,2.65rem)] leading-[1.12] font-medium tracking-[-0.032em] text-[var(--ag-ink)]">
            {isZh ? '99.6 分 · 压缩 85%。' : '99.6 fidelity · -85% tokens.'}{' '}
            <span className="text-[var(--ag-muted)]">
              {isZh
                ? `${report.fixtureCount} 大真实场景客观跑分。`
                : `Benchmarked across ${report.fixtureCount} real UI fixtures.`}
            </span>
          </h2>
        </div>

        {/* Side-by-Side Balanced Editorial Layout: span-5 Strategy Bars + span-7 10-Fixture Ledger */}
        <div className="grid items-start gap-8 lg:grid-cols-12">
          {/* Left: 5-Method Strategy Comparison + 3 Key Figures */}
          <div className="space-y-6 lg:col-span-5">
            <div className="ag-tabular grid grid-cols-3 divide-x divide-[var(--ag-line)] border-y border-[var(--ag-line)] py-4">
              <div className="pr-4">
                <div className="text-[13px] text-[var(--ag-muted)]">
                  {isZh ? '还原得分' : 'Fidelity'}
                </div>
                <div className="mt-1 text-2xl font-medium text-[var(--ag-emerald)]">
                  {anygrabDefault.avgFidelity.toFixed(1)}
                </div>
              </div>
              <div className="px-4">
                <div className="text-[13px] text-[var(--ag-muted)]">
                  {isZh ? '省流压缩' : 'Compression'}
                </div>
                <div className="mt-1 text-2xl font-medium text-[var(--ag-accent)]">
                  -{anygrabBudget.compressionPct.toFixed(1)}%
                </div>
              </div>
              <div className="pl-4">
                <div className="text-[13px] text-[var(--ag-muted)]">
                  {isZh ? '本地耗时' : 'Latency'}
                </div>
                <div className="mt-1 text-2xl font-medium text-[var(--ag-ink)]">
                  {anygrabDefault.avgDurationMs.toFixed(1)} ms
                </div>
              </div>
            </div>

            <div className="rounded-[16px] border border-[var(--ag-line)] bg-[var(--ag-panel)] p-5">
              <div className="mb-4 flex items-center justify-between gap-2">
                <h3 className="text-[15px] font-medium text-[var(--ag-ink)]">
                  {isZh ? '提取方案对比' : 'Method comparison'}
                </h3>

                <div className="inline-flex rounded-lg bg-[var(--ag-panel-muted)] p-0.5">
                  <button
                    type="button"
                    onClick={() => setChartMetric('fidelity')}
                    className={`min-h-[28px] rounded-[6px] px-2.5 text-[12px] font-medium transition-colors ${
                      chartMetric === 'fidelity'
                        ? 'bg-[var(--ag-panel)] text-[var(--ag-ink)] shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                        : 'text-[var(--ag-muted)] hover:text-[var(--ag-ink)]'
                    }`}
                  >
                    {isZh ? '还原分' : 'Fidelity'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartMetric('tokens')}
                    className={`min-h-[28px] rounded-[6px] px-2.5 text-[12px] font-medium transition-colors ${
                      chartMetric === 'tokens'
                        ? 'bg-[var(--ag-panel)] text-[var(--ag-ink)] shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                        : 'text-[var(--ag-muted)] hover:text-[var(--ag-ink)]'
                    }`}
                  >
                    Tokens
                  </button>
                </div>
              </div>

              <div className="divide-y divide-[var(--ag-line)]">
                {report.methods.map((m) => {
                  const widthPct =
                    chartMetric === 'fidelity'
                      ? Math.max(4, m.avgFidelity)
                      : Math.max(3, (m.avgTokens / maxAvgTokens) * 100);
                  const zhMeta = METHOD_ZH_MAP[m.methodId];
                  const displayName = isZh && zhMeta ? zhMeta.name : m.methodName;
                  const isAnyGrab = m.methodId.startsWith('anygrab');

                  return (
                    <div key={m.methodId} className="py-3 first:pt-1 last:pb-1">
                      <div className="ag-tabular mb-1.5 flex items-baseline justify-between gap-2 text-[13px]">
                        <span
                          className={
                            isAnyGrab
                              ? 'font-medium text-[var(--ag-ink)]'
                              : 'text-[var(--ag-ink-secondary)]'
                          }
                        >
                          {displayName}
                        </span>
                        <span className="font-mono text-[12px] text-[var(--ag-muted)]">
                          {m.avgTokens.toLocaleString()} tok ·{' '}
                          <strong
                            className={
                              isAnyGrab
                                ? 'font-medium text-[var(--ag-emerald)]'
                                : 'font-normal text-[var(--ag-muted)]'
                            }
                          >
                            {m.avgFidelity.toFixed(1)}
                          </strong>
                        </span>
                      </div>

                      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--ag-track)]">
                        <div
                          className={`h-full rounded-full transition-all duration-200 ${getBarColor(m)}`}
                          style={{ width: `${Math.min(100, widthPct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Clean 10-Fixture Hairline Ledger */}
          <div className="min-w-0 overflow-hidden rounded-[16px] border border-[var(--ag-line)] bg-[var(--ag-panel)] lg:col-span-7">
            <div className="overflow-x-auto">
              <table className="ag-tabular w-full border-collapse text-left text-[13px]">
                <thead>
                  <tr className="border-b border-[var(--ag-line)] bg-[var(--ag-panel-muted)] text-[13px] whitespace-nowrap text-[var(--ag-muted)]">
                    <th className="px-3 py-3 font-medium sm:px-4">
                      {isZh ? '测试样本' : 'Fixture'}
                    </th>
                    <th className="hidden px-3 py-3 text-right font-medium sm:table-cell">
                      {isZh ? '原始' : 'Raw'}
                    </th>
                    <th className="px-2 py-3 text-right font-medium sm:px-3">AnyGrab</th>
                    <th className="px-2 py-3 text-right font-medium text-[var(--ag-accent)] sm:px-3">
                      {isZh ? '600 省流' : '600 tok'}
                    </th>
                    <th className="px-3 py-3 text-right font-medium sm:px-4">
                      {isZh ? '操作' : 'Action'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--ag-line)]">
                  {report.fixtures.map((row) => {
                    const raw = row.results['raw-html'];
                    const ag = row.results['anygrab-default'];
                    const ag600 = row.results['anygrab-budget-600'];
                    const zhPreset = PRESET_ZH_MAP[row.fixtureId];
                    const displayName = isZh && zhPreset ? zhPreset.name : row.name;

                    return (
                      <tr
                        key={row.fixtureId}
                        className="whitespace-nowrap transition-colors hover:bg-[var(--ag-panel-muted)]"
                      >
                        <td className="px-3 py-2.5 font-medium text-[var(--ag-ink)] sm:px-4">
                          {displayName}
                        </td>
                        <td className="hidden px-3 py-2.5 text-right font-mono text-[var(--ag-muted)] sm:table-cell">
                          {raw.tokens.toLocaleString()}
                        </td>
                        <td className="px-2 py-2.5 text-right font-mono font-medium text-[var(--ag-emerald)] sm:px-3">
                          {ag.tokens.toLocaleString()}
                        </td>
                        <td className="px-2 py-2.5 text-right font-mono font-medium text-[var(--ag-accent)] sm:px-3">
                          {ag600.tokens.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-right sm:px-4">
                          <button
                            type="button"
                            data-action="try-live"
                            aria-label={`Try Live ${row.name}`}
                            onClick={() => onOpenPresetInPlayground(row.fixtureId)}
                            className="inline-flex min-h-[30px] shrink-0 items-center gap-1 rounded-full border border-[var(--ag-line-strong)] bg-[var(--ag-bg)] px-2.5 text-[12px] font-medium whitespace-nowrap text-[var(--ag-ink)] transition-colors hover:border-[var(--ag-accent)] hover:text-[var(--ag-accent)]"
                          >
                            <span>{isZh ? '实测' : 'Try'}</span>
                            <ArrowUpRight className="h-3 w-3 shrink-0" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
