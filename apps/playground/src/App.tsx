import { VERSION } from '@anygrab/core';
import { Star } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { LeaderboardView } from './components/LeaderboardView';
import { LivePlayground } from './components/LivePlayground';
import { NavbarHero } from './components/NavbarHero';
import { OverviewView } from './components/OverviewView';
import { QuickStartView } from './components/QuickStartView';
import { WorkflowsView } from './components/WorkflowsView';
import { PLAYGROUND_PRESETS, type ActiveTab } from './data/types';
import {
  detectInitialLocale,
  detectInitialTheme,
  GITHUB_REPO_URL,
  persistSiteLocale,
  persistSiteTheme,
  type SiteLocale,
  type SiteTheme,
} from './i18n';

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
  const [theme, setTheme] = useState<SiteTheme>(() => detectInitialTheme());
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => detectInitialTab());
  const [selectedPresetId, setSelectedPresetId] = useState<string>(PLAYGROUND_PRESETS[0].id);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title =
      locale === 'zh-CN'
        ? 'AnyGrab: 点一下，扒走好界面'
        : 'AnyGrab: Point. Click. Ship Clean UI.';
  }, [locale]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    const meta = document.getElementById('ag-theme-color');
    if (meta) {
      meta.setAttribute('content', theme === 'dark' ? '#0B0C0F' : '#F6F5F0');
    }
  }, [theme]);

  // Passive IntersectionObserver for active navigation highlight (zero scroll-jacking)
  useEffect(() => {
    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.id as ActiveTab;
            if (VALID_SECTIONS.includes(id)) {
              setActiveTab(id);
            }
          }
        }
      },
      { rootMargin: '-28% 0px -55% 0px', threshold: 0 },
    );

    for (const id of VALID_SECTIONS) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, []);

  const scrollToSection = useCallback((nextTab: ActiveTab) => {
    setActiveTab(nextTab);
    if (typeof window === 'undefined') return;
    window.history.replaceState(null, '', nextTab === 'overview' ? '#' : `#${nextTab}`);

    const targetEl = document.getElementById(nextTab);
    if (targetEl && typeof targetEl.scrollIntoView === 'function') {
      targetEl.scrollIntoView({ behavior: 'auto', block: 'start' });
    }
  }, []);

  const handleLocaleChange = (nextLocale: SiteLocale) => {
    setLocale(nextLocale);
    persistSiteLocale(nextLocale);
  };

  const handleThemeChange = (nextTheme: SiteTheme) => {
    setTheme(nextTheme);
    persistSiteTheme(nextTheme);
  };

  const handleOpenPresetFromLeaderboard = (presetId: string) => {
    setSelectedPresetId(presetId);
    scrollToSection('playground');
  };

  const isZh = locale === 'zh-CN';

  return (
    <div className="flex min-h-screen flex-col bg-[var(--ag-bg)] text-[var(--ag-ink)]">
      <NavbarHero
        activeTab={activeTab}
        onTabChange={scrollToSection}
        locale={locale}
        onLocaleChange={handleLocaleChange}
        theme={theme}
        onThemeChange={handleThemeChange}
      />

      <main id="top-main" className="w-full flex-1">
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

      {/* Inverse Open-Source Star Callout + Directory Footer (tasteskill footer.closing) */}
      <footer className="bg-[var(--ag-inv-bg)] py-14 text-[var(--ag-inv-ink)] sm:py-16">
        <div className="ag-wrap space-y-10">
          {/* Row 1: Open-Source Star Ask */}
          <div className="grid items-center gap-6 border-b border-[var(--ag-inv-line)] pb-10 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <h2 className="text-[clamp(1.6rem,2.4vw,2.4rem)] leading-[1.15] font-medium tracking-[-0.03em] text-[var(--ag-inv-ink)]">
                {isZh
                  ? 'MIT 完全开源。觉得好用，去 GitHub 点颗 Star 支持我们。'
                  : 'Open source under MIT. If AnyGrab helps you ship, star us on GitHub.'}
              </h2>
              <p className="mt-2.5 max-w-[56ch] text-[15px] leading-[1.6] text-[var(--ag-inv-muted)]">
                {isZh
                  ? '零后端、零遥测、零依赖核心引擎，全部源码公开在 github.com/botshen/anygrab。'
                  : 'Zero backend, zero telemetry, zero-dependency AST core at github.com/botshen/anygrab.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 lg:col-span-4 lg:justify-end">
              <a
                href={GITHUB_REPO_URL}
                target="_blank"
                rel="noreferrer"
                data-testid="footer-github-star"
                className="ag-btn ag-btn-inverse w-full sm:w-auto"
              >
                <Star className="h-4 w-4 fill-current text-[var(--ag-accent)]" />
                <span>
                  {isZh ? '去 GitHub 给个 Star' : 'Star botshen/anygrab'}
                </span>
              </a>
            </div>
          </div>

          {/* Row 2: Legal & Open-Source Directory */}
          <div className="flex flex-wrap items-center justify-between gap-4 text-[14px] text-[var(--ag-inv-muted)]">
            <div className="flex items-center gap-2.5">
              <span className="font-medium text-[var(--ag-inv-ink)]">AnyGrab</span>
              <span>v{VERSION}</span>
              <span>·</span>
              <span>MIT License</span>
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <a
                href={GITHUB_REPO_URL}
                target="_blank"
                rel="noreferrer"
                className="text-[var(--ag-inv-ink)] transition-opacity hover:opacity-80"
              >
                {isZh ? 'GitHub 开源仓库' : 'GitHub Repository'}
              </a>
              <a
                href={`${GITHUB_REPO_URL}/releases/latest`}
                target="_blank"
                rel="noreferrer"
                className="transition-colors hover:text-[var(--ag-inv-ink)]"
              >
                Releases
              </a>
              <a
                href={`${GITHUB_REPO_URL}/issues`}
                target="_blank"
                rel="noreferrer"
                className="transition-colors hover:text-[var(--ag-inv-ink)]"
              >
                Issues
              </a>
              <a
                href="./privacy.html"
                target="_blank"
                rel="noreferrer"
                className="transition-colors hover:text-[var(--ag-inv-ink)]"
              >
                {isZh ? '隐私政策' : 'Privacy'}
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
