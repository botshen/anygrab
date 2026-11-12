import { useEffect, useState } from 'react';
import { LeaderboardView } from './components/LeaderboardView';
import { LivePlayground } from './components/LivePlayground';
import { NavbarHero } from './components/NavbarHero';
import { OverviewView } from './components/OverviewView';
import { QuickStartView } from './components/QuickStartView';
import { WorkflowsView } from './components/WorkflowsView';
import { PLAYGROUND_PRESETS, type ActiveTab } from './data/types';
import { detectInitialLocale, persistSiteLocale, type SiteLocale } from './i18n';

function detectInitialTab(): ActiveTab {
  if (typeof window === 'undefined') return 'overview';
  const hash = window.location.hash.replace(/^#/, '').toLowerCase();
  if (
    hash === 'overview' ||
    hash === 'workflows' ||
    hash === 'playground' ||
    hash === 'leaderboard' ||
    hash === 'quickstart'
  ) {
    return hash;
  }
  return 'overview';
}

export function App() {
  const [locale, setLocale] = useState<SiteLocale>(() => detectInitialLocale());
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => detectInitialTab());
  const [selectedPresetId, setSelectedPresetId] = useState<string>(PLAYGROUND_PRESETS[0].id);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title =
      locale === 'zh-CN'
        ? 'AnyGrab 官方网站 — 看中任何网页组件，点一下就能喂给反重力 / Codex 1:1 复刻'
        : 'AnyGrab Official Site — Grab Clean UI, Tailwind & Tables for Coding Agents';
  }, [locale]);

  const handleTabChange = (nextTab: ActiveTab) => {
    setActiveTab(nextTab);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', nextTab === 'overview' ? '#' : `#${nextTab}`);
    }
  };

  const handleLocaleChange = (nextLocale: SiteLocale) => {
    setLocale(nextLocale);
    persistSiteLocale(nextLocale);
  };

  const handleOpenPresetFromLeaderboard = (presetId: string) => {
    setSelectedPresetId(presetId);
    handleTabChange('playground');
  };

  const isZh = locale === 'zh-CN';

  return (
    <div className="flex min-h-screen flex-col bg-[var(--ag-bg-canvas)] text-[var(--ag-text-primary)]">
      <NavbarHero
        activeTab={activeTab}
        onTabChange={handleTabChange}
        locale={locale}
        onLocaleChange={handleLocaleChange}
      />

      <main className="mx-auto w-full max-w-[1320px] flex-1 px-4 py-8 sm:px-8 sm:py-10">
        {activeTab === 'overview' && (
          <OverviewView locale={locale} onNavigate={handleTabChange} />
        )}
        {activeTab === 'workflows' && (
          <WorkflowsView locale={locale} onNavigate={handleTabChange} />
        )}
        {activeTab === 'playground' && (
          <LivePlayground
            locale={locale}
            selectedPresetId={selectedPresetId}
            onSelectPreset={setSelectedPresetId}
          />
        )}
        {activeTab === 'leaderboard' && (
          <LeaderboardView
            locale={locale}
            onOpenPresetInPlayground={handleOpenPresetFromLeaderboard}
          />
        )}
        {activeTab === 'quickstart' && <QuickStartView locale={locale} />}
      </main>

      <footer className="border-t border-[var(--ag-border)] bg-[var(--ag-bg-canvas)] py-6 text-xs leading-[1.6] text-[var(--ag-text-muted)]">
        <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-3 px-4 sm:px-8">
          <div className="flex items-center gap-2.5">
            <span className="inline-block h-2 w-2 rounded-[2px] bg-[var(--ag-accent)]" />
            <span>
              {isZh
                ? 'AnyGrab & AnyGrab-Bench — MIT 免费开源 · 毫秒级本地网页 UI 提纯引擎'
                : 'AnyGrab & AnyGrab-Bench — MIT Open Source · Sub-5ms Deterministic UI Context Engine'}
            </span>
          </div>
          <span className="font-mono text-[11px] text-[var(--ag-text-secondary)]">
            {isZh
              ? '0 大模型费用 · 100% 本地执行 · 支持 反重力 Antigravity / Codex / Cursor / Claude Code'
              : '0 LLM Calls · 100% Local Execution · Antigravity · Codex · Cursor · Claude Code'}
          </span>
        </div>
      </footer>
    </div>
  );
}
