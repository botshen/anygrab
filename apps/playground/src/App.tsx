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
        ? 'AnyGrab 官方网站 — 点一下网页就能喂给反重力 / Codex 1:1 复刻界面与表格'
        : 'AnyGrab Official Site — Grab Clean UI, Tailwind & Tables for Coding Agents';
  }, [locale]);

  const handleLocaleChange = (nextLocale: SiteLocale) => {
    setLocale(nextLocale);
    persistSiteLocale(nextLocale);
  };

  const handleOpenPresetFromLeaderboard = (presetId: string) => {
    setSelectedPresetId(presetId);
    setActiveTab('playground');
  };

  const isZh = locale === 'zh-CN';

  return (
    <div className="flex min-h-screen flex-col bg-[#09090b] text-zinc-100">
      <NavbarHero
        activeTab={activeTab}
        onTabChange={setActiveTab}
        locale={locale}
        onLocaleChange={handleLocaleChange}
      />

      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6">
        {activeTab === 'overview' && (
          <OverviewView locale={locale} onNavigate={setActiveTab} />
        )}
        {activeTab === 'workflows' && (
          <WorkflowsView locale={locale} onNavigate={setActiveTab} />
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

      <footer className="border-t border-white/[0.06] bg-zinc-950/90 py-5 text-xs text-zinc-500">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 sm:px-6">
          <span>
            {isZh
              ? 'AnyGrab 官方网站 & AnyGrab-Bench — MIT 免费开源 · 专为 AI 编程打造的毫秒级网页提纯引擎'
              : 'AnyGrab Official Website & AnyGrab-Bench — MIT Open Source · Deterministic Sub-5ms UI Context Engine'}
          </span>
          <span className="font-mono text-[11px] text-zinc-400">
            {isZh
              ? '0 大模型调用 · 100% 本地隐私执行 · 完美支持 反重力 Antigravity / Codex / Cursor'
              : '0 LLM Calls · 100% Local Execution · Built for Antigravity, Codex & Cursor'}
          </span>
        </div>
      </footer>
    </div>
  );
}
