import {
  DEFAULT_EXTENSION_SETTINGS,
  FORMAT_CYCLE,
  MAX_HISTORY_ITEMS,
  MAX_TOKEN_BUDGET,
  MIN_TOKEN_BUDGET,
  STORAGE_KEYS,
  type ExtensionSettings,
  type GrabHistoryItem,
} from './types';

/** Fallback in-memory store when running outside Chrome extension runtime (e.g. unit tests) */
const memoryStore: Record<string, unknown> = {};

function getChromeLocalArea(): chrome.storage.LocalStorageArea | null {
  if (
    typeof globalThis !== 'undefined' &&
    'chrome' in globalThis &&
    globalThis.chrome?.storage?.local
  ) {
    return globalThis.chrome.storage.local;
  }
  return null;
}

async function storageGet<T>(key: string): Promise<T | undefined> {
  const area = getChromeLocalArea();
  if (!area) {
    return memoryStore[key] as T | undefined;
  }

  return new Promise<T | undefined>((resolve) => {
    try {
      const maybePromise: unknown = area.get([key], (items) => {
        resolve(items?.[key] as T | undefined);
      });
      if (
        maybePromise &&
        typeof (maybePromise as Promise<Record<string, unknown>>).then === 'function'
      ) {
        (maybePromise as Promise<Record<string, unknown>>)
          .then((items) => resolve(items?.[key] as T | undefined))
          .catch(() => resolve(undefined));
      }
    } catch {
      resolve(undefined);
    }
  });
}

async function storageSet(key: string, value: unknown): Promise<void> {
  const area = getChromeLocalArea();
  if (!area) {
    memoryStore[key] = value;
    return;
  }

  return new Promise<void>((resolve) => {
    try {
      const maybePromise: unknown = area.set({ [key]: value }, () => {
        resolve();
      });
      if (maybePromise && typeof (maybePromise as Promise<void>).then === 'function') {
        (maybePromise as Promise<void>).then(() => resolve()).catch(() => resolve());
      }
    } catch {
      resolve();
    }
  });
}

export function sanitizeSettings(raw?: Partial<ExtensionSettings> | null): ExtensionSettings {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_EXTENSION_SETTINGS };
  }

  const format =
    raw.format && (FORMAT_CYCLE as readonly string[]).includes(raw.format)
      ? raw.format
      : DEFAULT_EXTENSION_SETTINGS.format;

  const rawBudget =
    typeof raw.maxTokens === 'number' && Number.isFinite(raw.maxTokens)
      ? Math.round(raw.maxTokens)
      : DEFAULT_EXTENSION_SETTINGS.maxTokens;
  const maxTokens = Math.min(MAX_TOKEN_BUDGET, Math.max(MIN_TOKEN_BUDGET, rawBudget));

  return {
    format,
    maxTokens,
    unlimitedTokens:
      typeof raw.unlimitedTokens === 'boolean'
        ? raw.unlimitedTokens
        : DEFAULT_EXTENSION_SETTINGS.unlimitedTokens,
    compactSvg:
      typeof raw.compactSvg === 'boolean'
        ? raw.compactSvg
        : DEFAULT_EXTENSION_SETTINGS.compactSvg,
    includeHoverStyles:
      typeof raw.includeHoverStyles === 'boolean'
        ? raw.includeHoverStyles
        : DEFAULT_EXTENSION_SETTINGS.includeHoverStyles,
  };
}

export async function loadSettings(): Promise<ExtensionSettings> {
  const stored = await storageGet<Partial<ExtensionSettings>>(STORAGE_KEYS.SETTINGS);
  return sanitizeSettings(stored);
}

export async function saveSettings(
  patch: Partial<ExtensionSettings>,
): Promise<ExtensionSettings> {
  const current = await loadSettings();
  const next = sanitizeSettings({ ...current, ...patch });
  await storageSet(STORAGE_KEYS.SETTINGS, next);
  return next;
}

export async function loadHistory(): Promise<GrabHistoryItem[]> {
  const stored = await storageGet<GrabHistoryItem[]>(STORAGE_KEYS.HISTORY);
  if (!Array.isArray(stored)) {
    return [];
  }
  return stored.slice(0, MAX_HISTORY_ITEMS);
}

export async function appendHistoryItem(item: GrabHistoryItem): Promise<GrabHistoryItem[]> {
  const existing = await loadHistory();
  const filtered = existing.filter((entry) => entry.id !== item.id);
  const next = [item, ...filtered].slice(0, MAX_HISTORY_ITEMS);
  await storageSet(STORAGE_KEYS.HISTORY, next);
  return next;
}

export async function clearHistory(): Promise<void> {
  await storageSet(STORAGE_KEYS.HISTORY, []);
}

export function resetMemoryStorageForTests(): void {
  for (const key of Object.keys(memoryStore)) {
    delete memoryStore[key];
  }
}
