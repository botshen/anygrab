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
  taglinePill: '本地毫秒提纯',
  openGuideBtn: '怎么用？30 秒练习靶场',
  openWebsiteBtn: '打开官方网站',
  websiteConfigLabel: '官网地址（本地或线上 URL）：',
  websiteSaveBtn: '保存',
  pickCtaTitle: '去当前网页点选元素',
  pickCtaSub: '点选后切到反重力 / Codex 直接粘贴即可 1:1 复刻',
  restrictedTabError:
    '当前是浏览器系统页，无法直接点选。请切到普通网页标签页，或点击「怎么用？30 秒练习靶场」当场试手。',
  formatSectionTitle: '输出格式（点选切换）',
  formats: {
    prompt: {
      shortTab: 'AI 复刻指令',
      fullTitle: 'AI 复刻指令 (Prompt)',
      subtitle: '推荐首选：附带中文还原指令与精确色板，切到反重力 / Codex 直接粘贴即可 1:1 复刻',
      hudLabel: 'AI 复刻指令',
      badge: '推荐',
    },
    jsx: {
      shortTab: 'React 组件',
      fullTitle: 'React 组件 (JSX)',
      subtitle: '输出语义化 JSX 与 Tailwind 类名，可直接放入 React / Next.js 工程',
      hudLabel: 'React JSX',
    },
    'tailwind-html': {
      shortTab: 'Tailwind',
      fullTitle: 'Tailwind 网页 (HTML)',
      subtitle: '剔除哈希冗余类名后的干净 HTML + Tailwind 样式结构，适合任意前端框架',
      hudLabel: 'Tailwind HTML',
    },
    markdown: {
      shortTab: '文档表格',
      fullTitle: '纯净文档表格 (Markdown)',
      subtitle: '完整保留跨行跨列合并表头与数据层级，适合将网页报表喂给 AI 分析',
      hudLabel: '文档表格 (MD)',
    },
  },
  budgetSectionTitle: '单次提纯上限',
  budgetUnlimitedLabel: '不限长度',
  formatBudgetValue: (maxTokens, unlimited) =>
    unlimited ? '不限长度' : `最多 ${maxTokens.toLocaleString('en-US')} 词元`,
  compactSvgTitle: '精简矢量图标',
  compactSvgSub: '折叠超长 SVG 路径体积',
  includeHoverTitle: '提取悬停态 (:hover)',
  includeHoverSub: '同步保留悬停变色样式',
  historySectionTitle: '最近提取记录',
  historyClearBtn: '清空',
  historyCopyBtn: '复制',
  historyCopiedBtn: '已复制',
  historyEmptyHtml:
    '暂无提取记录。点击上方 <strong>「怎么用？30 秒练习靶场」</strong> 或在网页按 <strong>Alt+Shift+G</strong> 立即体验。',
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
    arrows: '↑/↓：扩大/缩小选框',
    tab: 'Tab：切换格式',
    esc: 'Esc：退出',
  },
  formatHudBudget: (maxTokens, unlimited) =>
    unlimited ? '不限长度' : `≤${maxTokens.toLocaleString('en-US')} 词元`,
  guide: {
    pageTitle: 'AnyGrab — 30 秒实战指南与在线练习靶场',
    navBadge: '30 秒上手 · 本地毫秒提纯',
    heroBadge: 'ANYGRAB · 光学网页取景与上下文提纯器',
    heroTitle: '看到任何网站的好看界面或复杂表格，点选一下即可让 AI 1:1 复刻',
    heroSubtitle:
      '直接复制 F12 源码动辄几万行乱码，瞬间撑爆上下文；只发截图，AI 又猜不准色号与间距。用 AnyGrab 点一下，本地毫秒级剔除 95% 冗余嵌套，直接粘贴进反重力 Antigravity、Codex 或 Cursor 即可精准还原。',
    startPickerCta: '启动光学选框 · 在下方靶标试手 (Alt+Shift+G)',
    openWebsiteBtn: '打开官方网站',
    stepsSectionTitle: '三步完成从任意网页到高质量前端代码',
    step1Title: '点选网页任意目标区域',
    step1Desc:
      '在任意网页按 Alt+Shift+G（或点击工具栏图标），将光标移至目标组件或报表上。按键盘 ↑ / ↓ 方向键可逐级扩大或收窄选框范围，左键单击即可提取。',
    step2Title: '粘贴至反重力或 Codex',
    step2Desc:
      '默认的「AI 复刻指令」已自动整理好还原要求、精确设计色板与提纯结构代码。打开反重力 (Antigravity)、Codex 或 Cursor 输入框，直接按 Cmd+V（或 Ctrl+V）发送即可。',
    step3Title: '瞬间生成 1:1 还原代码',
    step3Desc:
      '剔除 95% 无效嵌套与随机哈希类名后，AI 不会超上下文截断，能够一次还原精确间距、阴影层级、:hover 悬停态以及跨行跨列合并大表。',
    promptsTitle: '进阶追问话术（粘贴组件后一键复制追加）',
    promptsHint: '先将提取结果粘贴进反重力 / Codex，再复制下方任意一句追问以定制改版：',
    promptTemplates: [
      {
        label: '提取这套配色与排版质感美化现有页面',
        text: '请提取上面组件的配色体系、圆角刻度、边框细节与字号层级，用同样的视觉质感重构我当前项目里的首页模块。',
      },
      {
        label: '封装为类型完备的 React + TS 组件',
        text: '请将上面提取的界面封装为独立可复用的 React + TypeScript + Tailwind 组件，补全交互状态 Props 与移动端响应式布局。',
      },
      {
        label: '将合并表头报表升级为可筛选数据看板',
        text: '请完整保留上面跨行跨列合并表格的表头层级与数据精度，帮我构建一个支持关键词检索与列排序的数据表格组件。',
      },
    ],
    copyPromptBtn: '复制话术',
    copiedPromptBtn: '已复制',
    arenaTitle: '现场点选练习靶场',
    arenaSubtitle:
      '点击「开启光学选框试手」按钮（桌面端也可按 Alt+Shift+G）启动橙红光学取景框，移至下方「定价卡片」或「合并财务表」上点选即可复制。',
    arenaStartBtn: '开启光学选框试手',
    arenaIdleBanner:
      '尚未点选靶标。点击上方「开启光学选框试手」按钮，再点选下方任意卡片或表格，此处将实时展示写入剪贴板的提纯内容。',
    arenaSuccessTitle: '抓取成功 · 提纯后的 AI 复刻上下文已写入剪贴板',
    arenaSuccessNextStep:
      '下一步：切换到反重力 Antigravity、Codex 或 Cursor 对话框，直接按 Cmd+V（或 Ctrl+V）粘贴发送，即可查看 1:1 复刻效果。',
    target1Badge: 'TARGET 01 · 组件布局与悬停态',
    target1Label: '企业级 SaaS 定价卡片（含 :hover 悬停变色与矢量图标）',
    target1Tip:
      '试手提示：将光标停在底部「立即开通旗舰版」按钮上，连按两次 ↑ 键扩选整张卡片，再单击左键复制。',
    target2Badge: 'TARGET 02 · 跨行跨列合并表格',
    target2Label: '多级表头财务合并报表（含 rowspan / colspan 结构）',
    target2Tip:
      '试手提示：开启选框后按 Tab 键可在「AI 复刻指令」与「文档表格」格式间切换，完整保留合并单元格。',
  },
};

const EN_US: ExtensionI18nBundle = {
  localeSwitchLabel: '中 / EN',
  localeSwitchTitle: '切换为简体中文 (Switch to Simplified Chinese)',
  taglinePill: '0 LLM · <5ms',
  openGuideBtn: 'How to Use · 30s Practice',
  openWebsiteBtn: 'Official Website',
  websiteConfigLabel: 'Website URL (local or hosted):',
  websiteSaveBtn: 'Save',
  pickCtaTitle: 'Pick Element on Page',
  pickCtaSub: 'Select any UI & paste straight into Antigravity / Codex',
  restrictedTabError:
    'Browser internal pages block extensions. Switch to a normal webpage tab, or click "How to Use · 30s Practice" above to try right now.',
  formatSectionTitle: 'Output Format',
  formats: {
    prompt: {
      shortTab: 'Prompt',
      fullTitle: 'AI Clone Prompt',
      subtitle:
        'Recommended: structured replication instructions + design tokens + distilled code for Antigravity / Codex / Cursor',
      hudLabel: 'AI Prompt',
      badge: 'Recommended',
    },
    'tailwind-html': {
      shortTab: 'Tailwind',
      fullTitle: 'Tailwind Webpage (HTML)',
      subtitle: 'Clean semantic HTML with synthesized Tailwind CSS utility classes',
      hudLabel: 'Tailwind HTML',
    },
    jsx: {
      shortTab: 'JSX',
      fullTitle: 'React Component (JSX)',
      subtitle: 'Drop-in JSX markup ready for React and Next.js codebases',
      hudLabel: 'React JSX',
    },
    markdown: {
      shortTab: 'Markdown',
      fullTitle: 'Clean Docs & Tables (Markdown)',
      subtitle: 'Preserves complex rowspan/colspan merged tables and structured copy for AI analysis',
      hudLabel: 'Markdown',
    },
  },
  budgetSectionTitle: 'Token Budget',
  budgetUnlimitedLabel: 'Unlimited',
  formatBudgetValue: (maxTokens, unlimited) =>
    unlimited ? 'Unlimited' : `${maxTokens.toLocaleString('en-US')} tokens`,
  compactSvgTitle: 'Compact SVGs',
  compactSvgSub: 'Fold verbose vector paths',
  includeHoverTitle: 'Include :hover',
  includeHoverSub: 'Extract hover transitions',
  historySectionTitle: 'Recent Grabs',
  historyClearBtn: 'Clear',
  historyCopyBtn: 'Copy',
  historyCopiedBtn: 'Copied',
  historyEmptyHtml:
    'No grabs yet. Click <strong>"How to Use · 30s Practice"</strong> above or press <strong>Alt+Shift+G</strong> on any page.',
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
    arrows: '↑/↓: Scope',
    tab: 'Tab: Format',
    esc: 'Esc: Exit',
  },
  formatHudBudget: (maxTokens, unlimited) =>
    unlimited ? 'Unlimited' : `≤${maxTokens.toLocaleString('en-US')} tok`,
  guide: {
    pageTitle: 'AnyGrab — 30-Second Field Guide & Live Practice Arena',
    navBadge: '30s Onboarding · Sub-5ms Local Engine',
    heroBadge: 'ANYGRAB · OPTICAL UI & CONTEXT RETICLE',
    heroTitle: 'See any great UI or complex table on the web? Select once so AI recreates it 1:1.',
    heroSubtitle:
      'Copying raw DevTools DOM floods your AI context with 20,000+ noisy tokens, while screenshots force models to guess colors and spacing. AnyGrab strips 95% of wrapper bloat in <5ms locally, ready to paste into Antigravity, Codex, or Cursor.',
    startPickerCta: 'Launch Optical Reticle · Try Below (Alt+Shift+G)',
    openWebsiteBtn: 'Open Official Website',
    stepsSectionTitle: 'Three Steps from Any Webpage to Production UI',
    step1Title: 'Point & Select Any Element',
    step1Desc:
      'Press Alt+Shift+G on any webpage (or click the extension icon). Hover over any section, press ↑ / ↓ arrows to step outward from a button to the full card, and left-click.',
    step2Title: 'Paste into Antigravity or Codex',
    step2Desc:
      'With "AI Clone Prompt" active, your clipboard holds clear instructions, exact design tokens, and distilled markup. Press Cmd+V (or Ctrl+V) in Antigravity, Codex, or Cursor.',
    step3Title: 'Get 1:1 Clean Code Instantly',
    step3Desc:
      'With 95% of noisy wrappers and CSS-in-JS hashes removed, coding agents reproduce typography, hover states, and merged rowspan/colspan tables accurately on the first pass.',
    promptsTitle: 'Follow-Up Companion Prompts (Click to Copy)',
    promptsHint: 'Paste your captured component into Antigravity / Codex, then append one of these:',
    promptTemplates: [
      {
        label: 'Apply this palette & layout rhythm to my app',
        text: 'Extract the color tokens, border radii, hairline borders, and typographic hierarchy from the component above and restyle my current landing page section.',
      },
      {
        label: 'Refactor into a typed React + TS component',
        text: 'Convert the captured UI above into a reusable React + TypeScript + Tailwind component with clean props, interactive states, and responsive layout.',
      },
      {
        label: 'Build a searchable table view from this report',
        text: 'Preserve every merged header and figure from the table above and build an interactive data table with keyword search and column sorting.',
      },
    ],
    copyPromptBtn: 'Copy Prompt',
    copiedPromptBtn: 'Copied',
    arenaTitle: 'Live Practice Arena',
    arenaSubtitle:
      'Click "Activate Optical Picker" (or press Alt+Shift+G on desktop) to launch the vermilion reticle, then select the Pricing Card or Financial Table below.',
    arenaStartBtn: 'Activate Optical Picker',
    arenaIdleBanner:
      'No target captured yet. Click "Activate Optical Picker" above, then select either target below to inspect the live clipboard output here.',
    arenaSuccessTitle: 'Captured & Copied to Clipboard',
    arenaSuccessNextStep:
      'Next step: Switch to Antigravity, Codex, or Cursor, press Cmd+V (or Ctrl+V), and send to recreate this component 1:1.',
    target1Badge: 'TARGET 01 · UI CARD & HOVER STATE',
    target1Label: 'Enterprise SaaS Pricing Card (:hover CTA + SVG icons)',
    target1Tip:
      'Tip: Hover the bottom CTA button, press ↑ twice to expand selection to the entire card, then left-click.',
    target2Badge: 'TARGET 02 · MERGED CELL TABLE',
    target2Label: 'Multi-Header Financial Statement (rowspan + colspan)',
    target2Tip:
      'Tip: Press Tab on the bottom HUD to switch between AI Clone Prompt and clean Markdown table output.',
  },
};

export function getMessages(locale: ExtensionLocale): ExtensionI18nBundle {
  return locale === 'zh-CN' ? ZH_CN : EN_US;
}
