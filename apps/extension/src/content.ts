import { AnyGrabPicker, grabElementInPage } from './picker/picker-controller';
import type { ExtensionMessage, ExtensionSettings, PickerActionResponse } from './shared/types';

export { AnyGrabPicker, grabElementInPage };
export * from './picker/dom-utils';

interface AnyGrabWindowGlobals {
  __ANYGRAB_PICKER_INSTANCE__?: AnyGrabPicker;
  __ANYGRAB_CONTENT_BOOTSTRAPPED__?: boolean;
}

const MAX_TOGGLE_DEBOUNCE_MS = 160;

export function bootstrapContentScript(win: Window = window, doc: Document = document): AnyGrabPicker {
  const globalWin = win as unknown as AnyGrabWindowGlobals;

  if (globalWin.__ANYGRAB_CONTENT_BOOTSTRAPPED__ && globalWin.__ANYGRAB_PICKER_INSTANCE__) {
    return globalWin.__ANYGRAB_PICKER_INSTANCE__;
  }

  const picker = new AnyGrabPicker({ window: win, document: doc });
  globalWin.__ANYGRAB_PICKER_INSTANCE__ = picker;
  globalWin.__ANYGRAB_CONTENT_BOOTSTRAPPED__ = true;

  let lastToggleTimestamp = 0;
  const safeDebouncedToggle = async (settings?: Partial<ExtensionSettings>): Promise<boolean> => {
    const now = Date.now();
    if (now - lastToggleTimestamp < MAX_TOGGLE_DEBOUNCE_MS) {
      return picker.isActive();
    }
    lastToggleTimestamp = now;
    return picker.toggle(settings);
  };

  // 1. Chrome runtime message bridge (Popup & Background command shortcut)
  if (
    typeof globalThis !== 'undefined' &&
    'chrome' in globalThis &&
    globalThis.chrome?.runtime?.onMessage
  ) {
    globalThis.chrome.runtime.onMessage.addListener(
      (
        rawMessage: unknown,
        _sender: chrome.runtime.MessageSender,
        sendResponse: (response: PickerActionResponse) => void,
      ) => {
        const msg = rawMessage as ExtensionMessage | undefined;
        if (!msg || typeof msg.type !== 'string') {
          return false;
        }

        switch (msg.type) {
          case 'ANYGRAB_PING': {
            sendResponse({ ok: true, active: picker.isActive() });
            return false;
          }
          case 'ANYGRAB_TOGGLE_PICKER': {
            void safeDebouncedToggle(msg.settings)
              .then((active) => sendResponse({ ok: true, active }))
              .catch((err: unknown) =>
                sendResponse({
                  ok: false,
                  error: err instanceof Error ? err.message : String(err),
                }),
              );
            return true;
          }
          case 'ANYGRAB_START_PICKER': {
            void picker
              .start(msg.settings)
              .then(() => sendResponse({ ok: true, active: true }))
              .catch((err: unknown) =>
                sendResponse({
                  ok: false,
                  error: err instanceof Error ? err.message : String(err),
                }),
              );
            return true;
          }
          case 'ANYGRAB_STOP_PICKER': {
            picker.stop();
            sendResponse({ ok: true, active: false });
            return false;
          }
          default:
            return false;
        }
      },
    );
  }

  // 2. Fallback in-page shortcut listener (`Alt+Shift+G`) for environments where browser
  // command bindings are unassigned (e.g. fresh headless Chromium E2E profiles).
  win.addEventListener(
    'keydown',
    (ev: KeyboardEvent) => {
      if (ev.altKey && ev.shiftKey && !ev.ctrlKey && !ev.metaKey && ev.code === 'KeyG') {
        ev.preventDefault();
        ev.stopPropagation();
        void safeDebouncedToggle();
      }
    },
    { capture: true },
  );

  // 3. Deterministic E2E & local automation window postMessage hook (zero DOM footprint until invoked)
  win.addEventListener('message', (ev: MessageEvent) => {
    if (ev.source !== win || !ev.data || typeof ev.data !== 'object') {
      return;
    }
    const payload = ev.data as {
      source?: string;
      action?: string;
      selector?: string;
      settings?: Partial<ExtensionSettings>;
    };
    if (payload.source !== 'anygrab-e2e') {
      return;
    }

    void (async () => {
      switch (payload.action) {
        case 'start': {
          await picker.start(payload.settings);
          win.postMessage(
            { source: 'anygrab-extension', event: 'state', active: picker.isActive() },
            '*',
          );
          break;
        }
        case 'stop': {
          picker.stop();
          win.postMessage(
            { source: 'anygrab-extension', event: 'state', active: picker.isActive() },
            '*',
          );
          break;
        }
        case 'toggle': {
          const active = await safeDebouncedToggle(payload.settings);
          win.postMessage({ source: 'anygrab-extension', event: 'state', active }, '*');
          break;
        }
        case 'select': {
          if (typeof payload.selector === 'string') {
            const el = doc.querySelector(payload.selector);
            picker.selectElement(el, true);
            win.postMessage(
              {
                source: 'anygrab-extension',
                event: 'selected',
                found: Boolean(el),
              },
              '*',
            );
          }
          break;
        }
        case 'grab': {
          const outcome = await picker.grabSelected();
          win.postMessage(
            {
              source: 'anygrab-extension',
              event: 'grabbed',
              ok: Boolean(outcome),
              toastText: outcome?.toastText ?? null,
              output: outcome?.result.output ?? null,
            },
            '*',
          );
          break;
        }
        default:
          break;
      }
    })();
  });

  return picker;
}

// Auto-register listeners silently when injected into a browser page (0 DOM nodes added!)
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  // Skip auto-bootstrapping inside Vitest unless explicitly tested, or wait:
  // bootstrapping adds zero DOM nodes and is guarded by __ANYGRAB_CONTENT_BOOTSTRAPPED__!
  bootstrapContentScript(window, document);
}
