import type { OutputFormat } from '@anygrab/core';

export type ExtensionLocale = 'zh-CN' | 'en';

export const HOST_ID = '__anygrab-host__';

export const STORAGE_KEYS = {
  SETTINGS: 'anygrab_settings_v1',
  HISTORY: 'anygrab_history_v1',
} as const;

export const MAX_HISTORY_ITEMS = 20;
export const MIN_TOKEN_BUDGET = 400;
export const MAX_TOKEN_BUDGET = 6000;
export const DEFAULT_TOKEN_BUDGET = 1600;
export const DEFAULT_WEBSITE_URL = 'https://botshen.github.io/anygrab/';

export const FORMAT_CYCLE: readonly OutputFormat[] = [
  'prompt',
  'tailwind-html',
  'jsx',
  'markdown',
] as const;

export const FORMAT_HUD_LABELS: Record<OutputFormat, string> = {
  prompt: 'AI Prompt',
  'tailwind-html': 'Tailwind HTML',
  jsx: 'React JSX',
  markdown: 'Markdown',
};

export const FORMAT_SHORT_LABELS: Record<OutputFormat, string> = {
  prompt: 'Prompt',
  'tailwind-html': 'Tailwind',
  jsx: 'JSX',
  markdown: 'Markdown',
};

export interface ExtensionSettings {
  locale: ExtensionLocale;
  format: OutputFormat;
  maxTokens: number;
  unlimitedTokens: boolean;
  compactSvg: boolean;
  includeHoverStyles: boolean;
  websiteUrl: string;
}

export const DEFAULT_EXTENSION_SETTINGS: ExtensionSettings = {
  locale: 'en',
  format: 'prompt',
  maxTokens: DEFAULT_TOKEN_BUDGET,
  unlimitedTokens: false,
  compactSvg: true,
  includeHoverStyles: false,
  websiteUrl: DEFAULT_WEBSITE_URL,
};

export interface GrabHistoryItem {
  id: string;
  timestamp: number;
  url: string;
  domain: string;
  tagLabel: string;
  format: OutputFormat;
  rawTokens: number;
  outputTokens: number;
  compressionRatio: number;
  durationMs: number;
  preview: string;
  output: string;
}

export type ExtensionMessage =
  | { type: 'ANYGRAB_PING' }
  | { type: 'ANYGRAB_TOGGLE_PICKER'; settings?: Partial<ExtensionSettings> }
  | { type: 'ANYGRAB_START_PICKER'; settings?: Partial<ExtensionSettings> }
  | { type: 'ANYGRAB_STOP_PICKER' }
  | { type: 'ANYGRAB_ACTIVATE_TAB_PICKER'; tabId?: number; settings?: Partial<ExtensionSettings> }
  | { type: 'FETCH_EXTERNAL_CSS'; url: string };

export interface PickerActionResponse {
  ok: boolean;
  active?: boolean;
  error?: string;
}

export interface FetchExternalCssResponse {
  ok: boolean;
  cssText?: string;
  error?: string;
}
