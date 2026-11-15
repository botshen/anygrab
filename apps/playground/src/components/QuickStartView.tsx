import { Check, Copy, Download } from 'lucide-react';
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
      "args": ["-y", "anygrab-mcp"]
    }
  }
}`,
  },
  codex: {
    label: 'Codex CLI',
    configPath: '~/.codex/config.toml',
    snippet: `[mcp_servers.anygrab]
command = "npx"
args = ["-y", "anygrab-mcp"]`,
  },
  cursor: {
    label: 'Cursor',
    configPath: '.cursor/mcp.json',
    snippet: `{
  "mcpServers": {
    "anygrab": {
      "command": "npx",
      "args": ["-y", "anygrab-mcp"]
    }
  }
}`,
  },
  'claude-code': {
    label: 'Claude Code',
    configPath: 'Terminal',
    snippet: `claude mcp add anygrab -- npx -y anygrab-mcp`,
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
    <div className="overflow-hidden rounded-xl border border-[var(--ag-line)] bg-[var(--ag-code-bg)]">
      <div className="flex items-center justify-between border-b border-[var(--ag-line)] bg-[var(--ag-panel-muted)] px-3.5 py-2 text-[13px] text-[var(--ag-muted)]">
        <span className="font-mono">{label}</span>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex min-h-[28px] items-center gap-1 rounded-md border border-[var(--ag-line-strong)] bg-[var(--ag-panel)] px-2.5 text-[12px] font-medium text-[var(--ag-ink)] transition-colors hover:border-[var(--ag-accent)]"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-[var(--ag-emerald)]" />
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
      <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-[1.6] whitespace-pre-wrap break-words text-[var(--ag-code-ink)]">
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
      className="py-14 sm:py-20"
    >
      <div className="ag-wrap space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-[clamp(1.75rem,2.4vw,2.65rem)] leading-[1.12] font-medium tracking-[-0.032em] text-[var(--ag-ink)]">
            {isZh ? '30 秒装好即用。' : 'Install in 30 seconds.'}{' '}
            <span className="text-[var(--ag-muted)]">
              {isZh
                ? '提供 Chrome 扩展、CLI 与 MCP 服务。'
                : 'Chrome extension, CLI, and MCP server.'}
            </span>
          </h2>

          <a
            href={RELEASE_ZIP_URL}
            target="_blank"
            rel="noreferrer"
            className="ag-btn ag-btn-secondary"
          >
            <Download className="h-4 w-4 text-[var(--ag-accent)]" />
            <span>{isZh ? '下载 Chrome 插件 (.zip)' : 'Download extension (.zip)'}</span>
          </a>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* 1. Chrome MV3 3-Step Setup */}
          <div className="space-y-5 rounded-[16px] border border-[var(--ag-line)] bg-[var(--ag-panel)] p-6">
            <h3 className="text-[19px] font-medium text-[var(--ag-ink)]">
              {isZh ? 'Chrome 浏览器扩展' : 'Chrome MV3 extension'}
            </h3>

            <ol className="divide-y divide-[var(--ag-line)] border-y border-[var(--ag-line)] text-[14px]">
              <li className="flex items-center justify-between gap-3 py-3.5">
                <div className="min-w-0">
                  <span className="mr-2.5 font-mono text-[13px] text-[var(--ag-muted)]">01</span>
                  <span className="text-[var(--ag-ink)]">
                    {isZh ? '开启开发者模式：' : 'Enable Developer mode at '}
                  </span>
                  <code className="ml-1 rounded bg-[var(--ag-panel-muted)] px-1.5 py-0.5 font-mono text-[13px] text-[var(--ag-ink)]">
                    chrome://extensions
                  </code>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyText('url', 'chrome://extensions')}
                  className="shrink-0 rounded-md border border-[var(--ag-line-strong)] px-2.5 py-1 text-[12px] font-medium text-[var(--ag-ink)] transition-colors hover:border-[var(--ag-accent)]"
                >
                  {copiedField === 'url' ? (isZh ? '已复制' : 'Copied') : isZh ? '复制' : 'Copy'}
                </button>
              </li>

              <li className="flex items-center justify-between gap-3 py-3.5">
                <div className="min-w-0">
                  <span className="mr-2.5 font-mono text-[13px] text-[var(--ag-muted)]">02</span>
                  <span className="text-[var(--ag-ink)]">
                    {isZh ? '加载已解压扩展，选择 ' : 'Load unpacked folder '}
                  </span>
                  <code className="ml-1 rounded bg-[var(--ag-accent-soft)] px-1.5 py-0.5 font-mono text-[13px] font-medium text-[var(--ag-accent)]">
                    apps/extension/dist
                  </code>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyText('dist', 'apps/extension/dist')}
                  className="shrink-0 rounded-md border border-[var(--ag-line-strong)] px-2.5 py-1 text-[12px] font-medium text-[var(--ag-ink)] transition-colors hover:border-[var(--ag-accent)]"
                >
                  {copiedField === 'dist' ? (isZh ? '已复制' : 'Copied') : isZh ? '复制' : 'Copy'}
                </button>
              </li>

              <li className="flex items-center justify-between gap-3 py-3.5">
                <div>
                  <span className="mr-2.5 font-mono text-[13px] text-[var(--ag-muted)]">03</span>
                  <span className="text-[var(--ag-ink)]">
                    {isZh
                      ? '打开插件内的「30 秒练习靶场」即刻试抓'
                      : 'Open popup and launch the 30s Practice Arena'}
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
          <div className="min-w-0 space-y-5 rounded-[16px] border border-[var(--ag-line)] bg-[var(--ag-panel)] p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <h3 className="text-[19px] font-medium text-[var(--ag-ink)]">
                MCP Server (anygrab-mcp)
              </h3>

              <div
                className="grid w-full grid-cols-2 gap-1 rounded-lg bg-[var(--ag-panel-muted)] p-1 sm:inline-flex sm:w-auto"
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
                    className={`min-h-[32px] rounded-[6px] px-2.5 text-[13px] font-medium whitespace-nowrap transition-colors ${
                      mcpClient === key
                        ? 'bg-[var(--ag-panel)] text-[var(--ag-ink)] shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
                        : 'text-[var(--ag-muted)] hover:text-[var(--ag-ink)]'
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

            <p className="text-[14px] leading-[1.6] text-[var(--ag-muted)]">
              {isZh ? '内置工具：' : 'Exposed tools: '}
              <code className="font-mono text-[13px] text-[var(--ag-ink)]">grab_url</code>
              {' · '}
              <code className="font-mono text-[13px] text-[var(--ag-ink)]">grab_html</code>
              {' · '}
              <code className="font-mono text-[13px] text-[var(--ag-ink)]">
                extract_design_tokens
              </code>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
