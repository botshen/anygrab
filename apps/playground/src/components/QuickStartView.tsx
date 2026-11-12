import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import type { SiteLocale } from '../i18n';

type McpClientKey = 'antigravity' | 'codex' | 'cursor' | 'claude-code';

const MCP_CONFIGS: Record<
  McpClientKey,
  {
    label: string;
    configPathZh: string;
    configPathEn: string;
    whereHintZh: string;
    whereHintEn: string;
    snippet: string;
  }
> = {
  antigravity: {
    label: 'Antigravity',
    configPathZh: '反重力 Antigravity · mcp_config.json',
    configPathEn: 'Antigravity · mcp_config.json',
    whereHintZh: '打开反重力右侧 MCP 设置面板 → 编辑配置文件，把下面这段粘进去保存即可：',
    whereHintEn: 'Open Antigravity MCP Settings → Edit mcp_config.json and paste:',
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
    configPathZh: 'Codex · ~/.codex/config.toml',
    configPathEn: 'Codex · ~/.codex/config.toml',
    whereHintZh: '打开电脑上的 ~/.codex/config.toml 文件，在末尾追加这 3 行即可：',
    whereHintEn: 'Append these 3 lines to ~/.codex/config.toml:',
    snippet: `[mcp_servers.anygrab]
command = "npx"
args = ["-y", "@anygrab/mcp"]`,
  },
  cursor: {
    label: 'Cursor',
    configPathZh: 'Cursor · .cursor/mcp.json',
    configPathEn: 'Cursor · .cursor/mcp.json',
    whereHintZh: '在项目根目录新建或编辑 .cursor/mcp.json（或在 Cursor Settings → MCP 中添加）：',
    whereHintEn: 'Add to .cursor/mcp.json or Cursor Settings → MCP:',
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
    configPathZh: '终端一行命令安装',
    configPathEn: 'CLI One-Liner or .mcp.json',
    whereHintZh: '在终端里直接运行下面这一行命令，1 秒自动挂载完成：',
    whereHintEn: 'Run this single command in your terminal:',
    snippet: `claude mcp add anygrab -- npx -y @anygrab/mcp`,
  },
};

const CLI_SNIPPET_ZH = `# 1. 抓取任意公开网页并复制到 Mac 剪贴板（限制 1200 字数上限）
npx anygrab https://ui.shadcn.com/pricing --budget 1200 | pbcopy

# 2. 只抓取网页主内容区，直接转成 React 组件代码保存成文件
npx anygrab https://example.com -s "main section" -f jsx -o HeroSection.tsx

# 3. 只提取目标网站的配色色板、字体和圆角设计规范
npx anygrab ./saved-page.html --tokens-only`;

const CLI_SNIPPET_EN = `# 1. Distill any live webpage into an AI-ready prompt bundle
npx anygrab https://ui.shadcn.com/pricing --budget 1200 | pbcopy

# 2. Compile a specific selector directly into React JSX + Tailwind v4
npx anygrab https://example.com -s "main section" -f jsx -o HeroSection.tsx

# 3. Extract pure Design Tokens (palette, typography, radii, shadows)
npx anygrab ./saved-page.html --tokens-only`;

const SDK_SNIPPET = `import { grab } from '@anygrab/core';

// Zero-dependency execution in Browser, Node, LinkeDOM, or Playwright
const result = grab(document.querySelector('#pricing-tier-pro')!, {
  format: 'prompt',
  locale: 'zh-CN', // Or 'en'
  maxTokens: 1000,
  compactSvg: true,
  includeHoverStyles: true,
  styleResolver: (el, pseudo) => window.getComputedStyle(el, pseudo),
});

console.log(result.output);              // Ready-to-paste AI prompt
console.log(result.designTokens.colors); // ['#141413', '#D94E28']`;

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
    <div className="overflow-hidden rounded-[8px] bg-[var(--ag-bg-stage)] text-[#EEEDE8]">
      <div className="flex items-center justify-between border-b border-white/10 bg-[var(--ag-bg-stage-elevated)] px-3.5 py-2 text-xs text-[#A3A198]">
        <span className="font-mono">{label}</span>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex items-center gap-1.5 rounded-[5px] bg-[#2C2C29] px-2.5 py-1 text-[11px] font-medium text-[#FAF9F5] transition hover:bg-[var(--ag-accent)]"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-[#4ADE80]" />
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
      <pre className="overflow-x-auto p-4 font-mono text-xs leading-[1.65] whitespace-pre-wrap break-words text-[#EEEDE8]">
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
  const [copiedExtUrl, setCopiedExtUrl] = useState(false);
  const activeMcp = MCP_CONFIGS[mcpClient];

  const handleCopyChromeUrl = () => {
    try {
      void navigator.clipboard?.writeText('chrome://extensions')?.catch(() => {});
    } catch {
      // Ignore
    }
    setCopiedExtUrl(true);
    setTimeout(() => setCopiedExtUrl(false), 1600);
  };

  return (
    <section aria-label="Quick Start and MCP Setup" className="grid gap-x-10 gap-y-12 pt-2 lg:grid-cols-2">
      {/* 1. Chrome MV3 3-Step Installation — Open Archival Layout (Zero Outer White Box Nesting) */}
      <div className="space-y-4 border-t-2 border-[var(--ag-accent)] pt-5">
        <div>
          <div className="font-mono text-[11px] font-bold text-[var(--ag-accent)] uppercase">
            01 · BROWSER EXTENSION
          </div>
          <h2 className="mt-1 text-lg leading-[1.35] font-extrabold text-[#141413]">
            {isZh
              ? '傻瓜式 3 步安装 Chrome 浏览器插件（最推荐）'
              : 'Chrome MV3 Live Element Picker (3-Step Local Setup)'}
          </h2>
          <p className="mt-1 text-xs leading-[1.6] text-[var(--ag-text-secondary)]">
            {isZh
              ? '兼容 Chrome / Edge / Arc 等所有 Chromium 内核浏览器，内置中英双语界面与 30 秒练习靶场。'
              : 'Works on Chrome, Edge, Arc & Brave — includes built-in 30s interactive practice arena.'}
          </p>
        </div>

        <ol className="divide-y divide-[var(--ag-border)] overflow-hidden rounded-[8px] border border-[var(--ag-border)] bg-white text-[13px] leading-[1.65]">
          <li className="p-4">
            <div className="font-bold text-[#141413]">
              {isZh ? '第 1 步：确认插件构建目录已生成' : 'Step 1 · Build the extension directory'}
            </div>
            <p className="mt-1 text-[var(--ag-text-secondary)]">
              {isZh ? (
                <>
                  项目内的{' '}
                  <code className="rounded-[4px] bg-[var(--ag-bg-subtle)] px-1.5 py-0.5 font-mono text-xs text-[#141413]">
                    apps/extension/dist
                  </code>{' '}
                  文件夹就是打包好的插件目录（首次拉取代码可在根目录运行{' '}
                  <code className="rounded-[4px] bg-[var(--ag-bg-subtle)] px-1.5 py-0.5 font-mono text-xs text-[#141413]">
                    pnpm build
                  </code>{' '}
                  生成）。
                </>
              ) : (
                <>
                  Run{' '}
                  <code className="rounded-[4px] bg-[var(--ag-bg-subtle)] px-1.5 py-0.5 font-mono text-xs text-[#141413]">
                    pnpm build
                  </code>{' '}
                  at the repo root to generate{' '}
                  <code className="rounded-[4px] bg-[var(--ag-bg-subtle)] px-1.5 py-0.5 font-mono text-xs text-[#141413]">
                    apps/extension/dist
                  </code>
                  .
                </>
              )}
            </p>
          </li>

          <li className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-[#141413]">
                {isZh
                  ? '第 2 步：打开扩展管理页并开启「开发者模式」'
                  : 'Step 2 · Open chrome://extensions & enable Developer mode'}
              </span>
              <button
                type="button"
                onClick={handleCopyChromeUrl}
                className="inline-flex items-center gap-1 rounded-[5px] border border-[var(--ag-border-strong)] bg-[var(--ag-bg-canvas)] px-2.5 py-1 text-[11px] font-semibold text-[#141413] transition hover:bg-[var(--ag-bg-subtle)]"
              >
                {copiedExtUrl ? (
                  <Check className="h-3 w-3 text-[var(--ag-success)]" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
                <span>{isZh ? '复制地址' : 'Copy URL'}</span>
              </button>
            </div>
            <p className="mt-1 text-[var(--ag-text-secondary)]">
              {isZh ? (
                <>
                  在浏览器地址栏输入{' '}
                  <code className="rounded-[4px] bg-[var(--ag-bg-subtle)] px-1.5 py-0.5 font-mono text-xs text-[#141413]">
                    chrome://extensions
                  </code>{' '}
                  回车，打开右上角的<strong>「开发者模式 (Developer mode)」</strong>开关。
                </>
              ) : (
                <>
                  Visit{' '}
                  <code className="rounded-[4px] bg-[var(--ag-bg-subtle)] px-1.5 py-0.5 font-mono text-xs text-[#141413]">
                    chrome://extensions
                  </code>{' '}
                  and toggle <strong>Developer mode</strong> ON in the top-right corner.
                </>
              )}
            </p>
          </li>

          <li className="p-4">
            <div className="font-bold text-[#141413]">
              {isZh
                ? '第 3 步：点击「加载已解压的扩展程序」选中 dist 目录'
                : 'Step 3 · Click "Load unpacked" & select apps/extension/dist'}
            </div>
            <p className="mt-1 text-[var(--ag-text-secondary)]">
              {isZh ? (
                <>
                  点击左上角<strong>「加载已解压的扩展程序」</strong>，选择{' '}
                  <code className="rounded-[4px] bg-[var(--ag-bg-subtle)] px-1.5 py-0.5 font-mono text-xs text-[#141413]">
                    apps/extension/dist
                  </code>{' '}
                  即可。装好后点击右上角插件图标里的「30 秒练习靶场」即可立刻体验点选。
                </>
              ) : (
                <>
                  Click <strong>Load unpacked</strong> and choose{' '}
                  <code className="rounded-[4px] bg-[var(--ag-bg-subtle)] px-1.5 py-0.5 font-mono text-xs text-[#141413]">
                    apps/extension/dist
                  </code>
                  . Open the popup and launch the 30s Practice Arena to try it live.
                </>
              )}
            </p>
          </li>
        </ol>
      </div>

      {/* 2. MCP Server Setup — Open Archival Layout */}
      <div className="space-y-4 border-t-2 border-[#141413] pt-5">
        <div>
          <div className="font-mono text-[11px] font-bold text-[#141413] uppercase">
            02 · STDIO MCP SERVER
          </div>
          <h2 className="mt-1 text-lg leading-[1.35] font-extrabold text-[#141413]">
            {isZh
              ? '把 AnyGrab MCP 装进反重力 / Codex（全自动抓网页）'
              : 'Connect Stdio MCP Server (@anygrab/mcp)'}
          </h2>
          <p className="mt-1 text-xs leading-[1.6] text-[var(--ag-text-secondary)]">
            {isZh
              ? '配置一次后，在聊天框直接发公开网址即可让 AI 自动抓取页面结构与设计色板。'
              : 'Give Antigravity, Codex, Cursor, or Claude Code native URL & design-token distillation tools.'}
          </p>
        </div>

        <div
          className="inline-flex flex-wrap gap-1 rounded-[8px] border border-[var(--ag-border)] bg-[var(--ag-bg-subtle)] p-0.5"
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
              className={`rounded-[5px] px-3 py-1.5 text-xs font-semibold transition ${
                mcpClient === key
                  ? 'bg-white text-[#141413] shadow-[0_1px_2px_rgba(20,20,19,0.08)]'
                  : 'text-[var(--ag-text-secondary)] hover:text-[#141413]'
              }`}
            >
              {MCP_CONFIGS[key].label}
            </button>
          ))}
        </div>

        <p className="text-xs leading-[1.6] text-[var(--ag-text-secondary)]">
          {isZh ? activeMcp.whereHintZh : activeMcp.whereHintEn}
        </p>

        <CopyCodeBlock
          code={activeMcp.snippet}
          label={isZh ? activeMcp.configPathZh : activeMcp.configPathEn}
          isZh={isZh}
        />

        <div className="grid gap-3 border-t border-[var(--ag-border)] pt-3 sm:grid-cols-3">
          <div>
            <code className="font-mono text-xs font-bold text-[#141413]">grab_url</code>
            <p className="mt-0.5 text-[11.5px] leading-[1.55] text-[var(--ag-text-secondary)]">
              {isZh ? '抓取公开网址并自动提纯' : 'Fetches public URL & distills.'}
            </p>
          </div>
          <div>
            <code className="font-mono text-xs font-bold text-[#141413]">grab_html</code>
            <p className="mt-0.5 text-[11.5px] leading-[1.55] text-[var(--ag-text-secondary)]">
              {isZh ? '清洗原始 HTML 为组件代码' : 'Cleans raw HTML into JSX/GFM.'}
            </p>
          </div>
          <div>
            <code className="font-mono text-xs font-bold text-[#141413]">
              extract_design_tokens
            </code>
            <p className="mt-0.5 text-[11.5px] leading-[1.55] text-[var(--ag-text-secondary)]">
              {isZh ? '提取网站色板、字体与圆角' : 'Extracts colors, fonts & radii.'}
            </p>
          </div>
        </div>
      </div>

      {/* 3. CLI Examples */}
      <div className="space-y-4 border-t border-[var(--ag-border-strong)] pt-6">
        <div>
          <div className="font-mono text-[11px] font-bold text-[var(--ag-text-muted)] uppercase">
            03 · COMMAND LINE
          </div>
          <h2 className="mt-1 text-base font-bold text-[#141413]">
            {isZh ? '终端命令行用法 (npx anygrab)' : 'CLI Workflows (npx anygrab)'}
          </h2>
          <p className="mt-0.5 text-xs leading-[1.6] text-[var(--ag-text-secondary)]">
            {isZh
              ? '免安装直接在终端抓取网页并导出文件或送入系统剪贴板。'
              : 'Pipe clean UI structures, complex tables, or tokens directly into terminal agents.'}
          </p>
        </div>
        <CopyCodeBlock
          code={isZh ? CLI_SNIPPET_ZH : CLI_SNIPPET_EN}
          label="Terminal · bash / zsh"
          isZh={isZh}
        />
      </div>

      {/* 4. @anygrab/core TypeScript SDK */}
      <div className="space-y-4 border-t border-[var(--ag-border-strong)] pt-6">
        <div>
          <div className="font-mono text-[11px] font-bold text-[var(--ag-text-muted)] uppercase">
            04 · TYPESCRIPT SDK
          </div>
          <h2 className="mt-1 text-base font-bold text-[#141413]">
            {isZh ? '开发者代码集成 (@anygrab/core)' : 'Zero-Dependency @anygrab/core SDK'}
          </h2>
          <p className="mt-0.5 text-xs leading-[1.6] text-[var(--ag-text-secondary)]">
            {isZh
              ? '零运行时依赖，可嵌入爬虫、Playwright 自动化脚本或自定义 AI Agent。'
              : 'Embed sub-5ms DOM distillation inside Browser-Use agents, Playwright scripts, or crawlers.'}
          </p>
        </div>
        <CopyCodeBlock code={SDK_SNIPPET} label="TypeScript · @anygrab/core" isZh={isZh} />
      </div>
    </section>
  );
}
