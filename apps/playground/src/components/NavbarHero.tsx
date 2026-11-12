import { VERSION } from '@anygrab/core';
import {
  BarChart3,
  BookOpen,
  Check,
  Copy,
  Layers,
  Sparkles,
  Terminal,
  Zap,
} from 'lucide-react';
import { useState } from 'react';
import type { ActiveTab } from '../data/types';

interface NavbarHeroProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
}

const CLI_INSTALL_CMD = 'npx anygrab https://ui.shadcn.com --budget 1200';

export function NavbarHero({ activeTab, onTabChange }: NavbarHeroProps) {
  const [copiedCmd, setCopiedCmd] = useState(false);

  const handleCopyCli = async () => {
    try {
      await navigator.clipboard?.writeText(CLI_INSTALL_CMD);
    } catch {
      // Clipboard fallback ignored in restricted test environments
    }
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 1800);
  };

  return (
    <div className="relative overflow-hidden border-b border-white/[0.08] bg-[#09090b]">
      {/* Subtle top ambient radial spotlight */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-36 mx-auto h-72 max-w-4xl rounded-full bg-gradient-to-r from-indigo-500/18 via-violet-500/14 to-emerald-500/12 blur-3xl"
      />

      {/* Sticky Top Navigation Bar */}
      <header className="relative z-10 mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 border-b border-white/[0.06] px-4 py-3.5 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25">
            <Layers className="h-4 w-4 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold tracking-tight text-white">AnyGrab</span>
            <span className="rounded-md border border-indigo-500/30 bg-indigo-500/10 px-1.5 py-0.5 font-mono text-[11px] font-medium text-indigo-300">
              v{VERSION}
            </span>
            <span className="hidden rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300 sm:inline-flex">
              MIT · Zero-Dep Core
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 text-xs text-zinc-400">
          <span className="hidden items-center gap-1.5 rounded-full border border-white/[0.08] bg-zinc-900/80 px-3 py-1 md:inline-flex">
            <Zap className="h-3.5 w-3.5 text-amber-400" />
            <span>Deterministic AST · 0 LLM Calls · Local Privacy</span>
          </span>
          <button
            type="button"
            onClick={() => onTabChange('quickstart')}
            className="rounded-lg border border-white/[0.08] bg-zinc-900 px-3 py-1.5 font-medium text-zinc-200 transition hover:border-indigo-500/40 hover:bg-zinc-800"
          >
            MCP &amp; Extension
          </button>
        </div>
      </header>

      {/* Hero Headline + Copy CLI Bar + View Switcher Tabs */}
      <section className="relative z-10 mx-auto max-w-[1440px] px-4 pt-7 pb-5 sm:px-6">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div className="max-w-3xl space-y-2.5">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/25 bg-indigo-950/50 px-3 py-1 text-xs font-medium text-indigo-300">
              <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
              <span>Built for Claude Code · Cursor · Antigravity · Codex · Browser-Use</span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl lg:text-[34px] lg:leading-[1.18]">
              Grab clean UI, Tailwind &amp; tables from ANY website for Coding Agents —{' '}
              <span className="bg-gradient-to-r from-indigo-400 via-violet-300 to-emerald-300 bg-clip-text text-transparent">
                &lt;5ms, 0 LLM
              </span>
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-zinc-400">
              Reverse-compiles computed CSS &amp; dirty DOM soup into compact Tailwind v4 HTML, React JSX,
              GFM Markdown, and Design Tokens with AST saliency budget folding.
            </p>
          </div>

          {/* One-Click Copy npx anygrab Command Box */}
          <div className="flex shrink-0 flex-col gap-1.5">
            <span className="text-[11px] font-medium tracking-wide text-zinc-500 uppercase">
              Quick CLI Run (Zero Install)
            </span>
            <div className="flex items-center gap-2 rounded-xl border border-white/[0.1] bg-zinc-900/90 px-3.5 py-2 shadow-inner">
              <Terminal className="h-4 w-4 shrink-0 text-indigo-400" />
              <code className="font-mono text-xs text-zinc-200 sm:text-[13px]">
                {CLI_INSTALL_CMD}
              </code>
              <button
                type="button"
                onClick={handleCopyCli}
                aria-label="Copy npx anygrab command"
                className="ml-1 inline-flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-zinc-800/90 px-2.5 py-1 text-xs font-medium text-zinc-200 transition hover:border-indigo-500/50 hover:bg-indigo-600 hover:text-white"
              >
                {copiedCmd ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-emerald-300">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Three Primary View Navigation Tabs */}
        <nav
          aria-label="Primary Playground Views"
          className="mt-6 flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-4"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'playground'}
            onClick={() => onTabChange('playground')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition sm:text-sm ${
              activeTab === 'playground'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : 'border border-white/[0.06] bg-zinc-900/70 text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            <span>Live Playground</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'leaderboard'}
            onClick={() => onTabChange('leaderboard')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition sm:text-sm ${
              activeTab === 'leaderboard'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : 'border border-white/[0.06] bg-zinc-900/70 text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>AnyGrab-Bench Leaderboard</span>
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-300">
              10 Torture Suites
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'quickstart'}
            onClick={() => onTabChange('quickstart')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition sm:text-sm ${
              activeTab === 'quickstart'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                : 'border border-white/[0.06] bg-zinc-900/70 text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span>Quick Start &amp; MCP Setup</span>
          </button>
        </nav>
      </section>
    </div>
  );
}
