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

const BRAND_LOGO_SVG = `
  <svg class="ag-nav-logo" viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <rect width="32" height="32" rx="7" fill="#141413" />
    <path
      d="M8.5 12.5V8.5H12.5M19.5 8.5H23.5V12.5M23.5 19.5V23.5H19.5M12.5 23.5H8.5V19.5"
      stroke="#FAF9F5"
      stroke-width="2.1"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <rect x="13.5" y="13.5" width="5" height="5" rx="1" fill="#D94E28" />
  </svg>
`;

const RETICLE_BTN_SVG = `
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#D94E28" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M4 9V5a1 1 0 0 1 1-1h4M15 4h4a1 1 0 0 1 1 1v4M20 15v4a1 1 0 0 1-1 1h-4M9 20H5a1 1 0 0 1-1-1v-4" />
    <circle cx="12" cy="12" r="2.2" fill="#D94E28" stroke="none" />
  </svg>
`;

const EXTERNAL_SITE_SVG = `
  <svg width="13.5" height="13.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M7 17L17 7" />
    <path d="M8 7h9v9" />
  </svg>
`;

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
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" fill="#242422" stroke="#3A3A36" stroke-width="1.2" />
      <path d="M7.8 12.4L10.6 15.2L16.4 9.2" stroke="#D94E28" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
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
            ${BRAND_LOGO_SVG}
            <div class="ag-nav-title">
              <span>AnyGrab</span>
              <span class="ag-nav-version">v${escapeHtml(VERSION)}</span>
            </div>
            <span class="ag-nav-meta">${escapeHtml(g.navBadge)}</span>
          </div>

          <div class="ag-nav-actions">
            <button type="button" class="ag-btn-outline" data-action="guide-open-website">
              <span>${escapeHtml(g.openWebsiteBtn)}</span>
              ${EXTERNAL_SITE_SVG}
            </button>
            <button
              type="button"
              class="ag-seg-locale"
              data-action="guide-toggle-locale"
              title="${escapeHtml(msg.localeSwitchTitle)}"
            >
              <span class="ag-seg-locale-item" data-active="${String(isZh)}">中文</span>
              <span class="ag-seg-locale-item" data-active="${String(!isZh)}">EN</span>
            </button>
          </div>
        </nav>

        <!-- Compact Left-Aligned Open Masthead Directly on Archival Paper -->
        <header class="ag-hero">
          <div class="ag-hero-main">
            <span class="ag-hero-badge">${escapeHtml(g.heroBadge)}</span>
            <h1 class="ag-hero-title">${escapeHtml(g.heroTitle)}</h1>
            <p class="ag-hero-sub">${escapeHtml(g.heroSubtitle)}</p>
          </div>
          <button type="button" class="ag-btn-primary ag-hero-cta" data-action="guide-start-picker">
            ${RETICLE_BTN_SVG}
            <span>${escapeHtml(g.startPickerCta)}</span>
          </button>
        </header>

        <!-- FIRST-FOLD PROTAGONIST: Live Practice Arena Framed by Optical Viewfinder Brackets -->
        <section id="practice-arena" class="ag-arena-section">
          <span aria-hidden="true" class="ag-reticle-bracket ag-rb-tl"></span>
          <span aria-hidden="true" class="ag-reticle-bracket ag-rb-tr"></span>
          <span aria-hidden="true" class="ag-reticle-bracket ag-rb-bl"></span>
          <span aria-hidden="true" class="ag-reticle-bracket ag-rb-br"></span>

          <div class="ag-arena-header">
            <div>
              <div class="ag-arena-eyebrow">${isZh ? 'LIVE OPTICAL VIEWFINDER STAGE · 现场实测靶场' : 'LIVE OPTICAL VIEWFINDER STAGE'}</div>
              <h2 class="ag-arena-title">${escapeHtml(g.arenaTitle)}</h2>
              <p class="ag-arena-sub">${escapeHtml(g.arenaSubtitle)}</p>
            </div>
            <button type="button" class="ag-btn-primary" data-action="arena-start-picker">
              ${RETICLE_BTN_SVG}
              <span>${escapeHtml(g.arenaStartBtn)}</span>
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
                  <div class="ag-capture-success-title">${escapeHtml(g.arenaSuccessTitle)}</div>
                  <div class="ag-capture-success-next">${escapeHtml(g.arenaSuccessNextStep)}</div>
                  <pre class="ag-capture-preview" data-part="arena-output-preview">${escapeHtml(
                    lastGrabOutcome.result.output.slice(0, 900),
                  )}</pre>
                `
                : escapeHtml(g.arenaIdleBanner)
            }
          </div>

          <div class="ag-arena-targets">
            <!-- Practice Target 1: Sharp Matte Carbon SaaS Pro Card -->
            <div class="ag-target-wrapper">
              <div class="ag-target-meta">
                <span class="ag-target-badge">${escapeHtml(g.target1Badge)}</span>
                <strong class="ag-target-label">${escapeHtml(g.target1Label)}</strong>
                <span class="ag-target-tip">${escapeHtml(g.target1Tip)}</span>
              </div>

              <article id="practice-target-card" class="practice-pricing-card css-junk-91x8a" data-testid="noisy-attr">
                <div class="pricing-top-row">
                  <h3 class="pricing-tier-name">${isZh ? 'AI 团队旗舰版 (Pro)' : 'AI Team Pro'}</h3>
                  <span class="pricing-pop-pill">${isZh ? '旗舰首选' : 'RECOMMENDED'}</span>
                </div>
                <div class="pricing-amount">
                  <span class="pricing-price">${isZh ? '¥199' : '$29'}</span>
                  <span class="pricing-period">${isZh ? '/ 每月 · 按需订阅' : '/ month · billed monthly'}</span>
                </div>
                <ul class="pricing-features">
                  <li class="pricing-feature-item">${checkSvg}<span>${
                    isZh ? '无限次网页 UI 与设计色板毫秒级提纯' : 'Unlimited webpage UI & design token distillation'
                  }</span></li>
                  <li class="pricing-feature-item">${checkSvg}<span>${
                    isZh ? '原生适配反重力 Antigravity / Codex / Cursor' : 'Zero-config prompts for Antigravity, Codex & Cursor'
                  }</span></li>
                  <li class="pricing-feature-item">${checkSvg}<span>${
                    isZh ? '完整保留 :hover 悬停变色与 Tailwind 类名' : 'Automatic :hover state & Tailwind v4 class synthesis'
                  }</span></li>
                </ul>
                <button type="button" id="practice-cta-btn" class="practice-cta-btn">
                  ${isZh ? '立即开通旗舰版 →' : 'Upgrade to Pro →'}
                </button>
              </article>
            </div>

            <!-- Practice Target 2: Enterprise Merged-Header Financial Table -->
            <div class="ag-target-wrapper">
              <div class="ag-target-meta">
                <span class="ag-target-badge">${escapeHtml(g.target2Badge)}</span>
                <strong class="ag-target-label">${escapeHtml(g.target2Label)}</strong>
                <span class="ag-target-tip">${escapeHtml(g.target2Tip)}</span>
              </div>

              <div class="practice-table-card">
                <table id="practice-target-table" class="practice-merged-table">
                  <thead>
                    <tr>
                      <th rowspan="2">${isZh ? '业务大区' : 'Region'}</th>
                      <th colspan="2">${isZh ? '2026 上半年营收 (百万)' : 'H1 2026 Revenue ($M)'}</th>
                      <th rowspan="2">${isZh ? '同比' : 'YoY'}</th>
                    </tr>
                    <tr>
                      <th>${isZh ? 'Q1 营收' : 'Q1 Actual'}</th>
                      <th>${isZh ? 'Q2 营收' : 'Q2 Actual'}</th>
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
                      <td>${isZh ? '欧美区 (NA/EU)' : 'NA & EU'}</td>
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

        <!-- Open 3-Step Timeline Directly on Archival Paper (Exact Same Left Vertical Anchor!) -->
        <section class="ag-open-section">
          <h2 class="ag-section-heading">${escapeHtml(g.stepsSectionTitle)}</h2>
          <div class="ag-steps-grid">
            <article class="ag-step-card" data-accent="true">
              <span class="ag-step-num" data-accent="true">01 / SELECT</span>
              <h3 class="ag-step-title">${escapeHtml(g.step1Title)}</h3>
              <p class="ag-step-desc">${escapeHtml(g.step1Desc)}</p>
            </article>
            <article class="ag-step-card">
              <span class="ag-step-num">02 / PASTE</span>
              <h3 class="ag-step-title">${escapeHtml(g.step2Title)}</h3>
              <p class="ag-step-desc">${escapeHtml(g.step2Desc)}</p>
            </article>
            <article class="ag-step-card">
              <span class="ag-step-num">03 / SHIP</span>
              <h3 class="ag-step-title">${escapeHtml(g.step3Title)}</h3>
              <p class="ag-step-desc">${escapeHtml(g.step3Desc)}</p>
            </article>
          </div>
        </section>

        <!-- Open Companion Prompts Ledger Directly on Archival Paper (Zero Outer White Box!) -->
        <section class="ag-open-section">
          <div class="ag-prompts-head">
            <h2 class="ag-section-heading" style="margin-bottom:4px;">${escapeHtml(g.promptsTitle)}</h2>
            <p class="ag-prompts-hint">${escapeHtml(g.promptsHint)}</p>
          </div>
          <div class="ag-prompts-grid">
            ${g.promptTemplates
              .map(
                (tpl, idx) => `
                  <div class="ag-prompt-card">
                    <div>
                      <div class="ag-prompt-label">${escapeHtml(tpl.label)}</div>
                      <p class="ag-prompt-text">${escapeHtml(tpl.text)}</p>
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
        <div class="ag-capture-success-title">${escapeHtml(g.arenaSuccessTitle)}</div>
        <div class="ag-capture-success-next">${escapeHtml(g.arenaSuccessNextStep)}</div>
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
