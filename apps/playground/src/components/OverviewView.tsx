import { ArrowRight, Check, Copy, Download, Play } from 'lucide-react';
import { useState } from 'react';
import type { ActiveTab } from '../data/types';
import type { SiteLocale } from '../i18n';

interface OverviewViewProps {
  locale: SiteLocale;
  onNavigate: (tab: ActiveTab) => void;
}

const CLI_CMD = 'npx anygrab https://ui.shadcn.com --budget 1200';

type StageDemoId = 'card' | 'table';

const DEMO_SNIPPETS: Record<
  StageDemoId,
  {
    selector: string;
    dims: string;
    rawTokens: string;
    cleanTokens: string;
    savedPct: string;
    duration: string;
    swatches: string[];
    codeZh: string;
    codeEn: string;
  }
> = {
  card: {
    selector: 'article.tier-pro',
    dims: '312 × 246 px',
    rawTokens: '3,840',
    cleanTokens: '218',
    savedPct: '-94.3%',
    duration: '3.6 ms',
    swatches: ['#141413', '#F5F4EF', '#D94E28', '#DFDDD4'],
    codeZh: `请 1:1 还原以下组件（Tailwind CSS）：
## 设计规范（自动提取）
- 配色: #141413, #F5F4EF, #D94E28
- 圆角: 12px, 8px · 字体: Inter

<article class="rounded-xl border p-5 bg-white">
  <div class="flex items-center justify-between">
    <h3 class="font-bold text-[#141413]">Team Pro</h3>
    <span class="font-mono text-xs text-[#D94E28]">PRO</span>
  </div>
  <p class="mt-2 text-3xl font-extrabold">$29/mo</p>
  <button class="mt-4 w-full rounded-lg bg-[#141413] py-2 text-white">
    Start 14-Day Trial
  </button>
</article>`,
    codeEn: `# AnyGrab Distilled UI Context
## Design Tokens
- Colors: #141413, #F5F4EF, #D94E28
- Radii: 12px, 8px · Font: Inter

<article class="rounded-xl border p-5 bg-white">
  <div class="flex items-center justify-between">
    <h3 class="font-bold text-[#141413]">Team Pro</h3>
    <span class="font-mono text-xs text-[#D94E28]">PRO</span>
  </div>
  <p class="mt-2 text-3xl font-extrabold">$29/mo</p>
  <button class="mt-4 w-full rounded-lg bg-[#141413] py-2 text-white">
    Start 14-Day Trial
  </button>
</article>`,
  },
  table: {
    selector: 'table.fin-ledger',
    dims: '336 × 214 px',
    rawTokens: '4,620',
    cleanTokens: '194',
    savedPct: '-95.8%',
    duration: '2.9 ms',
    swatches: ['#FFFFFF', '#ECEAE3', '#141413', '#15803D'],
    codeZh: `请完整保留跨行列合并表头还原以下报表：
<table class="w-full border-collapse text-xs">
  <thead>
    <tr class="bg-[#ECEAE3]">
      <th rowspan="2" class="border p-2">大区</th>
      <th colspan="2" class="border p-2">2026 H1 ($M)</th>
    </tr>
    <tr class="bg-[#ECEAE3]">
      <th class="border p-2">Q1</th>
      <th class="border p-2">Q2</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td class="border p-2">APAC</td>
      <td class="border p-2">$42.8M</td>
      <td class="border p-2 font-bold">$58.4M</td>
    </tr>
  </tbody>
</table>`,
    codeEn: `# Intact Merged Table (rowspan + colspan)
<table class="w-full border-collapse text-xs">
  <thead>
    <tr class="bg-[#ECEAE3]">
      <th rowspan="2" class="border p-2">Region</th>
      <th colspan="2" class="border p-2">2026 H1 ($M)</th>
    </tr>
    <tr class="bg-[#ECEAE3]">
      <th class="border p-2">Q1</th>
      <th class="border p-2">Q2</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td class="border p-2">APAC</td>
      <td class="border p-2">$42.8M</td>
      <td class="border p-2 font-bold">$58.4M</td>
    </tr>
  </tbody>
</table>`,
  },
};

export function OverviewView({ locale, onNavigate }: OverviewViewProps) {
  const isZh = locale === 'zh-CN';
  const [copiedCli, setCopiedCli] = useState(false);
  const [copiedStage, setCopiedStage] = useState(false);
  const [stageDemo, setStageDemo] = useState<StageDemoId>('card');

  const activeDemo = DEMO_SNIPPETS[stageDemo];
  const stageCode = isZh ? activeDemo.codeZh : activeDemo.codeEn;

  const handleCopyCli = () => {
    try {
      void navigator.clipboard?.writeText(CLI_CMD)?.catch(() => {});
    } catch {
      // Ignore in headless environments
    }
    setCopiedCli(true);
    setTimeout(() => setCopiedCli(false), 1800);
  };

  const handleCopyStage = () => {
    try {
      void navigator.clipboard?.writeText(stageCode)?.catch(() => {});
    } catch {
      // Ignore in headless environments
    }
    setCopiedStage(true);
    setTimeout(() => setCopiedStage(false), 1800);
  };

  return (
    <section aria-label="Product Overview" className="space-y-16 pt-1 pb-8 sm:space-y-24 sm:pt-4">
      {/* 1. Asymmetric Split Hero: Editorial Pitch (Left) + Precision Optical Viewfinder Stage (Right) */}
      <div className="grid items-center gap-6 lg:grid-cols-12 lg:gap-10">
        {/* Left Column (42%): Compact on mobile so Optical Stage appears inside first 844px fold */}
        <div className="space-y-3.5 sm:space-y-5 lg:col-span-5">
          <div className="flex items-center gap-2 text-xs leading-[1.5] font-medium text-[var(--ag-text-secondary)]">
            <span
              aria-hidden="true"
              className="inline-block h-2 w-2 shrink-0 rounded-[2px] bg-[var(--ag-accent)]"
            />
            <span>
              {isZh
                ? 'MIT 开源 · 专为 反重力 (Antigravity) · Codex · Cursor 打造'
                : 'MIT Open Source · Built for Antigravity · Codex · Cursor'}
            </span>
          </div>

          <h1 className="text-[26px] leading-[1.25] font-extrabold tracking-[-0.03em] text-[#141413] sm:text-[38px] lg:text-[40px]">
            {isZh ? (
              <>
                看中任何网页组件，
                <br />
                <span className="underline decoration-[var(--ag-accent)] decoration-[3px] underline-offset-[6px]">
                  点一下就能喂给 AI 1:1 复刻
                </span>
              </>
            ) : (
              <>
                Spot any great UI or table?{' '}
                <span className="underline decoration-[var(--ag-accent)] decoration-[3px] underline-offset-[6px]">
                  Grab it in 1 click for Coding Agents!
                </span>
              </>
            )}
          </h1>

          <p className="max-w-[510px] text-[13.5px] leading-[1.65] text-[var(--ag-text-secondary)] sm:text-[15px] sm:leading-[1.7]">
            {isZh
              ? '告别让 AI 盲猜色号的截图，也无需复制几万行 F12 乱码。AnyGrab 在本地 4 毫秒内剔除 90% 冗余嵌套，提纯精准色板、Tailwind 样式与完整合并表格——零联网、零 API 费用。'
              : 'Stop sending blurry screenshots or 50,000 lines of DevTools DOM bloat. AnyGrab distills live webpages locally in 4ms into clean Tailwind v4 classes, palettes, and intact merged tables — $0 API cost.'}
          </p>

          {/* Primary + Secondary Button Pair + Quiet Companion Link */}
          <div className="space-y-2.5 pt-0.5">
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={() => onNavigate('quickstart')}
                className="inline-flex items-center gap-2 rounded-[8px] bg-[#141413] px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-[#292926] sm:px-5 sm:py-3 sm:text-sm"
              >
                <Download className="h-4 w-4" />
                <span>{isZh ? '30 秒安装 Chrome 插件' : 'Install Chrome Extension'}</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('playground')}
                className="inline-flex items-center gap-2 rounded-[8px] border border-[var(--ag-border-strong)] bg-white px-3.5 py-2.5 text-[13px] font-semibold text-[#141413] transition hover:bg-[var(--ag-bg-subtle)]/70 sm:px-4 sm:py-3 sm:text-sm"
              >
                <Play className="h-3.5 w-3.5 text-[var(--ag-accent)]" />
                <span>{isZh ? '免安装在线试玩' : 'Live Playground'}</span>
              </button>
            </div>

            <div>
              <button
                type="button"
                onClick={() => onNavigate('workflows')}
                className="inline-flex items-center gap-1.5 text-xs leading-[1.55] font-semibold text-[var(--ag-text-secondary)] transition hover:text-[var(--ag-accent)]"
              >
                <span>
                  {isZh
                    ? '查看如何配合反重力 / Codex 使用（含现成提问话术）'
                    : 'See 3 workflows with Antigravity & Codex (with copyable prompts)'}
                </span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Full Un-truncated CLI Bar (Zero filler clutter, wraps cleanly on 390px mobile) */}
          <div className="flex items-center justify-between gap-2 rounded-[8px] border border-[var(--ag-border)] bg-white px-3 py-2">
            <div className="flex min-w-0 items-start gap-1.5 font-mono text-[11px] leading-[1.45] text-[#141413] sm:items-center sm:text-xs">
              <span className="select-none font-bold text-[var(--ag-accent)]">$</span>
              <code className="whitespace-normal sm:whitespace-nowrap">{CLI_CMD}</code>
            </div>
            <button
              type="button"
              onClick={handleCopyCli}
              className="inline-flex shrink-0 items-center gap-1 rounded-[5px] border border-[var(--ag-border)] bg-[var(--ag-bg-canvas)] px-2 py-1 text-[11.5px] font-medium text-[#141413] transition hover:border-[var(--ag-border-strong)] hover:bg-[var(--ag-bg-subtle)]"
            >
              {copiedCli ? (
                <>
                  <Check className="h-3 w-3 text-[var(--ag-success)]" />
                  <span>{isZh ? '已复制' : 'Copied'}</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 text-[var(--ag-text-secondary)]" />
                  <span>{isZh ? '复制' : 'Copy'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column (58%): High-Salience Optical Viewfinder Stage */}
        <div className="lg:col-span-7">
          <div className="overflow-hidden rounded-[12px] border border-[#141413]/20 bg-white shadow-[0_22px_54px_-26px_rgba(20,20,19,0.2)]">
            {/* Viewfinder Top Telemetry Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--ag-border)] bg-[#FAF9F5] px-3.5 py-2 sm:px-4">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setStageDemo('card')}
                  className={`rounded-[5px] px-2.5 py-1 text-xs font-semibold transition ${
                    stageDemo === 'card'
                      ? 'bg-[#141413] text-white'
                      : 'text-[var(--ag-text-secondary)] hover:bg-[var(--ag-bg-subtle)] hover:text-[#141413]'
                  }`}
                >
                  {isZh ? '01 · 界面卡片选框' : '01 · SaaS Card'}
                </button>
                <button
                  type="button"
                  onClick={() => setStageDemo('table')}
                  className={`rounded-[5px] px-2.5 py-1 text-xs font-semibold transition ${
                    stageDemo === 'table'
                      ? 'bg-[#141413] text-white'
                      : 'text-[var(--ag-text-secondary)] hover:bg-[var(--ag-bg-subtle)] hover:text-[#141413]'
                  }`}
                >
                  {isZh ? '02 · 跨行列合并表' : '02 · Merged Table'}
                </button>
              </div>

              <div className="ag-tabular flex items-center gap-2 font-mono text-[11px]">
                <span className="text-[var(--ag-text-muted)] line-through">
                  {activeDemo.rawTokens} tok
                </span>
                <span className="rounded-[4px] bg-[var(--ag-accent-soft)] px-1.5 py-0.5 font-bold text-[var(--ag-accent)]">
                  → {activeDemo.cleanTokens} tok ({activeDemo.savedPct})
                </span>
              </div>
            </div>

            {/* Split Stage Body: Left Optical Camera Viewfinder | Right Carbon Terminal */}
            <div className="grid md:grid-cols-12">
              {/* Left Half: Surrounded by dimmed webpage noise so the Vermilion Optical Reticle dominates at 480px */}
              <div className="relative flex flex-col justify-between overflow-hidden border-b border-[var(--ag-border)] bg-[#EFEDE6] p-4 sm:p-5 md:col-span-6 md:border-r md:border-b-0">
                {/* Optical Crosshair Guide Lines extending across the stage */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-[var(--ag-accent)]/30"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 left-1/2 border-l border-dashed border-[var(--ag-accent)]/30"
                />

                <div className="relative z-10 mb-2 flex items-center justify-between font-mono text-[10.5px] text-[var(--ag-text-secondary)]">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-[#141413]">
                    <span className="h-2 w-2 rounded-full bg-[var(--ag-accent)]" />
                    {isZh ? '光学取景锁定' : 'OPTICAL LOCK'}
                  </span>
                  <span className="rounded-[4px] border border-[var(--ag-border-strong)] bg-white/80 px-1.5 py-0.5 text-[10px]">
                    Alt+Shift+G
                  </span>
                </div>

                {/* Dimmed surrounding noisy DOM skeleton (top) */}
                <div
                  aria-hidden="true"
                  className="relative z-10 mb-2.5 truncate font-mono text-[10px] text-[#78766F]/65 select-none"
                >
                  &lt;div class=&quot;css-19x82a sc-layoutWrap _shell_9x&quot;&gt;
                </div>

                {/* Bold Signal Vermilion (#D94E28) Optical Reticle Frame with 4 L-Brackets */}
                <div key={stageDemo} className="ag-reticle-snap relative z-10 my-auto">
                  {/* Prominent Top Vermilion Readout Flag */}
                  <div className="ag-tabular inline-flex items-center gap-1.5 rounded-t-[5px] bg-[var(--ag-accent)] px-2.5 py-1 font-mono text-[10.5px] font-bold text-white shadow-xs">
                    <span>{activeDemo.selector}</span>
                    <span className="opacity-75">·</span>
                    <span>{activeDemo.dims}</span>
                  </div>

                  <div className="relative rounded-b-[6px] rounded-tr-[6px] border-[2.5px] border-[var(--ag-accent)] bg-white p-3.5 shadow-[0_14px_32px_-12px_rgba(217,78,40,0.32)]">
                    {/* 4 Bold Optical Camera Viewfinder L-Corners */}
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute -top-[6px] -left-[6px] h-3.5 w-3.5 border-t-[3px] border-l-[3px] border-[#141413]"
                    />
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute -top-[6px] -right-[6px] h-3.5 w-3.5 border-t-[3px] border-r-[3px] border-[#141413]"
                    />
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute -bottom-[6px] -left-[6px] h-3.5 w-3.5 border-b-[3px] border-l-[3px] border-[#141413]"
                    />
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute -right-[6px] -bottom-[6px] h-3.5 w-3.5 border-r-[3px] border-b-[3px] border-[#141413]"
                    />

                    {stageDemo === 'card' ? (
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-[#141413]">Team Pro</span>
                          <span className="rounded-[4px] bg-[var(--ag-accent-soft)] px-1.5 py-0.5 font-mono text-[10px] font-bold text-[var(--ag-accent)]">
                            PRO
                          </span>
                        </div>
                        <div className="ag-tabular mt-2 flex items-baseline gap-1">
                          <span className="text-2xl font-extrabold tracking-tight text-[#141413]">
                            $29
                          </span>
                          <span className="text-xs text-[var(--ag-text-muted)]">/ mo</span>
                        </div>
                        <ul className="mt-2.5 space-y-1 text-xs leading-[1.5] text-[var(--ag-text-secondary)]">
                          <li>✓ Unlimited UI &amp; token grabs</li>
                          <li>✓ Exact :hover &amp; Tailwind v4</li>
                        </ul>
                        <div className="mt-3 rounded-[6px] bg-[#141413] py-1.5 text-center text-xs font-semibold text-white">
                          Start 14-Day Trial
                        </div>
                      </div>
                    ) : (
                      <div className="overflow-hidden rounded-[6px] border border-[var(--ag-border)] bg-white">
                        <table className="ag-tabular w-full border-collapse text-[11px] text-[#141413]">
                          <thead>
                            <tr className="bg-[var(--ag-bg-subtle)] font-semibold">
                              <th
                                rowSpan={2}
                                className="border border-[var(--ag-border)] px-2 py-1.5 text-left"
                              >
                                {isZh ? '大区' : 'Region'}
                              </th>
                              <th
                                colSpan={2}
                                className="border border-[var(--ag-border)] px-2 py-1 text-right"
                              >
                                2026 H1 ($M)
                              </th>
                            </tr>
                            <tr className="bg-[var(--ag-bg-subtle)] text-[var(--ag-text-secondary)]">
                              <th className="border border-[var(--ag-border)] px-2 py-1 text-right">
                                Q1
                              </th>
                              <th className="border border-[var(--ag-border)] px-2 py-1 text-right">
                                Q2
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="border border-[var(--ag-border)] px-2 py-1.5 font-medium">
                                APAC
                              </td>
                              <td className="border border-[var(--ag-border)] px-2 py-1.5 text-right">
                                $42.8M
                              </td>
                              <td className="border border-[var(--ag-border)] px-2 py-1.5 text-right font-semibold">
                                $58.4M
                              </td>
                            </tr>
                            <tr className="bg-[#FAF9F5]">
                              <td className="border border-[var(--ag-border)] px-2 py-1.5 font-medium">
                                NA &amp; EU
                              </td>
                              <td className="border border-[var(--ag-border)] px-2 py-1.5 text-right">
                                $61.0M
                              </td>
                              <td className="border border-[var(--ag-border)] px-2 py-1.5 text-right font-semibold">
                                $79.5M
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                {/* Dimmed surrounding noisy DOM footer */}
                <div className="relative z-10 mt-2.5 flex items-center justify-between text-[10.5px] leading-[1.4] text-[var(--ag-text-secondary)]">
                  <span>{isZh ? '剥离 20 层空壳与乱码类名' : '20 wrapper layers stripped'}</span>
                  <span className="ag-tabular font-mono font-semibold text-[#141413]">
                    {activeDemo.duration}
                  </span>
                </div>
              </div>

              {/* Right Half: 10% Matte Carbon Terminal with Clean Line Wrapping (Zero Edge Clipping) */}
              <div className="flex flex-col justify-between bg-[var(--ag-bg-stage)] p-4 text-[#EEEDE8] md:col-span-6">
                <div className="mb-2 flex items-center justify-between gap-2 border-b border-white/10 pb-2">
                  <span className="font-mono text-[11px] text-[#B4B2A9]">
                    {isZh ? '2. 提纯输出 (直接粘贴给 AI)' : '2. Clean AI Context'}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyStage}
                    className="inline-flex items-center gap-1 rounded-[5px] bg-[#262624] px-2 py-1 text-[11px] font-medium text-[#FAF9F5] transition hover:bg-[var(--ag-accent)]"
                  >
                    {copiedStage ? (
                      <>
                        <Check className="h-3 w-3 text-[#4ADE80]" />
                        <span>{isZh ? '已复制' : 'Copied'}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>{isZh ? '复制示例' : 'Copy'}</span>
                      </>
                    )}
                  </button>
                </div>

                <pre
                  key={`code-${stageDemo}`}
                  className="ag-code-cut max-h-[256px] flex-1 overflow-y-auto font-mono text-[10.5px] leading-[1.58] whitespace-pre-wrap break-words text-[#E5E4DF]"
                >
                  <code>{stageCode}</code>
                </pre>

                <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-white/10 pt-2 font-mono text-[10px] text-[#A3A198]">
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="shrink-0 whitespace-nowrap">{isZh ? '色板:' : 'Tokens:'}</span>
                    {activeDemo.swatches.map((hex) => (
                      <span
                        key={hex}
                        className="inline-flex items-center gap-1 rounded-[4px] bg-[#1F1F1D] px-1 py-0.5 text-[#D8D6CE]"
                      >
                        <span
                          className="h-2 w-2 rounded-[2px] border border-white/20"
                          style={{ backgroundColor: hex }}
                        />
                        <span>{hex}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Open Archival Comparison Matrix (Breaks L/R Split Repetition & Eliminates White-Box Nesting) */}
      <div className="space-y-8 border-t border-[var(--ag-border)] pt-14">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-[680px] space-y-2">
            <div className="font-mono text-[11px] font-semibold tracking-wider text-[var(--ag-accent)] uppercase">
              01 / CONTEXT PRECISION
            </div>
            <h2 className="text-2xl leading-[1.38] font-extrabold tracking-[-0.02em] text-[#141413]">
              {isZh
                ? '为什么以前让 AI 抄网页总是「又慢又不像」？'
                : 'Why Traditional UI Cloning Workflows Fail Coding Agents'}
            </h2>
            <p className="text-sm leading-[1.7] text-[var(--ag-text-secondary)]">
              {isZh
                ? '对比三种把参考网页喂给 AI 编程工具的真实表现：截图丢了精确数值，F12 源码塞满噪音，只有确定性语法树提纯能兼顾高还原与低消耗。'
                : 'Screenshots lose exact CSS scales, while raw DevTools HTML drowns context windows in wrapper noise. Deterministic AST distillation preserves signal without bloat.'}
            </p>
          </div>

          <div className="ag-tabular flex items-center gap-8 border-l-2 border-[var(--ag-border-strong)] pl-5">
            <div>
              <div className="text-2xl font-extrabold tracking-tight text-[#141413]">99.6</div>
              <div className="text-xs leading-[1.5] text-[var(--ag-text-muted)]">
                {isZh ? 'AnyGrab-Bench 还原分' : 'Benchmark Fidelity'}
              </div>
            </div>
            <div>
              <div className="text-2xl font-extrabold tracking-tight text-[var(--ag-accent)]">
                -89.3%
              </div>
              <div className="text-xs leading-[1.5] text-[var(--ag-text-muted)]">
                {isZh ? '剔除冗余代码体积' : 'Wrapper Noise Stripped'}
              </div>
            </div>
          </div>
        </div>

        {/* 3-Column Open Ledger Directly on Archival Paper — Only Column 3 (AnyGrab) is Elevated */}
        <div className="grid gap-0 border-t border-b border-[var(--ag-border-strong)] lg:grid-cols-3 lg:divide-x lg:divide-[var(--ag-border-strong)]">
          {/* Column 1: Screenshots (Open Paper Cell) */}
          <div className="space-y-2.5 border-b border-[var(--ag-border)] py-6 lg:border-b-0 lg:pr-8">
            <div className="flex items-center justify-between font-mono text-xs">
              <span className="font-semibold text-[var(--ag-text-muted)]">
                {isZh ? '传统痛点 ① · 发截图' : 'Old Way 1 · Screenshots'}
              </span>
              <span className="ag-tabular text-[var(--ag-text-secondary)]">
                {isZh ? '还原度 ~50%' : '~50% Accuracy'}
              </span>
            </div>
            <h3 className="text-[15.5px] leading-[1.4] font-bold text-[#141413]">
              {isZh ? '发截图让 AI 凭肉眼「瞎猜」' : 'Screenshots Force AI to Guess'}
            </h3>
            <p className="text-[13.5px] leading-[1.68] text-[var(--ag-text-secondary)]">
              {isZh
                ? '图片里没有精确字号、间距数值和色号，鼠标放上去的悬停变色也截不到；遇到跨行跨列的复杂报表更是经常串行漏列，来回改五遍还是歪的。'
                : 'Pixels lack exact spacing scales, hex codes, and :hover states. Complex multi-header tables frequently misalign or drop merged columns.'}
            </p>
          </div>

          {/* Column 2: Raw DevTools HTML (Open Paper Cell) */}
          <div className="space-y-2.5 border-b border-[var(--ag-border)] py-6 lg:border-b-0 lg:px-8">
            <div className="flex items-center justify-between font-mono text-xs">
              <span className="font-semibold text-[var(--ag-text-muted)]">
                {isZh ? '传统痛点 ② · F12 扒源码' : 'Old Way 2 · Raw DevTools HTML'}
              </span>
              <span className="ag-tabular text-[var(--ag-text-secondary)]">
                {isZh ? '体积暴涨 +280%' : '+280% Token Bloat'}
              </span>
            </div>
            <h3 className="text-[15.5px] leading-[1.4] font-bold text-[#141413]">
              {isZh ? '复制几万行垃圾代码塞爆对话框' : 'Raw DOM Floods Context Quota'}
            </h3>
            <p className="text-[13.5px] leading-[1.68] text-[var(--ag-text-secondary)]">
              {isZh
                ? '现代网站塞满了 css-19x82a 乱码类名、几百行图标路径和二十层空壳 div。直接粘贴不仅瞬间烧光反重力 / Codex 额度，还会让 AI 注意力涣散报错。'
                : 'Modern pages carry thousands of CSS-in-JS hashes, giant SVG path strings, and 20-layer wrapper soup — burning quota and confusing LLMs.'}
            </p>
          </div>

          {/* Column 3: AnyGrab Solution (Elevated Focal Specimen Cell) */}
          <div className="space-y-2.5 bg-white p-6 shadow-[0_8px_24px_-16px_rgba(20,20,19,0.12)] lg:border-t-[3px] lg:border-t-[var(--ag-accent)]">
            <div className="flex items-center justify-between font-mono text-xs">
              <span className="font-bold text-[var(--ag-accent)]">
                {isZh ? 'AnyGrab 方案 · 4ms 提纯' : 'AnyGrab · 4ms Distillation'}
              </span>
              <span className="ag-tabular font-bold text-[#141413]">99.6 / 100</span>
            </div>
            <h3 className="text-[15.5px] leading-[1.4] font-bold text-[#141413]">
              {isZh
                ? '砍掉 85%~96% 废话，保留 100% 视觉与表格结构'
                : 'Strip 85%–96% Noise, Keep 100% UI & Table Signal'}
            </h3>
            <p className="text-[13.5px] leading-[1.68] text-[var(--ag-text-secondary)]">
              {isZh
                ? '自动把网页真实外观逆向编译为干净的 Tailwind 代码、设计色板与无损合并表格，自带中文复刻提示词，粘进反重力或 Codex 一次成型。'
                : 'Deterministically compiles real CSS into clean Tailwind v4 classes, extracts Design Tokens, and keeps rowspan/colspan tables 100% intact.'}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Open Typographic Process Timeline Directly on Archival Paper (Zero Card-Box Soup, Zero Filler Footnotes) */}
      <div className="space-y-8 pt-2">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="font-mono text-[11px] font-semibold tracking-wider text-[var(--ag-accent)] uppercase">
              02 / THREE-STEP WORKFLOW
            </div>
            <h2 className="mt-2 text-2xl leading-[1.4] font-extrabold tracking-[-0.02em] text-[#141413]">
              {isZh
                ? '三步上手：网页点一下 → 粘进反重力 / Codex → 1:1 完美还原'
                : 'Three Simple Steps: Click Element → Paste into AI → 1:1 UI'}
            </h2>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('workflows')}
            className="inline-flex items-center gap-1.5 rounded-[8px] border border-[var(--ag-border-strong)] bg-white px-4 py-2 text-xs font-semibold text-[#141413] transition hover:bg-[var(--ag-bg-subtle)]"
          >
            <span>
              {isZh ? '查看 3 种实战玩法与提问话术' : 'Explore 3 AI Workflows & Prompts'}
            </span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {/* Step 01 */}
          <div className="border-t-2 border-[var(--ag-accent)] pt-4">
            <div className="ag-tabular font-mono text-xs font-bold text-[var(--ag-accent)]">
              01 / SELECT
            </div>
            <h3 className="mt-2.5 text-base leading-[1.4] font-bold text-[#141413]">
              {isZh
                ? '第 1 步：在任意网页点选你要的组件'
                : 'Step 1: Point & Click Any Webpage Block'}
            </h3>
            <p className="mt-2 text-[13.5px] leading-[1.68] text-[var(--ag-text-secondary)]">
              {isZh
                ? '按下快捷键 Alt+Shift+G 开启橙红光学取景框。鼠标指到按钮、定价卡或大表格上（按 ↑ 键可扩大选中整张卡片），左键一点即自动提纯并复制。'
                : 'Press Alt+Shift+G on any webpage. Hover over any button, card, or table (press ArrowUp to expand to parent container) and click once to copy.'}
            </p>
          </div>

          {/* Step 02 */}
          <div className="border-t-2 border-[#141413] pt-4">
            <div className="ag-tabular font-mono text-xs font-bold text-[#141413]">
              02 / PASTE
            </div>
            <h3 className="mt-2.5 text-base leading-[1.4] font-bold text-[#141413]">
              {isZh
                ? '第 2 步：切到【反重力 / Codex】直接粘贴'
                : 'Step 2: Paste Straight into Antigravity / Codex'}
            </h3>
            <p className="mt-2 text-[13.5px] leading-[1.68] text-[var(--ag-text-secondary)]">
              {isZh
                ? '不用自己苦想提示词。复制内容顶部已自动附带中文复刻指令、提取色板与干净代码，切到聊天框直接按 Cmd+V 回车即可。'
                : 'Zero prompt engineering needed. Your clipboard holds a structured instruction header, Design Tokens, and clean markup — just hit Cmd+V + Enter.'}
            </p>
          </div>

          {/* Step 03 */}
          <div className="border-t-2 border-[#141413] pt-4">
            <div className="ag-tabular font-mono text-xs font-bold text-[#141413]">
              03 / SHIP
            </div>
            <h3 className="mt-2.5 text-base leading-[1.4] font-bold text-[#141413]">
              {isZh
                ? '第 3 步：AI 一次输出可运行的同款代码'
                : 'Step 3: Get Production-Ready Code on First Try'}
            </h3>
            <p className="mt-2 text-[13.5px] leading-[1.68] text-[var(--ag-text-secondary)]">
              {isZh
                ? '因为喂给 AI 的是准确的 Tailwind 类名、真实色号和完整表格结构，AI 不再瞎猜跑偏，一次性生成可直接接入项目的组件代码。'
                : 'Because the agent receives exact Tailwind v4 utilities, hex tokens, and colspan/rowspan structure, it nails the UI in a single turn.'}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
