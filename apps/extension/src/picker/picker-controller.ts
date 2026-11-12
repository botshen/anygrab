import { grab, type GrabOptions, type GrabResult, type OutputFormat } from '@anygrab/core';
import { copyTextToClipboard } from '../shared/clipboard';
import { collectHoverRulesFromDocument, createPageStyleResolver } from '../shared/hover-styles';
import { appendHistoryItem, loadSettings, saveSettings } from '../shared/storage';
import {
  DEFAULT_EXTENSION_SETTINGS,
  FORMAT_CYCLE,
  type ExtensionSettings,
  type GrabHistoryItem,
} from '../shared/types';
import {
  estimateElementDistilledTokens,
  extractDomainFromUrl,
  formatElementTagIdentifier,
  formatGrabToastSummary,
  formatHoverBadgeText,
  getFirstChildCandidate,
  getParentCandidate,
  isPickableElement,
  resolvePointerTarget,
} from './dom-utils';
import {
  formatHudBudget,
  mountShadowPickerHost,
  updateShadowHighlightPosition,
  type ShadowPickerRefs,
} from './shadow-ui';

export interface GrabExecutionOutcome {
  result: GrabResult;
  historyItem: GrabHistoryItem;
  toastText: string;
  copied: boolean;
}

export interface AnyGrabPickerOptions {
  document?: Document;
  window?: Window;
  toastDurationMs?: number;
}

/**
 * Core browser element distillation helper (usable standalone or via `AnyGrabPicker`).
 */
export function grabElementInPage(element: Element, options: GrabOptions = {}): GrabResult {
  const win = element.ownerDocument?.defaultView ?? window;
  return grab(element, {
    ...options,
    sourceUrl: options.sourceUrl ?? win.location.href,
    styleResolver:
      options.styleResolver ?? ((el, pseudo) => win.getComputedStyle(el, pseudo ?? null)),
  });
}

export class AnyGrabPicker {
  private readonly doc: Document;
  private readonly win: Window;
  private readonly toastDurationMs: number;

  private active = false;
  private settings: ExtensionSettings = { ...DEFAULT_EXTENSION_SETTINGS };
  private uiRefs: ShadowPickerRefs | null = null;
  private selectedEl: Element | null = null;
  /** Breadcrumb stack allowing `ArrowUp` then `ArrowDown` to retrace exact child path */
  private childStack: Element[] = [];
  private tokenEstimateCache = new WeakMap<Element, number>();

  private listenerAbort: AbortController | null = null;
  private rafId: number | null = null;
  private pendingPointerEvent: MouseEvent | null = null;
  private toastCleanupTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(options: AnyGrabPickerOptions = {}) {
    this.doc = options.document ?? document;
    this.win = options.window ?? (this.doc.defaultView ?? window);
    this.toastDurationMs = options.toastDurationMs ?? 3200;
  }

  public isActive(): boolean {
    return this.active;
  }

  public getSelectedElement(): Element | null {
    return this.selectedEl;
  }

  public getSettings(): ExtensionSettings {
    return { ...this.settings };
  }

  public getHostElement(): HTMLDivElement | null {
    return this.uiRefs?.host ?? null;
  }

  public async start(overrides?: Partial<ExtensionSettings>): Promise<void> {
    this.clearToastTimer();
    const persisted = await loadSettings();
    this.settings = overrides ? await saveSettings({ ...persisted, ...overrides }) : persisted;

    if (this.active && this.uiRefs) {
      this.syncHudState();
      return;
    }

    this.teardownListeners();
    this.tokenEstimateCache = new WeakMap<Element, number>();
    this.selectedEl = null;
    this.childStack = [];

    this.uiRefs = mountShadowPickerHost(this.doc, this.settings, {
      onSelectFormat: (fmt) => {
        this.setFormat(fmt);
      },
      onClose: () => {
        this.stop();
      },
    });

    this.active = true;
    this.attachListeners();
    this.emitStateEvent();
  }

  public stop(options: { keepToast?: boolean } = {}): void {
    this.active = false;
    this.teardownListeners();
    this.cancelScheduledFrame();
    this.pendingPointerEvent = null;
    this.selectedEl = null;
    this.childStack = [];

    if (options.keepToast && this.uiRefs) {
      this.uiRefs.host.setAttribute('data-anygrab-active', 'false');
      this.uiRefs.host.removeAttribute('data-anygrab-target');
      this.uiRefs.shieldEl.setAttribute('data-active', 'false');
      this.uiRefs.highlightEl.setAttribute('data-visible', 'false');
      this.uiRefs.badgeEl.setAttribute('data-visible', 'false');
      this.uiRefs.hudEl.setAttribute('data-hidden', 'true');
      this.emitStateEvent();
      return;
    }

    this.clearToastTimer();
    if (this.uiRefs) {
      this.uiRefs.host.remove();
      this.uiRefs = null;
    }
    this.emitStateEvent();
  }

  public async toggle(overrides?: Partial<ExtensionSettings>): Promise<boolean> {
    if (this.active) {
      this.stop();
      return false;
    }
    await this.start(overrides);
    return true;
  }

  public setFormat(format: OutputFormat): OutputFormat {
    this.settings = { ...this.settings, format };
    this.syncHudState();
    void saveSettings({ format });
    return format;
  }

  public cycleFormat(reverse = false): OutputFormat {
    const idx = FORMAT_CYCLE.indexOf(this.settings.format);
    const delta = reverse ? -1 : 1;
    const nextIdx = (idx + delta + FORMAT_CYCLE.length) % FORMAT_CYCLE.length;
    const nextFormat = FORMAT_CYCLE[nextIdx] ?? 'prompt';
    return this.setFormat(nextFormat);
  }

  public selectElement(el: Element | null, resetChildStack = true): void {
    if (!el || !isPickableElement(el, this.uiRefs?.host)) {
      this.selectedEl = null;
      if (this.uiRefs) {
        this.uiRefs.highlightEl.setAttribute('data-visible', 'false');
        this.uiRefs.badgeEl.setAttribute('data-visible', 'false');
        this.uiRefs.host.removeAttribute('data-anygrab-target');
      }
      return;
    }

    this.selectedEl = el;
    if (resetChildStack) {
      this.childStack = [];
    }
    this.renderSelectionOverlay();
  }

  public navigateParent(): Element | null {
    if (!this.selectedEl) {
      const initial = this.doc.body?.firstElementChild ?? this.doc.body;
      if (initial && isPickableElement(initial, this.uiRefs?.host)) {
        this.selectElement(initial, true);
      }
      return this.selectedEl;
    }

    const parent = getParentCandidate(this.selectedEl, this.uiRefs?.host);
    if (!parent || parent === this.selectedEl) {
      return this.selectedEl;
    }

    this.childStack.push(this.selectedEl);
    this.selectedEl = parent;
    this.renderSelectionOverlay();
    return this.selectedEl;
  }

  public navigateChild(): Element | null {
    if (!this.selectedEl) {
      return null;
    }

    // Retrace exact previously visited child if valid, else dive into first visible child
    while (this.childStack.length > 0) {
      const popped = this.childStack.pop()!;
      if (
        popped.parentElement === this.selectedEl &&
        isPickableElement(popped, this.uiRefs?.host)
      ) {
        this.selectedEl = popped;
        this.renderSelectionOverlay();
        return this.selectedEl;
      }
    }

    const firstChild = getFirstChildCandidate(this.selectedEl, this.uiRefs?.host);
    if (!firstChild) {
      return this.selectedEl;
    }

    this.selectedEl = firstChild;
    this.renderSelectionOverlay();
    return this.selectedEl;
  }

  public async grabSelected(): Promise<GrabExecutionOutcome | null> {
    const target = this.selectedEl;
    if (!target || !isPickableElement(target, this.uiRefs?.host)) {
      return null;
    }

    const latestSettings = await loadSettings();
    // Preserve in-session Tab format choice while syncing latest budget/toggle preferences
    const activeFormat = this.settings.format;
    this.settings = {
      ...latestSettings,
      format: activeFormat,
    };

    const hoverRules = this.settings.includeHoverStyles
      ? await collectHoverRulesFromDocument(this.doc)
      : [];
    const styleResolver = createPageStyleResolver(this.win, hoverRules);

    const grabOptions: GrabOptions = {
      format: this.settings.format,
      maxTokens: this.settings.unlimitedTokens ? undefined : this.settings.maxTokens,
      compactSvg: this.settings.compactSvg,
      includeHoverStyles: this.settings.includeHoverStyles,
      sourceUrl: this.win.location.href,
      styleResolver,
    };

    const result = grab(target, grabOptions);
    const copied = await copyTextToClipboard(result.output, this.doc);

    const tagLabel = formatElementTagIdentifier(target);
    const toastText = formatGrabToastSummary(
      result.format,
      result.metrics.rawTokens,
      result.metrics.outputTokens,
      result.metrics.compressionRatio,
    );

    const preview = result.output.replace(/\s+/g, ' ').trim().slice(0, 140);
    const historyItem: GrabHistoryItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      url: this.win.location.href,
      domain: extractDomainFromUrl(this.win.location.href),
      tagLabel,
      format: result.format,
      rawTokens: result.metrics.rawTokens,
      outputTokens: result.metrics.outputTokens,
      compressionRatio: result.metrics.compressionRatio,
      durationMs: result.metrics.durationMs,
      preview,
      output: result.output,
    };

    await appendHistoryItem(historyItem);

    // Exit active picking mode while displaying top-right confirmation toast in Shadow Root
    this.showSuccessToastAndExitPicker(toastText);

    const outcome: GrabExecutionOutcome = {
      result,
      historyItem,
      toastText,
      copied,
    };

    try {
      this.win.dispatchEvent(
        new CustomEvent('anygrab:grabbed', {
          detail: outcome,
        }),
      );
    } catch {
      // Ignore CustomEvent errors in restricted frames
    }

    return outcome;
  }

  private showSuccessToastAndExitPicker(toastText: string): void {
    const refs = this.uiRefs;
    this.stop({ keepToast: Boolean(refs) });

    if (!refs) {
      return;
    }

    refs.toastTextEl.textContent = toastText;
    refs.toastEl.setAttribute('data-visible', 'true');

    this.clearToastTimer();
    this.toastCleanupTimer = setTimeout(() => {
      if (!this.active && this.uiRefs === refs) {
        refs.host.remove();
        this.uiRefs = null;
      }
    }, this.toastDurationMs);
  }

  private syncHudState(): void {
    if (!this.uiRefs) return;
    this.uiRefs.host.setAttribute('data-anygrab-format', this.settings.format);
    this.uiRefs.hudBudgetEl.textContent = formatHudBudget(this.settings);
    for (const [fmt, btn] of this.uiRefs.formatButtons.entries()) {
      btn.setAttribute('data-active', String(fmt === this.settings.format));
    }
  }

  private renderSelectionOverlay(): void {
    if (!this.uiRefs || !this.selectedEl) {
      return;
    }

    const rect = this.selectedEl.getBoundingClientRect();
    const estTokens = estimateElementDistilledTokens(this.selectedEl, this.tokenEstimateCache);
    const badgeText = formatHoverBadgeText(this.selectedEl, rect, estTokens);
    const tagId = formatElementTagIdentifier(this.selectedEl);

    this.uiRefs.host.setAttribute('data-anygrab-target', tagId);
    updateShadowHighlightPosition(
      this.uiRefs,
      rect,
      badgeText,
      this.win.innerWidth || 1280,
      this.win.innerHeight || 800,
    );
  }

  private isEventInsideHud(ev: Event): boolean {
    const hudEl = this.uiRefs?.hudEl;
    if (!hudEl) {
      return false;
    }
    const path = typeof ev.composedPath === 'function' ? ev.composedPath() : [];
    if (path.includes(hudEl)) {
      return true;
    }
    const rawTarget = ev.target;
    return rawTarget && typeof rawTarget === 'object' && 'nodeType' in rawTarget
      ? hudEl.contains(rawTarget as Node)
      : false;
  }

  private attachListeners(): void {
    const controller = new AbortController();
    this.listenerAbort = controller;
    const { signal } = controller;

    this.doc.addEventListener(
      'mousemove',
      (ev: MouseEvent) => {
        if (!this.active || this.isEventInsideHud(ev)) return;
        this.pendingPointerEvent = ev;
        this.scheduleFrame(() => {
          if (!this.active || !this.pendingPointerEvent) return;
          const target = resolvePointerTarget(
            this.pendingPointerEvent,
            this.doc,
            this.uiRefs?.host,
          );
          if (target && target !== this.selectedEl) {
            this.selectElement(target, true);
          }
        });
      },
      { capture: true, passive: true, signal },
    );

    const suppressPagePointerAction = (ev: MouseEvent) => {
      if (!this.active || this.isEventInsideHud(ev)) return;
      ev.preventDefault();
      ev.stopPropagation();
      ev.stopImmediatePropagation();
    };

    this.doc.addEventListener('mousedown', suppressPagePointerAction, {
      capture: true,
      signal,
    });
    this.doc.addEventListener('pointerdown', suppressPagePointerAction, {
      capture: true,
      signal,
    });

    this.doc.addEventListener(
      'click',
      (ev: MouseEvent) => {
        if (!this.active || this.isEventInsideHud(ev)) {
          // Let HUD format/close buttons handle their own click inside Shadow DOM
          return;
        }

        ev.preventDefault();
        ev.stopPropagation();
        ev.stopImmediatePropagation();

        const clickedTarget = resolvePointerTarget(ev, this.doc, this.uiRefs?.host);
        if (
          clickedTarget &&
          (!this.selectedEl ||
            !this.selectedEl.contains(clickedTarget) ||
            (this.childStack.length === 0 && clickedTarget !== this.selectedEl))
        ) {
          this.selectElement(clickedTarget, true);
        }
        void this.grabSelected();
      },
      { capture: true, signal },
    );

    this.win.addEventListener(
      'keydown',
      (ev: KeyboardEvent) => {
        if (!this.active) return;

        switch (ev.key) {
          case 'Escape': {
            ev.preventDefault();
            ev.stopPropagation();
            ev.stopImmediatePropagation();
            this.stop();
            break;
          }
          case 'ArrowUp': {
            ev.preventDefault();
            ev.stopPropagation();
            this.navigateParent();
            break;
          }
          case 'ArrowDown': {
            ev.preventDefault();
            ev.stopPropagation();
            this.navigateChild();
            break;
          }
          case 'Tab': {
            ev.preventDefault();
            ev.stopPropagation();
            this.cycleFormat(ev.shiftKey);
            break;
          }
          case 'Enter': {
            ev.preventDefault();
            ev.stopPropagation();
            ev.stopImmediatePropagation();
            void this.grabSelected();
            break;
          }
          default:
            break;
        }
      },
      { capture: true, signal },
    );

    const refreshPosition = () => {
      if (!this.active || !this.selectedEl) return;
      this.scheduleFrame(() => {
        if (this.active && this.selectedEl) {
          this.renderSelectionOverlay();
        }
      });
    };

    this.win.addEventListener('scroll', refreshPosition, {
      capture: true,
      passive: true,
      signal,
    });
    this.win.addEventListener('resize', refreshPosition, {
      passive: true,
      signal,
    });
  }

  private scheduleFrame(callback: () => void): void {
    if (this.rafId !== null) {
      return;
    }
    if (typeof this.win.requestAnimationFrame === 'function') {
      this.rafId = this.win.requestAnimationFrame(() => {
        this.rafId = null;
        callback();
      });
    } else {
      callback();
    }
  }

  private cancelScheduledFrame(): void {
    if (this.rafId !== null && typeof this.win.cancelAnimationFrame === 'function') {
      this.win.cancelAnimationFrame(this.rafId);
    }
    this.rafId = null;
  }

  private teardownListeners(): void {
    if (this.listenerAbort) {
      this.listenerAbort.abort();
      this.listenerAbort = null;
    }
  }

  private clearToastTimer(): void {
    if (this.toastCleanupTimer !== null) {
      clearTimeout(this.toastCleanupTimer);
      this.toastCleanupTimer = null;
    }
  }

  private emitStateEvent(): void {
    try {
      this.win.dispatchEvent(
        new CustomEvent('anygrab:state', {
          detail: {
            active: this.active,
            format: this.settings.format,
          },
        }),
      );
    } catch {
      // Ignore in non-standard window environments
    }
  }
}
