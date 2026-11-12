import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnyGrabPicker, bootstrapContentScript } from '../content';
import { isHostOrInsideHost, resolveTargetAtPoint } from '../picker/dom-utils';
import { loadHistory, loadSettings, resetMemoryStorageForTests } from '../shared/storage';
import { HOST_ID } from '../shared/types';

describe('AnyGrabPicker Shadow DOM Lifecycle & Keyboard/Mouse Interaction', () => {
  let picker: AnyGrabPicker | null = null;
  let clipboardSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    resetMemoryStorageForTests();
    document.body.innerHTML = `
      <section id="pricing" class="pricing-section">
        <article class="pricing-card css-19x82a">
          <h2 class="plan-title">Pro Plan — $29/mo</h2>
          <p class="plan-desc">Unlimited AI context distillation for teams.</p>
          <div class="card-footer">
            <button id="buy-pro" class="cta-btn"><span class="btn-label">Upgrade Now</span></button>
          </div>
        </article>
      </section>
    `;

    // Mock deterministic bounding boxes for elements in happy-dom
    const card = document.querySelector('.pricing-card') as HTMLElement;
    const btn = document.querySelector('#buy-pro') as HTMLElement;
    vi.spyOn(card, 'getBoundingClientRect').mockReturnValue({
      x: 100,
      y: 80,
      top: 80,
      left: 100,
      right: 460,
      bottom: 560,
      width: 360,
      height: 480,
      toJSON: () => ({}),
    });
    vi.spyOn(btn, 'getBoundingClientRect').mockReturnValue({
      x: 120,
      y: 490,
      top: 490,
      left: 120,
      right: 280,
      bottom: 532,
      width: 160,
      height: 42,
      toJSON: () => ({}),
    });

    clipboardSpy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: clipboardSpy },
    });

    // Execute requestAnimationFrame callbacks synchronously for deterministic frame assertions
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
      cb(16);
      return 1;
    });
  });

  afterEach(() => {
    picker?.stop();
    picker = null;
    document.getElementById(HOST_ID)?.remove();
    vi.restoreAllMocks();
  });

  it('remains 100% silent with zero DOM injection prior to activation', () => {
    picker = new AnyGrabPicker({ document, window });
    expect(picker.isActive()).toBe(false);
    expect(document.getElementById(HOST_ID)).toBeNull();
  });

  it('mounts #__anygrab-host__ with an Open Shadow Root on start and tears down cleanly on Escape', async () => {
    picker = new AnyGrabPicker({ document, window });
    await picker.start();

    expect(picker.isActive()).toBe(true);
    const host = document.getElementById(HOST_ID);
    expect(host).not.toBeNull();
    expect(host?.getAttribute('data-anygrab-active')).toBe('true');
    expect(host?.shadowRoot).not.toBeNull();
    expect(host?.shadowRoot?.mode).toBe('open');

    const shield = host?.shadowRoot?.querySelector('[data-part="shield"]');
    const hud = host?.shadowRoot?.querySelector('[data-part="hud"]');
    const highlight = host?.shadowRoot?.querySelector('[data-part="highlight"]');
    const badge = host?.shadowRoot?.querySelector('[data-part="badge"]');
    expect(shield).not.toBeNull();
    expect(shield?.getAttribute('data-active')).toBe('true');
    expect(hud).not.toBeNull();
    expect(highlight).not.toBeNull();
    expect(badge).not.toBeNull();

    // Press Escape -> cleanly unmounts host & stops picker
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(picker.isActive()).toBe(false);
    expect(document.getElementById(HOST_ID)).toBeNull();
  });

  it('ignores #__anygrab-host__ and its Shadow Root children during hit-testing', async () => {
    picker = new AnyGrabPicker({ document, window });
    await picker.start();

    const host = document.getElementById(HOST_ID)!;
    const hudBtn = host.shadowRoot!.querySelector('[data-format="jsx"]')!;
    const card = document.querySelector('.pricing-card')!;

    expect(isHostOrInsideHost(host, host)).toBe(true);
    expect(isHostOrInsideHost(hudBtn, host)).toBe(true);
    expect(isHostOrInsideHost(card, host)).toBe(false);

    // Even if browser elementsFromPoint returns the overlay host first, resolveTargetAtPoint skips it
    const origElementsFromPoint = document.elementsFromPoint;
    document.elementsFromPoint = vi.fn().mockReturnValue([host, card, document.body]);
    try {
      const resolved = resolveTargetAtPoint(150, 120, document, host);
      expect(resolved).toBe(card);
    } finally {
      document.elementsFromPoint = origElementsFromPoint;
    }
  });

  it('highlights hovered elements via rAF and renders <tag.primaryClass> · W×H px · ~N tokens', async () => {
    picker = new AnyGrabPicker({ document, window });
    await picker.start();

    const card = document.querySelector('.pricing-card') as HTMLElement;
    card.dispatchEvent(
      new MouseEvent('mousemove', {
        bubbles: true,
        clientX: 150,
        clientY: 120,
      }),
    );

    expect(picker.getSelectedElement()).toBe(card);

    const host = document.getElementById(HOST_ID)!;
    expect(host.getAttribute('data-anygrab-target')).toBe('article.pricing-card');

    const badge = host.shadowRoot!.querySelector('[data-part="badge"]')!;
    expect(badge.getAttribute('data-visible')).toBe('true');
    // Strips CSS-in-JS `css-19x82a` in favor of semantic `.pricing-card`
    expect(badge.textContent).toMatch(/^<article\.pricing-card> · 360×480 px · ~\d+ tokens$/);

    const highlight = host.shadowRoot!.querySelector('[data-part="highlight"]') as HTMLElement;
    expect(highlight.getAttribute('data-visible')).toBe('true');
    expect(highlight.style.width).toBe('360px');
    expect(highlight.style.height).toBe('480px');
  });

  it('navigates up to parent containers (ArrowUp), back down & into children (ArrowDown), and cycles formats (Tab)', async () => {
    picker = new AnyGrabPicker({ document, window });
    await picker.start();

    const btn = document.querySelector('#buy-pro') as HTMLElement;
    const footer = document.querySelector('.card-footer') as HTMLElement;
    const card = document.querySelector('.pricing-card') as HTMLElement;
    const section = document.querySelector('#pricing') as HTMLElement;
    const labelSpan = document.querySelector('.btn-label') as HTMLElement;

    picker.selectElement(btn);
    expect(picker.getSelectedElement()).toBe(btn);

    // ArrowUp: button -> .card-footer -> .pricing-card -> section#pricing
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(picker.getSelectedElement()).toBe(footer);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(picker.getSelectedElement()).toBe(card);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(picker.getSelectedElement()).toBe(section);

    // ArrowDown retraces exact path back down to button, then dives into child .btn-label!
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(picker.getSelectedElement()).toBe(card);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(picker.getSelectedElement()).toBe(footer);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(picker.getSelectedElement()).toBe(btn);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(picker.getSelectedElement()).toBe(labelSpan);

    // Tab cycles formats: prompt -> tailwind-html -> jsx -> markdown -> prompt
    const host = document.getElementById(HOST_ID)!;
    expect(host.getAttribute('data-anygrab-format')).toBe('prompt');

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(host.getAttribute('data-anygrab-format')).toBe('tailwind-html');

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(host.getAttribute('data-anygrab-format')).toBe('jsx');

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(host.getAttribute('data-anygrab-format')).toBe('markdown');

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(host.getAttribute('data-anygrab-format')).toBe('prompt');

    const persisted = await loadSettings();
    expect(persisted.format).toBe('prompt');
  });

  it('grabs selected element on Click or Enter, copies to clipboard, stores history, and shows Toast', async () => {
    vi.useFakeTimers();
    try {
      picker = new AnyGrabPicker({ document, window, toastDurationMs: 1500 });
      await picker.start({ format: 'jsx' });

      const btn = document.querySelector('#buy-pro') as HTMLElement;
      const card = document.querySelector('.pricing-card') as HTMLElement;

      // Hover button, expand twice with ArrowUp to select whole pricing card, then click button!
      picker.selectElement(btn);
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
      expect(picker.getSelectedElement()).toBe(card);

      const grabbedPromise = new Promise<CustomEvent>((resolve) => {
        window.addEventListener('anygrab:grabbed', (e) => resolve(e as CustomEvent), {
          once: true,
        });
      });

      btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      const grabbedEvent = await grabbedPromise;

      // Clipboard received JSX output containing card content (not just button!)
      expect(clipboardSpy).toHaveBeenCalledTimes(1);
      const copiedOutput = clipboardSpy.mock.calls[0]?.[0] as string;
      expect(copiedOutput).toContain('Pro Plan');
      expect(copiedOutput).toContain('Upgrade Now');

      // Picker exited active mode while keeping host temporarily for Toast (shield deactivated!)
      expect(picker.isActive()).toBe(false);
      const host = document.getElementById(HOST_ID)!;
      expect(host.getAttribute('data-anygrab-active')).toBe('false');
      expect(host.shadowRoot!.querySelector('[data-part="shield"]')?.getAttribute('data-active')).toBe(
        'false',
      );

      const toast = host.shadowRoot!.querySelector('[data-part="toast"]')!;
      const toastText = host.shadowRoot!.querySelector('[data-part="toast-text"]')!;
      expect(toast.getAttribute('data-visible')).toBe('true');
      expect(toastText.textContent).toMatch(/^Copied JSX · [\d,]+ → [\d,]+ tokens \([-0-9.]+%\)$/);
      expect(grabbedEvent.detail.historyItem.tagLabel).toBe('article.pricing-card');

      // History saved
      const history = await loadHistory();
      expect(history).toHaveLength(1);
      expect(history[0]?.format).toBe('jsx');
      expect(history[0]?.tagLabel).toBe('article.pricing-card');

      // Host unmounts automatically once Toast timer completes
      vi.advanceTimersByTime(1600);
      expect(document.getElementById(HOST_ID)).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('supports E2E window postMessage commands via bootstrapContentScript', async () => {
    const win = window as unknown as {
      __ANYGRAB_CONTENT_BOOTSTRAPPED__?: boolean;
      __ANYGRAB_PICKER_INSTANCE__?: AnyGrabPicker;
    };
    win.__ANYGRAB_CONTENT_BOOTSTRAPPED__ = false;

    const instance = bootstrapContentScript(window, document);
    expect(instance.isActive()).toBe(false);

    await instance.start({ format: 'markdown' });
    instance.selectElement(document.querySelector('.pricing-card'));
    const outcome = await instance.grabSelected();

    expect(outcome).not.toBeNull();
    expect(outcome?.result.format).toBe('markdown');
    expect(outcome?.result.output).toContain('Pro Plan');
    instance.stop();
  });

  it('intercepts pointer events via .ag-shield without triggering native hover, while letting HUD clicks switch format', async () => {
    picker = new AnyGrabPicker({ document, window });
    await picker.start();

    const host = document.getElementById(HOST_ID)!;
    const shield = host.shadowRoot!.querySelector('[data-part="shield"]') as HTMLElement;
    const jsxHudBtn = host.shadowRoot!.querySelector('[data-format="jsx"]') as HTMLButtonElement;
    const btn = document.querySelector('#buy-pro') as HTMLElement;

    const origElementsFromPoint = document.elementsFromPoint;
    document.elementsFromPoint = vi.fn().mockReturnValue([host, btn, document.body]);
    try {
      // Clicking HUD format button changes format to JSX and must NOT trigger grabSelected
      jsxHudBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
      expect(picker.isActive()).toBe(true);
      expect(host.getAttribute('data-anygrab-format')).toBe('jsx');
      expect(clipboardSpy).not.toHaveBeenCalled();

      // Moving pointer over transparent shield resolves underlying #buy-pro via elementsFromPoint
      shield.dispatchEvent(
        new MouseEvent('mousemove', {
          bubbles: true,
          composed: true,
          clientX: 140,
          clientY: 500,
        }),
      );
      expect(picker.getSelectedElement()).toBe(btn);
    } finally {
      document.elementsFromPoint = origElementsFromPoint;
    }
  });
});
