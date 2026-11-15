export type SiteLocale = 'zh-CN' | 'en';
export type SiteTheme = 'light' | 'dark';

const LOCALE_STORAGE_KEY = 'anygrab_site_locale';
const THEME_STORAGE_KEY = 'anygrab_site_theme';

export const GITHUB_REPO_URL = 'https://github.com/botshen/anygrab';

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

export function detectInitialTheme(): SiteTheme {
  if (typeof window !== 'undefined') {
    try {
      const params = new URLSearchParams(window.location.search);
      const q = params.get('theme')?.toLowerCase();
      if (q === 'dark' || q === 'light') return q;
    } catch {
      // Ignore URL parsing errors
    }

    try {
      const stored = window.localStorage?.getItem(THEME_STORAGE_KEY);
      if (stored === 'dark' || stored === 'light') {
        return stored;
      }
    } catch {
      // Ignore restricted storage
    }
  }

  return 'light';
}

export function persistSiteTheme(theme: SiteTheme): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage?.setItem(THEME_STORAGE_KEY, theme);
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
    name: 'SaaS 定价卡',
    category: '定价页',
    description: '剔除混淆类名与 13 处冗余 SVG',
  },
  'financial-report-table': {
    name: '合并财务表',
    category: '复杂表格',
    description: '多级合并表头，行列零错位',
  },
  'bento-analytics-dashboard': {
    name: 'Bento 看板',
    category: '仪表盘',
    description: '折叠 20 层空壳嵌套容器',
  },
  'oauth-auth-modal': {
    name: 'OAuth 登录框',
    category: '表单',
    description: '清除隐藏节点，保留控件语义',
  },
  'api-docs-page': {
    name: 'API 文档页',
    category: '技术文档',
    description: '裁剪侧栏导航，仅留正文代码',
  },
  'kanban-sprint-board': {
    name: '敏捷看板',
    category: '项目管理',
    description: '预算限流下自动折叠同类卡片',
  },
  'dark-ai-hero': {
    name: 'AI 产品首屏',
    category: '落地页',
    description: '剥离 8 层纯装饰背景节点',
  },
  'feature-matrix-20': {
    name: '20 行对比表',
    category: '对比矩阵',
    description: '清理单元格重复默认内联样式',
  },
  'multi-section-settings': {
    name: '系统设置页',
    category: '后台表单',
    description: '保留输入、下拉与开关状态',
  },
  'academic-paper-section': {
    name: '论文实验表',
    category: '学术排版',
    description: '保留公式结构与多维实验数据',
  },
};

export const METHOD_ZH_MAP: Record<string, { name: string; desc: string }> = {
  'raw-html': {
    name: 'F12 原始 HTML',
    desc: '含脚本与混淆类名',
  },
  'naive-style-picker': {
    name: '普通样式抓取插件',
    desc: '全量内联样式，膨胀 +280%',
  },
  'turndown-gfm': {
    name: 'Turndown 纯文本',
    desc: '丢失色值与栅格布局',
  },
  'anygrab-default': {
    name: 'AnyGrab 无损提纯',
    desc: 'Tailwind + 色板',
  },
  'anygrab-budget-600': {
    name: 'AnyGrab 600 省流',
    desc: '自动折叠同类项',
  },
};

export interface WorkflowCardCopy {
  id: string;
  title: string;
  flowNodes: [string, string, string];
  promptToCopy: string;
  actionLabel: string;
  targetTab: 'playground' | 'quickstart';
}

export function getWorkflowsCopy(locale: SiteLocale): WorkflowCardCopy[] {
  if (locale === 'zh-CN') {
    return [
      {
        id: 'one-click-clone',
        title: '点选组件，1:1 复刻',
        flowNodes: ['点选目标', '粘贴上下文', '生成组件'],
        promptToCopy: '按以下 AnyGrab 上下文，生成 1:1 响应式 React + Tailwind 组件：',
        actionLabel: '打开沙盒实测',
        targetTab: 'playground',
      },
      {
        id: 'steal-design-system',
        title: '提取色板，无损换肤',
        flowNodes: ['提取色板', '锁定色值', '零逻辑改动'],
        promptToCopy: '仅用下方 Design Tokens 升级页面 Tailwind 样式，不动任何业务逻辑：',
        actionLabel: '查看提取色板',
        targetTab: 'playground',
      },
      {
        id: 'auto-mcp-agent',
        title: '接入 MCP，发网址即抓',
        flowNodes: ['配置 MCP', '发送网址', '自动提纯'],
        promptToCopy: '调用 grab_url 抓取 https://ui.shadcn.com (maxTokens=1200) 提纯并复刻：',
        actionLabel: '获取 MCP 配置',
        targetTab: 'quickstart',
      },
    ];
  }

  return [
    {
      id: 'one-click-clone',
      title: 'Click element, ship 1:1 UI',
      flowNodes: ['Pick node', 'Paste context', 'Ship JSX'],
      promptToCopy: 'Build a responsive React + Tailwind component matching this AnyGrab context 1:1:',
      actionLabel: 'Open sandbox',
      targetTab: 'playground',
    },
    {
      id: 'steal-design-system',
      title: 'Extract tokens, restyle safely',
      flowNodes: ['Grab palette', 'Apply tokens', 'Keep logic'],
      promptToCopy: 'Restyle our Tailwind UI with these AnyGrab Design Tokens. Keep all logic untouched:',
      actionLabel: 'Inspect tokens',
      targetTab: 'playground',
    },
    {
      id: 'auto-mcp-agent',
      title: 'Send URL via MCP server',
      flowNodes: ['Add MCP', 'Send URL', 'Auto distill'],
      promptToCopy: 'Run anygrab grab_url on https://ui.shadcn.com (maxTokens: 1200) and clone its grid:',
      actionLabel: 'Copy MCP config',
      targetTab: 'quickstart',
    },
  ];
}
