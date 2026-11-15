# AnyGrab Design System (`DESIGN.md`)

AnyGrab 是一款在本地毫秒级剥离网页混淆样式与冗余 DOM、提纯为 AI 编程上下文的 MIT 开源工程工具。官网与隐私页全面遵循 **`tasteskill 2.5.1`（`design-taste-frontend`）** 单一克制设计系统：平实精炼文案、等边对齐容器（`.ag-wrap`）、原生顺滑滚动（零滚动劫持）、以及一等公民的 **亮色档案纸（Archival Paper） / 暗色墨黑（Evening Ink）双主题系统**。

## 1. 视觉基调与克制原则
- **双主题一等公民（`data-theme="light" | "dark"`）**：
  - **亮色模式（默认）**：暖白档案纸 `#F6F5F0` 主背景 + `#ECEAE2` 次级分段底色 + `#FFFFFF` 洁净窗口面板 + `#141413` 暖深墨文字 + 朱砂橙红 `#C93E18` 强调色与深翠绿 `#0E7550` 指标色，与 Chrome 扩展弹窗视觉语言高度统一。
  - **暗色模式**：深墨黑 `#0B0C0F` 主背景 + `#111318` 次级分段底色 + `#161920` 窗口面板 + `#F2F3F5` 亮白文字 + 信号橙红 `#FF5629` 与翠绿 `#1AD196`。
- **文案极简约束（`copy.md`）**：消除全大写机械眉标（Eyebrow）、冗余多行副卡片与空话形容词；每个分区采用「主标题句 + 柔和次句（`.muted`）」两句式结构，控制单屏非代码词数。
- **严禁事项**：严禁紫/靛蓝弥散霓虹光晕、彩虹渐变字、悬浮毛玻璃胶囊顶栏、Lenis 等滚动劫持库、装饰性 Emoji 图标、或三层以上嵌套盒模型。

## 2. 语义色彩令牌（`apps/playground/src/index.css`）
- `--ag-bg` / `--ag-bg-alt`: 页面主画布与交替区块底色（`#F6F5F0` / `#ECEAE2` 亮色；`#0B0C0F` / `#111318` 暗色）。
- `--ag-panel` / `--ag-panel-muted`: 真实产品窗口卡片与工具栏底色。
- `--ag-code-bg` / `--ag-code-ink`: 亮暗自适应代码与终端底色。
- `--ag-ink` / `--ag-ink-secondary` / `--ag-muted`: 三级可读排版色阶，全线满足 WCAG AA/AAA 对比度。
- `--ag-line` / `--ag-line-strong`: `1px` 建筑细线分割与边框。
- `--ag-accent`: 光学取景框、主按钮与 Star 引导高光色（`#C93E18` / `#FF5629`）。
- `--ag-emerald`: Token 压缩率与高还原度指标色（`#0E7550` / `#1AD196`）。
- `--ag-lit-bg` / `--ag-lit-surface`: 首屏 `collage` 产品窗口柔和摄影棚底色（`sage` lit ground）。
- `--ag-inv-bg` / `--ag-inv-ink`: 页尾开源 Star 号召暗色收尾带（`footer.closing`）。

## 3. 字体与排版尺度
- `--ag-font-display` / `--ag-font-sans`: Google Fonts `Host Grotesk`（标题字重 `500`、紧字距 `-0.035em`，正文 `400/500`）搭配 `PingFang SC` / `Noto Sans SC`。
- `--ag-font-mono`: `JetBrains Mono` 等宽代码字体，配合 `.ag-tabular` 等宽数字对齐。
- **最小字号**：正文 `16px`，辅助说明 `14px`，标签与代码徽章 `12.5px–13px`，拒绝拥挤微缩字。

## 4. 动效规范（`motion.md`）
- **首屏单次入场**：加载时标题与产品窗口柔和就位一次（`620ms–760ms` `cubic-bezier(0.22, 1, 0.36, 1)`），`prefers-reduced-motion` 下静止直出。
- **可暂停示例轮播**：首屏右侧产品窗口 3 组真实提取样本每 `3.2s` 切换，悬停自动停驻，右下角配备 `32px` 独立暂停/播放圆钮。
- **指针微交互**：按钮悬停微抬 `-1px`、按压 `.985` 回弹；卡片悬停微抬 `-2px`；文字链接下划线自左向右平滑绘制；全程零滚动视差与零滚动劫持。

## 5. 核心界面映射
- 顶栏导航、亮暗模式切换、中英切换与 GitHub Star 入口：`apps/playground/src/components/NavbarHero.tsx`
- 首屏左文右窗 `collage` 舞台与三列对比条：`apps/playground/src/components/OverviewView.tsx`
- 双沙盒实时提纯台（单行样本胶囊 + 实时对比窗口）：`apps/playground/src/components/LivePlayground.tsx`
- 单屏左右分栏跑分榜（5 方案对比条 + 10 样本细线账本）：`apps/playground/src/components/LeaderboardView.tsx`
- 三套精简编码代理指令配方：`apps/playground/src/components/WorkflowsView.tsx`
- 30 秒扩展安装与四客户端 MCP 配置：`apps/playground/src/components/QuickStartView.tsx`
- 页尾 MIT 开源求 Star 收尾带与双主题隐私页：`apps/playground/src/App.tsx`、`apps/playground/public/privacy.html`
