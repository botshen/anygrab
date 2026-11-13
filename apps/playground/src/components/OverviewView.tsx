import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowDown, Check, Copy, Layers, Sparkles, Terminal } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ActiveTab } from '../data/types';
import type { SiteLocale } from '../i18n';
import { isDesktopViewport, isMotionCapableBrowser } from '../utils/motion';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

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
  durationMs: string;
  swatches: string[];
  codeSnippet: string;
}

const STAGE_SPECIMENS: StageSpecimen[] = [
  {
    id: 'pricing',
    selector: 'article.tier-pro',
    labelZh: 'Pro 定价卡',
    labelEn: 'Pro Pricing Card',
    rawTokens: '3,840',
    cleanTokens: '218',
    savedPct: '-94.3%',
    durationMs: '3.4 ms',
    swatches: ['#08090C', '#FF4D1C', '#10B981', '#F4F5F8'],
    codeSnippet: `<article class="rounded-2xl border border-white/10 bg-[#101217] p-5">
  <span class="font-mono text-[11px] text-[#FF4D1C]">PRO</span>
  <h3 class="mt-1 font-bold text-[#F4F5F8]">Team Pro</h3>
  <div class="mt-2 text-3xl font-extrabold">$29/mo</div>
  <button class="mt-4 w-full rounded-lg border border-white/15 py-2">
    Deploy Component
  </button>
</article>`,
  },
  {
    id: 'metrics',
    selector: 'div.mrr-spark-tile',
    labelZh: 'MRR 增长卡',
    labelEn: 'MRR Sparkline',
    rawTokens: '6,120',
    cleanTokens: '164',
    savedPct: '-97.3%',
    durationMs: '2.8 ms',
    swatches: ['#101217', '#10B981', '#F4F5F8', '#A1A7B5'],
    codeSnippet: `<section class="rounded-2xl border border-white/10 bg-[#101217] p-5">
  <div class="text-xs text-[#A1A7B5]">NET MRR</div>
  <div class="mt-1 flex items-baseline gap-2">
    <span class="text-2xl font-bold tabular-nums">$148,420</span>
    <span class="text-xs font-mono text-[#10B981]">+32.8%</span>
  </div>
</section>`,
  },
  {
    id: 'table',
    selector: 'table.fin-ledger',
    labelZh: '合并财务表',
    labelEn: 'Merged Table',
    rawTokens: '4,620',
    cleanTokens: '194',
    savedPct: '-95.8%',
    durationMs: '3.1 ms',
    swatches: ['#0B0D12', '#171A22', '#F4F5F8', '#10B981'],
    codeSnippet: `<table class="w-full border-collapse text-xs tabular-nums">
  <thead>
    <tr><th rowspan="2">Region</th><th colspan="2">FY26 H1</th></tr>
    <tr><th>Q1</th><th>Q2</th></tr>
  </thead>
  <tbody><tr><td>APAC</td><td>$42.8M</td><td>$58.4M</td></tr></tbody>
</table>`,
  },
];

function ReticleBrackets() {
  return (
    <>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-0 h-3.5 w-3.5 border-t-2 border-l-2 border-[var(--ag-accent)]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-0 right-0 h-3.5 w-3.5 border-t-2 border-r-2 border-[var(--ag-accent)]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 h-3.5 w-3.5 border-b-2 border-l-2 border-[var(--ag-accent)]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-0 bottom-0 h-3.5 w-3.5 border-r-2 border-b-2 border-[var(--ag-accent)]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-1/2 h-2 w-px -translate-x-1/2 bg-[var(--ag-accent)]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-1/2 h-2 w-px -translate-x-1/2 bg-[var(--ag-accent)]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-0 h-px w-2 -translate-y-1/2 bg-[var(--ag-accent)]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-0 h-px w-2 -translate-y-1/2 bg-[var(--ag-accent)]"
      />
    </>
  );
}

export function OverviewView({ locale, onNavigate }: OverviewViewProps) {
  const isZh = locale === 'zh-CN';
  const [activeIdx, setActiveIdx] = useState<number>(0);
  const [isHoveringStage, setIsHoveringStage] = useState<boolean>(false);
  const [copiedCli, setCopiedCli] = useState<boolean>(false);
  const [xrayStep, setXrayStep] = useState<number>(0);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const reticleGlowRef = useRef<HTMLDivElement | null>(null);
  const xrayWrapperRef = useRef<HTMLDivElement | null>(null);
  const noiseLayerRef = useRef<HTMLDivElement | null>(null);
  const tokenLayerRef = useRef<HTMLDivElement | null>(null);
  const cleanLayerRef = useRef<HTMLDivElement | null>(null);
  const xrayBeamRef = useRef<HTMLDivElement | null>(null);

  const activeSpecimen = STAGE_SPECIMENS[activeIdx] ?? STAGE_SPECIMENS[0];

  useEffect(() => {
    if (!isMotionCapableBrowser() || isHoveringStage) return;
    const id = window.setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % STAGE_SPECIMENS.length);
    }, 2600);
    return () => window.clearInterval(id);
  }, [isHoveringStage]);

  useEffect(() => {
    if (!isMotionCapableBrowser()) return;
    const stageEl = stageRef.current;
    const glowEl = reticleGlowRef.current;
    if (!stageEl || !glowEl) return;

    let rafId = 0;
    let targetX = 50;
    let targetY = 48;
    let currentX = 50;
    let currentY = 48;

    const tick = () => {
      currentX += (targetX - currentX) * 0.14;
      currentY += (targetY - currentY) * 0.14;
      glowEl.style.background = `radial-gradient(280px circle at ${currentX}% ${currentY}%, rgba(255, 77, 28, 0.14), transparent 72%)`;
      if (Math.abs(targetX - currentX) > 0.05 || Math.abs(targetY - currentY) > 0.05) {
        rafId = window.requestAnimationFrame(tick);
      } else {
        rafId = 0;
      }
    };

    const onMove = (e: MouseEvent) => {
      const rect = stageEl.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      targetX = ((e.clientX - rect.left) / rect.width) * 100;
      targetY = ((e.clientY - rect.top) / rect.height) * 100;
      if (!rafId) {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    stageEl.addEventListener('mousemove', onMove);
    return () => {
      stageEl.removeEventListener('mousemove', onMove);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  // GSAP ScrollTrigger pinned 3D Stacked X-Ray Peel (true axonometric layer separation)
  useEffect(() => {
    if (!isMotionCapableBrowser() || !isDesktopViewport()) return;
    const wrapper = xrayWrapperRef.current;
    const noiseEl = noiseLayerRef.current;
    const tokenEl = tokenLayerRef.current;
    const cleanEl = cleanLayerRef.current;
    const beamEl = xrayBeamRef.current;
    if (!wrapper || !noiseEl || !tokenEl || !cleanEl) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: wrapper,
          start: 'top 92px',
          end: '+=520',
          scrub: 0.45,
          pin: true,
          anticipatePin: 1,
          onUpdate: (self) => {
            const p = self.progress;
            if (p < 0.34) setXrayStep(0);
            else if (p < 0.68) setXrayStep(1);
            else setXrayStep(2);
          },
        },
      });

      // Phase 1: Top DOM waste membrane peels upward-left & fades to translucent ghost
      tl.fromTo(
        noiseEl,
        { y: 0, x: 0, scale: 1, opacity: 0.98 },
        { y: -112, x: -34, scale: 0.91, opacity: 0.28, ease: 'none', duration: 0.5 },
        0,
      );

      if (beamEl) {
        tl.fromTo(
          beamEl,
          { yPercent: 0, opacity: 0.9 },
          { yPercent: 260, opacity: 0.45, ease: 'none', duration: 0.9 },
          0,
        );
      }

      // Phase 2: Middle Token Palette sheet slides right & fans out cleanly
      tl.fromTo(
        tokenEl,
        { y: 12, x: 10, scale: 0.97, opacity: 0.85 },
        { y: -38, x: 26, scale: 1.0, opacity: 1, ease: 'none', duration: 0.55 },
        0.18,
      );

      // Phase 3: Clean Component Layer rises forward into sharp emerald lock
      tl.fromTo(
        cleanEl,
        { y: 36, x: 24, scale: 0.94 },
        { y: 48, x: 0, scale: 1.02, ease: 'none', duration: 0.6 },
        0.36,
      );
    }, wrapper);

    return () => ctx.revert();
  }, []);

  const handleCopyCli = () => {
    try {
      void navigator.clipboard?.writeText(CLI_QUICK_CMD)?.catch(() => {});
    } catch {
      // Ignore in test env
    }
    setCopiedCli(true);
    setTimeout(() => setCopiedCli(false), 1600);
  };

  return (
    <section
      id="overview"
      aria-label="Product Overview"
      className="min-w-0 space-y-12 sm:space-y-16"
    >
      {/* 1. Centered Monumental Hero + Optical Reticle Theater */}
      <div className="min-w-0 pt-1 text-center sm:pt-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#101217] px-3.5 py-1 font-mono text-[11px] font-medium text-[#A1A7B5]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--ag-emerald)] shadow-[0_0_8px_#10B981]" />
          <span>
            {isZh
              ? 'MIT 开源 · 4.2ms 本地 AST 光学剥离'
              : 'MIT OPEN SOURCE · 4.2MS LOCAL AST ENGINE'}
          </span>
        </div>

        <h1 className="mx-auto mt-4 max-w-4xl text-[clamp(2.35rem,5.4vw,4.5rem)] leading-[1.06] font-extrabold tracking-[-0.038em] text-[#F4F5F8]">
          {isZh ? '点一下，扒走好界面' : 'Point. Click. Ship Clean UI.'}
        </h1>

        <p className="mx-auto mt-3 max-w-2xl px-2 text-[13px] leading-[1.6] text-[#A1A7B5] sm:text-base">
          {isZh ? (
            <>
              剔除 90% 网页废码，直喂{' '}
              <span className="inline-block">反重力 (Antigravity) · Codex · Cursor</span>
            </>
          ) : (
            <>
              Strip 90% DOM bloat in 4ms for{' '}
              <span className="inline-block">Antigravity · Codex · Cursor</span>
            </>
          )}
        </p>

        {/* Primary Action Hierarchy: Solid Vermilion CTA dominates cleanly */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5 px-1">
          <button
            type="button"
            onClick={() => onNavigate('playground')}
            className="inline-flex items-center gap-2 rounded-full bg-[#FF4D1C] px-6 py-2.5 text-sm font-bold text-white shadow-[0_0_32px_-6px_rgba(255,77,28,0.65)] transition hover:brightness-110"
          >
            <span>{isZh ? '打开双沙盒实测' : 'Launch Live Lab'}</span>
            <ArrowDown className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={handleCopyCli}
            className="ag-no-scrollbar inline-flex max-w-full items-center gap-2 overflow-x-auto rounded-full border border-white/12 bg-[#101217] px-4 py-2.5 font-mono text-[11.5px] whitespace-nowrap text-[#A1A7B5] transition hover:border-white/25 hover:text-[#F4F5F8]"
          >
            <Terminal className="h-3.5 w-3.5 shrink-0 text-[var(--ag-accent)]" />
            <span>{CLI_QUICK_CMD}</span>
            {copiedCli ? (
              <Check className="h-3.5 w-3.5 shrink-0 text-[var(--ag-emerald)]" />
            ) : (
              <Copy className="h-3.5 w-3.5 shrink-0 text-[#7C8292]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => onNavigate('quickstart')}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs font-medium text-[#A1A7B5] transition hover:border-white/20 hover:text-[#F4F5F8]"
          >
            <span>{isZh ? 'Chrome 插件下载' : 'Get Extension'}</span>
          </button>
        </div>

        {/* Full-Bleed Kinetic Optical Reticle Stage (min-w-0 prevents mobile overflow) */}
        <div
          ref={stageRef}
          onMouseEnter={() => setIsHoveringStage(true)}
          onMouseLeave={() => setIsHoveringStage(false)}
          className="ag-grid-stage relative mx-auto mt-8 max-w-[1160px] min-w-0 overflow-hidden rounded-2xl border border-white/12 p-3.5 text-left shadow-[0_28px_80px_rgba(0,0,0,0.75)] sm:p-7"
        >
          <div
            ref={reticleGlowRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 transition-opacity duration-300"
          />

          {/* Stage Top Instrument HUD */}
          <div className="relative z-10 flex min-w-0 flex-wrap items-center justify-between gap-2.5 border-b border-white/8 pb-3.5">
            <div className="flex flex-wrap items-center gap-1.5">
              {STAGE_SPECIMENS.map((item, idx) => {
                const selected = idx === activeIdx;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveIdx(idx)}
                    className={`rounded-full px-3 py-1 font-mono text-[11px] transition ${
                      selected
                        ? 'border border-[var(--ag-accent)]/60 bg-[var(--ag-accent-soft)] font-semibold text-[#F4F5F8]'
                        : 'border border-white/8 bg-white/[0.03] text-[#A1A7B5] hover:border-white/20 hover:text-[#F4F5F8]'
                    }`}
                  >
                    {isZh ? item.labelZh : item.labelEn}
                  </button>
                );
              })}
            </div>

            <div className="ag-tabular flex flex-wrap items-center gap-2 font-mono text-[11px]">
              <span className="text-[#7C8292] line-through">{activeSpecimen.rawTokens} tok</span>
              <span className="text-[#A1A7B5]">→</span>
              <span className="rounded-full border border-[var(--ag-emerald)]/40 bg-[var(--ag-emerald-soft)] px-2.5 py-0.5 font-bold text-[#10B981]">
                {activeSpecimen.savedPct} · {activeSpecimen.cleanTokens} tok
              </span>
              <span className="text-[#7C8292]">{activeSpecimen.durationMs}</span>
            </div>
          </div>

          {/* Stage Main Theater: Muted Demo Target Frame (Left) + Extracted Tokens & Code (Right) */}
          <div className="relative z-10 mt-5 grid min-w-0 items-center gap-5 lg:grid-cols-12">
            <div className="relative min-w-0 overflow-hidden rounded-xl border border-white/12 bg-[#101217]/95 p-4 sm:p-5 lg:col-span-6">
              <ReticleBrackets />
              <div
                aria-hidden="true"
                className="ag-scan-beam pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#FF4D1C] to-transparent opacity-80"
              />

              <div className="mb-3 flex items-center justify-between font-mono text-[11px]">
                <span className="truncate font-semibold text-[var(--ag-accent)]">
                  {activeSpecimen.selector}
                </span>
                <span className="shrink-0 text-[#7C8292]">LOCKED</span>
              </div>

              {activeSpecimen.id === 'pricing' && (
                <div className="rounded-xl border border-white/10 bg-[#171A22] p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-[#F4F5F8]">Team Pro</span>
                    <span className="rounded-md bg-[var(--ag-accent-soft)] px-2 py-0.5 font-mono text-[11px] font-semibold text-[var(--ag-accent)]">
                      PRO
                    </span>
                  </div>
                  <div className="ag-tabular mt-2 text-3xl font-extrabold text-[#F4F5F8]">
                    $29<span className="text-xs font-normal text-[#A1A7B5]">/mo</span>
                  </div>
                  <div className="mt-4 flex items-center justify-between rounded-lg border border-white/15 bg-[#222632] px-4 py-2 text-xs font-semibold text-[#F4F5F8]">
                    <span>Deploy Component</span>
                    <span className="text-[#A1A7B5]">→</span>
                  </div>
                </div>
              )}

              {activeSpecimen.id === 'metrics' && (
                <div className="rounded-xl border border-white/10 bg-[#171A22] p-4 sm:p-5">
                  <div className="flex items-center justify-between font-mono text-[11px] text-[#A1A7B5]">
                    <span>NET MRR</span>
                    <span className="text-[#10B981]">+32.8%</span>
                  </div>
                  <div className="ag-tabular mt-1.5 text-3xl font-extrabold text-[#F4F5F8]">
                    $148,420
                  </div>
                  <svg
                    viewBox="0 0 280 54"
                    className="mt-4 h-12 w-full overflow-visible"
                    aria-hidden="true"
                  >
                    <path
                      d="M0 44 L45 38 L92 40 L140 24 L188 28 L235 12 L280 6"
                      fill="none"
                      stroke="#10B981"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              )}

              {activeSpecimen.id === 'table' && (
                <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#171A22] p-3">
                  <table className="ag-tabular w-full border-collapse font-mono text-[11px]">
                    <thead>
                      <tr className="border-b border-white/10 text-[#A1A7B5]">
                        <th rowSpan={2} className="border-r border-white/10 px-2.5 py-2 text-left">
                          Region
                        </th>
                        <th colSpan={2} className="border-b border-white/10 px-2.5 py-1.5">
                          FY26 H1
                        </th>
                      </tr>
                      <tr className="border-b border-white/10 text-[#A1A7B5]">
                        <th className="px-2.5 py-1.5 text-right">Q1</th>
                        <th className="px-2.5 py-1.5 text-right">Q2</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/8 text-[#F4F5F8]">
                      <tr>
                        <td className="border-r border-white/10 px-2.5 py-2">APAC</td>
                        <td className="px-2.5 py-2 text-right">$42.8M</td>
                        <td className="px-2.5 py-2 text-right font-bold text-[#10B981]">
                          $58.4M
                        </td>
                      </tr>
                      <tr>
                        <td className="border-r border-white/10 px-2.5 py-2">NA</td>
                        <td className="px-2.5 py-2 text-right">$61.2M</td>
                        <td className="px-2.5 py-2 text-right font-bold text-[#10B981]">
                          $74.9M
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="min-w-0 space-y-3 lg:col-span-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  {activeSpecimen.swatches.map((hex) => (
                    <span
                      key={hex}
                      className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-[#101217] px-2 py-1 font-mono text-[11px] text-[#F4F5F8]"
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-xs border border-white/20"
                        style={{ backgroundColor: hex }}
                      />
                      {hex}
                    </span>
                  ))}
                </div>
                <span className="font-mono text-[11px] text-[#7C8292]">
                  {isZh ? '纯净输出' : 'AST OUTPUT'}
                </span>
              </div>

              <pre className="rounded-xl border border-white/10 bg-[#08090C]/90 p-3.5 font-mono text-[11px] leading-[1.6] whitespace-pre-wrap break-words text-[#D8DCE6] sm:p-4 sm:text-[11.5px]">
                <code>{activeSpecimen.codeSnippet}</code>
              </pre>
            </div>
          </div>
        </div>

        {/* Open Architectural 3-Column Contrast Strip (NO extra box cards — sits cleanly on #08090C canvas) */}
        <div className="mx-auto mt-6 grid max-w-[1160px] divide-y divide-white/8 border-y border-white/8 text-left sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="px-4 py-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#F4F5F8]">
                {isZh ? '发截图' : 'Screenshots'}
              </span>
              <span className="font-mono text-[11px] text-[#7C8292]">~50 / 100</span>
            </div>
            <div className="mt-1 text-xs text-[#A1A7B5]">
              {isZh ? '丢失精确色号与圆角' : 'Lost hex & border radii'}
            </div>
          </div>

          <div className="px-4 py-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#F4F5F8]">
                {isZh ? 'F12 扒源码' : 'Raw F12 DOM'}
              </span>
              <span className="font-mono text-[11px] text-[var(--ag-accent)]">27k+ tok</span>
            </div>
            <div className="mt-1 text-xs text-[#A1A7B5]">
              {isZh ? '废代码撑爆上下文额度' : 'Bloats context & breaks UI'}
            </div>
          </div>

          <div className="px-4 py-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#F4F5F8]">
                {isZh ? 'AnyGrab 提纯' : 'AnyGrab AST'}
              </span>
              <span className="font-mono text-[11px] font-bold text-[#10B981]">99.6 / 100</span>
            </div>
            <div className="mt-1 text-xs text-[#A1A7B5]">
              {isZh ? '218 tok 直出纯净代码' : '218 tok · Tailwind + Tokens'}
            </div>
          </div>
        </div>
      </div>

      {/* 2. True Pinned 3D Stacked X-Ray Peel Stage (Open canvas + axonometric exploded stack) */}
      <div
        id="xray-stage"
        ref={xrayWrapperRef}
        className="mx-auto max-w-[1160px] min-w-0 border-t border-white/10 pt-10"
      >
        <div className="flex flex-wrap items-end justify-between gap-4 pb-6">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-[#101217] text-[var(--ag-accent)]">
              <Layers className="h-4 w-4" />
            </span>
            <div>
              <div className="font-mono text-[11px] font-semibold tracking-wider text-[var(--ag-accent)] uppercase">
                X-RAY DISSECTION · GSAP SCROLLTRIGGER
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight text-[#F4F5F8] sm:text-3xl">
                {isZh ? '滚轮透视 · 三层剥离' : 'Scroll to Peel DOM'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {[
              { idx: 0, label: isZh ? '01 剥废码' : '01 Strip' },
              { idx: 1, label: isZh ? '02 提令牌' : '02 Tokens' },
              { idx: 2, label: isZh ? '03 出代码' : '03 Code' },
            ].map((step) => (
              <button
                key={step.idx}
                type="button"
                onClick={() => setXrayStep(step.idx)}
                className={`rounded-full px-3 py-1 font-mono text-[11px] transition ${
                  xrayStep === step.idx
                    ? 'bg-[#F4F5F8] font-bold text-[#08090C]'
                    : 'border border-white/10 text-[#A1A7B5] hover:text-[#F4F5F8]'
                }`}
              >
                {step.label}
              </button>
            ))}

            <button
              type="button"
              onClick={() => onNavigate('playground')}
              className="ml-1 inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1 text-[11px] text-[#A1A7B5] transition hover:border-white/25 hover:text-[#F4F5F8]"
            >
              <span>{isZh ? '跳过动效 ↓' : 'Skip ↓'}</span>
            </button>
          </div>
        </div>

        {/* Left: 3D Stacked Axonometric Layers | Right: 3-Phase Live Telemetry Readout */}
        <div className="grid items-center gap-8 lg:grid-cols-12">
          <div
            className="ag-grid-stage relative min-h-[340px] overflow-hidden rounded-2xl border border-white/12 p-5 sm:min-h-[380px] sm:p-8 lg:col-span-7"
            style={{ perspective: '1200px' }}
          >
            <div
              ref={xrayBeamRef}
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 z-30 h-[2px] bg-gradient-to-r from-transparent via-[#FF4D1C] to-transparent"
            />

            <div className="relative mx-auto flex max-w-[440px] flex-col gap-3">
              {/* Layer 1: Top Wireframe Waste Membrane (peels up-left on scroll!) */}
              <div
                ref={noiseLayerRef}
                className={`rounded-xl border bg-[#0B0D12]/95 p-4 backdrop-blur-md transition-colors ${
                  xrayStep === 0
                    ? 'border-[var(--ag-accent)] shadow-[0_0_28px_-8px_rgba(255,77,28,0.5)]'
                    : 'border-white/10'
                }`}
              >
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="font-bold text-[var(--ag-accent)]">01 · NOISE SHELL</span>
                  <span className="text-[#7C8292]">-91.8%</span>
                </div>
                <div className="mt-2 font-mono text-[11px] text-[#7C8292] line-through">
                  &lt;div class=&quot;css-19x82a&quot;&gt; × 20 · 4KB &lt;svg&gt;
                </div>
              </div>

              {/* Layer 2: Design Token Sheet */}
              <div
                ref={tokenLayerRef}
                className={`rounded-xl border bg-[#101217]/95 p-4 backdrop-blur-md transition-colors ${
                  xrayStep === 1
                    ? 'border-[var(--ag-accent)] shadow-[0_0_28px_-8px_rgba(255,77,28,0.45)]'
                    : 'border-white/12'
                }`}
              >
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="font-bold text-[#F4F5F8]">02 · DESIGN TOKENS</span>
                  <span className="text-[#A1A7B5]">Inter · 16px</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {['#08090C', '#FF4D1C', '#10B981', '#F4F5F8'].map((hex) => (
                    <span
                      key={hex}
                      className="inline-flex items-center gap-1 rounded border border-white/10 bg-[#171A22] px-2 py-0.5 font-mono text-[11px] text-[#F4F5F8]"
                    >
                      <span className="h-2 w-2 rounded-xs" style={{ backgroundColor: hex }} />
                      {hex}
                    </span>
                  ))}
                </div>
              </div>

              {/* Layer 3: Distilled Tailwind / JSX Result */}
              <div
                ref={cleanLayerRef}
                className={`rounded-xl border bg-[#171A22]/95 p-4 backdrop-blur-md transition-colors ${
                  xrayStep === 2
                    ? 'border-[var(--ag-emerald)] shadow-[0_0_28px_-8px_rgba(16,185,129,0.5)]'
                    : 'border-white/14'
                }`}
              >
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="inline-flex items-center gap-1 font-bold text-[#10B981]">
                    <Sparkles className="h-3 w-3" />
                    03 · CLEAN JSX / TAILWIND
                  </span>
                  <span className="text-[#10B981]">218 TOK</span>
                </div>
                <pre className="mt-2 font-mono text-[11px] leading-[1.5] whitespace-pre-wrap break-words text-[#D8DCE6]">
                  <code>{`<Card className="rounded-2xl p-5"><Price>$29/mo</Price></Card>`}</code>
                </pre>
              </div>
            </div>
          </div>

          {/* Right: 3 Compact Phase Indicators on Open Canvas */}
          <div className="min-w-0 divide-y divide-white/8 lg:col-span-5">
            {[
              {
                idx: 0,
                code: 'PHASE 01',
                titleZh: '剥离混淆废码',
                titleEn: 'Strip DOM Clutter',
                metric: '20 div → 1 tag',
              },
              {
                idx: 1,
                code: 'PHASE 02',
                titleZh: '抽离设计规范',
                titleEn: 'Extract Tokens',
                metric: 'Hex · Radius · Font',
              },
              {
                idx: 2,
                code: 'PHASE 03',
                titleZh: '合成纯净组件',
                titleEn: 'Clean Tailwind / JSX',
                metric: '218 tok · 4.2ms',
              },
            ].map((item) => {
              const active = xrayStep === item.idx;
              return (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => setXrayStep(item.idx)}
                  className={`flex w-full items-center justify-between gap-4 border-l-2 py-5 pl-4 text-left transition ${
                    active
                      ? 'border-[var(--ag-accent)]'
                      : 'border-white/10 hover:border-white/25'
                  }`}
                >
                  <div>
                    <div
                      className={`font-mono text-[11px] font-bold ${
                        active ? 'text-[var(--ag-accent)]' : 'text-[#8E95A5]'
                      }`}
                    >
                      {item.code}
                    </div>
                    <div
                      className={`mt-1 text-lg font-extrabold ${
                        active ? 'text-[#F4F5F8]' : 'text-[#A1A7B5]'
                      }`}
                    >
                      {isZh ? item.titleZh : item.titleEn}
                    </div>
                  </div>
                  <span
                    className={`font-mono text-xs ${
                      active ? 'font-semibold text-[#10B981]' : 'text-[#8E95A5]'
                    }`}
                  >
                    {item.metric}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
