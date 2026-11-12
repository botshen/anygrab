import { useState } from 'react';
import { LeaderboardView } from './components/LeaderboardView';
import { LivePlayground } from './components/LivePlayground';
import { NavbarHero } from './components/NavbarHero';
import { QuickStartView } from './components/QuickStartView';
import { PLAYGROUND_PRESETS, type ActiveTab } from './data/types';

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('playground');
  const [selectedPresetId, setSelectedPresetId] = useState<string>(PLAYGROUND_PRESETS[0].id);

  const handleOpenPresetFromLeaderboard = (presetId: string) => {
    setSelectedPresetId(presetId);
    setActiveTab('playground');
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col">
      <NavbarHero activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6">
        {activeTab === 'playground' && (
          <LivePlayground
            selectedPresetId={selectedPresetId}
            onSelectPreset={setSelectedPresetId}
          />
        )}
        {activeTab === 'leaderboard' && (
          <LeaderboardView onOpenPresetInPlayground={handleOpenPresetFromLeaderboard} />
        )}
        {activeTab === 'quickstart' && <QuickStartView />}
      </main>

      <footer className="border-t border-white/[0.06] bg-zinc-950/90 py-5 text-xs text-zinc-500">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 sm:px-6">
          <span>
            AnyGrab &amp; AnyGrab-Bench — MIT Licensed Open Source · Deterministic Sub-5ms UI
            Context Engine
          </span>
          <span className="font-mono text-[11px] text-zinc-400">
            0 LLM Calls · 100% Local Execution · Built for AI Coding Agents
          </span>
        </div>
      </footer>
    </div>
  );
}
