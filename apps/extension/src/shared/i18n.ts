import type { OutputFormat } from '@anygrab/core';
import type { ExtensionLocale } from './types';

/**
 * Automatically detects user's preferred language from browser `navigator.language`.
 * Matches `zh`, `zh-CN`, `zh-TW`, `zh-HK`, `zh-Hans` -> `'zh-CN'`, everything else -> `'en'`.
 */
export function detectDefaultLocale(rawNavigatorLanguage?: string): ExtensionLocale {
  const lang =
    rawNavigatorLanguage ??
    (typeof globalThis !== 'undefined' && globalThis.navigator?.language
      ? globalThis.navigator.language
      : 'en');

  return /^zh\b/i.test(lang.trim()) ? 'zh-CN' : 'en';
}

export function toggleLocale(locale: ExtensionLocale): ExtensionLocale {
  return locale === 'zh-CN' ? 'en' : 'zh-CN';
}

export interface FormatCopyDescriptor {
  shortTab: string;
  fullTitle: string;
  subtitle: string;
  hudLabel: string;
  badge?: string;
}

export interface ExtensionI18nBundle {
  localeSwitchLabel: string;
  localeSwitchTitle: string;
  taglinePill: string;
  openGuideBtn: string;
  openWebsiteBtn: string;
  websiteConfigLabel: string;
  websiteSaveBtn: string;
  pickCtaTitle: string;
  pickCtaSub: string;
  restrictedTabError: string;
  formatSectionTitle: string;
  formats: Record<OutputFormat, FormatCopyDescriptor>;
  budgetSectionTitle: string;
  budgetUnlimitedLabel: string;
  formatBudgetValue: (maxTokens: number, unlimited: boolean) => string;
  compactSvgTitle: string;
  compactSvgSub: string;
  includeHoverTitle: string;
  includeHoverSub: string;
  historySectionTitle: string;
  historyClearBtn: string;
  historyCopyBtn: string;
  historyCopiedBtn: string;
  historyEmptyHtml: string;
  formatRelativeTime: (timestamp: number) => string;
  hudHints: {
    click: string;
    arrows: string;
    tab: string;
    esc: string;
  };
  formatHudBudget: (maxTokens: number, unlimited: boolean) => string;
  guide: {
    pageTitle: string;
    navBadge: string;
    heroBadge: string;
    heroTitle: string;
    heroSubtitle: string;
    startPickerCta: string;
    openWebsiteBtn: string;
    stepsSectionTitle: string;
    step1Title: string;
    step1Desc: string;
    step2Title: string;
    step2Desc: string;
    step3Title: string;
    step3Desc: string;
    promptsTitle: string;
    promptsHint: string;
    promptTemplates: Array<{ label: string; text: string }>;
    copyPromptBtn: string;
    copiedPromptBtn: string;
    arenaTitle: string;
    arenaSubtitle: string;
    arenaStartBtn: string;
    arenaIdleBanner: string;
    arenaSuccessTitle: string;
    arenaSuccessNextStep: string;
    target1Badge: string;
    target1Label: string;
    target1Tip: string;
    target2Badge: string;
    target2Label: string;
    target2Tip: string;
  };
}

const ZH_CN: ExtensionI18nBundle = {
  localeSwitchLabel: '中文 / EN',
  localeSwitchTitle: '切换为英文界面 (Switch to English)',
  taglinePill: '本地秒提纯 · 省 95% 额度',
  openGuideBtn: '📘 怎么用？30 秒练习靶场',
  openWebsiteBtn: '🌐 打开官方网站',
  websiteConfigLabel: '官网地址（本地或线上 URL）：',
  websiteSaveBtn: '保存',
  pickCtaTitle: '去当前网页点选元素',
  pickCtaSub: '点选后直接去反重力 / Codex 粘贴即可 1:1 复刻',
  restrictedTabError:
    '当前是浏览器系统设置页，无法点选。请先切到任意普通网页，或点击上方「📘 30 秒练习靶场」当场试玩！',
  formatSectionTitle: '复制出来给谁用？（点选切换）',
  formats: {
    prompt: {
      shortTab: 'AI 复刻指令',
      fullTitle: 'AI 复刻指令 (Prompt)',
      subtitle: '推荐！自带中文指令，复制后去反重力 / Codex 直接粘贴回车即可 1:1 画出来',
      hudLabel: '✨ AI 复刻指令',
      badge: '新手推荐',
    },
    jsx: {
      shortTab: 'React 组件',
      fullTitle: 'React 组件 (JSX)',
      subtitle: '适合直接放进 React / Next.js 项目中使用',
      hudLabel: 'React 组件 (JSX)',
    },
    'tailwind-html': {
      shortTab: 'Tailwind 网页',
      fullTitle: 'Tailwind 网页 (HTML)',
      subtitle: '干净的 HTML + Tailwind 样式代码，任何前端项目都能直接改',
      hudLabel: 'Tailwind 网页',
    },
    markdown: {
      shortTab: '文档与表格',
      fullTitle: '纯净文档表格 (Markdown)',
      subtitle: '完整保留跨行跨列合并表格与代码块，适合喂资料给 AI 分析',
      hudLabel: '文档表格 (MD)',
    },
  },
  budgetSectionTitle: '内容长度上限（防撑爆 AI 对话框）',
  budgetUnlimitedLabel: '不限长度',
  formatBudgetValue: (maxTokens, unlimited) =>
    unlimited ? '不限长度' : `最多 ${maxTokens.toLocaleString('en-US')} 词元`,
  compactSvgTitle: '自动精简图标',
  compactSvgSub: '把几百行乱码图标缩成一行',
  includeHoverTitle: '保留悬停变色 (:hover)',
  includeHoverSub: '连鼠标放上去的变色效果一起抓',
  historySectionTitle: '最近抓过的组件',
  historyClearBtn: '清空',
  historyCopyBtn: '再复制',
  historyCopiedBtn: '已复制 ✓',
  historyEmptyHtml:
    '还没有抓取记录。点击上方 <strong>「📘 怎么用？30 秒练习靶场」</strong> 立刻动手试一下吧！',
  formatRelativeTime: (timestamp) => {
    const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
    if (diffSec < 15) return '刚刚';
    if (diffSec < 60) return `${diffSec} 秒前`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} 分钟前`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr} 小时前`;
    return `${Math.floor(diffHr / 24)} 天前`;
  },
  hudHints: {
    click: '左键点击：复制给 AI',
    arrows: '↑/↓ 键：扩大/缩小选框',
    tab: 'Tab 键：切换格式',
    esc: 'Esc：退出',
  },
  formatHudBudget: (maxTokens, unlimited) =>
    unlimited ? '∞ 不限长度' : `≤${maxTokens.toLocaleString('en-US')} 词元`,
  guide: {
    pageTitle: 'AnyGrab — 30 秒新手实战教程 & 现场点选练习靶场',
    navBadge: '30 秒包教包会 · 零代码基础也能用',
    heroBadge: '✨ 欢迎使用 AnyGrab 网页组件扒取神器',
    heroTitle: '看到任何网站好看的界面或表格，点一下就能让 AI 1:1 画出来！',
    heroSubtitle:
      '以前按 F12 复制网页代码，几万行乱码瞬间塞爆 AI 对话框；只发截图，AI 又猜不准颜色和间距。现在用 AnyGrab 点一下，自动剔除 95% 网页垃圾代码，直接粘贴进【反重力 Antigravity / Codex / Cursor】回车即用！',
    startPickerCta: '🎯 点此启动鼠标选框，在下方靶标当场试手！(Alt+Shift+G)',
    openWebsiteBtn: '🌐 打开完整官方网站',
    stepsSectionTitle: '只需 1 → 2 → 3 三步，小白也能秒变前端高手',
    step1Title: '第 1 步：在网页上点一下想要的区域',
    step1Desc:
      '打开任何网页按 Alt+Shift+G（或点插件按钮），把鼠标移到心仪的卡片或表格上。按键盘 ↑ / ↓ 方向键可以像拉镜头一样扩大到整张大卡片，然后点一下鼠标左键！',
    step2Title: '第 2 步：切到【反重力 / Codex】直接粘贴回车',
    step2Desc:
      '默认「AI 复刻指令」已经帮你写好了全套中文要求、精确色号和提纯代码。你只需打开反重力 (Antigravity)、Codex 或 Cursor 对话框，直接按 Cmd+V（Windows 按 Ctrl+V）回车！',
    step3Title: '第 3 步：AI 瞬间 1:1 复刻，还能顺手改需求',
    step3Desc:
      '因为省掉了 95% 的无用垃圾嵌套，AI 不仅不会超字数报错，还能精准还原圆角、渐变、悬停变色和复杂的跨行跨列合并表格！',
    promptsTitle: '💡 进阶小妙招：粘贴后想顺便改点花样？点一下复制万能追问话术：',
    promptsHint: '先把抓到的组件粘贴进反重力 / Codex，再追问下面任意一句：',
    promptTemplates: [
      {
        label: '🎨 照着这个配色美化我现在的页面',
        text: '请提取上面组件的配色、圆角、阴影和字体层级，用同样的设计质感美化我当前项目里的首页组件。',
      },
      {
        label: '⚡ 改成交互完整的 React + TypeScript 组件',
        text: '请把上面抓到的界面封装成一个独立可复用的 React + TypeScript + Tailwind 组件，补上按钮点击状态和响应式适配。',
      },
      {
        label: '📊 把复杂表格转成带搜索筛选的数据看板',
        text: '请完整保留上面合并表头表格的所有数据结构，帮我做成一个带关键词搜索和列排序功能的交互式数据表格页面。',
      },
    ],
    copyPromptBtn: '复制话术',
    copiedPromptBtn: '已复制 ✓',
    arenaTitle: '🎯 现场点选练习靶场（不用找别的网站，现在就点下面试试！）',
    arenaSubtitle:
      '点击右侧按钮（或按键盘 Alt+Shift+G）开启紫蓝色选框 → 移到下面的「定价卡片」或「合并财务表」上 → 试试按 ↑ 键扩选 → 点一下左键复制！',
    arenaStartBtn: '🎯 开启选框试玩一下',
    arenaIdleBanner:
      '👆 还没试过？点右边按钮开启选框，然后随便点一下下面两张靶标卡片，这里会实时显示你抓出来的效果！',
    arenaSuccessTitle: '🎉 抓取成功！干净的中文 AI 复刻指令已经复制进你的剪贴板啦！',
    arenaSuccessNextStep:
      '👉 下一步：现在就切换到【反重力 Antigravity】或【Codex / Cursor】聊天输入框，直接按 Cmd+V (或 Ctrl+V) 粘贴回车，亲眼看看 1:1 复刻效果！',
    target1Badge: '练习靶标 1 · 视觉组件复刻',
    target1Label: '高颜值渐变 SaaS 定价卡片（含悬停变色按钮 + 复杂图标）',
    target1Tip: '💡 试玩提示：先把鼠标指到「立即升级 Pro 版」按钮上，连按两下键盘 ↑ 键扩选整张卡片，再点左键！',
    target2Badge: '练习靶标 2 · 复杂合并表格',
    target2Label: '跨行跨列企业财务合并报表（含 rowspan / colspan 双层表头）',
    target2Tip: '💡 试玩提示：开启选框后按 Tab 键切到「AI 复刻指令」或「文档表格」，一键把整张合并大表无损喂给 AI！',
  },
};

const EN_US: ExtensionI18nBundle = {
  localeSwitchLabel: '中 / EN',
  localeSwitchTitle: '切换为简体中文 (Switch to Simplified Chinese)',
  taglinePill: '0 LLM · <5ms',
  openGuideBtn: '📘 How to Use · 30s Practice',
  openWebsiteBtn: '🌐 Official Website',
  websiteConfigLabel: 'Website URL (local or hosted):',
  websiteSaveBtn: 'Save',
  pickCtaTitle: 'Pick Element on Page',
  pickCtaSub: 'Click any UI & paste straight into Antigravity / Codex',
  restrictedTabError:
    'Browser internal pages block extensions. Switch to any normal webpage tab, or click "📘 30s Practice" above to try right now!',
  formatSectionTitle: 'Output Format (What to Copy)',
  formats: {
    prompt: {
      shortTab: 'Prompt',
      fullTitle: 'AI Clone Prompt',
      subtitle: 'Recommended! Ready-to-paste instructions + tokens + code for Antigravity / Codex / Cursor',
      hudLabel: 'AI Prompt',
      badge: 'Best',
    },
    'tailwind-html': {
      shortTab: 'Tailwind',
      fullTitle: 'Tailwind Webpage (HTML)',
      subtitle: 'Clean semantic HTML + Tailwind CSS utility classes',
      hudLabel: 'Tailwind HTML',
    },
    jsx: {
      shortTab: 'JSX',
      fullTitle: 'React Component (JSX)',
      subtitle: 'Drop-in JSX snippet ready for React & Next.js apps',
      hudLabel: 'React JSX',
    },
    markdown: {
      shortTab: 'Markdown',
      fullTitle: 'Clean Docs & Tables (Markdown)',
      subtitle: 'Preserves complex merged tables & code blocks for AI context',
      hudLabel: 'Markdown',
    },
  },
  budgetSectionTitle: 'Token Budget (Save AI Context)',
  budgetUnlimitedLabel: 'Unlimited',
  formatBudgetValue: (maxTokens, unlimited) =>
    unlimited ? 'Unlimited' : `${maxTokens.toLocaleString('en-US')} tokens`,
  compactSvgTitle: 'Compact SVGs',
  compactSvgSub: 'Fold verbose vector paths',
  includeHoverTitle: 'Include :hover',
  includeHoverSub: 'Interactive hover states',
  historySectionTitle: 'Recent Grabs',
  historyClearBtn: 'Clear',
  historyCopyBtn: 'Copy',
  historyCopiedBtn: 'Copied',
  historyEmptyHtml:
    'No grabs yet. Click <strong>"📘 How to Use · 30s Practice"</strong> above or press <strong>Alt+Shift+G</strong> on any page!',
  formatRelativeTime: (timestamp) => {
    const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
    if (diffSec < 15) return 'just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return `${Math.floor(diffHr / 24)}d ago`;
  },
  hudHints: {
    click: 'Click: Copy for AI',
    arrows: '↑/↓: Expand/Shrink',
    tab: 'Tab: Format',
    esc: 'Esc: Exit',
  },
  formatHudBudget: (maxTokens, unlimited) =>
    unlimited ? '∞ tokens' : `≤${maxTokens.toLocaleString('en-US')} tok`,
  guide: {
    pageTitle: 'AnyGrab — 30-Second Quick Start & Live Practice Arena',
    navBadge: 'Zero Jargon · Learn in 30 Seconds',
    heroBadge: '✨ Welcome to AnyGrab UI & Context Picker',
    heroTitle: 'See any great UI or table on the web? Click once so AI can recreate it 1:1.',
    heroSubtitle:
      'Copying raw DevTools HTML floods your AI chat with 20,000+ junk tokens, while screenshots force AI to guess colors and spacing. AnyGrab strips 95% of DOM bloat in <5ms so you can paste directly into Antigravity, Codex, or Cursor!',
    startPickerCta: '🎯 Launch Element Picker & Try Below! (Alt+Shift+G)',
    openWebsiteBtn: '🌐 Open Official Website',
    stepsSectionTitle: 'How It Works in 3 Effortless Steps',
    step1Title: '1. Point & Click Any Webpage Element',
    step1Desc:
      'Press Alt+Shift+G on any webpage (or click the toolbar icon). Hover over any section, press ↑ / ↓ arrows to expand from a button up to the entire card, and left-click!',
    step2Title: '2. Paste Straight into Antigravity or Codex',
    step2Desc:
      'With "AI Clone Prompt" selected, your clipboard already holds clear instructions, exact colors, spacing, and clean code. Just press Cmd+V (or Ctrl+V) in Antigravity / Codex and hit Enter!',
    step3Title: '3. Get 1:1 Pixel-Accurate Code Instantly',
    step3Desc:
      'With 95% of noisy wrappers and hashed classes removed, Coding Agents reproduce gradients, hover states, and merged rowspan/colspan tables cleanly on the first try.',
    promptsTitle: '💡 Bonus Follow-Up Prompts (Click to Copy)',
    promptsHint: 'Paste your grabbed component into Antigravity / Codex, then add one of these:',
    promptTemplates: [
      {
        label: '🎨 Apply this palette & style to my app',
        text: 'Use the exact color palette, border radii, shadows, and typography hierarchy from this grabbed component to restyle my current landing page.',
      },
      {
        label: '⚡ Turn into a reusable React + TS component',
        text: 'Refactor the grabbed UI above into a clean, typed React + TypeScript + Tailwind component with interactive states and responsive mobile layout.',
      },
      {
        label: '📊 Build a searchable dashboard from this table',
        text: 'Preserve all merged headers and figures from the table above and build an interactive React table with search filtering and column sorting.',
      },
    ],
    copyPromptBtn: 'Copy Prompt',
    copiedPromptBtn: 'Copied ✓',
    arenaTitle: '🎯 Live Practice Arena — Test Clicking Right Here!',
    arenaSubtitle:
      'Click the button on the right (or press Alt+Shift+G) → move over the Pricing Card or Financial Table below → press ↑ to expand scope → left-click to copy!',
    arenaStartBtn: '🎯 Activate Picker Here',
    arenaIdleBanner:
      '👆 Click "Activate Picker Here" on the right, then click either target below to see live clipboard output right here!',
    arenaSuccessTitle: '🎉 Grabbed & Copied to Clipboard!',
    arenaSuccessNextStep:
      '👉 Next Step: Switch to Antigravity, Codex, or Cursor right now, press Cmd+V (or Ctrl+V) + Enter, and watch it build this UI 1:1!',
    target1Badge: 'Practice Target 1 · SaaS UI Card',
    target1Label: 'Gradient Pricing Card (with :hover CTA + multi-path SVGs)',
    target1Tip: '💡 Tip: Hover the "Upgrade to Pro" button, press ↑ twice to expand to the full card, then click!',
    target2Badge: 'Practice Target 2 · Complex Merged Table',
    target2Label: 'Multi-Header Financial Statement (rowspan + colspan)',
    target2Tip: '💡 Tip: Press Tab on the bottom HUD to test AI Prompt vs Markdown table output!',
  },
};

export function getMessages(locale: ExtensionLocale): ExtensionI18nBundle {
  return locale === 'zh-CN' ? ZH_CN : EN_US;
}
