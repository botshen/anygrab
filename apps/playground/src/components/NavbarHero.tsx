import { VERSION } from '@anygrab/core';
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
  }> = [
    {
      id: 'overview',
      label: isZh ? '产品首页' : 'Overview',
    },
    {
      id: 'workflows',
      label: isZh ? '实战教程' : 'Workflows',
    },
    {
      id: 'playground',
      label: isZh ? '在线体验台' : 'Playground',
    },
    {
      id: 'leaderboard',
      label: isZh ? '性能跑分' : 'Benchmarks',
    },
    {
      id: 'quickstart',
      label: isZh ? '下载与安装' : 'Install & MCP',
    },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--ag-border)] bg-[#F5F4EF]/94 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-between gap-x-6 gap-y-1.5 px-4 pt-2 pb-0 sm:px-8 lg:h-[58px] lg:flex-nowrap lg:py-0">
        {/* Brand Optical Reticle Mark */}
        <button
          type="button"
          onClick={() => onTabChange('overview')}
          className="flex items-center gap-2.5 text-left transition hover:opacity-80"
        >
          <svg
            width="26"
            height="26"
            viewBox="0 0 32 32"
            fill="none"
            aria-hidden="true"
            className="shrink-0"
          >
            <rect width="32" height="32" rx="7" fill="#141413" />
            <path
              d="M8.5 12.5V8.5H12.5M19.5 8.5H23.5V12.5M23.5 19.5V23.5H19.5M12.5 23.5H8.5V19.5"
              stroke="#FAF9F5"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <rect x="13.5" y="13.5" width="5" height="5" rx="1" fill="#D94E28" />
          </svg>
          <div className="flex items-baseline gap-2">
            <span className="text-[16px] font-bold tracking-[-0.025em] text-[#141413]">
              AnyGrab
            </span>
            <span className="font-mono text-[11px] text-[var(--ag-text-muted)]">
              v{VERSION}
            </span>
          </div>
        </button>

        {/* Clean Underline Navigation Tabs (Zero Pill Clutter) */}
        <nav
          role="tablist"
          aria-label="Primary Website Navigation"
          className="ag-no-scrollbar order-3 -mx-4 flex w-[calc(100%+2rem)] items-center justify-between gap-2 overflow-x-auto border-t border-[var(--ag-border)]/70 px-4 sm:justify-start sm:gap-5 lg:order-2 lg:mx-0 lg:h-full lg:w-auto lg:gap-7 lg:border-t-0 lg:px-0"
        >
          {navItems.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                data-tab={item.id}
                aria-selected={active}
                onClick={() => onTabChange(item.id)}
                className={`relative inline-flex h-[36px] shrink-0 items-center gap-1.5 text-[12.5px] transition sm:h-[42px] sm:text-[13px] lg:h-full ${
                  active
                    ? 'font-semibold text-[#141413]'
                    : 'font-medium text-[var(--ag-text-secondary)] hover:text-[#141413]'
                }`}
              >
                <span>{item.label}</span>
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-[2px] bg-[var(--ag-accent)]"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Minimalist Neutral Language Switcher */}
        <div
          data-testid="locale-switcher"
          aria-label="Language Switcher"
          className="order-2 inline-flex items-center rounded-[8px] border border-[var(--ag-border)] bg-[var(--ag-bg-subtle)] p-0.5 lg:order-3"
        >
          <button
            type="button"
            data-locale="zh-CN"
            aria-pressed={isZh}
            onClick={() => onLocaleChange('zh-CN')}
            className={`rounded-[5px] px-2.5 py-1 text-xs leading-none transition ${
              isZh
                ? 'bg-white font-semibold text-[#141413] shadow-[0_1px_2px_rgba(20,20,19,0.08)]'
                : 'font-medium text-[var(--ag-text-secondary)] hover:text-[#141413]'
            }`}
          >
            中文
          </button>
          <button
            type="button"
            data-locale="en"
            aria-pressed={!isZh}
            onClick={() => onLocaleChange('en')}
            className={`rounded-[5px] px-2.5 py-1 text-xs leading-none transition ${
              !isZh
                ? 'bg-white font-semibold text-[#141413] shadow-[0_1px_2px_rgba(20,20,19,0.08)]'
                : 'font-medium text-[var(--ag-text-secondary)] hover:text-[#141413]'
            }`}
          >
            EN
          </button>
        </div>
      </div>
    </header>
  );
}
