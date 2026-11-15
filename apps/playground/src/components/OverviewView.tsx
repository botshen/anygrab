import { ArrowRight, Check, Copy, Pause, Play, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ActiveTab } from '../data/types';
import { GITHUB_REPO_URL, type SiteLocale } from '../i18n';
import { isMotionCapableBrowser } from '../utils/motion';

interface OverviewViewProps {
  locale: SiteLocale;
  onNavigate: (tab: ActiveTab) => void;
}

const CLI_QUICK_CMD = 'npx anygrab https://stripe.com';

type StageTargetId = 'pricing' | 'metrics' | 'table';

interface StageSpecimen {
  id: StageTargetId;
  selector: string;
  labelZh: string;
  labelEn: string;
  rawTokens: string;
  cleanTokens: string;
  savedPct: string;
  swatches: string[];
  codeSnippet: string;
}

const STAGE_SPECIMENS: StageSpecimen[] = [
  {
    id: 'pricing',
    selector: 'article.tier-pro',
    labelZh: '定价卡',
    labelEn: 'Pricing card',
    rawTokens: '3,840',
    cleanTokens: '218',
    savedPct: '-94.3%',
    swatches: ['#141413', '#C93E18', '#0E7550', '#F6F5F0'],
    codeSnippet: `<article class="rounded-xl border p-5">
  <span class="font-mono text-xs">Pro</span>
  <h3 class="mt-1 text-lg font-medium">Team Pro · $29/mo</h3>
</article>`,
  },
  {
    id: 'metrics',
    selector: 'div.mrr-spark',
    labelZh: '增长卡',
    labelEn: 'Revenue card',
    rawTokens: '6,120',
    cleanTokens: '164',
    savedPct: '-97.3%',
    swatches: ['#141413', '#0E7550', '#636059', '#FFFFFF'],
    codeSnippet: `<section class="rounded-xl border p-5">
  <span class="text-xs">Net MRR</span>
  <p class="mt-1 text-2xl font-medium tabular-nums">$148,420</p>
</section>`,
  },
  {
    id: 'table',
    selector: 'table.fin-ledger',
    labelZh: '合并表',
    labelEn: 'Merged table',
    rawTokens: '4,620',
    cleanTokens: '194',
    savedPct: '-95.8%',
    swatches: ['#141413', '#ECEAE2', '#0E7550', '#FFFFFF'],
    codeSnippet: `<table class="w-full text-sm tabular-nums">
  <tr><th rowspan="2">Region</th><th colspan="2">FY26 H1</th></tr>
  <tr><td>APAC</td><td>$42.8M</td><td>$58.4M</td></tr>
</table>`,
  },
];

function ReticleCorners() {
  return (
    <>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-0 h-3 w-3 border-t-2 border-l-2 border-[var(--ag-accent)]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-0 right-0 h-3 w-3 border-t-2 border-r-2 border-[var(--ag-accent)]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 h-3 w-3 border-b-2 border-l-2 border-[var(--ag-accent)]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-0 bottom-0 h-3 w-3 border-r-2 border-b-2 border-[var(--ag-accent)]"
      />
    </>
  );
}

export function OverviewView({ locale, onNavigate }: OverviewViewProps) {
  const isZh = locale === 'zh-CN';
  const [activeIdx, setActiveIdx] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isHovering, setIsHovering] = useState<boolean>(false);
  const [copiedCli, setCopiedCli] = useState<boolean>(false);

  const activeSpecimen = STAGE_SPECIMENS[activeIdx] ?? STAGE_SPECIMENS[0];

  useEffect(() => {
    if (!isMotionCapableBrowser() || isPaused || isHovering) return;
    const id = window.setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % STAGE_SPECIMENS.length);
    }, 3200);
    return () => window.clearInterval(id);
  }, [isPaused, isHovering]);

  const handleCopyCli = () => {
    try {
      void navigator.clipboard?.writeText(CLI_QUICK_CMD)?.catch(() => {});
    } catch {
      // Ignore in test environments
    }
    setCopiedCli(true);
    setTimeout(() => setCopiedCli(false), 1600);
  };

  return (
    <section
      id="overview"
      aria-label="Product Overview"
      className="py-10 sm:py-14 lg:py-16"
    >
      <div className="ag-wrap">
        {/* tasteskill dealt `collage` Split Hero: span-5 text left, span-7 lit UI collage right */}
        <div className="grid items-start gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="ag-enter-text min-w-0 lg:col-span-5 lg:pt-2">
            <p className="text-[13px] font-medium text-[var(--ag-muted)]">
              {isZh
                ? 'MIT 开源项目 · 本地 4.2 毫秒提纯'
                : 'MIT open source · 4.2 ms local AST engine'}
            </p>

            <h1 className="mt-4 text-[clamp(2.35rem,3.8vw,3.9rem)] leading-[1.05] font-medium tracking-[-0.038em] text-[var(--ag-ink)]">
              {isZh ? '点一下，扒走好界面' : 'Point. Click. Ship Clean UI.'}
            </h1>

            <p className="mt-5 max-w-[44ch] text-[17px] leading-[1.6] text-[var(--ag-ink-secondary)]">
              {isZh
                ? '点选任意网页元素，剥离 90% 废码，直出 Tailwind 与设计色板喂给 反重力 (Antigravity)、Codex 与 Cursor。'
                : 'Click any webpage element to strip 90% DOM bloat into clean Tailwind and design tokens for Antigravity, Codex, and Cursor.'}
            </p>

            {/* Primary + Open-Source Star CTA pair (copy.md rule 5: max 2 hero buttons) */}
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <button
                type="button"
                onClick={() => onNavigate('playground')}
                className="ag-btn ag-btn-primary w-full sm:w-auto"
              >
                <span>{isZh ? '进入在线沙盒' : 'Try live sandbox'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              <a
                href={GITHUB_REPO_URL}
                target="_blank"
                rel="noreferrer"
                data-testid="hero-github-star"
                className="ag-btn ag-btn-secondary w-full sm:w-auto"
              >
                <Star className="h-4 w-4 fill-current text-[var(--ag-accent)]" />
                <span>{isZh ? '去 GitHub 点 Star' : 'Star on GitHub'}</span>
              </a>
            </div>

            {/* Quiet 1-click CLI command line */}
            <div className="mt-6 flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyCli}
                className="inline-flex min-h-[38px] max-w-full items-center gap-2.5 rounded-lg border border-[var(--ag-line)] bg-[var(--ag-panel)] px-3.5 font-mono text-[13px] text-[var(--ag-ink-secondary)] transition-colors hover:border-[var(--ag-line-strong)] hover:text-[var(--ag-ink)]"
              >
                <span className="truncate">{CLI_QUICK_CMD}</span>
                {copiedCli ? (
                  <Check className="h-3.5 w-3.5 shrink-0 text-[var(--ag-emerald)]" />
                ) : (
                  <Copy className="h-3.5 w-3.5 shrink-0 text-[var(--ag-muted)]" />
                )}
              </button>
            </div>
          </div>

          {/* Right: Lit Studio Frame with Live Product Window + Distilled Result Card */}
          <div
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            className="ag-enter-media ag-hero-art relative min-w-0 overflow-hidden rounded-[20px] p-4 sm:p-7 lg:col-span-7"
          >
            {/* Main Product Window */}
            <div className="ag-window overflow-hidden rounded-[14px]">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--ag-line)] bg-[var(--ag-panel-muted)] px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5" aria-hidden="true">
                    <i className="h-2.5 w-2.5 rounded-full bg-[var(--ag-line-strong)]" />
                    <i className="h-2.5 w-2.5 rounded-full bg-[var(--ag-line-strong)]" />
                    <i className="h-2.5 w-2.5 rounded-full bg-[var(--ag-line-strong)]" />
                  </span>
                  <span className="ml-1 font-mono text-[13px] text-[var(--ag-muted)]">
                    {activeSpecimen.selector}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1">
                  {STAGE_SPECIMENS.map((item, idx) => {
                    const selected = idx === activeIdx;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveIdx(idx)}
                        className={`min-h-[30px] rounded-full px-2.5 text-[13px] transition-colors ${
                          selected
                            ? 'bg-[var(--ag-ink)] font-medium text-[var(--ag-bg)]'
                            : 'text-[var(--ag-muted)] hover:text-[var(--ag-ink)]'
                        }`}
                      >
                        {isZh ? item.labelZh : item.labelEn}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 sm:p-6">
                <div className="relative rounded-xl border border-[var(--ag-line)] bg-[var(--ag-bg)] p-4 sm:p-5">
                  <ReticleCorners />

                  {activeSpecimen.id === 'pricing' && (
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[15px] font-medium text-[var(--ag-ink)]">
                          Team Pro
                        </span>
                        <span className="rounded-full bg-[var(--ag-accent-soft)] px-2.5 py-0.5 font-mono text-[13px] font-medium text-[var(--ag-accent)]">
                          Pro
                        </span>
                      </div>
                      <div className="ag-tabular mt-2 text-3xl font-medium text-[var(--ag-ink)]">
                        $29
                        <span className="text-sm font-normal text-[var(--ag-muted)]"> / mo</span>
                      </div>
                      <div className="mt-4 flex items-center justify-between rounded-lg border border-[var(--ag-line-strong)] bg-[var(--ag-panel)] px-3.5 py-2 text-[14px] font-medium text-[var(--ag-ink)]">
                        <span>{isZh ? '一键提取组件' : 'Extract component'}</span>
                        <span className="text-[var(--ag-muted)]">→</span>
                      </div>
                    </div>
                  )}

                  {activeSpecimen.id === 'metrics' && (
                    <div>
                      <div className="flex items-center justify-between text-[13px] text-[var(--ag-muted)]">
                        <span>Net MRR</span>
                        <span className="font-mono font-medium text-[var(--ag-emerald)]">
                          +32.8%
                        </span>
                      </div>
                      <div className="ag-tabular mt-1.5 text-3xl font-medium text-[var(--ag-ink)]">
                        $148,420
                      </div>
                      <svg
                        viewBox="0 0 280 48"
                        className="mt-3 h-11 w-full overflow-visible"
                        aria-hidden="true"
                      >
                        <path
                          d="M0 40 L45 34 L92 36 L140 22 L188 25 L235 10 L280 5"
                          fill="none"
                          stroke="var(--ag-emerald)"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                  )}

                  {activeSpecimen.id === 'table' && (
                    <div className="overflow-x-auto">
                      <table className="ag-tabular w-full border-collapse text-[13px]">
                        <thead>
                          <tr className="border-b border-[var(--ag-line)] text-[var(--ag-muted)]">
                            <th
                              rowSpan={2}
                              className="border-r border-[var(--ag-line)] px-3 py-2 text-left font-medium"
                            >
                              Region
                            </th>
                            <th
                              colSpan={2}
                              className="border-b border-[var(--ag-line)] px-3 py-1.5 font-medium"
                            >
                              FY26 H1
                            </th>
                          </tr>
                          <tr className="border-b border-[var(--ag-line)] text-[var(--ag-muted)]">
                            <th className="px-3 py-1.5 text-right font-medium">Q1</th>
                            <th className="px-3 py-1.5 text-right font-medium">Q2</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--ag-line)] text-[var(--ag-ink)]">
                          <tr>
                            <td className="border-r border-[var(--ag-line)] px-3 py-2">APAC</td>
                            <td className="px-3 py-2 text-right">$42.8M</td>
                            <td className="px-3 py-2 text-right font-medium text-[var(--ag-emerald)]">
                              $58.4M
                            </td>
                          </tr>
                          <tr>
                            <td className="border-r border-[var(--ag-line)] px-3 py-2">NA</td>
                            <td className="px-3 py-2 text-right">$61.2M</td>
                            <td className="px-3 py-2 text-right font-medium text-[var(--ag-emerald)]">
                              $74.9M
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Collage Lower Result Card + 32px Pause Control */}
            <div className="mt-4 flex items-end justify-between gap-3">
              <div className="ag-window min-w-0 flex-1 rounded-[12px] p-4">
                <div className="ag-tabular flex flex-wrap items-center justify-between gap-2 text-[13px]">
                  <div className="flex items-center gap-1.5">
                    {activeSpecimen.swatches.map((hex) => (
                      <span
                        key={hex}
                        title={hex}
                        className="h-3.5 w-3.5 rounded-[3px] border border-[var(--ag-line-strong)]"
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                    <span className="ml-1 font-mono text-[var(--ag-muted)]">
                      {activeSpecimen.rawTokens} → {activeSpecimen.cleanTokens} tok
                    </span>
                  </div>
                  <span className="rounded-full bg-[var(--ag-emerald-soft)] px-2.5 py-0.5 font-mono font-medium text-[var(--ag-emerald)]">
                    {activeSpecimen.savedPct}
                  </span>
                </div>

                <pre className="mt-2.5 overflow-x-auto font-mono text-[12.5px] leading-[1.55] whitespace-pre-wrap break-words text-[var(--ag-code-ink)]">
                  <code>{activeSpecimen.codeSnippet}</code>
                </pre>
              </div>

              <button
                type="button"
                onClick={() => setIsPaused((p) => !p)}
                aria-label={
                  isPaused
                    ? isZh
                      ? '继续轮播示例'
                      : 'Resume specimen cycle'
                    : isZh
                      ? '暂停轮播示例'
                      : 'Pause specimen cycle'
                }
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--ag-line-strong)] bg-[var(--ag-panel)] text-[var(--ag-ink)] transition-colors hover:border-[var(--ag-accent)]"
              >
                {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Docked 3-Fact Comparison Row (open hairlines, zero card boxes) */}
        <div className="mt-10 grid divide-y divide-[var(--ag-line)] border-y border-[var(--ag-line)] sm:mt-14 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="py-4 sm:pr-6">
            <div className="ag-tabular flex items-baseline justify-between gap-2">
              <span className="text-[15px] font-medium text-[var(--ag-ink)]">
                {isZh ? '发截图' : 'Screenshots'}
              </span>
              <span className="font-mono text-[13px] text-[var(--ag-muted)]">~50 / 100</span>
            </div>
            <p className="mt-1 text-[14px] text-[var(--ag-muted)]">
              {isZh ? '丢失精确色号与圆角间距' : 'Loses exact hex values and spacing'}
            </p>
          </div>

          <div className="py-4 sm:px-6">
            <div className="ag-tabular flex items-baseline justify-between gap-2">
              <span className="text-[15px] font-medium text-[var(--ag-ink)]">
                {isZh ? 'F12 扒源码' : 'Raw F12 DOM'}
              </span>
              <span className="font-mono text-[13px] text-[var(--ag-accent)]">27k+ tok</span>
            </div>
            <p className="mt-1 text-[14px] text-[var(--ag-muted)]">
              {isZh ? '冗余脚本撑爆上下文窗口' : 'Floods context with scripts and wrappers'}
            </p>
          </div>

          <div className="py-4 sm:pl-6">
            <div className="ag-tabular flex items-baseline justify-between gap-2">
              <span className="text-[15px] font-medium text-[var(--ag-ink)]">
                {isZh ? 'AnyGrab 提纯' : 'AnyGrab AST'}
              </span>
              <span className="font-mono text-[13px] font-medium text-[var(--ag-emerald)]">
                99.6 / 100
              </span>
            </div>
            <p className="mt-1 text-[14px] text-[var(--ag-muted)]">
              {isZh ? '218 tok 直出纯净代码与色板' : '218 tok clean Tailwind and tokens'}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
