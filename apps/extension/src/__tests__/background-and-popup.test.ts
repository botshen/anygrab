import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  dispatchPickerToTab,
  handleFetchExternalCss,
  isInjectableTabUrl,
} from '../background';
import { initPopupApp } from '../popup';
import {
  appendHistoryItem,
  loadHistory,
  loadSettings,
  resetMemoryStorageForTests,
} from '../shared/storage';

describe('Background Service Worker & Popup UI Panel', () => {
  beforeEach(() => {
    resetMemoryStorageForTests();
  });

  afterEach(() => {
    delete (globalThis as { chrome?: unknown }).chrome;
    vi.restoreAllMocks();
  });

  it('auto-injects content.js via chrome.scripting.executeScript when tab has no listener yet', async () => {
    let injected = false;
    const executeScriptSpy = vi.fn().mockImplementation(async () => {
      injected = true;
    });

    const sendMessageSpy = vi.fn(
      (_tabId: number, _msg: unknown, callback: (res?: { ok: boolean; active: boolean }) => void) => {
        if (!injected) {
          (globalThis.chrome.runtime as { lastError?: { message: string } }).lastError = {
            message: 'Could not establish connection. Receiving end does not exist.',
          };
          callback(undefined);
          delete (globalThis.chrome.runtime as { lastError?: { message: string } }).lastError;
          return;
        }
        callback({ ok: true, active: true });
      },
    );

    (globalThis as unknown as { chrome: unknown }).chrome = {
      runtime: {},
      tabs: { sendMessage: sendMessageSpy },
      scripting: { executeScript: executeScriptSpy },
    };

    const res = await dispatchPickerToTab(
      42,
      { type: 'ANYGRAB_TOGGLE_PICKER' },
      'https://stripe.com/pricing',
    );

    expect(executeScriptSpy).toHaveBeenCalledWith({
      target: { tabId: 42 },
      files: ['content.js'],
    });
    expect(sendMessageSpy).toHaveBeenCalledTimes(2);
    expect(res).toEqual({ ok: true, active: true });
  });

  it('blocks restricted internal browser URLs and validates FETCH_EXTERNAL_CSS URLs', async () => {
    expect(isInjectableTabUrl('chrome://extensions')).toBe(false);
    expect(isInjectableTabUrl('https://chromewebstore.google.com/detail/xyz')).toBe(false);
    expect(isInjectableTabUrl('https://developer.mozilla.org')).toBe(true);

    const blockedRes = await dispatchPickerToTab(
      7,
      { type: 'ANYGRAB_TOGGLE_PICKER' },
      'chrome://settings',
    );
    expect(blockedRes.ok).toBe(false);

    const fileSchemeCss = await handleFetchExternalCss('file:///etc/hosts');
    expect(fileSchemeCss.ok).toBe(false);

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '.btn:hover { opacity: 0.9; }',
    }) as unknown as typeof fetch;

    const okCss = await handleFetchExternalCss('https://example.com/app.css', mockFetch);
    expect(okCss).toEqual({
      ok: true,
      cssText: '.btn:hover { opacity: 0.9; }',
    });
    expect(mockFetch).toHaveBeenCalledWith(
      'https://example.com/app.css',
      expect.objectContaining({ credentials: 'omit' }),
    );
  });

  it('renders Popup controls, persists settings changes, and supports Recent Grabs Copy & Clear', async () => {
    const clipboardSpy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: clipboardSpy },
    });

    await appendHistoryItem({
      id: 'grab-1',
      timestamp: Date.now() - 5000,
      url: 'https://linear.app/features',
      domain: 'linear.app',
      tagLabel: 'section.bento-grid',
      format: 'jsx',
      rawTokens: 9800,
      outputTokens: 410,
      compressionRatio: 95.8,
      durationMs: 2.1,
      preview: '<section className="grid grid-cols-3">...</section>',
      output: '<section className="grid grid-cols-3">Linear Bento</section>',
    });

    const root = document.createElement('div');
    document.body.innerHTML = '';
    document.body.appendChild(root);

    const closeSpy = vi.fn();
    const activateSpy = vi.fn().mockResolvedValue({ ok: true, active: true });

    await initPopupApp(root, {
      closeWindow: closeSpy,
      activateTabPicker: activateSpy,
    });

    // 1. Switch output format to JSX
    const jsxBtn = root.querySelector<HTMLButtonElement>('[data-format="jsx"]')!;
    jsxBtn.click();
    await vi.waitFor(async () => {
      expect((await loadSettings()).format).toBe('jsx');
    });
    expect(jsxBtn.getAttribute('data-active')).toBe('true');

    // 2. Adjust Token Budget Slider & Unlimited Toggle
    const slider = root.querySelector<HTMLInputElement>('[data-control="budget-slider"]')!;
    slider.value = '2400';
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    await vi.waitFor(async () => {
      expect((await loadSettings()).maxTokens).toBe(2400);
    });
    expect(root.querySelector('[data-part="budget-value"]')?.textContent).toBe('2,400 tokens');

    const unlimitedToggle = root.querySelector<HTMLInputElement>(
      '[data-control="unlimited-tokens"]',
    )!;
    unlimitedToggle.checked = true;
    unlimitedToggle.dispatchEvent(new Event('change', { bubbles: true }));
    await vi.waitFor(async () => {
      expect((await loadSettings()).unlimitedTokens).toBe(true);
    });
    expect(root.querySelector('[data-part="budget-value"]')?.textContent).toBe('Unlimited');
    expect(slider.disabled).toBe(true);

    // 3. Toggle Compact SVGs & Include :hover
    const hoverToggle = root.querySelector<HTMLInputElement>('[data-control="include-hover"]')!;
    hoverToggle.checked = true;
    hoverToggle.dispatchEvent(new Event('change', { bubbles: true }));
    await vi.waitFor(async () => {
      expect((await loadSettings()).includeHoverStyles).toBe(true);
    });

    // 4. Recent Grabs list displays linear.app item, supports one-click Copy & Clear
    expect(root.textContent).toContain('linear.app');
    expect(root.textContent).toContain('-95.8%');

    const copyBtn = root.querySelector<HTMLButtonElement>('[data-action="copy-item"]')!;
    copyBtn.click();
    await vi.waitFor(() => {
      expect(clipboardSpy).toHaveBeenCalledWith(
        '<section className="grid grid-cols-3">Linear Bento</section>',
      );
    });

    const clearBtn = root.querySelector<HTMLButtonElement>('[data-action="clear-history"]')!;
    clearBtn.click();
    await vi.waitFor(async () => {
      expect(await loadHistory()).toHaveLength(0);
    });
    expect(root.querySelector('[data-part="history-empty"]')).not.toBeNull();

    // 5. Clicking "Pick Element on Page" triggers activation and closes popup
    const pickBtn = root.querySelector<HTMLButtonElement>('[data-action="pick-element"]')!;
    pickBtn.click();
    await vi.waitFor(() => {
      expect(activateSpy).toHaveBeenCalledTimes(1);
      expect(closeSpy).toHaveBeenCalledTimes(1);
    });
  });
});
