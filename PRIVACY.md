# Privacy Policy / 隐私政策 — AnyGrab

**Effective Date / 生效日期:** November 15, 2026  
**Open-Source Repository / 开源仓库:** [https://github.com/botshen/anygrab](https://github.com/botshen/anygrab)  
**Web Version / 在线页面:** [https://botshen.github.io/anygrab/privacy.html](https://botshen.github.io/anygrab/privacy.html)

---

## English

### 1. Overview & Zero Data Collection Commitment

**AnyGrab** (including the AnyGrab Chrome Extension, CLI, MCP Server, and Web Playground) is a **100% local, open-source** DOM and UI context distillation tool licensed under the MIT License.

- **No Personal Data Collected:** AnyGrab does **not** collect, transmit, store on external servers, sell, rent, or share any personal information, browsing history, page content, cookies, authentication credentials, IP addresses, or telemetry.
- **No Remote Servers or Analytics:** AnyGrab operates without any backend analytics, tracking pixels, third-party SDKs, or cloud processing servers. Every DOM inspection, CSS computation, and token-budget distillation runs strictly locally inside your own browser on your device.

### 2. How Browser Permissions Are Used

The AnyGrab Chrome Extension requests only the minimum permissions necessary to perform user-initiated UI element extraction:

- **`activeTab` & `scripting` & `content_scripts`:** Used solely when you explicitly activate the AnyGrab element picker (by clicking the extension toolbar icon, clicking "Pick Element on Page", or pressing `Alt+Shift+G`) to render the local Shadow-DOM selection overlay, read computed CSS styles (`getComputedStyle`) of the element you select, and distill the selected DOM subtree locally. When fetching `<link rel="stylesheet">` CSS rules referenced by the inspected webpage to synthesize hover utilities, requests are made locally from your browser with `credentials: 'omit'` and are never sent to AnyGrab or any third party.
- **`clipboardWrite`:** Used exclusively when you click an element in picker mode or click a "Copy" button inside the AnyGrab popup or practice guide, writing the distilled prompt, JSX, Tailwind HTML, or Markdown output to your system clipboard so you can paste it into your preferred AI coding assistant.
- **`storage` (`chrome.storage.local`):** Used strictly locally on your device to persist your extension preferences (interface language, output format, token budget, SVG/hover toggles, website URL) and up to the 20 most recent locally captured snippets for convenient re-copying. You can clear this local history at any time with one click via the **Clear** button in the extension popup or by uninstalling the extension.

### 3. Third-Party Sharing & AI Usage Disclosure

- AnyGrab does **not** call any external Large Language Model (LLM) APIs and does **not** transfer user data to any third parties.
- AnyGrab never uses user data for advertising, creditworthiness, lending, or profiling purposes.

### 4. Open-Source Transparency & Contact

AnyGrab's complete source code is publicly auditable under the MIT License at [https://github.com/botshen/anygrab](https://github.com/botshen/anygrab).  
If you have any questions or security concerns, please open an issue at [https://github.com/botshen/anygrab/issues](https://github.com/botshen/anygrab/issues).

---

## 简体中文

### 1. 总览与零数据收集承诺

**AnyGrab**（包含 AnyGrab Chrome 浏览器扩展、CLI 命令行工具、MCP 本地服务及在线交互靶场）是一款基于 MIT 协议开源的 **100% 纯本地运行**网页 DOM 与 UI 上下文提纯工具。

- **不收集任何个人数据：** AnyGrab **绝不**收集、上传、在外部服务器存储、出售或共享您的任何个人信息、浏览记录、网页正文内容、Cookie、账号密码、IP 地址或行为遥测数据。
- **无远程服务器与第三方统计：** AnyGrab 不接入任何后端服务器、第三方统计 SDK 或追踪脚本。所有元素点选、计算样式解析与 Token 预算裁剪均 100% 在您本机浏览器内存中离线完成。

### 2. 浏览器扩展权限用途说明

AnyGrab 浏览器扩展仅在您主动触发提取操作时使用以下最小必要权限：

- **`activeTab`、`scripting` 与 `content_scripts`：** 仅当您主动点击扩展图标、点击「去当前网页点选元素」或按下快捷键 `Alt+Shift+G` 时，用于在当前页面渲染 Shadow-DOM 光学取景选框、读取所选元素的本地计算样式（`getComputedStyle`），以及在不携带凭证（`credentials: 'omit'`）的前提下读取当前页面引用的公开 CSS 样式表以还原 `:hover` 交互类名。相关内容仅在本地处理，绝不外发。
- **`clipboardWrite`（剪贴板写入）：** 仅当您在取景模式下单击目标元素，或在扩展弹窗/练习靶场中点击「复制」按钮时，将提纯后的 Prompt、React JSX、Tailwind HTML 或 Markdown 写入您的系统剪贴板，方便您直接粘贴至 AI 编程工具。
- **`storage`（本地存储 `chrome.storage.local`）：** 仅在您的设备本地保存界面语言、输出格式、Token 预算等偏好设置，以及最近最多 20 条本地提取记录以便随时重制复制。您可以随时点击扩展面板中的**「清空」**按钮或卸载扩展彻底清除所有本地数据。

### 3. 第三方共享与合规声明

- AnyGrab 运行过程**不调用任何外部大模型 API**，也不会将任何用户数据传输给任何第三方。
- AnyGrab 绝不将任何用户数据用于个性化广告、画像分析或信贷评估等无关用途。

### 4. 开源透明与联系方式

AnyGrab 全部源代码已在 GitHub 按 MIT 协议公开，欢迎随时审计：[https://github.com/botshen/anygrab](https://github.com/botshen/anygrab)。  
如有任何隐私或安全疑问，请通过 GitHub Issues 联系我们：[https://github.com/botshen/anygrab/issues](https://github.com/botshen/anygrab/issues)。
