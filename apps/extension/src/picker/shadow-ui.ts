import type { OutputFormat } from '@anygrab/core';
import { getMessages } from '../shared/i18n';
import { FORMAT_CYCLE, HOST_ID, type ExtensionSettings } from '../shared/types';

export interface ShadowPickerCallbacks {
  onSelectFormat: (format: OutputFormat) => void;
  onToggleLocale: () => void;
  onClose: () => void;
}

export interface ShadowPickerRefs {
  host: HTMLDivElement;
  shadowRoot: ShadowRoot;
  shieldEl: HTMLDivElement;
  highlightEl: HTMLDivElement;
  badgeEl: HTMLDivElement;
  hudEl: HTMLDivElement;
  hudBudgetEl: HTMLSpanElement;
  hudHintsEl: HTMLDivElement;
  localeBtn: HTMLButtonElement;
  formatButtons: Map<OutputFormat, HTMLButtonElement>;
  toastEl: HTMLDivElement;
  toastTextEl: HTMLSpanElement;
}

const SHADOW_STYLES = `
:host {
  all: initial !important;
  position: fixed !important;
  inset: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
  z-index: 2147483647 !important;
  pointer-events: none !important;
  font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", "Inter", "Segoe UI", Roboto, sans-serif !important;
  line-height: 1.4 !important;
  -webkit-font-smoothing: antialiased !important;
}

*, *::before, *::after {
  box-sizing: border-box;
}

.ag-shield {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  background: transparent;
  cursor: crosshair;
  pointer-events: auto;
  z-index: 0;
}

.ag-shield[data-active="false"] {
  pointer-events: none;
  cursor: default;
}

.ag-highlight {
  position: fixed;
  z-index: 1;
  top: 0;
  left: 0;
  width: 0;
  height: 0;
  border: 2px solid #6366f1;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(56, 189, 248, 0.08) 100%);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.22) inset,
    0 8px 28px rgba(99, 102, 241, 0.24);
  border-radius: 5px;
  pointer-events: none;
  opacity: 0;
  transition:
    top 38ms cubic-bezier(0.16, 1, 0.3, 1),
    left 38ms cubic-bezier(0.16, 1, 0.3, 1),
    width 38ms cubic-bezier(0.16, 1, 0.3, 1),
    height 38ms cubic-bezier(0.16, 1, 0.3, 1),
    opacity 90ms ease;
}

.ag-highlight[data-visible="true"] {
  opacity: 1;
}

.ag-badge {
  position: fixed;
  z-index: 2;
  top: 0;
  left: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: min(92vw, 520px);
  padding: 4px 10px;
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(17, 24, 39, 0.96) 0%, rgba(30, 27, 75, 0.96) 100%);
  border: 1px solid rgba(129, 140, 248, 0.52);
  color: #f8fafc;
  font-family: ui-monospace, SFMono-Regular, "JetBrains Mono", Menlo, Consolas, monospace;
  font-size: 11.5px;
  font-weight: 500;
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  box-shadow: 0 10px 26px rgba(2, 6, 23, 0.52);
  pointer-events: none;
  opacity: 0;
  transition: opacity 90ms ease;
}

.ag-badge::before {
  content: "";
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: #818cf8;
  box-shadow: 0 0 8px #818cf8;
  flex-shrink: 0;
}

.ag-badge[data-visible="true"] {
  opacity: 1;
}

.ag-hud {
  position: fixed;
  z-index: 3;
  left: 50%;
  bottom: 20px;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px 13px;
  border-radius: 14px;
  background: rgba(9, 9, 14, 0.94);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.14);
  box-shadow:
    0 20px 48px rgba(0, 0, 0, 0.58),
    0 0 0 1px rgba(99, 102, 241, 0.24);
  color: #e4e4e7;
  font-size: 12px;
  pointer-events: auto;
  user-select: none;
  max-width: calc(100vw - 24px);
  flex-wrap: wrap;
  justify-content: center;
}

.ag-hud[data-hidden="true"] {
  display: none;
}

.ag-brand {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding-right: 8px;
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  font-weight: 600;
  color: #ffffff;
  font-size: 12px;
  letter-spacing: -0.02em;
}

.ag-brand-dot {
  width: 8px;
  height: 8px;
  border-radius: 3px;
  background: linear-gradient(135deg, #6366f1 0%, #38bdf8 100%);
  box-shadow: 0 0 10px rgba(99, 102, 241, 0.65);
}

.ag-formats {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 3px;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.ag-format-btn {
  appearance: none;
  border: none;
  background: transparent;
  color: #a1a1aa;
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 500;
  padding: 4px 9px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 120ms ease;
}

.ag-format-btn:hover {
  color: #f4f4f5;
  background: rgba(255, 255, 255, 0.06);
}

.ag-format-btn[data-active="true"] {
  color: #ffffff;
  background: linear-gradient(135deg, #6366f1 0%, #7c3aed 100%);
  box-shadow: 0 2px 10px rgba(99, 102, 241, 0.45);
}

.ag-budget-pill {
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(99, 102, 241, 0.14);
  border: 1px solid rgba(129, 140, 248, 0.28);
  color: #c7d2fe;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px;
}

.ag-hints {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #d4d4d8;
  font-size: 11.5px;
  padding-left: 2px;
  flex-wrap: wrap;
}

.ag-hint-pill {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 6px;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 11px;
}

.ag-locale-btn {
  appearance: none;
  border: 1px solid rgba(56, 189, 248, 0.42);
  background: rgba(56, 189, 248, 0.14);
  color: #bae6fd;
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 7px;
  cursor: pointer;
  transition: all 120ms ease;
}

.ag-locale-btn:hover {
  background: rgba(56, 189, 248, 0.26);
  color: #ffffff;
}

.ag-close-btn {
  appearance: none;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  color: #a1a1aa;
  width: 24px;
  height: 24px;
  border-radius: 7px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  transition: all 120ms ease;
}

.ag-close-btn:hover {
  color: #ffffff;
  background: rgba(239, 68, 68, 0.22);
  border-color: rgba(239, 68, 68, 0.45);
}

.ag-toast {
  position: fixed;
  z-index: 4;
  top: 16px;
  right: 16px;
  max-width: min(94vw, 560px);
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 11px 15px;
  border-radius: 12px;
  background: rgba(9, 9, 14, 0.96);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid rgba(52, 211, 153, 0.48);
  box-shadow:
    0 18px 42px rgba(0, 0, 0, 0.55),
    0 0 0 1px rgba(16, 185, 129, 0.18);
  color: #f8fafc;
  font-size: 12.5px;
  font-weight: 500;
  pointer-events: none;
  opacity: 0;
  transform: translateY(-8px);
  transition: opacity 150ms ease, transform 150ms ease;
}

.ag-toast[data-visible="true"] {
  opacity: 1;
  transform: translateY(0);
}

.ag-toast-icon {
  width: 20px;
  height: 20px;
  border-radius: 999px;
  background: rgba(16, 185, 129, 0.2);
  border: 1px solid rgba(52, 211, 153, 0.5);
  color: #34d399;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
}
`;

function renderHudHintsHtml(settings: ExtensionSettings): string {
  const msg = getMessages(settings.locale);
  return (
    `<span class="ag-hint-pill">${msg.hudHints.click}</span>` +
    `<span class="ag-hint-pill">${msg.hudHints.arrows}</span>` +
    `<span class="ag-hint-pill">${msg.hudHints.tab}</span>` +
    `<span class="ag-hint-pill">${msg.hudHints.esc}</span>`
  );
}

export function mountShadowPickerHost(
  doc: Document,
  settings: ExtensionSettings,
  callbacks: ShadowPickerCallbacks,
): ShadowPickerRefs {
  const existing = doc.getElementById(HOST_ID);
  if (existing) {
    existing.remove();
  }

  const msg = getMessages(settings.locale);

  const host = doc.createElement('div');
  host.id = HOST_ID;
  host.setAttribute('data-anygrab-active', 'true');
  host.setAttribute('data-anygrab-format', settings.format);
  host.setAttribute('data-anygrab-locale', settings.locale);

  const shadowRoot = host.attachShadow({ mode: 'open' });

  const styleEl = doc.createElement('style');
  styleEl.textContent = SHADOW_STYLES;
  shadowRoot.appendChild(styleEl);

  const shieldEl = doc.createElement('div');
  shieldEl.className = 'ag-shield';
  shieldEl.setAttribute('data-part', 'shield');
  shieldEl.setAttribute('data-active', 'true');
  shadowRoot.appendChild(shieldEl);

  const highlightEl = doc.createElement('div');
  highlightEl.className = 'ag-highlight';
  highlightEl.setAttribute('data-part', 'highlight');
  highlightEl.setAttribute('data-visible', 'false');
  shadowRoot.appendChild(highlightEl);

  const badgeEl = doc.createElement('div');
  badgeEl.className = 'ag-badge';
  badgeEl.setAttribute('data-part', 'badge');
  badgeEl.setAttribute('data-visible', 'false');
  shadowRoot.appendChild(badgeEl);

  const hudEl = doc.createElement('div');
  hudEl.className = 'ag-hud';
  hudEl.setAttribute('data-part', 'hud');

  const brandEl = doc.createElement('div');
  brandEl.className = 'ag-brand';
  const brandDot = doc.createElement('span');
  brandDot.className = 'ag-brand-dot';
  const brandText = doc.createElement('span');
  brandText.textContent = 'AnyGrab';
  brandEl.append(brandDot, brandText);

  const formatsWrap = doc.createElement('div');
  formatsWrap.className = 'ag-formats';
  formatsWrap.setAttribute('role', 'tablist');

  const formatButtons = new Map<OutputFormat, HTMLButtonElement>();
  for (const fmt of FORMAT_CYCLE) {
    const btn = doc.createElement('button');
    btn.type = 'button';
    btn.className = 'ag-format-btn';
    btn.setAttribute('data-format', fmt);
    btn.setAttribute('data-active', String(fmt === settings.format));
    btn.textContent = msg.formats[fmt].hudLabel;
    btn.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      callbacks.onSelectFormat(fmt);
    });
    formatButtons.set(fmt, btn);
    formatsWrap.appendChild(btn);
  }

  const hudBudgetEl = doc.createElement('span');
  hudBudgetEl.className = 'ag-budget-pill';
  hudBudgetEl.setAttribute('data-part', 'hud-budget');
  hudBudgetEl.textContent = msg.formatHudBudget(settings.maxTokens, settings.unlimitedTokens);

  const hudHintsEl = doc.createElement('div');
  hudHintsEl.className = 'ag-hints';
  hudHintsEl.setAttribute('data-part', 'hud-hints');
  hudHintsEl.innerHTML = renderHudHintsHtml(settings);

  const localeBtn = doc.createElement('button');
  localeBtn.type = 'button';
  localeBtn.className = 'ag-locale-btn';
  localeBtn.setAttribute('data-action', 'toggle-locale');
  localeBtn.title = msg.localeSwitchTitle;
  localeBtn.textContent = msg.localeSwitchLabel;
  localeBtn.addEventListener('click', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    callbacks.onToggleLocale();
  });

  const closeBtn = doc.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'ag-close-btn';
  closeBtn.setAttribute('data-action', 'close');
  closeBtn.setAttribute('aria-label', 'Close AnyGrab picker');
  closeBtn.textContent = '×';
  closeBtn.addEventListener('click', (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    callbacks.onClose();
  });

  hudEl.append(brandEl, formatsWrap, hudBudgetEl, hudHintsEl, localeBtn, closeBtn);
  shadowRoot.appendChild(hudEl);

  const toastEl = doc.createElement('div');
  toastEl.className = 'ag-toast';
  toastEl.setAttribute('data-part', 'toast');
  toastEl.setAttribute('data-visible', 'false');
  toastEl.setAttribute('role', 'status');

  const toastIcon = doc.createElement('span');
  toastIcon.className = 'ag-toast-icon';
  toastIcon.textContent = '✓';

  const toastTextEl = doc.createElement('span');
  toastTextEl.setAttribute('data-part', 'toast-text');

  toastEl.append(toastIcon, toastTextEl);
  shadowRoot.appendChild(toastEl);

  const mountParent = doc.documentElement ?? doc.body;
  mountParent.appendChild(host);

  return {
    host,
    shadowRoot,
    shieldEl,
    highlightEl,
    badgeEl,
    hudEl,
    hudBudgetEl,
    hudHintsEl,
    localeBtn,
    formatButtons,
    toastEl,
    toastTextEl,
  };
}

export function syncShadowHudI18n(refs: ShadowPickerRefs, settings: ExtensionSettings): void {
  const msg = getMessages(settings.locale);
  refs.host.setAttribute('data-anygrab-format', settings.format);
  refs.host.setAttribute('data-anygrab-locale', settings.locale);
  refs.hudBudgetEl.textContent = msg.formatHudBudget(settings.maxTokens, settings.unlimitedTokens);
  refs.hudHintsEl.innerHTML = renderHudHintsHtml(settings);
  refs.localeBtn.textContent = msg.localeSwitchLabel;
  refs.localeBtn.title = msg.localeSwitchTitle;

  for (const [fmt, btn] of refs.formatButtons.entries()) {
    btn.textContent = msg.formats[fmt].hudLabel;
    btn.setAttribute('data-active', String(fmt === settings.format));
  }
}

export function updateShadowHighlightPosition(
  refs: ShadowPickerRefs,
  rect: DOMRectReadOnly,
  badgeText: string,
  viewportWidth: number,
  viewportHeight: number,
): void {
  refs.highlightEl.style.left = `${Math.round(rect.left)}px`;
  refs.highlightEl.style.top = `${Math.round(rect.top)}px`;
  refs.highlightEl.style.width = `${Math.max(0, Math.round(rect.width))}px`;
  refs.highlightEl.style.height = `${Math.max(0, Math.round(rect.height))}px`;
  refs.highlightEl.setAttribute('data-visible', 'true');

  refs.badgeEl.textContent = badgeText;
  refs.badgeEl.setAttribute('data-visible', 'true');

  const badgeHeight = 26;
  const preferredTop =
    rect.top >= badgeHeight + 8 ? rect.top - badgeHeight - 6 : Math.max(8, rect.top + 6);
  const clampedTop = Math.min(
    Math.max(8, preferredTop),
    Math.max(8, viewportHeight - badgeHeight - 8),
  );
  const clampedLeft = Math.min(Math.max(8, rect.left), Math.max(8, viewportWidth - 280));

  refs.badgeEl.style.top = `${Math.round(clampedTop)}px`;
  refs.badgeEl.style.left = `${Math.round(clampedLeft)}px`;
}
