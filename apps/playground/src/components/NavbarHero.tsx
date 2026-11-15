import { Moon, Star, Sun } from 'lucide-react';
import type { ActiveTab } from '../data/types';
import { GITHUB_REPO_URL, type SiteLocale, type SiteTheme } from '../i18n';

interface NavbarHeroProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  locale: SiteLocale;
  onLocaleChange: (locale: SiteLocale) => void;
  theme: SiteTheme;
  onThemeChange: (theme: SiteTheme) => void;
}

function GitHubMark() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="M12 .5C5.65.5.5 5.66.5 12.02c0 5.1 3.3 9.42 7.88 10.95.58.1.79-.25.79-.56v-2.02c-3.2.7-3.88-1.39-3.88-1.39-.52-1.34-1.28-1.7-1.28-1.7-1.05-.72.08-.71.08-.71 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.56-.29-5.25-1.28-5.25-5.71 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.18 1.18a11.04 11.04 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.77.12 3.06.74.81 1.18 1.84 1.18 3.1 0 4.44-2.7 5.42-5.27 5.7.41.36.78 1.07.78 2.16v3.2c0 .31.21.67.8.56A11.53 11.53 0 0 0 23.5 12.02C23.5 5.66 18.35.5 12 .5Z" />
    </svg>
  );
}

export function NavbarHero({
  activeTab,
  onTabChange,
  locale,
  onLocaleChange,
  theme,
  onThemeChange,
}: NavbarHeroProps) {
  const isZh = locale === 'zh-CN';
  const isDark = theme === 'dark';

  const navItems: Array<{
    id: ActiveTab;
    label: string;
  }> = [
    { id: 'overview', label: isZh ? '总览' : 'Overview' },
    { id: 'playground', label: isZh ? '沙盒' : 'Sandbox' },
    { id: 'leaderboard', label: isZh ? '评测' : 'Bench' },
    { id: 'workflows', label: isZh ? '配方' : 'Recipes' },
    { id: 'quickstart', label: isZh ? '安装' : 'Install' },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--ag-line)] bg-[var(--ag-bg)]">
      <div className="ag-wrap flex min-h-[60px] flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2 sm:min-h-[68px] sm:py-0">
        <a href="#top-main" className="ag-skip-link">
          {isZh ? '跳至正文' : 'Skip to content'}
        </a>

        {/* Left: Minimalist Brand Reticle & Wordmark */}
        <button
          type="button"
          onClick={() => onTabChange('overview')}
          className="inline-flex min-h-[44px] items-center gap-2.5 text-left transition-opacity hover:opacity-80"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 32 32"
            fill="none"
            aria-hidden="true"
            className="shrink-0"
          >
            <rect width="32" height="32" rx="8" fill="var(--ag-ink)" />
            <path
              d="M8.5 13V8.5H13M19 8.5H23.5V13M23.5 19V23.5H19M13 23.5H8.5V19"
              stroke="var(--ag-bg)"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="16" cy="16" r="2.8" fill="var(--ag-accent)" />
          </svg>
          <span className="text-[19px] font-medium tracking-[-0.03em] text-[var(--ag-ink)]">
            AnyGrab
          </span>
        </button>

        {/* Center: Clean Hairline Navigation Links */}
        <nav
          role="tablist"
          aria-label="Primary Website Navigation"
          className="ag-no-scrollbar order-3 flex w-full items-center justify-between gap-1 overflow-x-auto border-t border-[var(--ag-line)] pt-1 sm:order-2 sm:w-auto sm:justify-center sm:gap-5 sm:border-t-0 sm:pt-0"
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
                className={`relative inline-flex min-h-[40px] shrink-0 items-center px-2 text-[15px] whitespace-nowrap transition-colors sm:min-h-[68px] sm:px-1 ${
                  active
                    ? 'font-medium text-[var(--ag-ink)]'
                    : 'text-[var(--ag-muted)] hover:text-[var(--ag-ink)]'
                }`}
              >
                <span>{item.label}</span>
                {active && (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-[var(--ag-ink)]"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Right: Theme Toggle + Locale Switcher + Star on GitHub */}
        <div className="order-2 flex items-center gap-2 sm:order-3">
          <button
            type="button"
            data-testid="theme-switcher"
            onClick={() => onThemeChange(isDark ? 'light' : 'dark')}
            aria-label={
              isDark
                ? isZh
                  ? '切换为亮色模式'
                  : 'Switch to light mode'
                : isZh
                  ? '切换为暗色模式'
                  : 'Switch to dark mode'
            }
            title={
              isDark
                ? isZh
                  ? '切换亮色'
                  : 'Light mode'
                : isZh
                  ? '切换暗色'
                  : 'Dark mode'
            }
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-[var(--ag-line)] bg-[var(--ag-panel)] px-3 text-[13px] font-medium text-[var(--ag-ink)] transition-colors hover:border-[var(--ag-line-strong)]"
          >
            {isDark ? (
              <>
                <Sun className="h-3.5 w-3.5 text-[var(--ag-accent)]" />
                <span className="hidden lg:inline">{isZh ? '亮色' : 'Light'}</span>
              </>
            ) : (
              <>
                <Moon className="h-3.5 w-3.5 text-[var(--ag-muted)]" />
                <span className="hidden lg:inline">{isZh ? '暗色' : 'Dark'}</span>
              </>
            )}
          </button>

          <div
            data-testid="locale-switcher"
            aria-label="Language Switcher"
            className="inline-flex min-h-[38px] items-center rounded-full border border-[var(--ag-line)] bg-[var(--ag-panel)] p-0.5"
          >
            <button
              type="button"
              data-locale="zh-CN"
              aria-pressed={isZh}
              onClick={() => onLocaleChange('zh-CN')}
              className={`min-h-[32px] rounded-full px-2.5 text-[13px] leading-none transition-colors ${
                isZh
                  ? 'bg-[var(--ag-ink)] font-medium text-[var(--ag-bg)]'
                  : 'text-[var(--ag-muted)] hover:text-[var(--ag-ink)]'
              }`}
            >
              中文
            </button>
            <button
              type="button"
              data-locale="en"
              aria-pressed={!isZh}
              onClick={() => onLocaleChange('en')}
              className={`min-h-[32px] rounded-full px-2.5 text-[13px] leading-none transition-colors ${
                !isZh
                  ? 'bg-[var(--ag-ink)] font-medium text-[var(--ag-bg)]'
                  : 'text-[var(--ag-muted)] hover:text-[var(--ag-ink)]'
              }`}
            >
              EN
            </button>
          </div>

          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noreferrer"
            data-testid="nav-github-star"
            aria-label={isZh ? '前往 GitHub 为 AnyGrab 点亮 Star' : 'Star AnyGrab on GitHub'}
            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full border border-[var(--ag-line-strong)] bg-[var(--ag-panel)] px-3.5 text-[13px] font-medium text-[var(--ag-ink)] transition-colors hover:border-[var(--ag-accent)] hover:text-[var(--ag-accent)]"
          >
            <GitHubMark />
            <Star className="h-3.5 w-3.5 fill-current text-[var(--ag-accent)]" />
            <span>{isZh ? 'Star' : 'Star'}</span>
          </a>
        </div>
      </div>
    </header>
  );
}
