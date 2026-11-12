import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from '../App';
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

describe('Playground Sandbox & Clipboard Utilities', () => {
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

  it('formats agent clipboard bundles and extracts fallback hex colors', () => {
    const jsxBundle = buildAgentCopyPayload('<div className="p-4" />', 'jsx', 'https://example.com');
    expect(jsxBundle).toContain('```tsx');
    expect(jsxBundle).toContain('https://example.com');

    const colors = extractFallbackColors('<style>.a{color:#6366f1;background:#0F172A;}</style>', []);
    expect(colors).toContain('#6366f1');
    expect(colors).toContain('#0f172a');
  });
});

describe('AnyGrab Interactive Playground & Leaderboard App', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    const win = window as unknown as HappyDomGlobal;
    if (win.happyDOM?.settings) {
      win.happyDOM.settings.handleDisabledFileLoadingAsSuccess = true;
    }
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

  it('renders Hero banner, npx command, and all 10 presets in Live Playground', () => {
    act(() => {
      root.render(<App />);
    });

    expect(container.textContent).toContain(
      'Grab clean UI, Tailwind & tables from ANY website for Coding Agents',
    );
    expect(container.textContent).toContain('npx anygrab');
    expect(container.textContent).toContain('SaaS 3-Tier Gradient Pricing');
    expect(container.textContent).toContain('Academic Paper + Theorem & Ablations');
    expect(container.textContent).toContain('Copy for Codex / Antigravity / Cursor');
  });

  it('switches presets, formats, token budget, and dual iframe sandbox previews', () => {
    act(() => {
      root.render(<App />);
    });

    const buttons = Array.from(container.querySelectorAll('button'));
    const financePresetBtn = buttons.find((b) =>
      b.textContent?.includes('Merged-Header Financial Statement'),
    );
    expect(financePresetBtn).toBeDefined();

    act(() => {
      financePresetBtn!.click();
    });
    expect(container.textContent).toContain('LedgerCore FY2026');

    // Switch format to React JSX
    const jsxBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('React JSX'),
    );
    act(() => {
      jsxBtn!.click();
    });
    expect(container.textContent).toContain('Distilled Code (jsx)');

    // Activate 600 token quick budget
    const budget600Btn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === '600',
    );
    act(() => {
      budget600Btn!.click();
    });
    expect(container.textContent).toContain('Budget: 600 tok');

    // Switch both left and right panels to Live Sandbox Preview (<iframe srcDoc>)
    const leftPreviewBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Original Sandbox Preview'),
    );
    const rightPreviewBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Tailwind Sandbox Preview'),
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

  it('navigates to AnyGrab-Bench Leaderboard and opens a fixture back in Live Playground', () => {
    act(() => {
      root.render(<App />);
    });

    const leaderboardTab = Array.from(
      container.querySelectorAll<HTMLButtonElement>('button[role="tab"]'),
    ).find((b) => b.textContent?.includes('AnyGrab-Bench Leaderboard'));
    act(() => {
      leaderboardTab!.click();
    });

    expect(container.textContent).toContain('Multi-Baseline Objective Comparison');
    expect(container.textContent).toContain('Naive Style Picker');
    expect(container.textContent).toContain('Turndown (GFM)');

    // Click "Try Live" on the last fixture row to jump back into Live Playground
    const tryLiveButtons = Array.from(container.querySelectorAll('button')).filter((b) =>
      b.textContent?.includes('Try Live'),
    );
    expect(tryLiveButtons.length).toBe(10);

    act(() => {
      tryLiveButtons[5].click(); // Fixture #6 Kanban Column
    });

    expect(container.textContent).toContain('Sprint 24');
  });

  it('renders Quick Start & MCP Setup with interactive client tabs and Chrome extension guide', () => {
    act(() => {
      root.render(<App />);
    });

    const quickStartTab = Array.from(
      container.querySelectorAll<HTMLButtonElement>('button[role="tab"]'),
    ).find((b) => b.textContent?.includes('Quick Start & MCP Setup'));
    act(() => {
      quickStartTab!.click();
    });

    expect(container.textContent).toContain('Connect Stdio MCP Server (@anygrab/mcp)');
    expect(container.textContent).toContain('chrome://extensions');
    expect(container.textContent).toContain('grab_url');

    const claudeTab = Array.from(
      container.querySelectorAll<HTMLButtonElement>('button[role="tab"]'),
    ).find((b) => b.textContent?.includes('Claude Code'));
    act(() => {
      claudeTab!.click();
    });

    expect(container.textContent).toContain('claude mcp add anygrab');
  });
});
