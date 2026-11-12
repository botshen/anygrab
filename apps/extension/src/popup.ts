import { VERSION, type OutputFormat } from '@anygrab/core';
import { copyTextToClipboard } from './shared/clipboard';
import { getMessages, toggleLocale } from './shared/i18n';
import {
  clearHistory,
  loadHistory,
  loadSettings,
  saveSettings,
} from './shared/storage';
import {
  FORMAT_CYCLE,
  FORMAT_SHORT_LABELS,
  MAX_TOKEN_BUDGET,
  MIN_TOKEN_BUDGET,
  type ExtensionSettings,
  type GrabHistoryItem,
  type PickerActionResponse,
} from './shared/types';

export interface PopupControllerOptions {
  closeWindow?: () => void;
  activateTabPicker?: (settings: ExtensionSettings) => Promise<PickerActionResponse>;
  openTabUrl?: (url: string) => Promise<void> | void;
  resolveExtensionUrl?: (relativePath: string) => string;
}

const BRAND_LOGO_SVG = `
  <svg class="ag-logo-mark" viewBox="0 0 32 32" fill="none" aria-hidden="true">
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

const RETICLE_ICON_SVG = `
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#D94E28" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M4 9V5a1 1 0 0 1 1-1h4M15 4h4a1 1 0 0 1 1 1v4M20 15v4a1 1 0 0 1-1 1h-4M9 20H5a1 1 0 0 1-1-1v-4" />
    <circle cx="12" cy="12" r="2.3" fill="#D94E28" stroke="none" />
  </svg>
`;

const GUIDE_ICON_SVG = `
  <svg width="13.5" height="13.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M2 5.5A2.5 2.5 0 0 1 4.5 3H11v17H4.5A2.5 2.5 0 0 0 2 22.5v-17Z" />
    <path d="M22 5.5A2.5 2.5 0 0 0 19.5 3H13v17h6.5a2.5 2.5 0 0 1 2.5 2.5v-17Z" />
  </svg>
`;

const WEBSITE_ICON_SVG = `
  <svg width="13.5" height="13.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M3.6 9h16.8M3.6 15h16.8" />
    <path d="M12 3a14.5 14.5 0 0 1 0 18M12 3a14.5 14.5 0 0 0 0 18" />
  </svg>
`;

const SLIDERS_ICON_SVG = `
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <line x1="4" y1="7" x2="20" y2="7" />
    <line x1="4" y1="17" x2="20" y2="17" />
    <circle cx="9" cy="7" r="2.2" fill="#FFFFFF" />
    <circle cx="15" cy="17" r="2.2" fill="#FFFFFF" />
  </svg>
`;

async function defaultActivateTabPicker(
  settings: ExtensionSettings,
): Promise<PickerActionResponse> {
  if (
    typeof globalThis === 'undefined' ||
    !('chrome' in globalThis) ||
    !globalThis.chrome?.runtime?.sendMessage
  ) {
    return { ok: false, error: 'Extension runtime unavailable.' };
  }

  return new Promise<PickerActionResponse>((resolve) => {
    try {
      globalThis.chrome.runtime.sendMessage(
        { type: 'ANYGRAB_ACTIVATE_TAB_PICKER', settings },
        (response?: PickerActionResponse) => {
          const err = globalThis.chrome?.runtime?.lastError;
          if (err) {
            resolve({ ok: false, error: err.message });
            return;
          }
          resolve(response ?? { ok: false, error: 'No response from background service.' });
        },
      );
    } catch (err) {
      resolve({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });
}

function defaultOpenTabUrl(url: string): void {
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

function defaultResolveExtensionUrl(relativePath: string): string {
  if (
    typeof globalThis !== 'undefined' &&
    'chrome' in globalThis &&
    globalThis.chrome?.runtime?.getURL
  ) {
    return globalThis.chrome.runtime.getURL(relativePath);
  }
  return `./${relativePath}`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function initPopupApp(
  root: HTMLElement,
  options: PopupControllerOptions = {},
): Promise<void> {
  const doc = root.ownerDocument;
  const closeWin = options.closeWindow ?? (() => window.close());
  const activatePicker = options.activateTabPicker ?? defaultActivateTabPicker;
  const openTabUrl = options.openTabUrl ?? defaultOpenTabUrl;
  const resolveExtUrl = options.resolveExtensionUrl ?? defaultResolveExtensionUrl;

  let settings = await loadSettings();
  let history = await loadHistory();
  let siteConfigOpen = false;

  const renderApp = () => {
    const msg = getMessages(settings.locale);
    const activeFmtCopy = msg.formats[settings.format];
    const isZh = settings.locale === 'zh-CN';

    root.setAttribute('data-locale', settings.locale);
    doc.documentElement.lang = settings.locale;

    root.innerHTML = `
      <main class="ag-popup">
        <header class="ag-header">
          <div class="ag-logo-group">
            ${BRAND_LOGO_SVG}
            <div class="ag-title-wrap">
              <span class="ag-title">AnyGrab</span>
              <span class="ag-version">v${escapeHtml(VERSION)}</span>
            </div>
          </div>
          <div class="ag-header-right">
            <button
              type="button"
              class="ag-seg-locale"
              data-action="toggle-locale"
              title="${escapeHtml(msg.localeSwitchTitle)}"
            >
              <span class="ag-seg-locale-item" data-active="${String(isZh)}">中文</span>
              <span class="ag-seg-locale-item" data-active="${String(!isZh)}">EN</span>
            </button>
          </div>
        </header>

        <button type="button" class="ag-pick-cta" data-action="pick-element">
          <span class="ag-pick-cta-left">
            <span class="ag-pick-cta-icon">${RETICLE_ICON_SVG}</span>
            <div>
              <div class="ag-pick-cta-title">${escapeHtml(msg.pickCtaTitle)}</div>
              <div class="ag-pick-cta-sub">${escapeHtml(msg.pickCtaSub)}</div>
            </div>
          </span>
          <kbd class="ag-shortcut-kbd">Alt+Shift+G</kbd>
        </button>

        <div class="ag-status-banner" data-part="status-banner" role="alert"></div>

        <div class="ag-onboarding-row">
          <button type="button" class="ag-guide-btn" data-action="open-guide">
            ${GUIDE_ICON_SVG}
            <span>${escapeHtml(msg.openGuideBtn)}</span>
          </button>
          <button type="button" class="ag-site-btn" data-action="open-website">
            ${WEBSITE_ICON_SVG}
            <span>${escapeHtml(msg.openWebsiteBtn)}</span>
          </button>
          <button
            type="button"
            class="ag-gear-btn"
            data-action="toggle-website-config"
            title="${escapeHtml(msg.websiteConfigLabel)}"
            aria-label="Configure official website URL"
          >${SLIDERS_ICON_SVG}</button>
        </div>

        <div class="ag-site-config" data-part="website-config" data-open="${String(siteConfigOpen)}">
          <input
            type="url"
            class="ag-site-input"
            data-control="website-url"
            value="${escapeHtml(settings.websiteUrl)}"
            placeholder="http://localhost:4173"
          />
          <button type="button" class="ag-site-save" data-action="save-website-url">
            ${escapeHtml(msg.websiteSaveBtn)}
          </button>
        </div>

        <section class="ag-rule-section" aria-label="Output Format">
          <div class="ag-section-row">
            <span class="ag-label">${escapeHtml(msg.formatSectionTitle)}</span>
          </div>
          <div class="ag-segmented" role="radiogroup" aria-label="Output Format">
            ${FORMAT_CYCLE.map(
              (fmt) => `
                <button
                  type="button"
                  class="ag-seg-btn"
                  data-format="${fmt}"
                  data-active="${String(fmt === settings.format)}"
                >${escapeHtml(msg.formats[fmt].shortTab)}</button>
              `,
            ).join('')}
          </div>
          <div class="ag-format-explain" data-part="format-explain">
            <span class="ag-sr-only" data-part="format-title">${escapeHtml(activeFmtCopy.fullTitle)}</span>
            <span class="ag-format-explain-sub" data-part="format-subtitle">${escapeHtml(activeFmtCopy.subtitle)}</span>
          </div>
        </section>

        <section class="ag-rule-section" aria-label="Token Budget">
          <div class="ag-section-row">
            <span class="ag-label">${escapeHtml(msg.budgetSectionTitle)}</span>
            <div class="ag-budget-readout">
              <span class="ag-budget-value" data-part="budget-value">${escapeHtml(
                msg.formatBudgetValue(settings.maxTokens, settings.unlimitedTokens),
              )}</span>
              <label class="ag-unlimited-chip" data-part="unlimited-chip" data-active="${String(settings.unlimitedTokens)}">
                <input
                  type="checkbox"
                  data-control="unlimited-tokens"
                  ${settings.unlimitedTokens ? 'checked' : ''}
                />
                <span>${escapeHtml(msg.budgetUnlimitedLabel)}</span>
              </label>
            </div>
          </div>
          <div class="ag-slider-wrap" data-part="slider-wrap" data-disabled="${String(settings.unlimitedTokens)}">
            <input
              type="range"
              class="ag-slider"
              data-control="budget-slider"
              min="${MIN_TOKEN_BUDGET}"
              max="${MAX_TOKEN_BUDGET}"
              step="100"
              value="${settings.maxTokens}"
              ${settings.unlimitedTokens ? 'disabled' : ''}
            />
            <!-- Mathematically Linear Scale Ticks across [400, 6000] -->
            <div class="ag-slider-ticks">
              <span class="ag-tick ag-tick-start">400</span>
              <span class="ag-tick" style="left: 28.57%;">2,000</span>
              <span class="ag-tick" style="left: 64.29%;">4,000</span>
              <span class="ag-tick ag-tick-end">6,000</span>
            </div>
          </div>
        </section>

        <section class="ag-rule-section ag-toggles-grid" aria-label="Extraction Options">
          <label class="ag-toggle-row">
            <div>
              <div class="ag-toggle-title">${escapeHtml(msg.compactSvgTitle)}</div>
              <div class="ag-toggle-sub">${escapeHtml(msg.compactSvgSub)}</div>
            </div>
            <span class="ag-switch">
              <input type="checkbox" data-control="compact-svg" ${settings.compactSvg ? 'checked' : ''} />
              <span class="ag-switch-track"></span>
            </span>
          </label>

          <label class="ag-toggle-row">
            <div>
              <div class="ag-toggle-title">${escapeHtml(msg.includeHoverTitle)}</div>
              <div class="ag-toggle-sub">${escapeHtml(msg.includeHoverSub)}</div>
            </div>
            <span class="ag-switch">
              <input type="checkbox" data-control="include-hover" ${settings.includeHoverStyles ? 'checked' : ''} />
              <span class="ag-switch-track"></span>
            </span>
          </label>
        </section>

        <section class="ag-rule-section ag-history-section" aria-label="Recent Grabs">
          <div class="ag-history-header">
            <div class="ag-history-title-group">
              <span class="ag-label">${escapeHtml(msg.historySectionTitle)}</span>
              <span class="ag-count-badge" data-part="history-count">${history.length}</span>
            </div>
            <button
              type="button"
              class="ag-clear-btn"
              data-action="clear-history"
              ${history.length === 0 ? 'disabled' : ''}
            >${escapeHtml(msg.historyClearBtn)}</button>
          </div>
          <div class="ag-history-list" data-part="history-list"></div>
        </section>
      </main>
    `;

    bindEvents();
    renderHistoryItems();
  };

  const renderHistoryItems = () => {
    const msg = getMessages(settings.locale);
    const historyCountEl = root.querySelector<HTMLSpanElement>('[data-part="history-count"]');
    const clearHistoryBtn = root.querySelector<HTMLButtonElement>('[data-action="clear-history"]');
    const historyListEl = root.querySelector<HTMLDivElement>('[data-part="history-list"]');
    if (!historyCountEl || !clearHistoryBtn || !historyListEl) return;

    historyCountEl.textContent = String(history.length);
    clearHistoryBtn.disabled = history.length === 0;

    if (history.length === 0) {
      historyListEl.innerHTML = `
        <div class="ag-empty-history" data-part="history-empty">
          ${msg.historyEmptyHtml}
        </div>
      `;
      return;
    }

    historyListEl.innerHTML = history
      .map((item: GrabHistoryItem) => {
        const pct =
          Number.isFinite(item.compressionRatio) && item.compressionRatio > 0
            ? `-${item.compressionRatio.toFixed(1)}%`
            : '0.0%';
        const shortFmt =
          msg.formats[item.format]?.shortTab ?? FORMAT_SHORT_LABELS[item.format] ?? item.format;
        return `
          <div class="ag-history-item" data-history-id="${escapeHtml(item.id)}">
            <div class="ag-history-meta">
              <div class="ag-history-top">
                <span class="ag-domain" title="${escapeHtml(item.url)}">${escapeHtml(item.domain)}</span>
                <span class="ag-tag-pill">&lt;${escapeHtml(item.tagLabel)}&gt;</span>
              </div>
              <div class="ag-history-bottom">
                <span class="ag-fmt-badge">${escapeHtml(shortFmt)}</span>
                <span class="ag-ratio-badge">${escapeHtml(pct)}</span>
                <span class="ag-tokens-muted">${item.outputTokens.toLocaleString('en-US')} tok · ${escapeHtml(
                  msg.formatRelativeTime(item.timestamp),
                )}</span>
              </div>
            </div>
            <button
              type="button"
              class="ag-copy-btn"
              data-action="copy-item"
              data-id="${escapeHtml(item.id)}"
            >${escapeHtml(msg.historyCopyBtn)}</button>
          </div>
        `;
      })
      .join('');
  };

  const bindEvents = () => {
    const langBtn = root.querySelector<HTMLButtonElement>('[data-action="toggle-locale"]')!;
    const guideBtn = root.querySelector<HTMLButtonElement>('[data-action="open-guide"]')!;
    const siteBtn = root.querySelector<HTMLButtonElement>('[data-action="open-website"]')!;
    const gearBtn = root.querySelector<HTMLButtonElement>('[data-action="toggle-website-config"]')!;
    const siteConfigWrap = root.querySelector<HTMLDivElement>('[data-part="website-config"]')!;
    const siteUrlInput = root.querySelector<HTMLInputElement>('[data-control="website-url"]')!;
    const siteSaveBtn = root.querySelector<HTMLButtonElement>('[data-action="save-website-url"]')!;
    const pickBtn = root.querySelector<HTMLButtonElement>('[data-action="pick-element"]')!;
    const statusBanner = root.querySelector<HTMLDivElement>('[data-part="status-banner"]')!;
    const formatBtns = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-format]'));
    const budgetValueEl = root.querySelector<HTMLSpanElement>('[data-part="budget-value"]')!;
    const unlimitedCheckbox = root.querySelector<HTMLInputElement>(
      '[data-control="unlimited-tokens"]',
    )!;
    const budgetSlider = root.querySelector<HTMLInputElement>('[data-control="budget-slider"]')!;
    const compactSvgCheckbox = root.querySelector<HTMLInputElement>('[data-control="compact-svg"]')!;
    const includeHoverCheckbox = root.querySelector<HTMLInputElement>(
      '[data-control="include-hover"]',
    )!;
    const clearHistoryBtn = root.querySelector<HTMLButtonElement>('[data-action="clear-history"]')!;
    const historyListEl = root.querySelector<HTMLDivElement>('[data-part="history-list"]')!;

    langBtn.addEventListener('click', () => {
      void (async () => {
        settings = await saveSettings({ locale: toggleLocale(settings.locale) });
        renderApp();
      })();
    });

    guideBtn.addEventListener('click', () => {
      void Promise.resolve(openTabUrl(resolveExtUrl('guide.html'))).then(() => {
        closeWin();
      });
    });

    siteBtn.addEventListener('click', () => {
      void Promise.resolve(openTabUrl(settings.websiteUrl)).then(() => {
        closeWin();
      });
    });

    gearBtn.addEventListener('click', () => {
      siteConfigOpen = !siteConfigOpen;
      siteConfigWrap.setAttribute('data-open', String(siteConfigOpen));
    });

    siteSaveBtn.addEventListener('click', () => {
      void (async () => {
        settings = await saveSettings({ websiteUrl: siteUrlInput.value });
        siteUrlInput.value = settings.websiteUrl;
        siteConfigOpen = false;
        siteConfigWrap.setAttribute('data-open', 'false');
      })();
    });

    pickBtn.addEventListener('click', () => {
      void (async () => {
        statusBanner.setAttribute('data-visible', 'false');
        const res = await activatePicker(settings);
        if (res.ok) {
          closeWin();
        } else {
          const msg = getMessages(settings.locale);
          statusBanner.textContent = msg.restrictedTabError;
          statusBanner.setAttribute('data-visible', 'true');
        }
      })();
    });

    const formatExplainEl = root.querySelector<HTMLDivElement>('[data-part="format-explain"]')!;
    const unlimitedChipEl = root.querySelector<HTMLLabelElement>('[data-part="unlimited-chip"]')!;
    const sliderWrapEl = root.querySelector<HTMLDivElement>('[data-part="slider-wrap"]')!;

    const syncControlsInPlace = () => {
      const msg = getMessages(settings.locale);
      const fmtCopy = msg.formats[settings.format];

      for (const b of formatBtns) {
        b.setAttribute('data-active', String(b.dataset.format === settings.format));
      }

      formatExplainEl.innerHTML = `
        <span class="ag-sr-only" data-part="format-title">${escapeHtml(fmtCopy.fullTitle)}</span>
        <span class="ag-format-explain-sub" data-part="format-subtitle">${escapeHtml(fmtCopy.subtitle)}</span>
      `;

      budgetValueEl.textContent = msg.formatBudgetValue(settings.maxTokens, settings.unlimitedTokens);
      unlimitedChipEl.setAttribute('data-active', String(settings.unlimitedTokens));
      unlimitedCheckbox.checked = settings.unlimitedTokens;
      sliderWrapEl.setAttribute('data-disabled', String(settings.unlimitedTokens));
      budgetSlider.disabled = settings.unlimitedTokens;
      budgetSlider.value = String(settings.maxTokens);
      compactSvgCheckbox.checked = settings.compactSvg;
      includeHoverCheckbox.checked = settings.includeHoverStyles;
    };

    for (const btn of formatBtns) {
      btn.addEventListener('click', () => {
        const fmt = btn.dataset.format as OutputFormat | undefined;
        if (!fmt) return;
        void (async () => {
          settings = await saveSettings({ format: fmt });
          syncControlsInPlace();
        })();
      });
    }

    budgetSlider.addEventListener('input', () => {
      const nextVal = Number(budgetSlider.value);
      settings = { ...settings, maxTokens: nextVal };
      const msg = getMessages(settings.locale);
      budgetValueEl.textContent = msg.formatBudgetValue(settings.maxTokens, settings.unlimitedTokens);
      void saveSettings({ maxTokens: nextVal });
    });

    unlimitedCheckbox.addEventListener('change', () => {
      void (async () => {
        settings = await saveSettings({ unlimitedTokens: unlimitedCheckbox.checked });
        syncControlsInPlace();
      })();
    });

    compactSvgCheckbox.addEventListener('change', () => {
      void (async () => {
        settings = await saveSettings({ compactSvg: compactSvgCheckbox.checked });
      })();
    });

    includeHoverCheckbox.addEventListener('change', () => {
      void (async () => {
        settings = await saveSettings({ includeHoverStyles: includeHoverCheckbox.checked });
      })();
    });

    clearHistoryBtn.addEventListener('click', () => {
      void (async () => {
        await clearHistory();
        history = [];
        renderHistoryItems();
      })();
    });

    historyListEl.addEventListener('click', (ev: MouseEvent) => {
      const target = (ev.target as HTMLElement | null)?.closest<HTMLButtonElement>(
        '[data-action="copy-item"]',
      );
      if (!target) return;
      const itemId = target.dataset.id;
      const matched = history.find((item) => item.id === itemId);
      if (!matched) return;

      void (async () => {
        const msg = getMessages(settings.locale);
        const ok = await copyTextToClipboard(matched.output, doc);
        if (ok) {
          target.textContent = msg.historyCopiedBtn;
          target.setAttribute('data-copied', 'true');
          setTimeout(() => {
            if (target.isConnected) {
              target.textContent = getMessages(settings.locale).historyCopyBtn;
              target.removeAttribute('data-copied');
            }
          }, 1200);
        }
      })();
    });
  };

  renderApp();
}

if (typeof document !== 'undefined') {
  const appRoot = document.getElementById('app');
  if (appRoot) {
    void initPopupApp(appRoot);
  }
}
