# AnyGrab Design System (`DESIGN.md`)

AnyGrab 是一款在本地毫秒级剥离网页混淆样式与冗余 DOM、提纯为 AI 编程上下文的光学工程工具。官网界面采用 **「暗室激光剥离台（Obsidian X-Ray Laser Dissection Stage）」** 方向（用户确认）：以深曜石画布、钛白巨字与滚轮驱动的逐层 X 光剥离动效取代冗长文本。

> Chrome MV3 扩展弹窗（`apps/extension/public/popup.html`、`apps/extension/public/guide.html`）为适配小尺寸高密度日常点选场景，保留浅色档案纸与信号橙红取景框规范（Agent 推断）。

## 1. 视觉基调与禁止项
- **色彩配比**：84% 深曜石画布 `#08090C` + 12% 碳黑玻璃面板 `#101217` / `#171A22` + 4% 激光信号色（信号橙红 `#FF4D1C` 光学取景框与翠绿 `#10B981` 压缩遥测信号）（用户确认）。
- **信息减负约束**：单屏主标题严格控制在 15 个中文字符以内；禁止整段多句散文；以交互式光学取景舞台、X 光 3D 剥离动效与等宽数字直接表达价值（用户确认）。
- **严禁事项**：严禁黑底紫蓝弥散发光球、彩虹渐变标题字、装饰性 Emoji 图标、或首屏死板左文右景分栏（Agent 推断）。

## 2. 色彩变量（CSS Custom Properties — 官网暗室系统）
- `--ag-bg-canvas`: `#08090C` — 全局暗室底色，配合 2.8% SVG 分形噪点微粒层（Agent 推断）。
- `--ag-bg-elevated`: `#101217` — 顶部悬浮胶囊栏、卡片主体与双沙盒控制台底色（Agent 推断）。
- `--ag-bg-surface`: `#171A22` — 分段控制槽、终端代码区与悬浮矩阵行高亮底色（Agent 推断）。
- `--ag-bg-stage`: `#0B0D12` — 光学取景舞台与代码对比深槽底色（Agent 推断）。
- `--ag-border`: `rgba(255, 255, 255, 0.08)` — 全局细线结构描边（Agent 推断）。
- `--ag-border-strong`: `rgba(255, 255, 255, 0.16)` — 激活态与悬停态描边（Agent 推断）。
- `--ag-text-primary`: `#F4F5F8` — 钛白主标题、重点指标与主 CTA 文字（用户确认）。
- `--ag-text-secondary`: `#A1A7B5` — 次级导语、表头与控件标签，保证高对比可读（Agent 推断）。
- `--ag-text-muted`: `#7C8292` — 版本元数据与辅助坐标，最低对比度达标 WCAG AA（Agent 推断）。
- `--ag-accent`: `#FF4D1C` — 光学激光信号橙红，仅用于十字 L 角标选框、扫描线与当前激活状态（Agent 推断）。
- `--ag-accent-soft`: `rgba(255, 77, 28, 0.12)` — 选框半透明遮罩底色（Agent 推断）。
- `--ag-emerald`: `#10B981` — 压缩收益遥测信号色，如 `-94.3%`、已复制与就绪状态（Agent 推断）。
- `--ag-emerald-soft`: `rgba(16, 185, 129, 0.12)` — 遥测徽章半透底色（Agent 推断）。

## 3. 字体、字号与排版尺度
- `--ag-font-sans`: 无衬线界面字体栈，覆盖 Inter 与 PingFang SC 系统黑体（Agent 推断）。
- `--ag-font-mono`: 等宽代码与指标字体栈，配合 `.ag-tabular` 开启等宽数字对齐（Agent 推断）。
- **Hero Display**：使用 clamp 自适应巨字标题，字重 800、紧字距与平衡换行（Agent 推断）。
- **最小字号底线**：全站正文字号不低于 12px，角标与元数据不低于 11px，避免窄屏拥挤（Agent 推断）。

## 4. 圆角与材质工艺
- `--ag-radius-lg`: `16px` — 光学取景舞台、X 光 3D 剥离台与双沙盒外框（Agent 推断）。
- `--ag-radius-md`: `10px` — 配方卡片、命令行 dock 与终端面板（Agent 推断）。
- `--ag-radius-sm`: `6px` — 分段切换滑块、代码片段键帽与色板胶囊（Agent 推断）。

## 5. GSAP + Lenis 动效与滚动叙事编排
- **Lenis 平滑滚动**：在支持动画的浏览器端与 GSAP ticker 同步驱动，导航胶囊高亮随滚轮自动追踪，点击平滑滑达目标锚点（用户确认）。
- **Hero 磁吸光学取景舞台**：默认自动循环巡航锁定样本并触发激光扫掠；鼠标移入切换为阻尼磁吸追踪并实时更新提纯 Token 读数（Agent 推断）。
- **滚轮一镜到底 X 光剥离**：桌面端通过 ScrollTrigger pin 与 scrub 随滚轮逐层分离 3D 透视堆栈（剥离废码、抽离设计规范、合成纯净代码），并附带跳过动效锚点；移动端与降动效模式自动切为简洁垂直阶梯展示（用户确认）。
- **单发进度条与弹簧滑块**：跑分对比条首次入屏单发从缩放到展开；顶栏五段导航与格式切换采用弹簧滑块过渡（Agent 推断）。

## 6. 核心界面映射
- 全局暗室令牌与流光样式：`apps/playground/src/index.css`
- 运动环境安全守卫：`apps/playground/src/utils/motion.ts`
- 悬浮玻璃胶囊导航栏：`apps/playground/src/components/NavbarHero.tsx`
- 首屏光学舞台与滚轮 X 光剥离：`apps/playground/src/components/OverviewView.tsx`
- 双沙盒实时提纯控制台：`apps/playground/src/components/LivePlayground.tsx`
- 客观跑分对比与 10 样本矩阵：`apps/playground/src/components/LeaderboardView.tsx`
- 三套零废话 AI 配方：`apps/playground/src/components/WorkflowsView.tsx`
- 安装指南与四客户端 MCP 配置：`apps/playground/src/components/QuickStartView.tsx`
