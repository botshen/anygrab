export type SiteLocale = 'zh-CN' | 'en';

const LOCALE_STORAGE_KEY = 'anygrab_site_locale';

export function detectInitialLocale(): SiteLocale {
  if (typeof window !== 'undefined') {
    try {
      const params = new URLSearchParams(window.location.search);
      const q = params.get('lang')?.toLowerCase();
      if (q === 'zh' || q === 'zh-cn') return 'zh-CN';
      if (q === 'en' || q === 'en-us') return 'en';
    } catch {
      // Ignore URL parsing errors
    }

    try {
      const stored = window.localStorage?.getItem(LOCALE_STORAGE_KEY);
      if (stored === 'zh-CN' || stored === 'en') {
        return stored;
      }
    } catch {
      // Ignore restricted storage
    }
  }

  if (typeof navigator !== 'undefined') {
    const primary = navigator.language || '';
    if (/^zh\b/i.test(primary) || primary.toLowerCase().startsWith('zh')) {
      return 'zh-CN';
    }
    const list = navigator.languages ?? [];
    if (list.some((l) => l.toLowerCase().startsWith('zh'))) {
      return 'zh-CN';
    }
  }

  return 'en';
}

export function persistSiteLocale(locale: SiteLocale): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage?.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Ignore restricted storage
  }
}

export interface LocalizedPresetCopy {
  name: string;
  category: string;
  description: string;
}

export const PRESET_ZH_MAP: Record<string, LocalizedPresetCopy> = {
  'saas-pricing': {
    name: 'SaaS 三档定价卡片',
    category: '营销定价页',
    description: '含 CSS-in-JS 乱码类名 (css-19x82a)、13 个超长 SVG 对勾图标与推荐徽章。',
  },
  'financial-report-table': {
    name: '跨行跨列合并表头财务报表',
    category: '复杂数据大表',
    description: '含 rowspan=2 与 colspan=2 多级合并表头、底部汇总行与审核状态标签，普通转换工具极易错位。',
  },
  'bento-analytics-dashboard': {
    name: 'Bento 数据分析看板（20 层嵌套）',
    category: '数据仪表盘',
    description: '4 张核心指标卡 + SVG 折线面积图，外层故意包裹 20 层无意义 div 冗余空壳。',
  },
  'oauth-auth-modal': {
    name: '第三方登录与表单弹窗',
    category: '登录与表单',
    description: '含 GitHub/Google 登录按钮、邮箱密码输入框、无障碍校验提示与隐藏防爬蜜罐节点。',
  },
  'api-docs-page': {
    name: 'API 接口技术文档页',
    category: '开发者文档',
    description: '含顶部导航栏噪音、18 条废弃侧边栏链接噪音、TypeScript 代码块与参数说明表。',
  },
  'kanban-sprint-board': {
    name: '敏捷看板列（10 张重复任务卡）',
    category: '项目管理界面',
    description: '包含 10 张结构相同的任务卡片，专门测试开启字数限制后自动智能折叠而不破坏标签。',
  },
  'dark-ai-hero': {
    name: 'AI 产品官网首屏样本',
    category: '着陆页首屏',
    description: '含 8 个隐藏装饰发光层 (aria-hidden)、背景网格 SVG 噪音、双行动按钮与命令行框。',
  },
  'feature-matrix-20': {
    name: '20 行功能对比矩阵大表',
    category: '功能对比表',
    description: '20 行 × 5 列密集对比矩阵，每个单元格都塞满了浏览器默认废话内联样式。',
  },
  'multi-section-settings': {
    name: '多分区系统设置表单面板',
    category: '后台设置页',
    description: '三大设置分区，涵盖文本框、下拉选择框、多行输入、开关按钮与危险操作区。',
  },
  'academic-paper-section': {
    name: '学术论文定理与消融实验表',
    category: '科研论文',
    description: 'arXiv 风格论文片段，含 Theorem 4.1 定理框、数学符号与多维合并表头实验表。',
  },
};

export const METHOD_ZH_MAP: Record<string, { name: string; desc: string }> = {
  'raw-html': {
    name: '直接复制原始网页源码 (Raw HTML)',
    desc: '不做任何清洗，包含大量 script 脚本、超长 SVG 路径与乱码类名，浪费上下文。',
  },
  'naive-style-picker': {
    name: '普通样式提取插件 (Naive Style Picker)',
    desc: '把浏览器几百条默认计算样式全塞进每个标签，体积暴涨 +280%，瞬间塞爆 AI 对话框。',
  },
  'turndown-gfm': {
    name: '纯文本 Markdown 转换 (Turndown)',
    desc: '虽然字数少，但颜色、间距、圆角、布局 100% 丢失（样式 0 分），跨行列大表易损坏。',
  },
  'anygrab-default': {
    name: 'AnyGrab 智能提纯（默认无损模式）',
    desc: '自动把真实样式翻译成干净 Tailwind 代码，剔除垃圾节点，100% 保留复杂合并表格。',
  },
  'anygrab-budget-600': {
    name: 'AnyGrab 省流模式（限制 600 Token）',
    desc: '智能识别重点内容并自动折叠重复列表项，砍掉 85% 体积依然保持 94.6% 样式还原度。',
  },
};

export interface WorkflowCardCopy {
  id: string;
  badge: string;
  title: string;
  scenario: string;
  steps: string[];
  promptLabel: string;
  promptToCopy: string;
  actionLabel: string;
  targetTab: 'playground' | 'quickstart';
}

export function getWorkflowsCopy(locale: SiteLocale): WorkflowCardCopy[] {
  if (locale === 'zh-CN') {
    return [
      {
        id: 'one-click-clone',
        badge: '场景 01 · 新手首选（零配置）',
        title: '插件点一下网页 → 去反重力 / Codex 直接粘贴回车',
        scenario:
          '适用场景：逛网站时看到好看的定价卡片、数据看板、登录框或跨行跨列大表格，想在自己的项目里 1:1 做一个同款。',
        steps: [
          '打开浏览器右上角的 AnyGrab 插件，保持默认的「AI 复刻指令 (Prompt)」，点击主按钮开启选框（或按快捷键 Alt+Shift+G）。',
          '鼠标移到网页上想参考的区块（按键盘 ↑ 方向键可往外扩选整张大卡片），左键点一下，右上角提示「已复制」即可。',
          '切换到【反重力 Antigravity】、【Codex】或【Cursor】聊天框，直接按 Cmd+V（Windows 按 Ctrl+V）粘贴回车。若想同步改文案，可附上下面这句：',
        ],
        promptLabel: '配套提问话术（粘贴在抓取内容前面或后面均可）',
        promptToCopy:
          '请根据我粘贴的这段 AnyGrab 网页提纯内容，在当前项目中新建一个可直接运行的 React + Tailwind CSS 组件：1:1 还原它的布局、配色、圆角、阴影和交互细节，并帮我把里面的示例文字替换成我们自己产品的中文文案，同时做好手机端自适应。',
        actionLabel: '免装插件，先去在线体验台试一把',
        targetTab: 'playground',
      },
      {
        id: 'steal-design-system',
        badge: '场景 02 · 旧界面换肤升级',
        title: '一键提取标杆网站的「色板与圆角」，给现有页面换肤',
        scenario:
          '适用场景：你自己写的功能逻辑都能跑，但界面配色粗糙杂乱，想借用 Linear、Raycast、Stripe 等标杆网站的视觉秩序。',
        steps: [
          '打开你心仪的标杆网站，用 AnyGrab 点选它的首屏或核心面板（也可在「在线免装体验台」底部直接查看自动提取的色块）。',
          'AnyGrab 会自动剔除无效杂色，把该网站真实的「背景色、强调色、描边色、圆角刻度、阴影参数」干净提炼出来。',
          '把下方的「只换外观不改逻辑」专用话术 + 提取结果一起发给反重力或 Codex，安全完成界面改版。',
        ],
        promptLabel: '配套「无损换肤」提问话术',
        promptToCopy:
          '我觉得目前项目的页面配色、字体层级和留白太粗糙了。请严格参考下方 AnyGrab 从标杆网站提取出的配色色板（Design Tokens）、圆角刻度与排版样式，帮我全面美化当前页面的视觉质感！注意：只升级 CSS / Tailwind 外观样式，千万不要改动任何原有的按钮点击事件和接口逻辑。',
        actionLabel: '去在线体验台查看色板提取效果',
        targetTab: 'playground',
      },
      {
        id: 'auto-mcp-agent',
        badge: '场景 03 · MCP 全自动抓取',
        title: '把 AnyGrab MCP 装进反重力 & Codex，发网址让 AI 自动抓取',
        scenario:
          '适用场景：公开网页连浏览器都不用打开。配置好一次 MCP 服务后，直接在 AI 编程工具里输入网址，AI 自动在本地毫秒级抓取提纯。',
        steps: [
          '点击顶部「下载插件 & 安装」板块，复制对应【反重力 Antigravity】或【Codex】的 6 行 MCP 配置代码，粘贴进工具配置文件。',
          '配置一次长期生效，AI 会获得 grab_url（抓网页）、grab_html（洗代码）、extract_design_tokens（提色板）三个本地工具。',
          '之后直接在反重力或 Codex 聊天框粘贴下方话术，填入任意公开网址即可全自动开工：',
        ],
        promptLabel: '装好 MCP 后直接发给反重力 / Codex 的指令',
        promptToCopy:
          '请调用 anygrab 的 grab_url 工具抓取 https://ui.shadcn.com（将 maxTokens 预算设为 1200，开启 compactSvg），参考它的卡片栅格布局、深色色板与间距规范，为我们项目设计并实现一个高颜值的数据概览首页！',
        actionLabel: '去复制反重力 / Codex 的 MCP 配置',
        targetTab: 'quickstart',
      },
    ];
  }

  return [
    {
      id: 'one-click-clone',
      badge: 'Workflow 01 · Zero-Setup Favorite',
      title: 'Click Any Element on a Page → Paste Straight into Antigravity / Codex',
      scenario:
        'Best when you spot a clean pricing tier, dashboard card, auth modal, or complex merged table and want a 1:1 component in your repo.',
      steps: [
        'Open the AnyGrab Chrome extension, keep the default "AI Prompt" format selected, and click "Pick Element" (or press Alt+Shift+G).',
        'Hover over any UI block on the webpage (press ArrowUp to expand selection to the parent card) and left-click to copy.',
        'Switch to Antigravity, Codex, or Cursor and press Cmd+V / Ctrl+V + Enter. Want custom copy too? Append this prompt:',
      ],
      promptLabel: 'Ready-to-use follow-up prompt for Antigravity / Codex',
      promptToCopy:
        'Based on the AnyGrab distilled UI context pasted below, create a clean, responsive React + Tailwind CSS component in our project. Match the exact layout, color palette, border radii, shadows, and typography hierarchy 1:1 while adapting the text labels to our product.',
      actionLabel: 'Try it right now in Live Playground',
      targetTab: 'playground',
    },
    {
      id: 'steal-design-system',
      badge: 'Workflow 02 · Safe UI Restyling',
      title: 'Extract Master-Class Color Palettes & Radii to Upgrade Existing Pages',
      scenario:
        'Best when your app logic works great, but the styling feels dated and you want Linear / Raycast / Stripe-grade visual discipline.',
      steps: [
        'Grab the hero or card section of a reference site with AnyGrab (or inspect the Design Tokens bar in Live Playground).',
        'AnyGrab automatically deduplicates exact background hexes, accent colors, border alphas, radii, and shadows.',
        'Send the prompt below + extracted Design Tokens to Antigravity or Codex to restyle your app without touching business logic.',
      ],
      promptLabel: 'Safe UI restyling prompt (preserves all logic)',
      promptToCopy:
        'Our current page styling feels rough. Please use the AnyGrab Design Tokens (colors, fonts, border radii, and shadows) below as our visual spec and upgrade our current page into a polished Tailwind UI. IMPORTANT: Only update visual classes/styles — do not alter any existing state, handlers, or API calls.',
      actionLabel: 'Inspect live Design Token extraction',
      targetTab: 'playground',
    },
    {
      id: 'auto-mcp-agent',
      badge: 'Workflow 03 · Autonomous MCP Tooling',
      title: 'Connect AnyGrab MCP to Antigravity & Codex — Let Agents Fetch URLs Directly',
      scenario:
        'Best for public pages: configure MCP once, then simply type a URL in chat and let your coding agent distill it autonomously.',
      steps: [
        'Open the "Download & MCP" tab above and copy the 6-line MCP config into Antigravity, Codex, Cursor, or Claude Code.',
        'Your agent immediately gains three local tools: grab_url, grab_html, and extract_design_tokens (0 API keys needed).',
        'Paste the prompt below into Antigravity or Codex with any target URL:',
      ],
      promptLabel: 'Autonomous MCP prompt for Antigravity / Codex',
      promptToCopy:
        'Use the anygrab grab_url tool to distill https://ui.shadcn.com (with maxTokens: 1200 and compactSvg: true). Study its card grid, palette, and typography scale, then build a matching analytics overview page for our project.',
      actionLabel: 'Get 1-click MCP config JSON',
      targetTab: 'quickstart',
    },
  ];
}
