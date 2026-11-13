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
    name: 'SaaS 定价卡片',
    category: '营销页',
    description: 'CSS-in-JS 乱码类名 + 13 个冗余 SVG',
  },
  'financial-report-table': {
    name: '合并表头财务表',
    category: '复杂表格',
    description: 'rowspan + colspan 多级合并零错位',
  },
  'bento-analytics-dashboard': {
    name: 'Bento 数据看板',
    category: '仪表盘',
    description: '剥离 20 层无意义 div 嵌套空壳',
  },
  'oauth-auth-modal': {
    name: 'OAuth 登录弹窗',
    category: '表单弹窗',
    description: '清除隐藏蜜罐节点，保留表单语义',
  },
  'api-docs-page': {
    name: 'API 技术文档',
    category: '开发文档',
    description: '自动裁剪 18 条导航噪音保留正文',
  },
  'kanban-sprint-board': {
    name: '敏捷看板 (10卡)',
    category: '项目管理',
    description: '限流模式下智能折叠同类卡片',
  },
  'dark-ai-hero': {
    name: '暗黑 AI 首屏',
    category: '落地页',
    description: '剔除 8 层 aria-hidden 装饰光斑',
  },
  'feature-matrix-20': {
    name: '20 行对比矩阵',
    category: '对比表',
    description: '剔除单元格内联默认样式废话',
  },
  'multi-section-settings': {
    name: '系统设置表单',
    category: '后台设置',
    description: '完整保留输入框、下拉与开关控件',
  },
  'academic-paper-section': {
    name: '论文实验表格',
    category: '科研论文',
    description: '定理公式 + 多维消融实验数据表',
  },
};

export const METHOD_ZH_MAP: Record<string, { name: string; desc: string }> = {
  'raw-html': {
    name: 'Raw HTML (F12 原码)',
    desc: '含 script、SVG 路径与乱码类名',
  },
  'naive-style-picker': {
    name: '普通样式抓取插件',
    desc: '默认计算样式全量塞入，膨胀 +280%',
  },
  'turndown-gfm': {
    name: 'Turndown 纯文本',
    desc: '丢失全部色值、圆角与栅格布局',
  },
  'anygrab-default': {
    name: 'AnyGrab (无损提纯)',
    desc: '纯净 Tailwind + 色板 · 表格 100%',
  },
  'anygrab-budget-600': {
    name: 'AnyGrab (600 省流)',
    desc: '智能折叠重复项 · 立省 85% 上下文',
  },
};

export interface WorkflowCardCopy {
  id: string;
  badge: string;
  title: string;
  flowNodes: [string, string, string];
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
        badge: '01 · 复刻界面',
        title: '点选组件 → 1:1 复刻',
        flowNodes: ['插件选框', 'Cmd+V 粘贴', '1:1 组件'],
        promptLabel: '复制指令',
        promptToCopy: '按以下 AnyGrab 上下文，生成 1:1 响应式 React + Tailwind 组件：',
        actionLabel: '去实测台',
        targetTab: 'playground',
      },
      {
        id: 'steal-design-system',
        badge: '02 · 色板换肤',
        title: '提取色板 → 无损换肤',
        flowNodes: ['提炼色板', '注入 Token', '零逻辑改动'],
        promptLabel: '换肤指令',
        promptToCopy: '仅用下方 Design Tokens 升级页面 Tailwind 样式，不动任何业务逻辑：',
        actionLabel: '看色板',
        targetTab: 'playground',
      },
      {
        id: 'auto-mcp-agent',
        badge: '03 · MCP 托管',
        title: '发条网址 → 自动抓取',
        flowNodes: ['配置 MCP', '发公开 URL', '4ms 蒸馏'],
        promptLabel: 'MCP 指令',
        promptToCopy: '调用 grab_url 抓取 https://ui.shadcn.com (maxTokens=1200) 提纯并复刻：',
        actionLabel: '复制配置',
        targetTab: 'quickstart',
      },
    ];
  }

  return [
    {
      id: 'one-click-clone',
      badge: '01 · CLONE UI',
      title: 'Click Element → Ship 1:1',
      flowNodes: ['Optical Pick', 'Paste Context', '1:1 Component'],
      promptLabel: 'Prompt',
      promptToCopy: 'Build a responsive React + Tailwind component matching this AnyGrab context 1:1:',
      actionLabel: 'Live Lab',
      targetTab: 'playground',
    },
    {
      id: 'steal-design-system',
      badge: '02 · RESTYLE',
      title: 'Extract Tokens → Restyle',
      flowNodes: ['Grab Palette', 'Lock Tokens', 'Zero Logic Diff'],
      promptLabel: 'Prompt',
      promptToCopy: 'Restyle our Tailwind UI with these AnyGrab Design Tokens. Keep all logic untouched:',
      actionLabel: 'Inspect Tokens',
      targetTab: 'playground',
    },
    {
      id: 'auto-mcp-agent',
      badge: '03 · MCP AGENT',
      title: 'Send URL → Auto Distill',
      flowNodes: ['3-Line MCP', 'Send URL', '4ms Distill'],
      promptLabel: 'MCP Prompt',
      promptToCopy: 'Run anygrab grab_url on https://ui.shadcn.com (maxTokens: 1200) and clone its grid:',
      actionLabel: 'Get MCP',
      targetTab: 'quickstart',
    },
  ];
}
