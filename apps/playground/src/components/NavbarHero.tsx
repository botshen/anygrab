import { VERSION } from '@anygrab/core';
import { ArrowUpRight } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
  const navRef = useRef<HTMLElement | null>(null);
  const tabRefs = useRef<Partial<Record<ActiveTab, HTMLButtonElement | null>>>({});
  const [indicator, setIndicator] = useState<{ left: number; width: number }>({
    left: 0,
    width: 0,
  });

  const navItems: Array<{
    id: ActiveTab;
    label: string;
  }> = [
    { id: 'overview', label: isZh ? '总览' : 'Stage' },
    { id: 'playground', label: isZh ? '实测台' : 'Lab' },
    { id: 'leaderboard', label: isZh ? '跑分' : 'Bench' },
    { id: 'workflows', label: isZh ? '配方' : 'Recipes' },
    { id: 'quickstart', label: isZh ? '安装' : 'Install' },
  ];

  const syncIndicator = () => {
    const navEl = navRef.current;
    const activeBtn = tabRefs.current[activeTab];
    if (!navEl || !activeBtn) return;
    const left = activeBtn.offsetLeft;
    const width = activeBtn.offsetWidth;
    if (width > 0) {
      setIndicator({ left, width });
    }
  };

  useLayoutEffect(() => {
    syncIndicator();
  }, [activeTab, locale]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onResize = () => syncIndicator();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [activeTab, locale]);

  return (
    <header className="sticky top-0 z-50 px-3 pt-3 sm:px-6 sm:pt-4">
      <div className="mx-auto flex max-w-[1160px] flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/10 bg-[#101217]/85 px-3 py-2 shadow-[0_12px_40px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:rounded-full sm:px-4">
        {/* Optical Reticle Brand Mark */}
        <button
          type="button"
          onClick={() => onTabChange('overview')}
          className="flex items-center gap-2.5 pl-1 text-left transition hover:opacity-85"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 32 32"
            fill="none"
            aria-hidden="true"
            className="shrink-0"
          >
            <rect
              width="32"
              height="32"
              rx="7"
              fill="#08090C"
              stroke="rgba(255,255,255,0.16)"
            />
            <path
              d="M8.5 12.5V8.5H12.5M19.5 8.5H23.5V12.5M23.5 19.5V23.5H19.5M12.5 23.5H8.5V19.5"
              stroke="#F4F5F8"
              strokeWidth="2.1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <rect x="13.5" y="13.5" width="5" height="5" rx="1" fill="#FF4D1C" />
          </svg>
          <span className="text-[15px] font-bold tracking-[-0.025em] text-[#F4F5F8]">
            AnyGrab
          </span>
          <span className="hidden font-mono text-[11px] text-[#7C8292] sm:inline">
            v{VERSION}
          </span>
        </button>

        {/* Centered Floating Navigation Capsule with Spring Glide Indicator */}
        <nav
          ref={navRef}
          role="tablist"
          aria-label="Primary Website Navigation"
          className="ag-no-scrollbar relative order-3 flex w-full items-center justify-between gap-0.5 overflow-x-auto rounded-full border border-white/8 bg-[#08090C]/70 p-1 sm:order-2 sm:w-auto sm:justify-center"
        >
          {indicator.width > 0 && (
            <span
              aria-hidden="true"
              className="ag-pill-glide pointer-events-none absolute top-1 bottom-1 left-0 rounded-full border border-white/12 bg-[#1A1E28]"
              style={{
                width: `${indicator.width}px`,
                transform: `translateX(${indicator.left}px)`,
              }}
            />
          )}

          {navItems.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                ref={(el) => {
                  tabRefs.current[item.id] = el;
                }}
                type="button"
                role="tab"
                data-tab={item.id}
                aria-selected={active}
                onClick={() => onTabChange(item.id)}
                className={`relative z-10 inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition sm:px-3.5 ${
                  active ? 'font-semibold text-[#F4F5F8]' : 'text-[#A1A7B5] hover:text-[#F4F5F8]'
                }`}
              >
                {active && (
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 rounded-full bg-[var(--ag-accent)]"
                  />
                )}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Locale Switcher + GitHub */}
        <div className="order-2 flex items-center gap-2 sm:order-3">
          <div
            data-testid="locale-switcher"
            aria-label="Language Switcher"
            className="inline-flex items-center rounded-full border border-white/10 bg-[#08090C]/80 p-0.5"
          >
            <button
              type="button"
              data-locale="zh-CN"
              aria-pressed={isZh}
              onClick={() => onLocaleChange('zh-CN')}
              className={`rounded-full px-2.5 py-1 text-[11px] leading-none transition ${
                isZh
                  ? 'bg-[#F4F5F8] font-bold text-[#08090C]'
                  : 'font-medium text-[#A1A7B5] hover:text-[#F4F5F8]'
              }`}
            >
              中文
            </button>
            <button
              type="button"
              data-locale="en"
              aria-pressed={!isZh}
              onClick={() => onLocaleChange('en')}
              className={`rounded-full px-2.5 py-1 text-[11px] leading-none transition ${
                !isZh
                  ? 'bg-[#F4F5F8] font-bold text-[#08090C]'
                  : 'font-medium text-[#A1A7B5] hover:text-[#F4F5F8]'
              }`}
            >
              EN
            </button>
          </div>

          <a
            href="https://github.com/botshen/anygrab"
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-[#F4F5F8] transition hover:border-white/25 hover:bg-white/10 md:inline-flex"
          >
            <span>GitHub</span>
            <ArrowUpRight className="h-3 w-3 text-[#A1A7B5]" />
          </a>
        </div>
      </div>
    </header>
  );
}
