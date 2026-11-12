import { VERSION } from '@anygrab/core';
import { loadSettings, saveSettings } from './shared/storage';
import type {
  ExtensionMessage,
  FetchExternalCssResponse,
  PickerActionResponse,
} from './shared/types';

const RESTRICTED_URL_PREFIXES = [
  'chrome://',
  'chrome-extension://',
  'edge://',
  'about:',
  'view-source:',
  'devtools://',
  'https://chromewebstore.google.com/',
  'https://chrome.google.com/webstore/',
];

const EXTERNAL_CSS_TIMEOUT_MS = 4000;
const MAX_EXTERNAL_CSS_BYTES = 2 * 1024 * 1024;

export function isOwnGuideTabUrl(url?: string | null): boolean {
  if (!url) return false;
  return /^chrome-extension:\/\/[^/]+\/guide\.html([?#]|$)/i.test(url);
}

export function isInjectableTabUrl(url?: string | null): boolean {
  if (!url) {
    return true;
  }
  if (isOwnGuideTabUrl(url)) {
    return true;
  }
  const lower = url.toLowerCase();
  return !RESTRICTED_URL_PREFIXES.some((prefix) => lower.startsWith(prefix));
}

function sendMessageToTab(
  tabId: number,
  message: ExtensionMessage,
): Promise<PickerActionResponse> {
  return new Promise((resolve, reject) => {
    try {
      chrome.tabs.sendMessage(tabId, message, (response?: PickerActionResponse) => {
        const lastError = chrome.runtime?.lastError;
        if (lastError) {
          reject(new Error(lastError.message || 'Receiving end does not exist'));
          return;
        }
        if (!response) {
          reject(new Error('No response from content script'));
          return;
        }
        resolve(response);
      });
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
    }
  });
}

/**
 * Sends a picker command (`ANYGRAB_TOGGLE_PICKER` or `ANYGRAB_START_PICKER`) to `tabId`.
 * Automatically injects `content.js` via `chrome.scripting.executeScript` if the target tab
 * was opened before the extension was loaded.
 */
export async function dispatchPickerToTab(
  tabId: number,
  message: ExtensionMessage = { type: 'ANYGRAB_TOGGLE_PICKER' },
  tabUrl?: string,
): Promise<PickerActionResponse> {
  if (!isInjectableTabUrl(tabUrl)) {
    return {
      ok: false,
      error: 'AnyGrab cannot run on restricted browser internal pages.',
    };
  }

  try {
    return await sendMessageToTab(tabId, message);
  } catch {
    if (isOwnGuideTabUrl(tabUrl)) {
      return {
        ok: false,
        error: 'Practice Arena page is still loading — please try again in a moment.',
      };
    }

    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js'],
      });
      return await sendMessageToTab(tabId, message);
    } catch (injectErr) {
      return {
        ok: false,
        error:
          injectErr instanceof Error
            ? injectErr.message
            : 'Unable to inject AnyGrab content script into this tab.',
      };
    }
  }
}

export async function queryActiveTab(): Promise<chrome.tabs.Tab | null> {
  return new Promise((resolve) => {
    try {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        resolve(tabs?.[0] ?? null);
      });
    } catch {
      resolve(null);
    }
  });
}

/**
 * Fetches a public external CSS stylesheet (`http:` / `https:` only, `credentials: 'omit'`)
 * to assist `:hover` rule extraction when cross-origin `<link rel="stylesheet">` throws `SecurityError`.
 */
export async function handleFetchExternalCss(
  rawUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<FetchExternalCssResponse> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { ok: false, error: 'Invalid stylesheet URL.' };
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { ok: false, error: 'Only http/https public stylesheets are permitted.' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), EXTERNAL_CSS_TIMEOUT_MS);

  try {
    const response = await fetchImpl(parsed.toString(), {
      method: 'GET',
      credentials: 'omit',
      cache: 'force-cache',
      signal: controller.signal,
      headers: {
        Accept: 'text/css,*/*;q=0.1',
      },
    });

    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}` };
    }

    const cssText = await response.text();
    if (cssText.length > MAX_EXTERNAL_CSS_BYTES) {
      return {
        ok: true,
        cssText: cssText.slice(0, MAX_EXTERNAL_CSS_BYTES),
      };
    }

    return { ok: true, cssText };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Failed to fetch external CSS.',
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function registerBackgroundListeners(): void {
  if (typeof globalThis === 'undefined' || !('chrome' in globalThis) || !globalThis.chrome) {
    return;
  }

  chrome.runtime?.onInstalled?.addListener((details) => {
    void (async () => {
      const current = await loadSettings();
      await saveSettings(current);
      console.info(`[AnyGrab] Extension v${VERSION} ready.`);

      // Open built-in 30-second interactive guide & practice arena on fresh install
      if (
        details?.reason === 'install' &&
        chrome.runtime?.getURL &&
        chrome.tabs?.create
      ) {
        try {
          chrome.tabs.create({
            url: chrome.runtime.getURL('guide.html'),
            active: true,
          });
        } catch {
          // Ignore tab creation errors in restricted test contexts
        }
      }
    })();
  });

  chrome.commands?.onCommand?.addListener((command: string) => {
    if (command !== 'toggle-picker') {
      return;
    }
    void (async () => {
      const activeTab = await queryActiveTab();
      if (activeTab?.id !== undefined) {
        await dispatchPickerToTab(
          activeTab.id,
          { type: 'ANYGRAB_TOGGLE_PICKER' },
          activeTab.url,
        );
      }
    })();
  });

  chrome.runtime?.onMessage?.addListener(
    (
      rawMessage: unknown,
      _sender: chrome.runtime.MessageSender,
      sendResponse: (response: FetchExternalCssResponse | PickerActionResponse) => void,
    ) => {
      const msg = rawMessage as ExtensionMessage | undefined;
      if (!msg || typeof msg.type !== 'string') {
        return false;
      }

      if (msg.type === 'FETCH_EXTERNAL_CSS') {
        void handleFetchExternalCss(msg.url).then(sendResponse);
        return true;
      }

      if (msg.type === 'ANYGRAB_ACTIVATE_TAB_PICKER') {
        void (async () => {
          let targetTabId = msg.tabId;
          let targetTabUrl: string | undefined;
          if (targetTabId === undefined) {
            const tab = await queryActiveTab();
            targetTabId = tab?.id;
            targetTabUrl = tab?.url;
          }
          if (targetTabId === undefined) {
            sendResponse({ ok: false, error: 'No active browser tab found.' });
            return;
          }
          const result = await dispatchPickerToTab(
            targetTabId,
            { type: 'ANYGRAB_START_PICKER', settings: msg.settings },
            targetTabUrl,
          );
          sendResponse(result);
        })();
        return true;
      }

      return false;
    },
  );
}

registerBackgroundListeners();
