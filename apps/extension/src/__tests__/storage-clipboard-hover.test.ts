import { grab } from '@anygrab/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formatGrabToastSummary } from '../picker/dom-utils';
import { copyTextToClipboard } from '../shared/clipboard';
import {
  clearExternalCssCacheForTests,
  collectHoverRulesFromDocument,
  createPageStyleResolver,
  parseHoverRulesFromCss,
} from '../shared/hover-styles';
import {
  appendHistoryItem,
  clearHistory,
  loadHistory,
  loadSettings,
  resetMemoryStorageForTests,
  saveSettings,
} from '../shared/storage';
import { MAX_HISTORY_ITEMS, type GrabHistoryItem } from '../shared/types';

describe('Clipboard, Storage Ring Buffer & Cross-Origin :hover Style Resolver', () => {
  beforeEach(() => {
    resetMemoryStorageForTests();
    clearExternalCssCacheForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('formats bilingual toast compression summaries matching specification', () => {
    const enText = formatGrabToastSummary('jsx', 12400, 460, 96.29, 'en');
    expect(enText).toContain('Copied JSX · 12,400 → 460 tokens (-96.3%)');

    const zhText = formatGrabToastSummary('prompt', 12400, 620, 95.0, 'zh-CN');
    expect(zhText).toBe(
      '✅ 已复制！已为你剔除 95% 网页垃圾代码 — 现在切到【反重力 / Codex】直接按 Cmd+V 粘贴回车即可！',
    );
  });

  it('falls back to document.execCommand("copy") when navigator.clipboard.writeText fails', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: vi.fn().mockRejectedValue(new Error('NotAllowedError')),
      },
    });

    const execCommandSpy = vi.fn().mockReturnValue(true);
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: execCommandSpy,
    });

    const copied = await copyTextToClipboard('<div className="p-4">Hello</div>', document);
    expect(copied).toBe(true);
    expect(execCommandSpy).toHaveBeenCalledWith('copy');
    // Temporary textarea must be removed immediately
    expect(document.querySelector('[data-anygrab-clipboard-fallback]')).toBeNull();
  });

  it('persists sanitized settings and caps history at 20 most recent entries', async () => {
    const defaults = await loadSettings();
    expect(defaults.format).toBe('prompt');
    expect(defaults.compactSvg).toBe(true);

    const updated = await saveSettings({
      format: 'tailwind-html',
      maxTokens: 99999, // Clamped to MAX_TOKEN_BUDGET (6000)
      includeHoverStyles: true,
    });
    expect(updated.format).toBe('tailwind-html');
    expect(updated.maxTokens).toBe(6000);
    expect(updated.includeHoverStyles).toBe(true);

    for (let i = 1; i <= 25; i++) {
      const item: GrabHistoryItem = {
        id: `id-${i}`,
        timestamp: 1000 + i,
        url: `https://example.com/item-${i}`,
        domain: 'example.com',
        tagLabel: `div.card-${i}`,
        format: 'jsx',
        rawTokens: 5000,
        outputTokens: 250,
        compressionRatio: 95,
        durationMs: 1.8,
        preview: `Card ${i}`,
        output: `<div className="card-${i}" />`,
      };
      await appendHistoryItem(item);
    }

    const history = await loadHistory();
    expect(history).toHaveLength(MAX_HISTORY_ITEMS);
    expect(history[0]?.id).toBe('id-25');
    expect(history[19]?.id).toBe('id-6');

    await clearHistory();
    expect(await loadHistory()).toEqual([]);
  });

  it('fetches external cross-origin CSS on SecurityError and resolves :hover styles', async () => {
    document.body.innerHTML = `<button class="hero-cta">Start Free</button>`;
    const button = document.querySelector('.hero-cta')!;

    // Simulate a cross-origin stylesheet that throws SecurityError on `.cssRules` access
    const fakeCrossOriginSheet = {
      href: 'https://cdn.example.com/styles/main.css',
      get cssRules(): CSSRuleList {
        throw new DOMException('Cannot read rules from cross-origin stylesheet', 'SecurityError');
      },
    };

    const fakeDoc = {
      styleSheets: [fakeCrossOriginSheet],
    } as unknown as Document;

    const fetchExternalSpy = vi
      .fn()
      .mockResolvedValue(
        '.hero-cta { background-color: #6366f1; } .hero-cta:hover { background-color: #4338ca; transform: translateY(-1px); }',
      );

    const rules = await collectHoverRulesFromDocument(fakeDoc, fetchExternalSpy);
    expect(fetchExternalSpy).toHaveBeenCalledWith('https://cdn.example.com/styles/main.css');
    expect(rules).toHaveLength(1);
    expect(rules[0]?.baseSelector).toBe('.hero-cta');

    const parsedDirect = parseHoverRulesFromCss(
      '.nav-link:hover, .cta:hover { color: #38bdf8 !important; }',
    );
    expect(parsedDirect).toHaveLength(2);

    const resolver = createPageStyleResolver(window, rules);
    const hoverResolved = resolver(button, ':hover') as Record<string, string> | null;
    expect(hoverResolved).not.toBeNull();
    expect(hoverResolved?.['background-color']).toBe('#4338ca');
    expect(hoverResolved?.backgroundColor).toBe('#4338ca');
    expect(hoverResolved?.transform).toBe('translateY(-1px)');
  });

  it('expands CSS variables var(--accent-hover) in :hover rules and compiles clean base + hover:* Tailwind classes', () => {
    document.head.innerHTML = `
      <style>
        :root {
          --accent-primary: #4f46e5;
          --accent-hover: #4338ca;
        }
        .pro-cta {
          background-color: var(--accent-primary);
          color: #ffffff;
        }
      </style>
    `;
    document.body.innerHTML = `
      <div class="pricing-tier">
        <button class="pro-cta">Get Started</button>
      </div>
    `;

    const card = document.querySelector('.pricing-tier')!;
    const cta = document.querySelector('.pro-cta')!;

    const hoverRules = parseHoverRulesFromCss(`
      .pro-cta:hover {
        background-color: var(--accent-hover);
        border-color: var(--undefined-token, var(--accent-hover));
      }
    `);

    const styleResolver = createPageStyleResolver(window, hoverRules);
    const hoverMap = styleResolver(cta, ':hover') as Record<string, string> | null;
    expect(hoverMap?.['background-color']).toBe('#4338ca');
    expect(hoverMap?.['border-color']).toBe('#4338ca');

    const grabbed = grab(card, {
      format: 'jsx',
      includeHoverStyles: true,
      styleResolver,
    });

    expect(grabbed.output).toContain('bg-indigo-600');
    expect(grabbed.output).toContain('hover:bg-indigo-700');
  });
});
