import {
  ArrowRight,
  Check,
  CheckCircle2,
  ClipboardPaste,
  Copy,
  Download,
  MousePointerClick,
  Sparkles,
  Terminal,
  Wand2,
  XCircle,
  Zap,
} from 'lucide-react';
import { useState } from 'react';
import type { ActiveTab } from '../data/types';
import type { SiteLocale } from '../i18n';

interface OverviewViewProps {
  locale: SiteLocale;
  onNavigate: (tab: ActiveTab) => void;
}

const CLI_CMD = 'npx anygrab https://ui.shadcn.com --budget 1200';

export function OverviewView({ locale, onNavigate }: OverviewViewProps) {
  const isZh = locale === 'zh-CN';
  const [copiedCli, setCopiedCli] = useState(false);

  const handleCopyCli = () => {
    try {
      void navigator.clipboard?.writeText(CLI_CMD)?.catch(() => {});
    } catch {
      // Ignore in headless environments
    }
    setCopiedCli(true);
    setTimeout(() => setCopiedCli(false), 1800);
  };

  return (
    <section aria-label="Product Overview" className="space-y-12 py-4">
      {/* 1. High-Impact Plain-Language Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-indigo-500/25 bg-gradient-to-b from-indigo-950/35 via-zinc-900/75 to-zinc-950 px-6 py-10 text-center shadow-2xl sm:px-12 sm:py-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -top-28 mx-auto h-64 max-w-3xl rounded-full bg-gradient-to-r from-indigo-500/25 via-violet-500/20 to-emerald-500/15 blur-3xl"
        />

        <div className="relative z-10 mx-auto max-w-4xl space-y-5">
          <div className="inline-flex flex-wrap items-center justify-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-950/70 px-4 py-1.5 text-xs font-semibold text-indigo-200">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            <span>
              {isZh
                ? '专为 反重力 (Antigravity) · Codex · Cursor · Claude Code 打造 · 100% 免费开源 MIT'
                : 'Built for Antigravity · Codex · Cursor · Claude Code · 100% Free MIT Open Source'}
            </span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl lg:leading-[1.18]">
            {isZh ? (
              <>
                看到任何网站好看的界面或复杂表格，
                <br className="hidden sm:inline" />
                <span className="bg-gradient-to-r from-indigo-400 via-violet-300 to-emerald-300 bg-clip-text text-transparent">
                  点一下就能喂给 AI 1:1 复刻！
                </span>
              </>
            ) : (
              <>
                See a great UI or complex table on ANY website?{' '}
                <span className="bg-gradient-to-r from-indigo-400 via-violet-300 to-emerald-300 bg-clip-text text-transparent">
                  Grab it in 1 click for Coding Agents!
                </span>
              </>
            )}
          </h1>

          <p className="mx-auto max-w-2xl text-sm leading-relaxed text-zinc-300 sm:text-base">
            {isZh
              ? '不用再发模糊截图让 AI 瞎猜色号，也不用按 F12 复制几万行乱码把聊天框塞爆！AnyGrab 在本地 0.004 秒内自动剔除 90% 网页垃圾代码，提纯出精准配色、干净 Tailwind 样式与完整合并表格——不连外网、无需 API Key、完全免费。'
              : 'Stop sending blurry screenshots that force AI to guess colors, or pasting 50,000 lines of DevTools DOM bloat! AnyGrab distills live webpages locally in 4ms into clean Tailwind v4 styles, palettes, and intact merged tables — 0 LLM calls, $0 cost.'}
          </p>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => onNavigate('quickstart')}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 transition hover:from-indigo-500 hover:to-violet-500"
            >
              <Download className="h-4 w-4" />
              <span>{isZh ? '30 秒安装 Chrome 插件' : 'Install Chrome Extension (30s)'}</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('workflows')}
              className="inline-flex items-center gap-2 rounded-xl border border-indigo-400/40 bg-indigo-500/15 px-5 py-3 text-sm font-bold text-indigo-200 transition hover:bg-indigo-500/25"
            >
              <Wand2 className="h-4 w-4 text-indigo-300" />
              <span>
                {isZh
                  ? '看怎么配合反重力 / Codex 用'
                  : 'How to Use with Antigravity & Codex'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('playground')}
              className="inline-flex items-center gap-2 rounded-xl border border-white/[0.12] bg-zinc-900/90 px-5 py-3 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-800"
            >
              <Sparkles className="h-4 w-4 text-emerald-400" />
              <span>{isZh ? '免安装在线试玩' : 'Try Live Playground'}</span>
            </button>
          </div>

          {/* Quick CLI One-Liner */}
          <div className="mx-auto mt-4 inline-flex max-w-full items-center gap-2.5 rounded-xl border border-white/[0.1] bg-zinc-950/90 px-4 py-2 text-left">
            <Terminal className="h-4 w-4 shrink-0 text-indigo-400" />
            <code className="truncate font-mono text-xs text-zinc-200 sm:text-sm">{CLI_CMD}</code>
            <button
              type="button"
              onClick={handleCopyCli}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-white/[0.08] bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-200 transition hover:bg-indigo-600 hover:text-white"
            >
              {copiedCli ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span>{isZh ? '已复制' : 'Copied'}</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>{isZh ? '复制命令' : 'Copy'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 2. Core Pain-Point Visual Comparison (3 Cards) */}
      <div className="space-y-4">
        <div className="text-center">
          <h2 className="text-xl font-extrabold text-white sm:text-2xl">
            {isZh
              ? '为什么以前让 AI 抄网页总是「又慢又不像」？'
              : 'Why Traditional UI Cloning Workflows Fail Coding Agents'}
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            {isZh
              ? '对比三种把参考网页喂给 AI 编程工具的真实表现'
              : 'Comparing 3 ways developers feed reference webpages into AI Coding IDEs'}
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {/* Bad 1: Screenshot */}
          <div className="rounded-2xl border border-rose-500/20 bg-zinc-900/65 p-6">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 px-3 py-1 text-xs font-bold text-rose-300">
                <XCircle className="h-3.5 w-3.5" />
                {isZh ? '传统痛点 ① · 发截图' : 'Old Way 1 · Screenshots'}
              </span>
              <span className="font-mono text-xs text-rose-400">
                {isZh ? '还原度 ~50%' : '~50% Accuracy'}
              </span>
            </div>
            <h3 className="mt-4 text-base font-bold text-white">
              {isZh ? '发截图让 AI 凭肉眼「瞎猜」' : 'Screenshots Force AI to Guess'}
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-zinc-400">
              {isZh
                ? '图片里没有精确字号、间距数值和色号，鼠标放上去的悬停变色也截不到；遇到跨行跨列的复杂报表更是经常串行漏列，来回改五遍还是歪的。'
                : 'Pixels lack exact spacing scales, hex codes, and :hover states. Complex multi-header tables frequently misalign or hallucinate numbers.'}
            </p>
          </div>

          {/* Bad 2: Raw DevTools F12 */}
          <div className="rounded-2xl border border-amber-500/20 bg-zinc-900/65 p-6">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-300">
                <XCircle className="h-3.5 w-3.5" />
                {isZh ? '传统痛点 ② · F12 扒源码' : 'Old Way 2 · Raw DevTools HTML'}
              </span>
              <span className="font-mono text-xs text-amber-400">
                {isZh ? '体积暴涨 +280%' : '+280% Token Bloat'}
              </span>
            </div>
            <h3 className="mt-4 text-base font-bold text-white">
              {isZh ? '复制几万行垃圾代码塞爆对话框' : 'Raw DOM Floods Context Quota'}
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-zinc-400">
              {isZh
                ? '现代网站塞满了 css-19x82a 乱码类名、几百行图标路径和二十层空壳 div。直接粘贴不仅瞬间烧光反重力 / Codex 额度，还会让 AI 注意力涣散报错。'
                : 'Modern pages carry thousands of CSS-in-JS hashes, giant SVG path strings, and 20-layer wrapper soup — burning quota and confusing LLMs.'}
            </p>
          </div>

          {/* Good: AnyGrab */}
          <div className="rounded-2xl border-2 border-indigo-500/60 bg-gradient-to-b from-indigo-950/40 to-zinc-900/80 p-6 shadow-lg shadow-indigo-500/10">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {isZh ? 'AnyGrab 方案 · 0.004 秒提纯' : 'AnyGrab · 4ms Distillation'}
              </span>
              <span className="font-mono text-xs font-bold text-emerald-300">
                {isZh ? '99.6 分满分还原' : '99.6/100 Fidelity'}
              </span>
            </div>
            <h3 className="mt-4 text-base font-bold text-white">
              {isZh
                ? '砍掉 85%~96% 废话，保留 100% 精华！'
                : 'Strip 85%–96% Noise, Keep 100% UI Signal!'}
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-zinc-300">
              {isZh
                ? '自动把网页真实外观逆向翻译成干净的 Tailwind 代码 + 设计色板 + 完整合并表格，自带中文复刻提示词，粘进反重力或 Codex 一次成型！'
                : 'Deterministically compiles real CSS into clean Tailwind v4 classes, extracts Design Tokens, and keeps rowspan/colspan tables 100% intact.'}
            </p>
          </div>
        </div>
      </div>

      {/* 3. One-Minute 3-Step Visual Workflow Diagram */}
      <div className="rounded-3xl border border-white/[0.08] bg-zinc-900/55 p-6 sm:p-8">
        <div className="mb-8 text-center">
          <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300">
            {isZh ? '小白 1 分钟上手流程' : '1-Minute Visual Workflow'}
          </span>
          <h2 className="mt-3 text-xl font-extrabold text-white sm:text-2xl">
            {isZh
              ? '只需三步：网页点一下 → 粘进反重力 / Codex → 1:1 完美还原'
              : 'Three Simple Steps: Click Element → Paste into AI → 1:1 Pixel-Accurate UI'}
          </h2>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Step 1 */}
          <div className="relative flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-zinc-950/85 p-5">
            <div>
              <div className="flex items-center justify-between">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 font-mono text-sm font-extrabold text-white">
                  1
                </span>
                <MousePointerClick className="h-5 w-5 text-indigo-400" />
              </div>
              <h3 className="mt-4 text-base font-bold text-white">
                {isZh
                  ? '第 1 步：在任意网页点选你要的组件'
                  : 'Step 1: Point & Click Any Webpage Block'}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                {isZh
                  ? '按下快捷键 Alt+Shift+G 开启紫蓝取景框。鼠标指到按钮、定价卡或大表格上（按 ↑ 键可扩大选中整张卡片），左键轻轻一点即自动提纯并复制！'
                  : 'Press Alt+Shift+G on any webpage. Hover over any button, card, or table (press ↑ to expand to parent container) and click once to copy.'}
              </p>
            </div>
            <div className="mt-4 rounded-xl border border-indigo-500/30 bg-indigo-950/30 p-3 font-mono text-[11px] text-indigo-200">
              {isZh
                ? '🎯 紫蓝选框实时显示：尺寸 + 预计字数，默认选好「AI 复刻指令」'
                : '🎯 Live HUD shows dimensions + token count in real time'}
            </div>
          </div>

          {/* Step 2 */}
          <div className="relative flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-zinc-950/85 p-5">
            <div>
              <div className="flex items-center justify-between">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 font-mono text-sm font-extrabold text-white">
                  2
                </span>
                <ClipboardPaste className="h-5 w-5 text-violet-400" />
              </div>
              <h3 className="mt-4 text-base font-bold text-white">
                {isZh
                  ? '第 2 步：切到【反重力 / Codex】直接粘贴'
                  : 'Step 2: Paste Straight into Antigravity / Codex'}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                {isZh
                  ? '完全不用自己想提示词！你复制出来的内容顶部已经自带写好的中文指令（「请 1:1 视觉与布局还原以下组件…」）+ 色板 + 干净代码，直接按 Cmd+V 回车！'
                  : 'Zero prompt engineering needed! Your clipboard already holds a structured instruction header + Design Tokens + clean markup. Just hit Cmd+V + Enter!'}
              </p>
            </div>
            <div className="mt-4 rounded-xl border border-violet-500/30 bg-violet-950/30 p-3 font-mono text-[11px] text-violet-200">
              {isZh
                ? '💡 支持：反重力 Antigravity · Codex · Cursor · Claude Code'
                : '💡 Works with Antigravity, Codex, Cursor & Claude Code'}
            </div>
          </div>

          {/* Step 3 */}
          <div className="relative flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-zinc-950/85 p-5">
            <div>
              <div className="flex items-center justify-between">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 font-mono text-sm font-extrabold text-white">
                  3
                </span>
                <Zap className="h-5 w-5 text-emerald-400" />
              </div>
              <h3 className="mt-4 text-base font-bold text-white">
                {isZh
                  ? '第 3 步：AI 一次输出可运行的漂亮代码！'
                  : 'Step 3: Get Production-Ready Code on First Try!'}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                {isZh
                  ? '因为喂给 AI 的是 100% 准确的 Tailwind 类名和真实色号，AI 不会再胡编乱造，一次性生成可直接放进 React / Vue / HTML 项目的同款界面！'
                  : 'Because the agent receives exact Tailwind v4 utilities, hex tokens, and colspan/rowspan structure, it nails the UI in a single turn.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('workflows')}
              className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-600/20 px-3 py-2.5 text-xs font-bold text-emerald-300 border border-emerald-500/30 transition hover:bg-emerald-600 hover:text-white"
            >
              <span>
                {isZh
                  ? '查看 3 种配合反重力 & Codex 的进阶玩法'
                  : 'Explore 3 Step-by-Step AI Workflows'}
              </span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
