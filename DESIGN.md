# AnyGrab Design System (`DESIGN.md`)

AnyGrab 是一款把任意网页组件与复杂合并表格在本地毫秒级提纯为 AI 编程上下文的精密工具。界面设计遵循 **「暖白档案纸上的光学取景器（Optical Reticle on Archival Paper）」** 方向，以干净克制的编辑式排版衬托核心的选框提取与代码产出。

## 1. 视觉基调与禁止项
- 全端采用 **85% 微暖石白画布 + 10% 深炭黑代码舞台 + 5% 信号橙红选框色** 的配比，官网与插件三端视觉同源。
- 严禁使用黑底紫蓝弥散发光球、彩虹渐变标题字、满屏彩色胶囊药丸与装饰性 Emoji 图标。
- 首屏采用「左文右景」分屏交互舞台，直接展示带橙红十字角标选框的网页组件与深色提纯代码对比。

## 2. 色彩变量（CSS Custom Properties）
- `--ag-bg-canvas`: `#F5F4EF` — 页面主背景（微暖档案纸色，避免刺眼纯白）。
- `--ag-bg-surface`: `#FFFFFF` — 卡片、工作台顶栏与控件主面板。
- `--ag-bg-subtle`: `#ECEAE3` — 分段控制器底槽、次级代码块底与表头浅底。
- `--ag-bg-stage`: `#141413` — 代码终端、提纯结果舞台与网页浮层 HUD 底色。
- `--ag-bg-stage-elevated`: `#1F1F1D` — 深色终端顶栏与键帽背景。
- `--ag-border`: `#DFDDD4` — 全局 `1px` 结构分割细线与面板描边。
- `--ag-border-strong`: `#C7C4B8` — 按钮与交互卡片悬停态描边。
- `--ag-text-primary`: `#141413` — 主标题、正文重点与实心主按钮底色。
- `--ag-text-secondary`: `#52514C` — 说明正文与常规导航文字（深浅对比度 > 6.8:1）。
- `--ag-text-muted`: `#78766F` — 辅助元数据、版本号与坐标读数。
- `--ag-accent`: `#D94E28` — 唯一主强调色（国际信号橙红），仅用于光学选框、当前激活指示条与关键省流指标。
- `--ag-accent-soft`: `rgba(217, 78, 40, 0.09)` — 选框半透明高亮遮罩与轻量强调底色。
- `--ag-success`: `#15803D` — 仅用于「已复制」瞬态反馈与跑分满分校验标识。

## 3. 字体、字号与中文排版节奏
- `--ag-font-sans`: 无衬线界面字体栈（Inter + PingFang SC / 系统中文黑体）。
- `--ag-font-mono`: 等宽代码与指标字体栈（JetBrains Mono / SFMono-Regular），所有数据表格与体积指标启用 `tabular-nums` 等宽数字对齐。
- 大标题行高保持 1.24–1.32 并开启 `text-wrap: balance`；所有可能换行的中文正文与辅助说明行高统一设为 1.6–1.7，杜绝多行拥挤与窄容器单字孤行。

## 4. 圆角、阴影与间距刻度
- `--ag-radius-lg`: `12px` — 首屏交互舞台、在线沙盒双栏外框与大型区块容器。
- `--ag-radius-md`: `8px` — 按钮、输入框、分段切换器与常规信息面板。
- `--ag-radius-sm`: `5px` — 快捷键 `<kbd>`、内联代码标签与选框四角控制柄。
- 面板层级优先依靠底色明度差（`#F5F4EF` → `#FFFFFF` → `#141413`）与 `1px` `--ag-border` 细线区分；仅首屏主舞台与网页浮层使用低对比柔影。

## 5. 核心界面映射
- 全局令牌与基础排版样式：`apps/playground/src/index.css`
- 官网顶栏与下划线式导航：`apps/playground/src/components/NavbarHero.tsx`
- 首屏左文右景分屏舞台与对比矩阵：`apps/playground/src/components/OverviewView.tsx`
- 双沙盒实时提纯工作台：`apps/playground/src/components/LivePlayground.tsx`
- 客观跑分横向对比与数据矩阵表：`apps/playground/src/components/LeaderboardView.tsx`
- 实战教程与一键接入配置页：`apps/playground/src/components/WorkflowsView.tsx`、`apps/playground/src/components/QuickStartView.tsx`
- Chrome 插件弹窗与新手练习靶场：`apps/extension/public/popup.html`、`apps/extension/public/guide.html`
- 网页 Shadow DOM 光学选框与底部工具条：`apps/extension/src/picker/shadow-ui.ts`
