import { VERSION } from '@anygrab/core';
import {
  BarChart3,
  Download,
  Home,
  Languages,
  Layers,
  Sparkles,
  Wand2,
} from 'lucide-react';
import type { ActiveTab } from '../data/types';
import type { SiteLocale } from '../i18n';

interface NavbarHeroProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  locale: SiteLocale;
  onLocaleChange: (locale: SiteLocale) => void;
}

export function NavbarHero({
  activeTab,
  onTabChange,
  locale,
  onLocaleChange,
}: NavbarHeroProps) {
  const isZh = locale === 'zh-CN';

  const navItems: Array<{
    id: ActiveTab;
    label: string;
    badge?: string;
    icon: typeof Home;
  }> = [
    {
      id: 'overview',
      label: isZh ? '产品首页' : 'Overview',
      icon: Home,
    },
    {
      id: 'workflows',
      label: isZh ? '配合 AI 实战教程' : 'AI Workflows',
      badge: isZh ? '必看' : 'Guide',
      icon: Wand2,
    },
    {
      id: 'playground',
      label: isZh ? '在线免装体验台' : 'Live Playground',
      icon: Sparkles,
    },
    {
      id: 'leaderboard',
      label: isZh ? '性能跑分榜' : 'AnyGrab-Bench',
      badge: '99.6',
      icon: BarChart3,
    },
    {
      id: 'quickstart',
      label: isZh ? '下载插件 & 安装' : 'Download & MCP',
      icon: Download,
    },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#09090b]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        {/* Brand Identity */}
        <button
          type="button"
          onClick={() => onTabChange('overview')}
          className="flex items-center gap-2.5 text-left transition hover:opacity-90"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25">
            <Layers className="h-4 w-4 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base font-extrabold tracking-tight text-white">AnyGrab</span>
            <span className="rounded-md border border-indigo-500/30 bg-indigo-500/10 px-1.5 py-0.5 font-mono text-[11px] font-medium text-indigo-300">
              v{VERSION}
            </span>
            <span className="hidden rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300 md:inline-flex">
              {isZh ? '免费开源 MIT · 零大模型费用' : 'MIT Open Source · 0 LLM Cost'}
            </span>
          </div>
        </button>

        {/* Five Core Navigation Tabs */}
        <nav
          role="tablist"
          aria-label="Primary Website Navigation"
          className="order-3 flex w-full items-center gap-1.5 overflow-x-auto pt-1 lg:order-2 lg:w-auto lg:pt-0"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                data-tab={item.id}
                aria-selected={active}
                onClick={() => onTabChange(item.id)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition sm:text-[13px] ${
                  active
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                    : 'border border-white/[0.06] bg-zinc-900/75 text-zinc-300 hover:bg-zinc-800 hover:text-white'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className={`rounded-full px-1.5 py-0.2 font-mono text-[10px] font-bold ${
                      active
                        ? 'bg-white/20 text-white'
                        : 'bg-emerald-500/15 text-emerald-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* One-Click Language Switcher (中文 / EN) */}
        <div
          data-testid="locale-switcher"
          aria-label="Language Switcher"
          className="order-2 inline-flex items-center gap-1 rounded-xl border border-white/[0.1] bg-zinc-900 p-1 lg:order-3"
        >
          <Languages className="ml-1.5 h-3.5 w-3.5 text-indigo-400" />
          <button
            type="button"
            data-locale="zh-CN"
            aria-pressed={isZh}
            onClick={() => onLocaleChange('zh-CN')}
            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
              isZh
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            中文
          </button>
          <button
            type="button"
            data-locale="en"
            aria-pressed={!isZh}
            onClick={() => onLocaleChange('en')}
            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
              !isZh
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            EN
          </button>
        </div>
      </div>
    </header>
  );
}
