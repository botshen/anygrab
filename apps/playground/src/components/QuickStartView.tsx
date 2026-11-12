import { Check, Code2, Copy, Cpu, Globe, Plug, Terminal } from 'lucide-react';
import { useState } from 'react';

type McpClientKey = 'antigravity' | 'claude-code' | 'cursor' | 'codex';

const MCP_CONFIGS: Record<
  McpClientKey,
  { label: string; configPath: string; snippet: string }
> = {
  antigravity: {
    label: 'Antigravity',
    configPath: 'mcp_config.json',
    snippet: `{
  "mcpServers": {
    "anygrab": {
      "command": "npx",
      "args": ["-y", "@anygrab/mcp"]
    }
  }
}`,
  },
  'claude-code': {
    label: 'Claude Code',
    configPath: 'CLI One-Liner or .mcp.json',
    snippet: `# Register AnyGrab Stdio MCP Server in 1 command:
claude mcp add anygrab -- npx -y @anygrab/mcp`,
  },
  cursor: {
    label: 'Cursor',
    configPath: '.cursor/mcp.json',
    snippet: `{
  "mcpServers": {
    "anygrab": {
      "command": "npx",
      "args": ["-y", "@anygrab/mcp"]
    }
  }
}`,
  },
  codex: {
    label: 'Codex CLI',
    configPath: '~/.codex/config.toml',
    snippet: `[mcp_servers.anygrab]
command = "npx"
args = ["-y", "@anygrab/mcp"]`,
  },
};

const CLI_SNIPPET = `# 1. Distill any live webpage into an AI-ready prompt bundle
npx anygrab https://ui.shadcn.com/pricing --budget 1200 | pbcopy

# 2. Compile a specific selector directly into React JSX + Tailwind v4
npx anygrab https://example.com -s "main section" -f jsx -o HeroSection.tsx

# 3. Extract pure Design Tokens (palette, typography, radii, shadows)
npx anygrab ./saved-page.html --tokens-only`;

const SDK_SNIPPET = `import { grab, registerAdapter } from '@anygrab/core';

// Zero-dependency execution in Browser, Node, LinkeDOM, or Playwright
const result = grab(document.querySelector('#pricing-tier-pro')!, {
  format: 'jsx',
  maxTokens: 1000,
  compactSvg: true,
  includeHoverStyles: true,
  styleResolver: (el, pseudo) => window.getComputedStyle(el, pseudo),
});

console.log(result.jsx);
console.log(result.designTokens.colors); // ['#6366f1', '#0f172a', ...]
console.log(result.metrics);             // { compressionRatio: 94.8, durationMs: 1.7, ... }`;

function CopyCodeBlock({ code, label }: { code: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard?.writeText(code);
    } catch {
      // Ignore in test environment
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#070709]">
      <div className="flex items-center justify-between border-b border-white/[0.06] bg-zinc-900/80 px-3.5 py-2 text-xs text-zinc-400">
        <span className="font-mono">{label}</span>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-zinc-800 px-2.5 py-1 text-[11px] font-medium text-zinc-200 transition hover:bg-indigo-600 hover:text-white"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-zinc-200">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function QuickStartView() {
  const [mcpClient, setMcpClient] = useState<McpClientKey>('antigravity');
  const activeMcp = MCP_CONFIGS[mcpClient];

  return (
    <section aria-label="Quick Start and MCP Setup" className="grid gap-6 lg:grid-cols-2">
      {/* 1. MCP Server Setup */}
      <div className="space-y-4 rounded-2xl border border-indigo-500/25 bg-zinc-900/65 p-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300">
            <Plug className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">
              1. Connect Stdio MCP Server (@anygrab/mcp)
            </h2>
            <p className="text-xs text-zinc-400">
              Give Antigravity, Claude Code, Cursor, or Codex native webpage &amp; design-token
              distillation tools.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="MCP Client Tabs">
          {(Object.keys(MCP_CONFIGS) as McpClientKey[]).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={mcpClient === key}
              onClick={() => setMcpClient(key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                mcpClient === key
                  ? 'bg-indigo-600 text-white'
                  : 'border border-white/[0.06] bg-zinc-950 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {MCP_CONFIGS[key].label}
            </button>
          ))}
        </div>

        <CopyCodeBlock code={activeMcp.snippet} label={activeMcp.configPath} />

        <div className="grid gap-2 pt-1 sm:grid-cols-3">
          <div className="rounded-xl border border-white/[0.06] bg-zinc-950/80 p-3">
            <code className="font-mono text-xs font-bold text-indigo-300">grab_url</code>
            <p className="mt-1 text-[11px] text-zinc-400">
              Fetches public URL + inlines external CSS &amp; distills under token budget.
            </p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-zinc-950/80 p-3">
            <code className="font-mono text-xs font-bold text-violet-300">grab_html</code>
            <p className="mt-1 text-[11px] text-zinc-400">
              Distills raw HTML + &lt;style&gt; strings into Prompt, Tailwind, JSX, or GFM.
            </p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-zinc-950/80 p-3">
            <code className="font-mono text-xs font-bold text-emerald-300">
              extract_design_tokens
            </code>
            <p className="mt-1 text-[11px] text-zinc-400">
              Extracts deduplicated colors, fonts, radii, shadows &amp; spacing scales.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Chrome MV3 Extension 3-Step Local Guide */}
      <div className="space-y-4 rounded-2xl border border-white/[0.08] bg-zinc-900/65 p-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300">
            <Globe className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">
              2. Chrome MV3 Live Element Picker (3-Step Setup)
            </h2>
            <p className="text-xs text-zinc-400">
              Shadow-DOM isolated visual inspector that grabs real computed styles + :hover states on
              any authenticated tab.
            </p>
          </div>
        </div>

        <ol className="space-y-3 text-xs">
          <li className="rounded-xl border border-white/[0.06] bg-zinc-950/80 p-3.5">
            <div className="font-semibold text-white">
              Step 1 · Build the extension bundle locally
            </div>
            <p className="mt-1 text-zinc-400">
              Run <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-indigo-300">pnpm build</code>{' '}
              at the repository root to generate{' '}
              <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-200">
                apps/extension/dist
              </code>
              .
            </p>
          </li>
          <li className="rounded-xl border border-white/[0.06] bg-zinc-950/80 p-3.5">
            <div className="font-semibold text-white">
              Step 2 · Load Unpacked in Chrome / Edge / Arc / Brave
            </div>
            <p className="mt-1 text-zinc-400">
              Open <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-emerald-300">chrome://extensions</code>,
              enable <strong>Developer mode</strong>, click <strong>Load unpacked</strong>, and
              select <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-200">apps/extension/dist</code>.
            </p>
          </li>
          <li className="rounded-xl border border-white/[0.06] bg-zinc-950/80 p-3.5">
            <div className="font-semibold text-white">
              Step 3 · Point, Traverse &amp; Copy in 1 Keystroke
            </div>
            <p className="mt-1 text-zinc-400">
              Press <kbd className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 font-mono text-zinc-200">Alt+Shift+G</kbd> on any page ·{' '}
              <kbd className="rounded border border-zinc-700 bg-zinc-800 px-1 font-mono text-zinc-200">↑</kbd> /{' '}
              <kbd className="rounded border border-zinc-700 bg-zinc-800 px-1 font-mono text-zinc-200">↓</kbd> expand parent/child ·{' '}
              <kbd className="rounded border border-zinc-700 bg-zinc-800 px-1 font-mono text-zinc-200">Tab</kbd> cycle format ·{' '}
              <kbd className="rounded border border-zinc-700 bg-zinc-800 px-1 font-mono text-zinc-200">Enter</kbd> copy to clipboard!
            </p>
          </li>
        </ol>
      </div>

      {/* 3. CLI Examples */}
      <div className="space-y-4 rounded-2xl border border-white/[0.08] bg-zinc-900/65 p-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300">
            <Terminal className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">3. CLI Workflows (npx anygrab)</h2>
            <p className="text-xs text-zinc-400">
              Pipe clean UI structures, complex tables, or tokens directly into terminal agents.
            </p>
          </div>
        </div>
        <CopyCodeBlock code={CLI_SNIPPET} label="Terminal · bash / zsh" />
      </div>

      {/* 4. @anygrab/core TypeScript SDK */}
      <div className="space-y-4 rounded-2xl border border-white/[0.08] bg-zinc-900/65 p-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/20 text-violet-300">
            <Code2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">
              4. Zero-Dependency @anygrab/core SDK
            </h2>
            <p className="text-xs text-zinc-400">
              Embed sub-5ms DOM distillation inside Browser-Use agents, Playwright scripts, or RAG
              crawlers.
            </p>
          </div>
        </div>
        <CopyCodeBlock code={SDK_SNIPPET} label="TypeScript · @anygrab/core" />
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <Cpu className="h-4 w-4 text-indigo-400" />
          <span>
            100% pure ESM + CJS bundle · Zero runtime npm dependencies · Built-in declarative
            adapters.
          </span>
        </div>
      </div>
    </section>
  );
}
