import { VERSION, type OutputFormat } from '@anygrab/core';
import { copyTextToClipboard } from './shared/clipboard';
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
}

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

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatBudgetDisplay(settings: ExtensionSettings): string {
  if (settings.unlimitedTokens) {
    return 'Unlimited';
  }
  return `${settings.maxTokens.toLocaleString('en-US')} tokens`;
}

function formatRelativeTime(timestamp: number): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSec < 15) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

export async function initPopupApp(
  root: HTMLElement,
  options: PopupControllerOptions = {},
): Promise<void> {
  const doc = root.ownerDocument;
  const closeWin = options.closeWindow ?? (() => window.close());
  const activatePicker = options.activateTabPicker ?? defaultActivateTabPicker;

  let settings = await loadSettings();
  let history = await loadHistory();

  root.innerHTML = `
    <main class="ag-popup">
      <header class="ag-header">
        <div class="ag-logo-group">
          <svg class="ag-logo-mark" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <defs>
              <linearGradient id="ag-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#4338ca" />
                <stop offset="52%" stop-color="#6366f1" />
                <stop offset="100%" stop-color="#38bdf8" />
              </linearGradient>
            </defs>
            <rect x="1" y="1" width="30" height="30" rx="7.5" fill="url(#ag-grad)" />
            <path d="M8 12.5V8.8C8 8.36 8.36 8 8.8 8H12.5M19.5 8H23.2C23.64 8 24 8.36 24 8.8V12.5M24 19.5V23.2C24 23.64 23.64 24 23.2 24H19.5M12.5 24H8.8C8.36 24 8 23.64 8 23.2V19.5" stroke="white" stroke-width="2.2" stroke-linecap="round" />
            <path d="M16 11.2C16.55 13.85 18.15 15.45 20.8 16C18.15 16.55 16.55 18.15 16 20.8C15.45 18.15 13.85 16.55 11.2 16C13.85 15.45 15.45 13.85 16 11.2Z" fill="white" />
          </svg>
          <div class="ag-title-wrap">
            <span class="ag-title">AnyGrab</span>
            <span class="ag-version">v${escapeHtml(VERSION)}</span>
          </div>
        </div>
        <span class="ag-engine-pill">0 LLM · &lt;5ms</span>
      </header>

      <button type="button" class="ag-pick-cta" data-action="pick-element">
        <span class="ag-pick-cta-left">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3"></circle>
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4"></path>
          </svg>
          <span>Pick Element on Page</span>
        </span>
        <kbd class="ag-shortcut-kbd">Alt+Shift+G</kbd>
      </button>

      <div class="ag-status-banner" data-part="status-banner" role="alert"></div>

      <section class="ag-section" aria-label="Output Format">
        <div class="ag-section-row">
          <span class="ag-label">Output Format</span>
        </div>
        <div class="ag-segmented" role="radiogroup" aria-label="Output Format">
          ${FORMAT_CYCLE.map(
            (fmt) => `
              <button
                type="button"
                class="ag-seg-btn"
                data-format="${fmt}"
                data-active="${String(fmt === settings.format)}"
              >${escapeHtml(FORMAT_SHORT_LABELS[fmt])}</button>
            `,
          ).join('')}
        </div>
      </section>

      <section class="ag-section" aria-label="Token Budget">
        <div class="ag-section-row">
          <span class="ag-label">Token Budget</span>
          <div class="ag-budget-readout">
            <span class="ag-budget-value" data-part="budget-value">${escapeHtml(formatBudgetDisplay(settings))}</span>
            <label class="ag-unlimited-chip" data-part="unlimited-chip" data-active="${String(settings.unlimitedTokens)}">
              <input
                type="checkbox"
                data-control="unlimited-tokens"
                ${settings.unlimitedTokens ? 'checked' : ''}
              />
              <span>Unlimited</span>
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
          <div class="ag-slider-ticks">
            <span>400</span>
            <span>2,000</span>
            <span>4,000</span>
            <span>6,000</span>
          </div>
        </div>
      </section>

      <div class="ag-toggles-grid">
        <label class="ag-toggle-card">
          <div>
            <div class="ag-toggle-title">Compact SVGs</div>
            <div class="ag-toggle-sub">Fold verbose paths</div>
          </div>
          <span class="ag-switch">
            <input type="checkbox" data-control="compact-svg" ${settings.compactSvg ? 'checked' : ''} />
            <span class="ag-switch-track"></span>
          </span>
        </label>

        <label class="ag-toggle-card">
          <div>
            <div class="ag-toggle-title">Include :hover</div>
            <div class="ag-toggle-sub">Interactive states</div>
          </div>
          <span class="ag-switch">
            <input type="checkbox" data-control="include-hover" ${settings.includeHoverStyles ? 'checked' : ''} />
            <span class="ag-switch-track"></span>
          </span>
        </label>
      </div>

      <section class="ag-section" aria-label="Recent Grabs">
        <div class="ag-history-header">
          <div class="ag-history-title-group">
            <span class="ag-label">Recent Grabs</span>
            <span class="ag-count-badge" data-part="history-count">${history.length}</span>
          </div>
          <button
            type="button"
            class="ag-clear-btn"
            data-action="clear-history"
            ${history.length === 0 ? 'disabled' : ''}
          >Clear</button>
        </div>
        <div class="ag-history-list" data-part="history-list"></div>
      </section>
    </main>
  `;

  const pickBtn = root.querySelector<HTMLButtonElement>('[data-action="pick-element"]')!;
  const statusBanner = root.querySelector<HTMLDivElement>('[data-part="status-banner"]')!;
  const formatBtns = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-format]'));
  const budgetValueEl = root.querySelector<HTMLSpanElement>('[data-part="budget-value"]')!;
  const unlimitedChipEl = root.querySelector<HTMLLabelElement>('[data-part="unlimited-chip"]')!;
  const unlimitedCheckbox = root.querySelector<HTMLInputElement>(
    '[data-control="unlimited-tokens"]',
  )!;
  const sliderWrapEl = root.querySelector<HTMLDivElement>('[data-part="slider-wrap"]')!;
  const budgetSlider = root.querySelector<HTMLInputElement>('[data-control="budget-slider"]')!;
  const compactSvgCheckbox = root.querySelector<HTMLInputElement>('[data-control="compact-svg"]')!;
  const includeHoverCheckbox = root.querySelector<HTMLInputElement>(
    '[data-control="include-hover"]',
  )!;
  const historyCountEl = root.querySelector<HTMLSpanElement>('[data-part="history-count"]')!;
  const clearHistoryBtn = root.querySelector<HTMLButtonElement>('[data-action="clear-history"]')!;
  const historyListEl = root.querySelector<HTMLDivElement>('[data-part="history-list"]')!;

  const syncControlsUI = () => {
    for (const btn of formatBtns) {
      btn.setAttribute('data-active', String(btn.dataset.format === settings.format));
    }
    budgetValueEl.textContent = formatBudgetDisplay(settings);
    unlimitedChipEl.setAttribute('data-active', String(settings.unlimitedTokens));
    unlimitedCheckbox.checked = settings.unlimitedTokens;
    sliderWrapEl.setAttribute('data-disabled', String(settings.unlimitedTokens));
    budgetSlider.disabled = settings.unlimitedTokens;
    budgetSlider.value = String(settings.maxTokens);
    compactSvgCheckbox.checked = settings.compactSvg;
    includeHoverCheckbox.checked = settings.includeHoverStyles;
  };

  const renderHistoryList = () => {
    historyCountEl.textContent = String(history.length);
    clearHistoryBtn.disabled = history.length === 0;

    if (history.length === 0) {
      historyListEl.innerHTML = `
        <div class="ag-empty-history" data-part="history-empty">
          No grabs yet. Press <strong>Alt+Shift+G</strong> or click above to capture any UI element.
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
        const shortFmt = FORMAT_SHORT_LABELS[item.format] ?? item.format;
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
                <span class="ag-tokens-muted">${item.outputTokens.toLocaleString('en-US')} tok · ${escapeHtml(formatRelativeTime(item.timestamp))}</span>
              </div>
            </div>
            <button
              type="button"
              class="ag-copy-btn"
              data-action="copy-item"
              data-id="${escapeHtml(item.id)}"
            >Copy</button>
          </div>
        `;
      })
      .join('');
  };

  renderHistoryList();

  pickBtn.addEventListener('click', () => {
    void (async () => {
      statusBanner.setAttribute('data-visible', 'false');
      const res = await activatePicker(settings);
      if (res.ok) {
        closeWin();
      } else {
        statusBanner.textContent =
          res.error ?? 'Switch to an active http/https webpage tab to pick elements.';
        statusBanner.setAttribute('data-visible', 'true');
      }
    })();
  });

  for (const btn of formatBtns) {
    btn.addEventListener('click', () => {
      const fmt = btn.dataset.format as OutputFormat | undefined;
      if (!fmt) return;
      void (async () => {
        settings = await saveSettings({ format: fmt });
        syncControlsUI();
      })();
    });
  }

  budgetSlider.addEventListener('input', () => {
    const nextVal = Number(budgetSlider.value);
    settings = { ...settings, maxTokens: nextVal };
    budgetValueEl.textContent = formatBudgetDisplay(settings);
    void saveSettings({ maxTokens: nextVal });
  });

  unlimitedCheckbox.addEventListener('change', () => {
    void (async () => {
      settings = await saveSettings({ unlimitedTokens: unlimitedCheckbox.checked });
      syncControlsUI();
    })();
  });

  compactSvgCheckbox.addEventListener('change', () => {
    void (async () => {
      settings = await saveSettings({ compactSvg: compactSvgCheckbox.checked });
      syncControlsUI();
    })();
  });

  includeHoverCheckbox.addEventListener('change', () => {
    void (async () => {
      settings = await saveSettings({ includeHoverStyles: includeHoverCheckbox.checked });
      syncControlsUI();
    })();
  });

  clearHistoryBtn.addEventListener('click', () => {
    void (async () => {
      await clearHistory();
      history = [];
      renderHistoryList();
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
      const ok = await copyTextToClipboard(matched.output, doc);
      if (ok) {
        target.textContent = 'Copied';
        target.setAttribute('data-copied', 'true');
        setTimeout(() => {
          if (target.isConnected) {
            target.textContent = 'Copy';
            target.removeAttribute('data-copied');
          }
        }, 1200);
      }
    })();
  });
}

if (typeof document !== 'undefined') {
  const appRoot = document.getElementById('app');
  if (appRoot) {
    void initPopupApp(appRoot);
  }
}
