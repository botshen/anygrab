import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from '../App';
import { detectInitialLocale } from '../i18n';
import {
  buildAgentCopyPayload,
  buildRawSandboxDoc,
  buildTailwindSandboxDoc,
  extractFallbackColors,
} from '../utils/sandbox';

// Enable React 19 act() environment flag for clean zero-warning test runs
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

interface HappyDomGlobal {
  happyDOM?: {
    settings: {
      handleDisabledFileLoadingAsSuccess?: boolean;
    };
  };
}

function mockNavigatorLanguage(lang: string) {
  Object.defineProperty(window.navigator, 'language', {
    value: lang,
    configurable: true,
  });
  Object.defineProperty(window.navigator, 'languages', {
    value: [lang],
    configurable: true,
  });
}

describe('Playground Sandbox, i18n & Clipboard Utilities', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('strips executable script tags and inline on* event handlers from raw sandbox HTML while retaining styles', () => {
    const dirty =
      '<div><style>.box{color:#fff}</style><script>alert(1)</script><button type="button" onclick="window.__track(\'pro\')" onmouseover=\'noop()\'>Safe</button></div>';
    const doc = buildRawSandboxDoc(dirty);
    expect(doc).not.toContain('<script>');
    expect(doc).not.toContain('onclick=');
    expect(doc).not.toContain('onmouseover=');
    expect(doc).toContain('.box{color:#fff}');
    expect(doc).toContain('type="button"');
    expect(doc).toContain('>Safe</button>');
  });

  it('injects Tailwind CDN and fallback utility styles in Tailwind sandbox srcDoc', () => {
    const doc = buildTailwindSandboxDoc('<section class="flex gap-4 bg-[#0f172a]">Hello</section>');
    expect(doc).toContain('https://cdn.tailwindcss.com');
    expect(doc).toContain('bg-[#0f172a]');
    expect(doc).toContain('Hello');
  });

  it('formats bilingual agent clipboard bundles and extracts fallback hex colors', () => {
    const enJsx = buildAgentCopyPayload('<div className="p-4" />', 'jsx', 'https://example.com', 'en');
    expect(enJsx).toContain('```tsx');
    expect(enJsx).toContain('https://example.com');

    const zhJsx = buildAgentCopyPayload(
      '<div className="p-4" />',
      'jsx',
      'https://example.com',
      'zh-CN',
    );
    expect(zhJsx).toContain('请 1:1 视觉与结构还原以下由 AnyGrab 提纯的网页组件');
    expect(zhJsx).toContain('```tsx');

    const colors = extractFallbackColors('<style>.a{color:#6366f1;background:#0F172A;}</style>', []);
    expect(colors).toContain('#6366f1');
    expect(colors).toContain('#0f172a');
  });

  it('auto-detects Chinese vs English browser locale and respects localStorage override', () => {
    mockNavigatorLanguage('zh-CN');
    expect(detectInitialLocale()).toBe('zh-CN');

    mockNavigatorLanguage('en-US');
    expect(detectInitialLocale()).toBe('en');

    window.localStorage.setItem('anygrab_site_locale', 'zh-CN');
    expect(detectInitialLocale()).toBe('zh-CN');
  });
});

describe('AnyGrab Bilingual Official Product Website (v0.2.0)', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    const win = window as unknown as HappyDomGlobal;
    if (win.happyDOM?.settings) {
      win.happyDOM.settings.handleDisabledFileLoadingAsSuccess = true;
    }
    window.localStorage.clear();
    window.location.hash = '';
    mockNavigatorLanguage('zh-CN');

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('defaults to plain-Chinese Product Overview in zh-CN browsers and toggles cleanly between 中文 and EN', () => {
    act(() => {
      root.render(<App />);
    });

    // Overview section is active by default with all 5 core navigation tabs
    const tabs = container.querySelectorAll('button[role="tab"]');
    expect(tabs.length).toBe(5);
    expect(document.documentElement.lang).toBe('zh-CN');
    expect(container.textContent).toContain('点一下就能喂给 AI 1:1 复刻');
    expect(container.textContent).toContain('传统痛点 ① · 发截图');
    expect(container.textContent).toContain('第 1 步：在任意网页点选你要的组件');
    expect(container.textContent).toContain('npx anygrab');

    // Click EN switcher in top navbar
    const enBtn = container.querySelector<HTMLButtonElement>('button[data-locale="en"]');
    expect(enBtn).not.toBeNull();
    act(() => {
      enBtn!.click();
    });

    expect(document.documentElement.lang).toBe('en');
    expect(window.localStorage.getItem('anygrab_site_locale')).toBe('en');
    expect(container.textContent).toContain('Grab it in 1 click for Coding Agents!');
    expect(container.textContent).toContain('Old Way 1 · Screenshots');

    // Toggle back to 中文
    const zhBtn = container.querySelector<HTMLButtonElement>('button[data-locale="zh-CN"]');
    act(() => {
      zhBtn!.click();
    });
    expect(document.documentElement.lang).toBe('zh-CN');
    expect(container.textContent).toContain('点一下就能喂给 AI 1:1 复刻');
  });

  it('renders AI Workflows Guide with 3 Antigravity & Codex workflows and 1-click prompt copy', () => {
    act(() => {
      root.render(<App />);
    });

    const workflowsTab = container.querySelector<HTMLButtonElement>(
      'button[data-tab="workflows"]',
    );
    act(() => {
      workflowsTab!.click();
    });

    expect(container.querySelector('section[aria-label="AI Workflows Guide"]')).not.toBeNull();
    expect(container.textContent).toContain('3 种配合【反重力 Antigravity & Codex】的神仙玩法');

    const copyBtns = container.querySelectorAll<HTMLButtonElement>(
      'button[data-action="copy-workflow-prompt"]',
    );
    expect(copyBtns.length).toBe(3);

    act(() => {
      copyBtns[0].click();
    });
    expect(container.textContent).toContain('已复制话术！快去反重力 / Codex 粘贴');
  });

  it('passes active locale into @anygrab/core grab() in Live Playground and supports dual sandbox previews', () => {
    act(() => {
      root.render(<App />);
    });

    const playgroundTab = container.querySelector<HTMLButtonElement>(
      'button[data-tab="playground"]',
    );
    act(() => {
      playgroundTab!.click();
    });

    const outputPre = container.querySelector('pre[aria-label="Distilled Output Code"]');
    expect(outputPre).not.toBeNull();
    // Chinese locale generates localized Chinese prompt directly from @anygrab/core!
    expect(outputPre!.textContent).toContain('请 1:1 视觉与布局还原以下从网页提取的 UI 组件');
    expect(outputPre!.textContent).toContain('## 设计规范（自动提取）');

    // Switch to EN and verify @anygrab/core output immediately switches to English prompt
    const enBtn = container.querySelector<HTMLButtonElement>('button[data-locale="en"]');
    act(() => {
      enBtn!.click();
    });
    expect(outputPre!.textContent).toContain('# AnyGrab Distilled UI Context');
    expect(outputPre!.textContent).toContain('## Design Tokens');
    expect(outputPre!.textContent).toContain('## Structure (Tailwind HTML)');

    // Switch preset to #6 Kanban Sprint Board and test 600 token budget intelligent folding
    const kanbanPresetBtn = container.querySelector<HTMLButtonElement>(
      'button[data-preset-id="kanban-sprint-board"]',
    );
    act(() => {
      kanbanPresetBtn!.click();
    });
    expect(outputPre!.textContent).toContain('Sprint 24');

    const budget600Btn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === '600',
    );
    act(() => {
      budget600Btn!.click();
    });
    expect(container.textContent).toContain('Budget: 600 tok');
    expect(outputPre!.textContent).toContain('similar items omitted');

    // Switch format to React JSX
    const jsxBtn = container.querySelector<HTMLButtonElement>('button[data-format="jsx"]');
    act(() => {
      jsxBtn!.click();
    });
    expect(container.textContent).toContain('Distilled Code (jsx)');

    // Switch both left and right panels to Live Sandbox Preview (<iframe srcDoc>)
    const leftPreviewBtn = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Original Sandbox Preview"]',
    );
    const rightPreviewBtn = container.querySelector<HTMLButtonElement>(
      'button[aria-label="Tailwind Sandbox Preview"]',
    );

    act(() => {
      leftPreviewBtn!.click();
      rightPreviewBtn!.click();
    });

    const rawIframe = container.querySelector('iframe[title="Raw HTML Sandbox Preview"]');
    const twIframe = container.querySelector('iframe[title="Distilled Tailwind Sandbox Preview"]');
    expect(rawIframe).not.toBeNull();
    expect(twIframe).not.toBeNull();
    expect(twIframe?.getAttribute('srcdoc') ?? (twIframe as HTMLIFrameElement).srcdoc).toContain(
      'cdn.tailwindcss.com',
    );
  });

  it('renders Bilingual Benchmark Leaderboard and jumps into Live Playground via Try Live', () => {
    act(() => {
      root.render(<App />);
    });

    const leaderboardTab = container.querySelector<HTMLButtonElement>(
      'button[data-tab="leaderboard"]',
    );
    act(() => {
      leaderboardTab!.click();
    });

    expect(container.textContent).toContain('一分钟大白话读懂这份跑分榜');
    expect(container.textContent).toContain('99.6');
    expect(container.textContent).toContain('-85.0%');

    const tryLiveButtons = container.querySelectorAll<HTMLButtonElement>(
      'button[data-action="try-live"]',
    );
    expect(tryLiveButtons.length).toBe(10);

    act(() => {
      tryLiveButtons[1].click(); // Fixture #2 Financial Statement
    });

    expect(container.querySelector('section[aria-label="Live Distillation Playground"]')).not.toBeNull();
    expect(container.textContent).toContain('LedgerCore FY2026');
  });

  it('renders Download & MCP guide with 3-step Chrome setup and Antigravity / Codex / Claude Code tabs', () => {
    act(() => {
      root.render(<App />);
    });

    const quickStartTab = container.querySelector<HTMLButtonElement>(
      'button[data-tab="quickstart"]',
    );
    act(() => {
      quickStartTab!.click();
    });

    expect(container.textContent).toContain('傻瓜式 3 步安装 Chrome 浏览器插件');
    expect(container.textContent).toContain('chrome://extensions');
    expect(container.textContent).toContain('apps/extension/dist');
    expect(container.textContent).toContain('Antigravity');
    expect(container.textContent).toContain('grab_url');

    const mcpTabs = Array.from(
      container
        .querySelector('div[aria-label="MCP Client Tabs"]')!
        .querySelectorAll<HTMLButtonElement>('button[role="tab"]'),
    );
    const codexTab = mcpTabs.find((b) => b.textContent?.includes('Codex CLI'));
    act(() => {
      codexTab!.click();
    });
    expect(container.textContent).toContain('[mcp_servers.anygrab]');

    const claudeTab = mcpTabs.find((b) => b.textContent?.includes('Claude Code'));
    act(() => {
      claudeTab!.click();
    });
    expect(container.textContent).toContain('claude mcp add anygrab');
  });
});
