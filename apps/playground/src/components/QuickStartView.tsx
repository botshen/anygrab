import { Check, Code2, Copy, Cpu, Globe, Plug, Sparkles, Terminal } from 'lucide-react';
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

const CLI_SNIPPET_ZH = `# 1. 抓取任意公开网页并直接复制到 Mac 剪贴板（限制 1200 字数上限）
npx anygrab https://ui.shadcn.com/pricing --budget 1200 | pbcopy

# 2. 只扒取网页主内容区，直接转成 React 组件代码保存成文件
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

console.log(result.output);              // Ready-to-paste Chinese/English AI prompt
console.log(result.designTokens.colors); // ['#6366f1', '#0f172a', ...]`;

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
              <span>{isZh ? '已复制' : 'Copied'}</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>{isZh ? '一键复制' : 'Copy'}</span>
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
    <section aria-label="Quick Start and MCP Setup" className="grid gap-6 lg:grid-cols-2">
      {/* 1. Super Foolproof Chrome Extension 3-Step Visual Guide */}
      <div className="space-y-4 rounded-2xl border-2 border-emerald-500/35 bg-zinc-900/70 p-5 sm:p-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300">
            <Globe className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white sm:text-lg">
              {isZh
                ? '1. 傻瓜式 3 步安装 Chrome 浏览器插件（最推荐！）'
                : '1. Chrome MV3 Live Element Picker (3-Step Local Setup)'}
            </h2>
            <p className="text-xs text-zinc-400">
              {isZh
                ? '支持 Chrome / Edge / Arc / 豆包 / 夸克等所有 Chromium 内核浏览器，自带中文界面与新手练习靶场！'
                : 'Works on Chrome, Edge, Arc & Brave — includes built-in interactive 30s practice range!'}
            </p>
          </div>
        </div>

        <ol className="space-y-3 text-xs">
          <li className="rounded-xl border border-white/[0.07] bg-zinc-950/85 p-4">
            <div className="font-bold text-white">
              {isZh
                ? '第 ① 步：确认插件文件夹已生成'
                : 'Step 1 · Locate the pre-built extension folder'}
            </div>
            <p className="mt-1.5 leading-relaxed text-zinc-300">
              {isZh ? (
                <>
                  项目里的{' '}
                  <code className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-emerald-300">
                    apps/extension/dist
                  </code>{' '}
                  目录就是打包好的插件文件夹！（如果你刚拉下代码，在根目录跑一次{' '}
                  <code className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-indigo-300">
                    pnpm build
                  </code>{' '}
                  即可生成）。
                </>
              ) : (
                <>
                  Run{' '}
                  <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-indigo-300">
                    pnpm build
                  </code>{' '}
                  at the repo root to build{' '}
                  <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-200">
                    apps/extension/dist
                  </code>
                  .
                </>
              )}
            </p>
          </li>

          <li className="rounded-xl border border-white/[0.07] bg-zinc-950/85 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-white">
                {isZh
                  ? '第 ② 步：打开浏览器扩展管理页，开启「开发者模式」'
                  : 'Step 2 · Open chrome://extensions & enable Developer mode'}
              </span>
              <button
                type="button"
                onClick={handleCopyChromeUrl}
                className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-300 transition hover:bg-emerald-600 hover:text-white"
              >
                {copiedExtUrl ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                <span>{isZh ? '复制 chrome://extensions' : 'Copy URL'}</span>
              </button>
            </div>
            <p className="mt-1.5 leading-relaxed text-zinc-300">
              {isZh ? (
                <>
                  新建一个浏览器标签页，在地址栏粘贴{' '}
                  <code className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-emerald-300">
                    chrome://extensions
                  </code>{' '}
                  并回车，然后把页面<strong>右上角的「开发者模式 (Developer mode)」开关打开</strong>。
                </>
              ) : (
                <>
                  Navigate to{' '}
                  <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-emerald-300">
                    chrome://extensions
                  </code>{' '}
                  and toggle <strong>Developer mode</strong> ON in the top-right corner.
                </>
              )}
            </p>
          </li>

          <li className="rounded-xl border border-white/[0.07] bg-zinc-950/85 p-4">
            <div className="font-bold text-white">
              {isZh
                ? '第 ③ 步：点击「加载已解压的扩展程序」选中 dist 文件夹！'
                : 'Step 3 · Click "Load unpacked" & select apps/extension/dist'}
            </div>
            <p className="mt-1.5 leading-relaxed text-zinc-300">
              {isZh ? (
                <>
                  点击页面左上角出现的<strong>「加载已解压的扩展程序 (Load unpacked)」</strong>按钮，在弹窗里选中{' '}
                  <code className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-zinc-100">
                    apps/extension/dist
                  </code>{' '}
                  文件夹就装好啦！
                </>
              ) : (
                <>
                  Click <strong>Load unpacked</strong> in the top-left and choose{' '}
                  <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-100">
                    apps/extension/dist
                  </code>
                  . Press <kbd className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono">Alt+Shift+G</kbd> on any page to start grabbing!
                </>
              )}
            </p>
            <div className="mt-2.5 flex items-center gap-1.5 rounded-lg border border-indigo-500/25 bg-indigo-950/40 px-3 py-2 text-[11px] text-indigo-200">
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
              <span>
                {isZh
                  ? '新手福利：装好后点开浏览器右上角插件图标，点击【📘 怎么用？30 秒练习靶场】就能边看边练！'
                  : 'Pro Tip: Open the extension popup and click "30s Interactive Guide & Practice Range" to test it hands-on!'}
              </span>
            </div>
          </li>
        </ol>
      </div>

      {/* 2. MCP Server Setup */}
      <div className="space-y-4 rounded-2xl border border-indigo-500/25 bg-zinc-900/65 p-5 sm:p-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300">
            <Plug className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-white sm:text-lg">
              {isZh
                ? '2. 把 AnyGrab MCP 装进反重力 / Codex（全自动扒网页）'
                : '2. Connect Stdio MCP Server (@anygrab/mcp)'}
            </h2>
            <p className="text-xs text-zinc-400">
              {isZh
                ? '配置一次后，在聊天框直接发网址就能让 AI 自己去抓取网页与提取色板！'
                : 'Give Antigravity, Codex, Cursor, or Claude Code native URL & design-token distillation tools.'}
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

        <p className="text-xs text-zinc-300">
          {isZh ? activeMcp.whereHintZh : activeMcp.whereHintEn}
        </p>

        <CopyCodeBlock
          code={activeMcp.snippet}
          label={isZh ? activeMcp.configPathZh : activeMcp.configPathEn}
          isZh={isZh}
        />

        <div className="grid gap-2 pt-1 sm:grid-cols-3">
          <div className="rounded-xl border border-white/[0.06] bg-zinc-950/80 p-3">
            <code className="font-mono text-xs font-bold text-indigo-300">grab_url</code>
            <p className="mt-1 text-[11px] text-zinc-400">
              {isZh
                ? '自动下载公开网址 + 外部样式表并提纯给 AI'
                : 'Fetches public URL + inlines external CSS & distills.'}
            </p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-zinc-950/80 p-3">
            <code className="font-mono text-xs font-bold text-violet-300">grab_html</code>
            <p className="mt-1 text-[11px] text-zinc-400">
              {isZh
                ? '直接把杂乱 HTML 代码清洗成干净组件'
                : 'Distills raw HTML + <style> into Prompt, JSX, or GFM.'}
            </p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-zinc-950/80 p-3">
            <code className="font-mono text-xs font-bold text-emerald-300">
              extract_design_tokens
            </code>
            <p className="mt-1 text-[11px] text-zinc-400">
              {isZh
                ? '一键提取目标网站配色色板、字体与圆角'
                : 'Extracts deduplicated colors, fonts, radii & shadows.'}
            </p>
          </div>
        </div>
      </div>

      {/* 3. CLI Examples */}
      <div className="space-y-4 rounded-2xl border border-white/[0.08] bg-zinc-900/65 p-5 sm:p-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300">
            <Terminal className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">
              {isZh ? '3. 终端命令行用法 (npx anygrab)' : '3. CLI Workflows (npx anygrab)'}
            </h2>
            <p className="text-xs text-zinc-400">
              {isZh
                ? '免安装直接在终端里抓取网页并导出成文件或塞进剪贴板'
                : 'Pipe clean UI structures, complex tables, or tokens directly into terminal agents.'}
            </p>
          </div>
        </div>
        <CopyCodeBlock
          code={isZh ? CLI_SNIPPET_ZH : CLI_SNIPPET_EN}
          label="Terminal · bash / zsh"
          isZh={isZh}
        />
      </div>

      {/* 4. @anygrab/core TypeScript SDK */}
      <div className="space-y-4 rounded-2xl border border-white/[0.08] bg-zinc-900/65 p-5 sm:p-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/20 text-violet-300">
            <Code2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">
              {isZh
                ? '4. 开发者代码集成 (@anygrab/core SDK)'
                : '4. Zero-Dependency @anygrab/core SDK'}
            </h2>
            <p className="text-xs text-zinc-400">
              {isZh
                ? '零第三方依赖，可嵌入你自己的爬虫、自动化脚本或 AI Agent 项目'
                : 'Embed sub-5ms DOM distillation inside Browser-Use agents, Playwright scripts, or RAG crawlers.'}
            </p>
          </div>
        </div>
        <CopyCodeBlock code={SDK_SNIPPET} label="TypeScript · @anygrab/core" isZh={isZh} />
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <Cpu className="h-4 w-4 text-indigo-400" />
          <span>
            {isZh
              ? '100% 纯本地运行 · 0 运行时依赖 · 支持 locale: "zh-CN" | "en" 双语输出'
              : '100% pure ESM + CJS bundle · Zero runtime npm dependencies · Built-in bilingual prompt output.'}
          </span>
        </div>
      </div>
    </section>
  );
}
