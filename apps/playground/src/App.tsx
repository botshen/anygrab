import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { useCallback, useEffect, useRef, useState } from 'react';
import { LeaderboardView } from './components/LeaderboardView';
import { LivePlayground } from './components/LivePlayground';
import { NavbarHero } from './components/NavbarHero';
import { OverviewView } from './components/OverviewView';
import { QuickStartView } from './components/QuickStartView';
import { WorkflowsView } from './components/WorkflowsView';
import { PLAYGROUND_PRESETS, type ActiveTab } from './data/types';
import { detectInitialLocale, persistSiteLocale, type SiteLocale } from './i18n';
import { isMotionCapableBrowser } from './utils/motion';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

const VALID_SECTIONS: ActiveTab[] = [
  'overview',
  'playground',
  'leaderboard',
  'workflows',
  'quickstart',
];

function detectInitialTab(): ActiveTab {
  if (typeof window === 'undefined') return 'overview';
  const hash = window.location.hash.replace(/^#/, '').toLowerCase() as ActiveTab;
  return VALID_SECTIONS.includes(hash) ? hash : 'overview';
}

export function App() {
  const [locale, setLocale] = useState<SiteLocale>(() => detectInitialLocale());
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => detectInitialTab());
  const [selectedPresetId, setSelectedPresetId] = useState<string>(PLAYGROUND_PRESETS[0].id);
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title =
      locale === 'zh-CN'
        ? 'AnyGrab — 点一下，扒走好界面'
        : 'AnyGrab — Point. Click. Ship Clean UI.';
  }, [locale]);

  // Lenis inertial smooth scroll synced to GSAP ticker + active section scroll tracking
  useEffect(() => {
    if (!isMotionCapableBrowser()) return;

    const lenis = new Lenis({
      duration: 1.05,
      smoothWheel: true,
    });
    lenisRef.current = lenis;

    lenis.on('scroll', ScrollTrigger.update);
    const tick = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    const triggers: ScrollTrigger[] = [];
    for (const id of VALID_SECTIONS) {
      const el = document.getElementById(id);
      if (!el) continue;
      triggers.push(
        ScrollTrigger.create({
          trigger: el,
          start: 'top 38%',
          end: 'bottom 38%',
          onEnter: () => setActiveTab(id),
          onEnterBack: () => setActiveTab(id),
        }),
      );
    }

    return () => {
      for (const st of triggers) st.kill();
      gsap.ticker.remove(tick);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  const scrollToSection = useCallback((nextTab: ActiveTab) => {
    setActiveTab(nextTab);
    if (typeof window === 'undefined') return;
    window.history.replaceState(null, '', nextTab === 'overview' ? '#' : `#${nextTab}`);

    const targetEl = document.getElementById(nextTab);
    if (!targetEl) return;

    if (lenisRef.current) {
      lenisRef.current.scrollTo(targetEl, { offset: -86 });
    } else if (typeof targetEl.scrollIntoView === 'function') {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const handleLocaleChange = (nextLocale: SiteLocale) => {
    setLocale(nextLocale);
    persistSiteLocale(nextLocale);
  };

  const handleOpenPresetFromLeaderboard = (presetId: string) => {
    setSelectedPresetId(presetId);
    scrollToSection('playground');
  };

  const isZh = locale === 'zh-CN';

  return (
    <div className="relative flex min-h-screen flex-col bg-[var(--ag-bg-canvas)] text-[var(--ag-text-primary)]">
      {/* Subtle architectural film grain layer */}
      <div
        aria-hidden="true"
        className="ag-grain-layer pointer-events-none fixed inset-0 z-0"
      />

      <NavbarHero
        activeTab={activeTab}
        onTabChange={scrollToSection}
        locale={locale}
        onLocaleChange={handleLocaleChange}
      />

      <main className="relative z-10 w-full flex-1 space-y-20 px-4 pt-6 pb-20 sm:space-y-24 sm:px-8">
        <OverviewView locale={locale} onNavigate={scrollToSection} />

        <LivePlayground
          locale={locale}
          selectedPresetId={selectedPresetId}
          onSelectPreset={setSelectedPresetId}
        />

        <LeaderboardView
          locale={locale}
          onOpenPresetInPlayground={handleOpenPresetFromLeaderboard}
        />

        <WorkflowsView locale={locale} onNavigate={scrollToSection} />

        <QuickStartView locale={locale} />
      </main>

      {/* Architectural Monumental Wordmark Footer */}
      <footer className="relative z-10 overflow-hidden border-t border-white/8 bg-[#08090C] pt-12 pb-8 leading-[1.65]">
        <div className="mx-auto max-w-[1160px] px-4 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4 font-mono text-xs leading-[1.65] text-[#7C8292]">
            <div className="flex items-center gap-2.5">
              <span className="inline-block h-2 w-2 shrink-0 rounded-[2px] bg-[var(--ag-accent)]" />
              <span className="leading-[1.65]">
                {isZh
                  ? 'AnyGrab · MIT 开源 · 100% 本地 AST 提纯 · 0 大模型开销'
                  : 'AnyGrab · MIT Open Source · 100% Local AST · $0 API Cost'}
              </span>
            </div>

            <div className="flex items-center gap-5">
              <a
                href="https://github.com/botshen/anygrab/releases/latest"
                target="_blank"
                rel="noreferrer"
                className="text-[#A1A7B5] transition hover:text-[#F4F5F8]"
              >
                Releases v0.2.0
              </a>
              <a
                href="https://github.com/botshen/anygrab"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-[#F4F5F8] transition hover:text-[var(--ag-accent)]"
              >
                GitHub ↗
              </a>
            </div>
          </div>

          {/* Oversized Architectural Outline Wordmark */}
          <svg
            viewBox="0 0 1160 150"
            className="mt-8 w-full select-none"
            aria-hidden="true"
          >
            <text
              x="50%"
              y="128"
              textAnchor="middle"
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="1.5"
              fontFamily="Inter, -apple-system, sans-serif"
              fontWeight="900"
              fontSize="148"
              letterSpacing="14"
            >
              ANYGRAB
            </text>
          </svg>
        </div>
      </footer>
    </div>
  );
}
