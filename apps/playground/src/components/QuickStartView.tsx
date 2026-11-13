import { AlertCircle, Check, Copy, Download } from 'lucide-react';
import { useState } from 'react';
import type { SiteLocale } from '../i18n';

type McpClientKey = 'antigravity' | 'codex' | 'cursor' | 'claude-code';

const RELEASE_ZIP_URL =
  'https://github.com/botshen/anygrab/releases/latest/download/anygrab-chrome-extension-v0.2.0.zip';

const MCP_CONFIGS: Record<
  McpClientKey,
  {
    label: string;
    configPath: string;
    snippet: string;
  }
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
  codex: {
    label: 'Codex CLI',
    configPath: '~/.codex/config.toml',
    snippet: `[mcp_servers.anygrab]
command = "npx"
args = ["-y", "@anygrab/mcp"]`,
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
  'claude-code': {
    label: 'Claude Code',
    configPath: 'Terminal One-Liner',
    snippet: `claude mcp add anygrab -- npx -y @anygrab/mcp`,
  },
};

function CopyCodeBlock({
  code,
  label,
  isZh,
}: {
  code: string;
  label: string;
  isZh: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const onCopy = () => {
    try {
      void navigator.clipboard?.writeText(code)?.catch(() => {});
    } catch {
      // Ignore in test environment
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-[#08090C]">
      <div className="flex items-center justify-between border-b border-white/8 bg-[#171A22] px-3.5 py-2 text-xs text-[#A1A7B5]">
        <span className="font-mono text-[11px]">{label}</span>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center gap-1 rounded-md border border-white/12 bg-[#101217] px-2.5 py-1 text-[11px] font-semibold text-[#F4F5F8] transition hover:border-[var(--ag-accent)]"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-[#10B981]" />
              <span>{isZh ? '已复制' : 'Copied'}</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>{isZh ? '复制' : 'Copy'}</span>
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-xs leading-[1.6] whitespace-pre-wrap break-words text-[#D8DCE6]">
        <code>{code}</code>
      </pre>
    </div>
  );
}

interface QuickStartViewProps {
  locale: SiteLocale;
}

export function QuickStartView({ locale }: QuickStartViewProps) {
  const isZh = locale === 'zh-CN';
  const [mcpClient, setMcpClient] = useState<McpClientKey>('antigravity');
  const [copiedField, setCopiedField] = useState<'url' | 'dist' | null>(null);
  const activeMcp = MCP_CONFIGS[mcpClient];

  const handleCopyText = (field: 'url' | 'dist', text: string) => {
    try {
      void navigator.clipboard?.writeText(text)?.catch(() => {});
    } catch {
      // Ignore
    }
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1600);
  };

  return (
    <section
      id="quickstart"
      aria-label="Quick Start and MCP Setup"
      className="mx-auto max-w-[1160px] space-y-6 pt-4"
    >
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="font-mono text-[11px] font-semibold tracking-wider text-[var(--ag-accent)] uppercase">
            05 · EXTENSION &amp; MCP SETUP
          </div>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-[#F4F5F8] sm:text-3xl">
            {isZh ? '30 秒装好即用' : 'Install in 30 Seconds'}
          </h2>
        </div>

        <a
          href={RELEASE_ZIP_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-full border border-[var(--ag-emerald)]/45 bg-[var(--ag-emerald-soft)] px-4 py-1.5 text-xs font-semibold text-[#10B981] transition hover:bg-[#10B981] hover:text-[#08090C]"
        >
          <Download className="h-3.5 w-3.5" />
          <span>{isZh ? '下载免编译插件 v0.2.0 (.zip)' : 'Download Extension v0.2.0 (.zip)'}</span>
        </a>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 1. Chrome MV3 3-Step Visual Dock (Highlighting dist/ subfolder pitfall!) */}
        <div className="space-y-4 rounded-2xl border border-white/10 bg-[#101217] p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs font-bold text-[#F4F5F8]">
              {isZh ? 'CHROME MV3 插件' : 'CHROME EXTENSION'}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-[var(--ag-accent)]/40 bg-[var(--ag-accent-soft)] px-2.5 py-0.5 font-mono text-[11px] font-semibold text-[var(--ag-accent)]">
              <AlertCircle className="h-3 w-3" />
              <span>{isZh ? '必选 dist 子目录' : 'Select /dist folder'}</span>
            </span>
          </div>

          <ol className="divide-y divide-white/8 overflow-hidden rounded-xl border border-white/10 bg-[#08090C] text-xs">
            <li className="flex items-center justify-between gap-3 px-4 py-3.5">
              <div>
                <span className="mr-2 font-mono text-[#FF4D1C]">01</span>
                <span className="font-semibold text-[#F4F5F8]">
                  {isZh ? '打开扩展页并开启「开发者模式」' : 'Enable Developer mode at'}
                </span>
                <code className="ml-2 rounded bg-[#171A22] px-1.5 py-0.5 font-mono text-[#A1A7B5]">
                  chrome://extensions
                </code>
              </div>
              <button
                type="button"
                onClick={() => handleCopyText('url', 'chrome://extensions')}
                className="shrink-0 rounded-md border border-white/12 px-2.5 py-1 text-[11px] font-semibold text-[#F4F5F8] transition hover:border-white/30"
              >
                {copiedField === 'url' ? (isZh ? '已复制' : 'Copied') : isZh ? '复制' : 'Copy'}
              </button>
            </li>

            <li className="flex items-center justify-between gap-3 px-4 py-3.5">
              <div>
                <span className="mr-2 font-mono text-[#FF4D1C]">02</span>
                <span className="font-semibold text-[#F4F5F8]">
                  {isZh ? '加载已解压扩展 → 选中' : 'Load unpacked → pick'}
                </span>
                <code className="ml-2 rounded border border-[var(--ag-accent)]/40 bg-[var(--ag-accent-soft)] px-1.5 py-0.5 font-mono font-bold text-[#F4F5F8]">
                  apps/extension/dist
                </code>
              </div>
              <button
                type="button"
                onClick={() => handleCopyText('dist', 'apps/extension/dist')}
                className="shrink-0 rounded-md border border-white/12 px-2.5 py-1 text-[11px] font-semibold text-[#F4F5F8] transition hover:border-white/30"
              >
                {copiedField === 'dist' ? (isZh ? '已复制' : 'Copied') : isZh ? '复制路径' : 'Copy'}
              </button>
            </li>

            <li className="flex items-center justify-between gap-3 px-4 py-3.5">
              <div>
                <span className="mr-2 font-mono text-[#10B981]">03</span>
                <span className="font-semibold text-[#F4F5F8]">
                  {isZh ? '点开插件里的「30 秒练习靶场」即刻试抓' : 'Open popup → launch 30s Practice Arena'}
                </span>
              </div>
            </li>
          </ol>

          <CopyCodeBlock
            code={`npx anygrab https://ui.shadcn.com/pricing --budget 1200 | pbcopy`}
            label="CLI · npx anygrab"
            isZh={isZh}
          />
        </div>

        {/* 2. MCP Server Setup */}
        <div className="space-y-4 rounded-2xl border border-white/10 bg-[#101217] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-xs font-bold text-[#F4F5F8]">
              MCP SERVER (@anygrab/mcp)
            </span>

            <div
              className="inline-flex flex-wrap gap-1 rounded-lg border border-white/8 bg-[#08090C] p-0.5"
              role="tablist"
              aria-label="MCP Client Tabs"
            >
              {(Object.keys(MCP_CONFIGS) as McpClientKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={mcpClient === key}
                  onClick={() => setMcpClient(key)}
                  className={`rounded-[6px] px-2.5 py-1 text-[11px] font-semibold transition ${
                    mcpClient === key
                      ? 'bg-[#F4F5F8] text-[#08090C]'
                      : 'text-[#A1A7B5] hover:text-[#F4F5F8]'
                  }`}
                >
                  {MCP_CONFIGS[key].label}
                </button>
              ))}
            </div>
          </div>

          <CopyCodeBlock
            code={activeMcp.snippet}
            label={activeMcp.configPath}
            isZh={isZh}
          />

          <div className="grid gap-2.5 sm:grid-cols-3">
            {[
              { fn: 'grab_url', descZh: '抓公开网址并提纯', descEn: 'Fetch & distill URL' },
              { fn: 'grab_html', descZh: '清洗 HTML 为组件', descEn: 'Clean raw HTML' },
              { fn: 'extract_design_tokens', descZh: '提取色板字体圆角', descEn: 'Extract Tokens' },
            ].map((tool) => (
              <div
                key={tool.fn}
                className="rounded-xl border border-white/8 bg-[#08090C] px-3 py-2.5"
              >
                <code className="font-mono text-[11px] font-bold text-[#F4F5F8]">{tool.fn}</code>
                <div className="mt-0.5 text-[11px] text-[#7C8292]">
                  {isZh ? tool.descZh : tool.descEn}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
