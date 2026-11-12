import { VERSION } from '@anygrab/core';
import { bootstrapContentScript, type AnyGrabPicker } from './content';
import type { GrabExecutionOutcome } from './picker/picker-controller';
import { copyTextToClipboard } from './shared/clipboard';
import { getMessages, toggleLocale } from './shared/i18n';
import { loadSettings, saveSettings } from './shared/storage';

export interface GuideControllerOptions {
  openTabUrl?: (url: string) => void;
  picker?: AnyGrabPicker;
}

function defaultOpenWebsite(url: string): void {
  if (
    typeof globalThis !== 'undefined' &&
    'chrome' in globalThis &&
    globalThis.chrome?.tabs?.create
  ) {
    globalThis.chrome.tabs.create({ url });
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function initGuideApp(
  root: HTMLElement,
  options: GuideControllerOptions = {},
): Promise<AnyGrabPicker> {
  const doc = root.ownerDocument;
  const win = doc.defaultView ?? window;
  const openWebsite = options.openTabUrl ?? defaultOpenWebsite;
  const picker = options.picker ?? bootstrapContentScript(win, doc);

  let settings = await loadSettings();
  let lastGrabOutcome: GrabExecutionOutcome | null = null;

  const checkSvg = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#312e81" />
      <path d="M8 12.5L10.8 15.3L16.2 9.5" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  `;

  const renderGuide = () => {
    const msg = getMessages(settings.locale);
    const g = msg.guide;
    const isZh = settings.locale === 'zh-CN';

    doc.title = g.pageTitle;
    doc.documentElement.lang = settings.locale;
    root.setAttribute('data-locale', settings.locale);

    root.innerHTML = `
      <div class="ag-guide-shell">
        <nav class="ag-guide-nav">
          <div class="ag-nav-brand">
            <svg class="ag-nav-logo" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <rect x="1" y="1" width="30" height="30" rx="8" fill="#4f46e5" />
              <path d="M8 12.5V8.8C8 8.36 8.36 8 8.8 8H12.5M19.5 8H23.2C23.64 8 24 8.36 24 8.8V12.5M24 19.5V23.2C24 23.64 23.64 24 23.2 24H19.5M12.5 24H8.8C8.36 24 8 23.64 8 23.2V19.5" stroke="white" stroke-width="2.2" stroke-linecap="round" />
              <path d="M16 11.2C16.55 13.85 18.15 15.45 20.8 16C18.15 16.55 16.55 18.15 16 20.8C15.45 18.15 13.85 16.55 11.2 16C13.85 15.45 15.45 13.85 16 11.2Z" fill="white" />
            </svg>
            <div>
              <div class="ag-nav-title">AnyGrab <span style="font-weight:500;font-size:12px;color:#94a3b8;">v${escapeHtml(VERSION)}</span></div>
            </div>
            <span class="ag-nav-pill">${escapeHtml(g.navBadge)}</span>
          </div>

          <div class="ag-nav-actions">
            <button type="button" class="ag-btn-outline" data-action="guide-open-website">
              ${escapeHtml(g.openWebsiteBtn)}
            </button>
            <button type="button" class="ag-btn-lang" data-action="guide-toggle-locale">
              ${escapeHtml(msg.localeSwitchLabel)}
            </button>
          </div>
        </nav>

        <header class="ag-hero">
          <span class="ag-hero-badge">${escapeHtml(g.heroBadge)}</span>
          <h1 class="ag-hero-title">${escapeHtml(g.heroTitle)}</h1>
          <p class="ag-hero-sub">${escapeHtml(g.heroSubtitle)}</p>
          <button type="button" class="ag-btn-primary" data-action="guide-start-picker">
            ${escapeHtml(g.startPickerCta)}
          </button>
        </header>

        <section>
          <h2 class="ag-section-heading">${escapeHtml(g.stepsSectionTitle)}</h2>
          <div class="ag-steps-grid">
            <article class="ag-step-card">
              <span class="ag-step-num">1</span>
              <h3 class="ag-step-title">${escapeHtml(g.step1Title)}</h3>
              <p class="ag-step-desc">${escapeHtml(g.step1Desc)}</p>
            </article>
            <article class="ag-step-card">
              <span class="ag-step-num">2</span>
              <h3 class="ag-step-title">${escapeHtml(g.step2Title)}</h3>
              <p class="ag-step-desc">${escapeHtml(g.step2Desc)}</p>
            </article>
            <article class="ag-step-card">
              <span class="ag-step-num">3</span>
              <h3 class="ag-step-title">${escapeHtml(g.step3Title)}</h3>
              <p class="ag-step-desc">${escapeHtml(g.step3Desc)}</p>
            </article>
          </div>
        </section>

        <section class="ag-prompts-box">
          <div>
            <div style="font-size:15px;font-weight:700;color:#ffffff;">${escapeHtml(g.promptsTitle)}</div>
            <div style="font-size:12.5px;color:#94a3b8;margin-top:2px;">${escapeHtml(g.promptsHint)}</div>
          </div>
          <div class="ag-prompts-grid">
            ${g.promptTemplates
              .map(
                (tpl, idx) => `
                  <div class="ag-prompt-card">
                    <div>
                      <div class="ag-prompt-label">${escapeHtml(tpl.label)}</div>
                      <p class="ag-prompt-text" style="margin-top:5px;">${escapeHtml(tpl.text)}</p>
                    </div>
                    <button
                      type="button"
                      class="ag-prompt-copy"
                      data-action="copy-prompt-template"
                      data-prompt-idx="${idx}"
                    >${escapeHtml(g.copyPromptBtn)}</button>
                  </div>
                `,
              )
              .join('')}
          </div>
        </section>

        <section id="practice-arena" class="ag-arena-section">
          <div class="ag-arena-header">
            <div>
              <h2 style="font-size:20px;font-weight:800;color:#ffffff;">${escapeHtml(g.arenaTitle)}</h2>
              <p class="ag-arena-sub">${escapeHtml(g.arenaSubtitle)}</p>
            </div>
            <button type="button" class="ag-btn-primary" data-action="arena-start-picker" style="margin-top:0;">
              ${escapeHtml(g.arenaStartBtn)}
            </button>
          </div>

          <div
            class="ag-capture-feedback"
            data-part="arena-capture-box"
            data-captured="${String(Boolean(lastGrabOutcome))}"
          >
            ${
              lastGrabOutcome
                ? `
                  <div style="font-weight:700;font-size:14.5px;color:#6ee7b7;">${escapeHtml(g.arenaSuccessTitle)}</div>
                  <div style="margin-top:4px;font-size:13px;color:#d1fae5;">${escapeHtml(g.arenaSuccessNextStep)}</div>
                  <pre class="ag-capture-preview" data-part="arena-output-preview">${escapeHtml(
                    lastGrabOutcome.result.output.slice(0, 900),
                  )}</pre>
                `
                : escapeHtml(g.arenaIdleBanner)
            }
          </div>

          <div class="ag-arena-targets">
            <!-- Practice Target 1: Gradient SaaS Pricing Card -->
            <div class="ag-target-wrapper">
              <div class="ag-target-meta">
                <span class="ag-target-badge">${escapeHtml(g.target1Badge)}</span>
                <strong style="font-size:14px;">${escapeHtml(g.target1Label)}</strong>
                <span class="ag-target-tip">${escapeHtml(g.target1Tip)}</span>
              </div>

              <article id="practice-target-card" class="practice-pricing-card css-junk-91x8a" data-testid="noisy-attr">
                <div class="pricing-top-row">
                  <h3 class="pricing-tier-name">${isZh ? 'AI 团队旗舰版 (Pro)' : 'AI Team Pro'}</h3>
                  <span class="pricing-pop-pill">${isZh ? '🔥 最受欢迎' : '🔥 Most Popular'}</span>
                </div>
                <div class="pricing-amount">
                  <span class="pricing-price">${isZh ? '¥199' : '$29'}</span>
                  <span class="pricing-period">${isZh ? '/ 每月 · 随时可取消' : '/ month · billed monthly'}</span>
                </div>
                <ul class="pricing-features">
                  <li class="pricing-feature-item">${checkSvg}<span>${
                    isZh ? '无限次网页 UI 与设计色板一键提纯' : 'Unlimited webpage UI & design token distillation'
                  }</span></li>
                  <li class="pricing-feature-item">${checkSvg}<span>${
                    isZh ? '完美适配反重力 Antigravity / Codex / Cursor' : 'Zero-config prompts for Antigravity, Codex & Cursor'
                  }</span></li>
                  <li class="pricing-feature-item">${checkSvg}<span>${
                    isZh ? '自动保留 :hover 悬停变色与 Tailwind 类名' : 'Automatic :hover state & Tailwind v4 class synthesis'
                  }</span></li>
                </ul>
                <button type="button" id="practice-cta-btn" class="practice-cta-btn">
                  ${isZh ? '立即升级 Pro 版 →' : 'Upgrade to Pro Now →'}
                </button>
              </article>
            </div>

            <!-- Practice Target 2: Complex Merged-Header Financial Table -->
            <div class="ag-target-wrapper">
              <div class="ag-target-meta">
                <span class="ag-target-badge">${escapeHtml(g.target2Badge)}</span>
                <strong style="font-size:14px;">${escapeHtml(g.target2Label)}</strong>
                <span class="ag-target-tip">${escapeHtml(g.target2Tip)}</span>
              </div>

              <div class="practice-table-card">
                <table id="practice-target-table" class="practice-merged-table">
                  <thead>
                    <tr>
                      <th rowspan="2">${isZh ? '业务大区' : 'Region'}</th>
                      <th colspan="2">${isZh ? '2026 上半年营收明细 (百万)' : 'H1 2026 Revenue ($M)'}</th>
                      <th rowspan="2">${isZh ? '同比增长' : 'YoY Growth'}</th>
                    </tr>
                    <tr>
                      <th>${isZh ? 'Q1 实际营收' : 'Q1 Actual'}</th>
                      <th>${isZh ? 'Q2 实际营收' : 'Q2 Actual'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>${isZh ? '亚太区 (APAC)' : 'Asia-Pacific'}</td>
                      <td>¥42.8M</td>
                      <td>¥58.4M</td>
                      <td><span class="practice-growth-pill">+36.4%</span></td>
                    </tr>
                    <tr>
                      <td>${isZh ? '北美与欧洲 (NA & EU)' : 'North America & EU'}</td>
                      <td>¥61.0M</td>
                      <td>¥79.5M</td>
                      <td><span class="practice-growth-pill">+30.3%</span></td>
                    </tr>
                    <tr>
                      <td><strong>${isZh ? '全球合计' : 'Global Total'}</strong></td>
                      <td><strong>¥103.8M</strong></td>
                      <td><strong>¥137.9M</strong></td>
                      <td><span class="practice-growth-pill">+32.8%</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      </div>
    `;

    bindGuideEvents();
  };

  const bindGuideEvents = () => {
    const langBtn = root.querySelector<HTMLButtonElement>('[data-action="guide-toggle-locale"]')!;
    const siteBtn = root.querySelector<HTMLButtonElement>('[data-action="guide-open-website"]')!;
    const heroStartBtn = root.querySelector<HTMLButtonElement>(
      '[data-action="guide-start-picker"]',
    )!;
    const arenaStartBtn = root.querySelector<HTMLButtonElement>(
      '[data-action="arena-start-picker"]',
    )!;
    const promptBtns = Array.from(
      root.querySelectorAll<HTMLButtonElement>('[data-action="copy-prompt-template"]'),
    );

    langBtn.addEventListener('click', () => {
      void (async () => {
        const nextLocale = toggleLocale(settings.locale);
        settings = await saveSettings({ locale: nextLocale });
        if (picker.isActive()) {
          picker.setLocale(nextLocale);
        }
        renderGuide();
      })();
    });

    siteBtn.addEventListener('click', () => {
      openWebsite(settings.websiteUrl);
    });

    const launchArenaPicker = () => {
      const arenaEl = doc.getElementById('practice-arena');
      if (arenaEl && typeof arenaEl.scrollIntoView === 'function') {
        arenaEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      void picker.start({ locale: settings.locale });
    };

    heroStartBtn.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      launchArenaPicker();
    });

    arenaStartBtn.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      void picker.start({ locale: settings.locale });
    });

    for (const btn of promptBtns) {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.promptIdx ?? '0');
        const msg = getMessages(settings.locale);
        const tpl = msg.guide.promptTemplates[idx];
        if (!tpl) return;

        void (async () => {
          const ok = await copyTextToClipboard(tpl.text, doc);
          if (ok) {
            btn.textContent = msg.guide.copiedPromptBtn;
            btn.setAttribute('data-copied', 'true');
            setTimeout(() => {
              if (btn.isConnected) {
                btn.textContent = getMessages(settings.locale).guide.copyPromptBtn;
                btn.removeAttribute('data-copied');
              }
            }, 1300);
          }
        })();
      });
    }
  };

  const updateCaptureFeedbackInPlace = () => {
    const captureBox = root.querySelector<HTMLDivElement>('[data-part="arena-capture-box"]');
    if (!captureBox) return;
    const g = getMessages(settings.locale).guide;
    captureBox.setAttribute('data-captured', String(Boolean(lastGrabOutcome)));
    if (lastGrabOutcome) {
      captureBox.innerHTML = `
        <div style="font-weight:700;font-size:14.5px;color:#6ee7b7;">${escapeHtml(g.arenaSuccessTitle)}</div>
        <div style="margin-top:4px;font-size:13px;color:#d1fae5;">${escapeHtml(g.arenaSuccessNextStep)}</div>
        <pre class="ag-capture-preview" data-part="arena-output-preview">${escapeHtml(
          lastGrabOutcome.result.output.slice(0, 900),
        )}</pre>
      `;
    } else {
      captureBox.textContent = g.arenaIdleBanner;
    }
  };

  win.addEventListener('anygrab:grabbed', (ev: Event) => {
    const custom = ev as CustomEvent<GrabExecutionOutcome>;
    if (custom.detail) {
      lastGrabOutcome = custom.detail;
      updateCaptureFeedbackInPlace();
    }
  });

  win.addEventListener('anygrab:state', (ev: Event) => {
    const custom = ev as CustomEvent<{ locale?: 'zh-CN' | 'en' }>;
    if (custom.detail?.locale && custom.detail.locale !== settings.locale) {
      settings = { ...settings, locale: custom.detail.locale };
      renderGuide();
    }
  });

  renderGuide();
  return picker;
}

if (typeof document !== 'undefined') {
  const guideRoot = document.getElementById('guide-app');
  if (guideRoot) {
    void initGuideApp(guideRoot);
  }
}
