#!/usr/bin/env node
/**
 * AnyGrab Full-Stack Real-Browser E2E & Open-Source Governance Verifier
 *
 * Covers 4 mandatory acceptance gates:
 *   1. Real Chrome MV3 Extension E2E (Playwright persistent context + Service Worker + Open Shadow DOM)
 *   2. Interactive Website `apps/playground/dist` Real Browser E2E (0 Console/Page/HTTP Errors)
 *   3. CLI & Stdio MCP Server Real Subprocess E2E (`spawn` + `StdioClientTransport` + TSX compiler validation)
 *   4. 1,000-Star Open-Source Purity, Security & Benchmark Consistency Audit
 *
 * Usage:
 *   node e2e/verify-all.mjs
 *   node e2e/verify-all.mjs --only=ext|playground|cli-mcp|audit [--skip-rebuild]
 */

import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import ts from 'typescript';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const EXT_DIST_DIR = path.join(REPO_ROOT, 'apps', 'extension', 'dist');
const PLAYGROUND_DIST_DIR = path.join(REPO_ROOT, 'apps', 'playground', 'dist');
const CLI_BIN_PATH = path.join(REPO_ROOT, 'packages', 'cli', 'dist', 'cli.js');
const MCP_BIN_PATH = path.join(REPO_ROOT, 'packages', 'mcp', 'dist', 'index.js');

const SYSTEM_CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PLAYWRIGHT_CACHE_DIR = path.join(os.homedir(), 'Library', 'Caches', 'ms-playwright');

const VOID_HTML_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

/* -------------------------------------------------------------------------- */
/* Helpers: Logging, Subprocess, Tag & JSX Validators, Browser Discovery      */
/* -------------------------------------------------------------------------- */

const reportSummary = {
  startedAt: new Date().toISOString(),
  gates: {},
};

function logSection(title) {
  console.log(`\n========================================================================`);
  console.log(`▶ ${title}`);
  console.log(`========================================================================`);
}

function logPass(step, detail = '') {
  console.log(`  ✔ ${step}${detail ? ` — ${detail}` : ''}`);
}

function runProcess(cmd, args, { cwd = REPO_ROOT, stdinText, timeoutMs = 120_000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, FORCE_COLOR: '0', CI: '1' },
    });

    const stdoutChunks = [];
    const stderrChunks = [];
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`Command timed out after ${timeoutMs}ms: ${cmd} ${args.join(' ')}`));
    }, timeoutMs);

    child.stdout.on('data', (chunk) => stdoutChunks.push(Buffer.from(chunk)));
    child.stderr.on('data', (chunk) => stderrChunks.push(Buffer.from(chunk)));
    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({
        code: code ?? 1,
        stdout: Buffer.concat(stdoutChunks).toString('utf8'),
        stderr: Buffer.concat(stderrChunks).toString('utf8'),
      });
    });

    if (stdinText !== undefined) {
      child.stdin.write(stdinText);
    }
    child.stdin.end();
  });
}

/**
 * Validates that an HTML fragment has 100% balanced opening and closing tags
 * (excluding HTML comments and standard HTML5 void tags).
 */
function assertBalancedHtmlTags(html, contextLabel) {
  const withoutComments = html.replace(/<!--[\s\S]*?-->/g, '');
  const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9:-]*)(?:\s+(?:"[^"]*"|'[^']*'|[^>"'])*)?\s*(\/?)>/g;
  const stack = [];
  let match;
  let tagCount = 0;

  while ((match = tagRegex.exec(withoutComments)) !== null) {
    const full = match[0];
    const tag = match[1].toLowerCase();
    const selfClosingSlash = match[2] === '/';
    const isClosing = full.startsWith('</');
    tagCount++;

    if (isClosing) {
      assert.ok(
        stack.length > 0,
        `[${contextLabel}] Unexpected closing tag </${tag}> with empty stack`,
      );
      const top = stack.pop();
      assert.equal(
        top,
        tag,
        `[${contextLabel}] Mismatched HTML closing tag: expected </${top}>, found </${tag}>`,
      );
    } else if (!selfClosingSlash && !VOID_HTML_TAGS.has(tag)) {
      stack.push(tag);
    }
  }

  assert.ok(tagCount > 0, `[${contextLabel}] Expected at least 1 HTML tag in output`);
  assert.equal(
    stack.length,
    0,
    `[${contextLabel}] Unclosed HTML tags remaining on stack: ${stack.join(' > ')}`,
  );
  return tagCount;
}

/**
 * Compiles a JSX snippet with TypeScript's real JSX parser (`ts.JsxEmit.ReactJSX`)
 * to guarantee 0 syntax errors.
 */
function assertValidJsxSyntax(jsxSnippet, contextLabel) {
  assert.ok(jsxSnippet && jsxSnippet.trim().length > 0, `[${contextLabel}] Empty JSX snippet`);
  const wrappedSource = `export function VerifiedSnippet() {\n  return (\n    <>\n${jsxSnippet}\n    </>\n  );\n}\n`;
  const result = ts.transpileModule(wrappedSource, {
    fileName: 'VerifiedSnippet.tsx',
    reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.ReactJSX,
    },
  });

  const diagnostics = result.diagnostics ?? [];
  if (diagnostics.length > 0) {
    const formatted = diagnostics
      .map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'))
      .join('; ');
    assert.fail(
      `[${contextLabel}] TypeScript JSX parser reported syntax diagnostics: ${formatted}\nSnippet:\n${jsxSnippet.slice(0, 600)}`,
    );
  }
}

function discoverCachedPlaywrightChromiumCandidates() {
  const found = [];
  if (fs.existsSync(PLAYWRIGHT_CACHE_DIR)) {
    const entries = fs
      .readdirSync(PLAYWRIGHT_CACHE_DIR)
      .filter((name) => name.startsWith('chromium-'))
      .sort()
      .reverse();
    for (const dir of entries) {
      const macArm = path.join(
        PLAYWRIGHT_CACHE_DIR,
        dir,
        'chrome-mac-arm64',
        'Google Chrome for Testing.app',
        'Contents',
        'MacOS',
        'Google Chrome for Testing',
      );
      const macX64 = path.join(
        PLAYWRIGHT_CACHE_DIR,
        dir,
        'chrome-mac',
        'Chromium.app',
        'Contents',
        'MacOS',
        'Chromium',
      );
      if (fs.existsSync(macArm)) found.push(macArm);
      if (fs.existsSync(macX64)) found.push(macX64);
    }
  }
  if (fs.existsSync(SYSTEM_CHROME_PATH)) {
    found.push(SYSTEM_CHROME_PATH);
  }
  return found;
}

function getStandardBrowserExecutable() {
  if (fs.existsSync(SYSTEM_CHROME_PATH)) {
    return SYSTEM_CHROME_PATH;
  }
  const candidates = discoverCachedPlaywrightChromiumCandidates();
  assert.ok(candidates.length > 0, 'No Chrome or Playwright Chromium binary found on machine');
  return candidates[0];
}

function createComplexTestFixtureHtml(cssHref = '/styles.css') {
  const verboseSvgPaths = Array.from(
    { length: 8 },
    (_, idx) =>
      `<path d="M${idx + 2} 4C${idx + 5}.5 4 19 8.5 19 12C19 15.5 14.5 20 ${idx + 2} 20Z" fill="#818cf8" opacity="0.${idx + 1}" />`,
  ).join('\n');

  const repeatedItems = Array.from(
    { length: 10 },
    (_, idx) => `
      <li class="feature-row css-99x-li-${idx}" data-testid="feat-item-${idx}">
        <span class="feat-index">#${idx + 1}</span>
        <span class="feat-name">Deterministic Pipeline Stage ${idx + 1} — Zero LLM Overhead</span>
      </li>`,
  ).join('\n');

  const css = `
    :root {
      --surface-dark: #0f172a;
      --surface-card: #1e293b;
      --accent-primary: #4f46e5;
      --accent-hover: #4338ca;
      --text-bright: #f8fafc;
      --text-dim: #94a3b8;
    }
    body {
      margin: 0;
      padding: 24px;
      background-color: var(--surface-dark);
      color: var(--text-bright);
      font-family: Inter, system-ui, sans-serif;
    }
    .cards-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 24px;
      margin-bottom: 32px;
    }
    .pro-card {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 16px;
      padding: 24px;
      border-radius: 16px;
      background-color: var(--surface-card);
      border: 1px solid #334155;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.35);
    }
    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .card-title {
      font-size: 20px;
      font-weight: 700;
      color: #ffffff;
      margin: 0;
    }
    .price-tag {
      font-size: 30px;
      font-weight: 800;
      color: #38bdf8;
    }
    .pro-cta {
      padding: 12px 20px;
      border-radius: 8px;
      background-color: var(--accent-primary);
      color: #ffffff;
      font-size: 14px;
      font-weight: 600;
      border: none;
      cursor: pointer;
    }
    .pro-cta:hover {
      background-color: var(--accent-hover);
    }
    .feature-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .feature-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 6px;
      background-color: #0f172a;
      font-size: 13px;
    }
    .merged-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 16px;
    }
    .merged-table th, .merged-table td {
      padding: 10px 14px;
      border: 1px solid #334155;
      text-align: left;
    }
  `;

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>AnyGrab E2E Verification Target</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22><rect width=%2216%22 height=%2216%22 fill=%22%236366f1%22/></svg>" />
  <link rel="stylesheet" href="${cssHref}" />
</head>
<body>
  <main id="page-root" class="css-root-88a sc-mainWrap">
    <div aria-hidden="true" style="display: none;">Hidden Analytics Beacon Noise_99182</div>
    <script>window.__NOISE_SEED__ = "strip-me-immediately";</script>

    <div id="cards-grid" class="cards-grid css-grid-71k" data-testid="pricing-grid">
      <article id="pro-card" class="pro-card css-19x82a sc-pCard _card_19x_1" data-testid="pro-tier-card" data-v-991a2b="">
        <div class="card-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <svg id="pro-icon" width="24" height="24" viewBox="0 0 24 24" aria-label="Pro Sparkle Icon" style="width: 24px; height: 24px; color: #818cf8;">
              <defs><linearGradient id="g1"><stop offset="0%" stop-color="#6366f1"/></linearGradient></defs>
              ${verboseSvgPaths}
            </svg>
            <h2 class="card-title">Pro Agent Scale</h2>
          </div>
          <span class="price-tag">$49/mo</span>
        </div>
        <p style="color: #94a3b8; font-size: 14px; margin: 0;">Sub-5ms deterministic UI distillation with full Tailwind v4 &amp; JSX support.</p>
        <ul id="feature-list" class="feature-list">
          ${repeatedItems}
        </ul>
        <button id="pro-cta" type="button" class="pro-cta css-btn-hash99" data-testid="upgrade-cta">
          Deploy Agent Pipeline
        </button>
      </article>

      <article id="team-card" class="pro-card css-19x82b">
        <div class="card-header">
          <h2 class="card-title">Enterprise Mesh</h2>
          <span class="price-tag">$199/mo</span>
        </div>
        <p style="color: #94a3b8; font-size: 14px; margin: 0;">Custom declarative site adapters &amp; dedicated browser fleet integration.</p>
        <button id="team-cta" type="button" class="pro-cta">Contact Architecture</button>
      </article>
    </div>

    <section id="table-section">
      <h3 style="font-size: 18px; font-weight: 700;">Quarterly Regional Telemetry (Merged Cells)</h3>
      <table id="merged-table" class="merged-table">
        <thead>
          <tr>
            <th rowspan="2">Region</th>
            <th colspan="2">H1 Revenue ($M)</th>
            <th rowspan="2">YoY Growth</th>
          </tr>
          <tr>
            <th>Q1 Actual</th>
            <th>Q2 Actual</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>North America</td>
            <td>$14.2M</td>
            <td>$18.6M</td>
            <td>+31.0%</td>
          </tr>
          <tr>
            <td>APAC &amp; EMEA</td>
            <td>$9.8M</td>
            <td>$12.4M</td>
            <td>+26.5%</td>
          </tr>
        </tbody>
      </table>
    </section>
  </main>
</body>
</html>`;

  return { html, css };
}

function startFixtureHttpServer() {
  const { html, css } = createComplexTestFixtureHtml('/styles.css');
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const reqUrl = new URL(req.url ?? '/', 'http://127.0.0.1');
      if (reqUrl.pathname === '/styles.css') {
        res.writeHead(200, {
          'Content-Type': 'text/css; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
        });
        res.end(css);
        return;
      }
      if (reqUrl.pathname === '/' || reqUrl.pathname === '/index.html') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
        return;
      }
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
    });
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolve({
        server,
        baseUrl: `http://127.0.0.1:${addr.port}`,
        html,
        css,
        close: () => new Promise((r) => server.close(r)),
      });
    });
  });
}

/* -------------------------------------------------------------------------- */
/* Gate 1: Real Chrome MV3 Extension End-to-End Verification                  */
/* -------------------------------------------------------------------------- */

async function verifyExtensionE2E() {
  logSection(
    'Gate 1: Real Chrome MV3 Extension v0.2.0 E2E (Bilingual _locales + 30s Practice Arena + Shadow DOM + Popup)',
  );

  const manifestPath = path.join(EXT_DIST_DIR, 'manifest.json');
  assert.ok(fs.existsSync(manifestPath), `Missing extension dist manifest at ${EXT_DIST_DIR}`);

  const manifestJson = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.equal(manifestJson.version, '0.2.0', 'Extension manifest version must be 0.2.0');
  assert.equal(manifestJson.default_locale, 'en', 'Extension manifest must set default_locale="en"');
  assert.equal(manifestJson.name, '__MSG_extName__', 'Extension manifest name must use __MSG_extName__');
  assert.equal(
    manifestJson.description,
    '__MSG_extDescription__',
    'Extension manifest description must use __MSG_extDescription__',
  );

  const zhLocalePath = path.join(EXT_DIST_DIR, '_locales', 'zh_CN', 'messages.json');
  const enLocalePath = path.join(EXT_DIST_DIR, '_locales', 'en', 'messages.json');
  assert.ok(fs.existsSync(zhLocalePath), 'Missing dist/_locales/zh_CN/messages.json');
  assert.ok(fs.existsSync(enLocalePath), 'Missing dist/_locales/en/messages.json');
  assert.ok(fs.existsSync(path.join(EXT_DIST_DIR, 'guide.html')), 'Missing dist/guide.html');
  assert.ok(fs.existsSync(path.join(EXT_DIST_DIR, 'guide.js')), 'Missing dist/guide.js');

  const zhMessages = JSON.parse(fs.readFileSync(zhLocalePath, 'utf8'));
  const enMessages = JSON.parse(fs.readFileSync(enLocalePath, 'utf8'));
  assert.match(
    zhMessages?.extName?.message ?? '',
    /AnyGrab.*AI 编程网页组件扒取神器/,
    'zh_CN messages.json must provide Chinese extension name',
  );
  assert.match(
    enMessages?.extName?.message ?? '',
    /AnyGrab/i,
    'en messages.json must provide English extension name',
  );
  logPass(
    'Extension v0.2.0 manifest & `_locales/{zh_CN,en}` static bundle check',
    `${zhMessages.extName.message}`,
  );

  const candidates = discoverCachedPlaywrightChromiumCandidates();
  assert.ok(candidates.length > 0, 'No Chromium / Chrome candidates found for MV3 extension test');

  let context = null;
  let userDataDir = null;
  let serviceWorker = null;
  let chosenExecutable = null;

  for (const exePath of candidates) {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'anygrab-mv3-e2e-'));
    try {
      const ctx = await chromium.launchPersistentContext(tmpDir, {
        executablePath: exePath,
        headless: false,
        locale: 'zh-CN',
        viewport: { width: 1280, height: 900 },
        args: [
          '--headless=new',
          '--lang=zh-CN',
          `--disable-extensions-except=${EXT_DIST_DIR}`,
          `--load-extension=${EXT_DIST_DIR}`,
          '--no-first-run',
          '--no-default-browser-check',
        ],
      });

      let sw = ctx.serviceWorkers()[0] ?? null;
      if (!sw) {
        sw = await ctx.waitForEvent('serviceworker', { timeout: 4000 }).catch(() => null);
      }

      if (sw && sw.url().startsWith('chrome-extension://')) {
        context = ctx;
        userDataDir = tmpDir;
        serviceWorker = sw;
        chosenExecutable = exePath;
        break;
      }

      await ctx.close();
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  assert.ok(
    context && serviceWorker,
    `Failed to load MV3 Service Worker from ${EXT_DIST_DIR} across candidates: ${candidates.join(', ')}`,
  );

  const swUrl = serviceWorker.url();
  const extId = new URL(swUrl).hostname;
  logPass('MV3 Service Worker active', `${swUrl} (binary: ${path.basename(chosenExecutable)})`);

  const fixtureServer = await startFixtureHttpServer();
  const consoleErrors = [];
  const pageErrors = [];
  const trackedPages = new WeakSet();

  const attachErrorTrackers = (targetPage, label) => {
    if (trackedPages.has(targetPage)) return;
    trackedPages.add(targetPage);
    targetPage.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(`[${label} console.error] ${msg.text()}`);
      }
    });
    targetPage.on('pageerror', (err) => {
      pageErrors.push(`[${label} pageerror] ${err.message}`);
    });
  };

  for (const existingPage of context.pages()) {
    attachErrorTrackers(existingPage, 'initial-tab');
  }
  context.on('page', (newPage) => {
    attachErrorTrackers(newPage, 'dynamic-tab');
  });

  try {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    // 1. Open Popup: verify Chinese auto-detection, plain-language cards, `中文 / EN` toggle & `:hover` setting
    const popupPage = await context.newPage();
    attachErrorTrackers(popupPage, 'popup');
    await popupPage.goto(`chrome-extension://${extId}/popup.html`, {
      waitUntil: 'domcontentloaded',
    });

    await popupPage.locator('#app[data-locale="zh-CN"]').waitFor({ state: 'visible' });
    await popupPage.locator('[data-action="pick-element"]').waitFor({ state: 'visible' });
    await popupPage.locator('[data-action="open-guide"]').waitFor({ state: 'visible' });
    await popupPage.locator('[data-action="open-website"]').waitFor({ state: 'visible' });

    const formatExplainZh = (await popupPage.locator('[data-part="format-explain"]').textContent()) ?? '';
    assert.match(
      formatExplainZh,
      /反重力|Codex/,
      `Popup plain-language format explanation should mention Antigravity/Codex, got: ${formatExplainZh}`,
    );

    const initialHistoryCount = await popupPage.locator('[data-part="history-count"]').textContent();
    assert.equal(initialHistoryCount?.trim(), '0', 'Initial popup history count should be 0');

    // Toggle Popup language: `zh-CN` -> `en` -> `zh-CN`
    await popupPage.locator('[data-action="toggle-locale"]').click();
    await popupPage.locator('#app[data-locale="en"]').waitFor({ state: 'visible' });
    const formatExplainEn = (await popupPage.locator('[data-part="format-explain"]').textContent()) ?? '';
    assert.match(formatExplainEn, /Antigravity|Codex/i);

    await popupPage.locator('[data-action="toggle-locale"]').click();
    await popupPage.locator('#app[data-locale="zh-CN"]').waitFor({ state: 'visible' });

    // Enable `:hover` extraction via locale-agnostic label selector
    const includeHoverCheckbox = popupPage.locator('[data-control="include-hover"]');
    if (!(await includeHoverCheckbox.isChecked())) {
      await popupPage.locator('label:has([data-control="include-hover"])').click();
    }
    assert.equal(await includeHoverCheckbox.isChecked(), true, 'Include :hover toggle should be checked');
    logPass(
      'Extension Popup bilingual UI (`zh-CN` ↔ `en`) & plain-language guidance',
      '0 history, Include :hover ON',
    );

    const readLatestHistoryFromStorage = async (expectedCount) => {
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        const arr = await popupPage.evaluate(async () => {
          const data = await chrome.storage.local.get('anygrab_history_v1');
          return Array.isArray(data?.anygrab_history_v1) ? data.anygrab_history_v1 : [];
        });
        if (arr.length >= expectedCount) {
          return arr[0];
        }
        await new Promise((r) => setTimeout(r, 50));
      }
      assert.fail(`Timed out waiting for chrome.storage.local history length >= ${expectedCount}`);
    };

    // 2. Verify Built-in 30s Interactive Tutorial & Practice Arena (`guide.html`)
    const existingGuideTab = context
      .pages()
      .find((p) => p.url() === `chrome-extension://${extId}/guide.html`);
    const guidePage = existingGuideTab ?? (await context.newPage());
    attachErrorTrackers(guidePage, 'guide');
    await guidePage.bringToFront();
    await guidePage.goto(`chrome-extension://${extId}/guide.html`, {
      waitUntil: 'domcontentloaded',
    });

    await guidePage.locator('#guide-app[data-locale="zh-CN"]').waitFor({ state: 'visible' });
    assert.equal(await guidePage.locator('.ag-step-card').count(), 3, 'Guide must show 1-2-3 step cards');
    assert.ok(
      (await guidePage.locator('[data-action="copy-prompt-template"]').count()) >= 3,
      'Guide must provide >= 3 ready-to-copy Antigravity/Codex companion prompts',
    );
    await guidePage.locator('#practice-target-card').waitFor({ state: 'visible' });
    await guidePage.locator('#practice-target-table').waitFor({ state: 'visible' });

    // Toggle Guide language `zh-CN` -> `en` -> `zh-CN`
    await guidePage.locator('[data-action="guide-toggle-locale"]').click();
    await guidePage.locator('#guide-app[data-locale="en"]').waitFor({ state: 'visible' });
    await guidePage.locator('[data-action="guide-toggle-locale"]').click();
    await guidePage.locator('#guide-app[data-locale="zh-CN"]').waitFor({ state: 'visible' });

    // Test 1-click prompt template copy button
    const firstTplBtn = guidePage.locator('[data-action="copy-prompt-template"]').first();
    await firstTplBtn.click();
    await guidePage.waitForFunction(
      () =>
        document
          .querySelector('[data-action="copy-prompt-template"]')
          ?.getAttribute('data-copied') === 'true',
    );

    // Launch real Shadow DOM picker inside Practice Arena & grab Target #1 (`#practice-target-card`)
    await guidePage.locator('[data-action="arena-start-picker"]').click();
    await guidePage
      .locator('#__anygrab-host__[data-anygrab-active="true"][data-anygrab-locale="zh-CN"]')
      .waitFor({ state: 'attached', timeout: 5000 });

    const hudHintsZh = await guidePage.evaluate(
      () =>
        document
          .getElementById('__anygrab-host__')
          ?.shadowRoot?.querySelector('[data-part="hud-hints"]')?.textContent ?? '',
    );
    assert.match(hudHintsZh, /复制给 AI/, 'Shadow HUD in zh-CN must display plain-Chinese click hint');

    // Test Shadow HUD runtime locale toggle (`zh-CN` -> `en` -> `zh-CN`)
    await guidePage.locator('#__anygrab-host__ [data-action="toggle-locale"]').click();
    await guidePage
      .locator('#__anygrab-host__[data-anygrab-locale="en"]')
      .waitFor({ state: 'attached' });
    await guidePage.locator('#__anygrab-host__ [data-action="toggle-locale"]').click();
    await guidePage
      .locator('#__anygrab-host__[data-anygrab-locale="zh-CN"]')
      .waitFor({ state: 'attached' });

    // Select `#practice-target-card` in `prompt` format and grab via real hover + ArrowUp + Click!
    await guidePage.evaluate(() => {
      document.getElementById('practice-target-card')?.scrollIntoView({ block: 'center' });
    });
    const practiceTitleBox = await guidePage
      .locator('#practice-target-card .pricing-tier-name')
      .boundingBox();
    assert.ok(practiceTitleBox, '#practice-target-card .pricing-tier-name bounding box must exist');
    await guidePage.mouse.move(
      practiceTitleBox.x + practiceTitleBox.width / 2,
      practiceTitleBox.y + practiceTitleBox.height / 2,
    );
    await guidePage.waitForFunction(
      () =>
        document.getElementById('__anygrab-host__')?.getAttribute('data-anygrab-target') ===
        'h3.pricing-tier-name',
      null,
      { timeout: 5000 },
    );
    await guidePage.keyboard.press('ArrowUp'); // div.pricing-top-row
    await guidePage.keyboard.press('ArrowUp'); // article.practice-pricing-card
    await guidePage.waitForFunction(
      () =>
        document.getElementById('__anygrab-host__')?.getAttribute('data-anygrab-target') ===
        'article.practice-pricing-card',
      null,
      { timeout: 5000 },
    );
    await guidePage.mouse.click(
      practiceTitleBox.x + practiceTitleBox.width / 2,
      practiceTitleBox.y + practiceTitleBox.height / 2,
    );

    await guidePage
      .locator('[data-part="arena-capture-box"][data-captured="true"]')
      .waitFor({ state: 'visible', timeout: 5000 });
    const arenaPreviewText =
      (await guidePage.locator('[data-part="arena-output-preview"]').textContent()) ?? '';
    assert.match(
      arenaPreviewText,
      /请 1:1 视觉与布局还原/,
      'Practice arena live preview must render Chinese AI replication prompt',
    );
    assert.match(arenaPreviewText, /AI 团队旗舰版/);

    const arenaToastZh = await guidePage.evaluate(
      () =>
        document
          .getElementById('__anygrab-host__')
          ?.shadowRoot?.querySelector('[data-part="toast-text"]')?.textContent ?? '',
    );
    assert.match(arenaToastZh, /已复制.*反重力 \/ Codex/);

    const arenaHistory = await readLatestHistoryFromStorage(1);
    assert.equal(arenaHistory.domain, 'AnyGrab Practice Arena');
    assert.equal(arenaHistory.format, 'prompt');
    logPass(
      'Built-in `guide.html` Practice Target #1 (`#practice-target-card` Prompt)',
      `${arenaToastZh}`,
    );

    // Also verify Practice Arena Target #2 (`#practice-target-table` merged table -> Markdown)
    await guidePage.locator('[data-action="arena-start-picker"]').click();
    await guidePage
      .locator('#__anygrab-host__[data-anygrab-active="true"]')
      .waitFor({ state: 'attached', timeout: 5000 });
    await guidePage.evaluate(() => {
      window.postMessage(
        { source: 'anygrab-e2e', action: 'select', selector: '#practice-target-table' },
        '*',
      );
    });
    await guidePage.waitForFunction(
      () =>
        document.getElementById('__anygrab-host__')?.getAttribute('data-anygrab-target') ===
        'table.practice-merged-table',
      null,
      { timeout: 5000 },
    );
    for (let guard = 0; guard < 4; guard++) {
      const curFmt = await guidePage.locator('#__anygrab-host__').getAttribute('data-anygrab-format');
      if (curFmt === 'markdown') break;
      await guidePage.keyboard.press('Tab');
    }
    await guidePage.keyboard.press('Enter');
    const arenaTableHistory = await readLatestHistoryFromStorage(2);
    assert.equal(arenaTableHistory.format, 'markdown');
    assert.match(arenaTableHistory.output, /亚太区 \(APAC\)/);
    assert.match(arenaTableHistory.output, /¥42\.8M/);
    const arenaTablePreview =
      (await guidePage.locator('[data-part="arena-output-preview"]').textContent()) ?? '';
    assert.match(arenaTablePreview, /亚太区 \(APAC\)/);

    // Restore default `prompt` format in storage before moving to external page
    await popupPage.evaluate(async () => {
      const cur = await chrome.storage.local.get('anygrab_settings_v1');
      await chrome.storage.local.set({
        anygrab_settings_v1: { ...(cur?.anygrab_settings_v1 ?? {}), format: 'prompt' },
      });
    });
    logPass(
      'Built-in `guide.html` Practice Target #2 (`#practice-target-table` Markdown)',
      'Merged financial table distilled & rendered in live arena box',
    );

    // 3. Open complex external webpage & verify silent 0 DOM pollution before activation
    const page = await context.newPage();
    attachErrorTrackers(page, 'content-page');
    await page.goto(fixtureServer.baseUrl, { waitUntil: 'networkidle' });

    await page.waitForTimeout(150);
    const hostCountBefore = await page.locator('#__anygrab-host__').count();
    assert.equal(hostCountBefore, 0, 'Expected 0 DOM nodes injected before picker activation');
    logPass('Silent content script idle state', '0 DOM pollution (#__anygrab-host__ absent)');

    // 4. Trigger Picker via `Alt+Shift+G` shortcut & verify Open Shadow Root + non-empty Badge
    await page.bringToFront();
    await page.keyboard.press('Alt+Shift+KeyG');
    await page.locator('#__anygrab-host__[data-anygrab-active="true"]').waitFor({
      state: 'attached',
      timeout: 5000,
    });

    const shadowCheck = await page.evaluate(() => {
      const host = document.getElementById('__anygrab-host__');
      return {
        exists: Boolean(host),
        shadowMode: host?.shadowRoot?.mode ?? null,
        hudVisible: host?.shadowRoot?.querySelector('[data-part="hud"]') !== null,
        initialFormat: host?.getAttribute('data-anygrab-format'),
        initialLocale: host?.getAttribute('data-anygrab-locale'),
      };
    });
    assert.equal(shadowCheck.exists, true);
    assert.equal(shadowCheck.shadowMode, 'open', 'Shadow Root must be open');
    assert.equal(shadowCheck.hudVisible, true, 'Floating HUD must mount in Shadow Root');
    assert.equal(shadowCheck.initialFormat, 'prompt');
    assert.equal(shadowCheck.initialLocale, 'zh-CN');

    // Hover over `#pro-cta` button and verify highlight box + dimension/token capsule badge
    const ctaBox = await page.locator('#pro-cta').boundingBox();
    assert.ok(ctaBox, '#pro-cta bounding box must exist');
    await page.mouse.move(ctaBox.x + ctaBox.width / 2, ctaBox.y + ctaBox.height / 2);

    await page.waitForFunction(() => {
      const host = document.getElementById('__anygrab-host__');
      const badge = host?.shadowRoot?.querySelector('[data-part="badge"]');
      return badge?.getAttribute('data-visible') === 'true' && (badge.textContent || '').length > 0;
    });

    const overlayInspect = await page.evaluate(() => {
      const host = document.getElementById('__anygrab-host__');
      const sr = host.shadowRoot;
      const badge = sr.querySelector('[data-part="badge"]');
      const highlight = sr.querySelector('[data-part="highlight"]');
      return {
        targetAttr: host.getAttribute('data-anygrab-target'),
        badgeText: badge?.textContent?.trim() ?? '',
        highlightWidth: parseFloat(highlight?.style.width || '0'),
        highlightHeight: parseFloat(highlight?.style.height || '0'),
      };
    });

    assert.equal(
      overlayInspect.targetAttr,
      'button.pro-cta',
      `Expected hover target button.pro-cta, got ${overlayInspect.targetAttr}`,
    );
    assert.match(
      overlayInspect.badgeText,
      /\d+×\d+\s*px.*~\d+.*tokens/i,
      `Badge must display dimensions + token estimate, got: ${overlayInspect.badgeText}`,
    );
    assert.ok(overlayInspect.highlightWidth > 40 && overlayInspect.highlightHeight > 20);
    logPass('Open Shadow Root overlay & live telemetry badge', overlayInspect.badgeText);

    // 5. Test ArrowUp / ArrowDown parent-child scope traversal
    await page.keyboard.press('ArrowUp');
    const afterUp1 = await page.locator('#__anygrab-host__').getAttribute('data-anygrab-target');
    assert.equal(afterUp1, 'article.pro-card', 'ArrowUp #1 should expand from button.pro-cta to article.pro-card');

    await page.keyboard.press('ArrowUp');
    const afterUp2 = await page.locator('#__anygrab-host__').getAttribute('data-anygrab-target');
    assert.equal(afterUp2, 'div.cards-grid', 'ArrowUp #2 should expand from article.pro-card to div.cards-grid');

    await page.keyboard.press('ArrowDown');
    const afterDown1 = await page.locator('#__anygrab-host__').getAttribute('data-anygrab-target');
    assert.equal(afterDown1, 'article.pro-card', 'ArrowDown should retrace breadcrumb stack back to article.pro-card');
    logPass('ArrowUp / ArrowDown AST scope traversal', 'button.pro-cta → article.pro-card → div.cards-grid → article.pro-card');

    // 6. Test Tab format cycling & switch HUD to English (`en`) to verify English JSX toast too
    const observedFormats = [];
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('Tab');
      observedFormats.push(await page.locator('#__anygrab-host__').getAttribute('data-anygrab-format'));
    }
    assert.deepEqual(
      observedFormats,
      ['tailwind-html', 'jsx', 'markdown', 'prompt'],
      'Tab must cycle cleanly through all 4 formats',
    );

    await page.locator('#__anygrab-host__ [data-action="toggle-locale"]').click();
    await page.locator('#__anygrab-host__[data-anygrab-locale="en"]').waitFor({ state: 'attached' });

    // Cycle twice to land on `jsx` and grab `article#pro-card` via real click!
    await page.keyboard.press('Tab'); // tailwind-html
    await page.keyboard.press('Tab'); // jsx
    assert.equal(await page.locator('#__anygrab-host__').getAttribute('data-anygrab-format'), 'jsx');

    await page.mouse.click(ctaBox.x + ctaBox.width / 2, ctaBox.y + ctaBox.height / 2);

    await page.waitForFunction(
      () => {
        const host = document.getElementById('__anygrab-host__');
        const toast = host?.shadowRoot?.querySelector('[data-part="toast"]');
        return toast?.getAttribute('data-visible') === 'true';
      },
      null,
      { timeout: 5000 },
    );

    const toastInfo2 = await page.evaluate(() => {
      const host = document.getElementById('__anygrab-host__');
      const toastText = host?.shadowRoot?.querySelector('[data-part="toast-text"]')?.textContent ?? '';
      return { visible: true, toastText };
    });

    const jsxHistory = await readLatestHistoryFromStorage(3);
    assert.equal(jsxHistory.format, 'jsx');
    assert.equal(jsxHistory.tagLabel, 'article.pro-card');
    assertValidJsxSyntax(jsxHistory.output, 'Extension JSX Grab');
    assert.match(jsxHistory.output, /className="/, 'JSX output must use className');
    assert.match(jsxHistory.output, /\bflex\b/, 'JSX output must include compiled Tailwind flex utility');
    assert.match(jsxHistory.output, /\bbg-indigo-600\b/, 'JSX output must preserve resting bg-indigo-600 without mouse hover contamination');
    assert.match(jsxHistory.output, /\bhover:bg-indigo-700\b/, 'JSX output must expand var(--accent-hover) into hover:bg-indigo-700');
    assert.match(jsxHistory.output, /data-icon="svg"/, 'Verbose SVG must be compacted');
    assert.doesNotMatch(jsxHistory.output, /css-19x82a|data-testid/, 'CSS-in-JS hashes & testids must be stripped');
    assert.match(toastInfo2.toastText, /Copied JSX.*Antigravity \/ Codex/i);
    logPass(
      'Click grab #3 (React JSX + :hover + SVG compaction + English Toast)',
      `${toastInfo2.toastText} · TypeScript JSX validated`,
    );

    // 7. Grab #4: Switch HUD back to `zh-CN`, grab merged `rowspan`/`colspan` table in `tailwind-html`
    await page.waitForTimeout(220);
    await page.keyboard.press('Alt+Shift+KeyG');
    await page.locator('#__anygrab-host__[data-anygrab-active="true"]').waitFor({
      state: 'attached',
      timeout: 5000,
    });
    await page.locator('#__anygrab-host__ [data-action="toggle-locale"]').click();
    await page.locator('#__anygrab-host__[data-anygrab-locale="zh-CN"]').waitFor({ state: 'attached' });

    await page.evaluate(() => {
      window.postMessage({ source: 'anygrab-e2e', action: 'select', selector: '#merged-table' }, '*');
    });
    await page.waitForFunction(
      () => document.getElementById('__anygrab-host__')?.getAttribute('data-anygrab-target') === 'table.merged-table',
      null,
      { timeout: 5000 },
    );
    for (let guard = 0; guard < 4; guard++) {
      const curFmt = await page.locator('#__anygrab-host__').getAttribute('data-anygrab-format');
      if (curFmt === 'tailwind-html') break;
      await page.keyboard.press('Tab');
    }
    assert.equal(await page.locator('#__anygrab-host__').getAttribute('data-anygrab-format'), 'tailwind-html');

    await page.keyboard.press('Enter');
    const htmlHistory = await readLatestHistoryFromStorage(4);
    const toastText3 = await page.evaluate(
      () =>
        document
          .getElementById('__anygrab-host__')
          ?.shadowRoot?.querySelector('[data-part="toast-text"]')?.textContent ?? '',
    );

    assert.equal(htmlHistory.format, 'tailwind-html');
    assertBalancedHtmlTags(htmlHistory.output, 'Extension Tailwind HTML Table Grab');
    assert.match(htmlHistory.output, /rowspan="2"/i, 'Merged table must preserve rowspan="2"');
    assert.match(htmlHistory.output, /colspan="2"/i, 'Merged table must preserve colspan="2"');
    assert.match(htmlHistory.output, /\$18\.6M/, 'Table cell figures must be intact');
    assert.match(toastText3, /已复制.*反重力 \/ Codex/);
    logPass('Enter grab #4 (Tailwind HTML merged table + Chinese Toast)', toastText3);

    // 8. Grab #5: Full `#page-root` in `prompt` format with `locale === 'zh-CN'` -> Chinese Prompt!
    await page.waitForTimeout(220);
    await page.keyboard.press('Alt+Shift+KeyG');
    await page.locator('#__anygrab-host__[data-anygrab-active="true"]').waitFor({
      state: 'attached',
      timeout: 5000,
    });
    await page.evaluate(() => {
      window.postMessage({ source: 'anygrab-e2e', action: 'select', selector: '#page-root' }, '*');
    });
    await page.waitForFunction(
      () => (document.getElementById('__anygrab-host__')?.getAttribute('data-anygrab-target') || '').startsWith('main'),
      null,
      { timeout: 5000 },
    );
    for (let guard = 0; guard < 4; guard++) {
      const curFmt = await page.locator('#__anygrab-host__').getAttribute('data-anygrab-format');
      if (curFmt === 'prompt') break;
      await page.keyboard.press('Tab');
    }
    await page.keyboard.press('Enter');
    const promptHistory = await readLatestHistoryFromStorage(5);
    const toastText4 = await page.evaluate(
      () =>
        document
          .getElementById('__anygrab-host__')
          ?.shadowRoot?.querySelector('[data-part="toast-text"]')?.textContent ?? '',
    );
    assert.equal(promptHistory.format, 'prompt');
    assert.match(
      promptHistory.output,
      /请 1:1 视觉与布局还原以下从网页提取的 UI 组件/,
      'zh-CN prompt output must begin with plain-Chinese AI replication instruction',
    );
    assert.match(
      promptHistory.output,
      /## 设计规范（自动提取）/,
      'zh-CN prompt output must include Chinese Design Tokens section',
    );
    assert.ok(promptHistory.output.includes('North America'));
    assert.doesNotMatch(promptHistory.output, /Hidden Analytics Beacon|strip-me-immediately/);
    logPass('Enter grab #5 (Chinese Structured AI Prompt)', toastText4);

    // 9. Reload `popup.html` & verify all 5 history items, one-click Copy, and 0 errors!
    await popupPage.bringToFront();
    await popupPage.reload({ waitUntil: 'domcontentloaded' });
    await popupPage.locator('.ag-history-item').first().waitFor({ state: 'visible' });

    const historyCountAfter = await popupPage.locator('[data-part="history-count"]').textContent();
    assert.equal(historyCountAfter?.trim(), '5', 'Popup must display all 5 recent grabs');

    const copyBtn = popupPage.locator('[data-action="copy-item"]').first();
    await copyBtn.click();
    await popupPage.waitForFunction(
      () => document.querySelector('[data-action="copy-item"]')?.getAttribute('data-copied') === 'true',
    );
    logPass('Popup Recent Grabs history & one-click Copy', '5 items rendered & copied cleanly');

    assert.equal(
      consoleErrors.length,
      0,
      `Expected 0 Console Errors in Extension E2E, found:\n${consoleErrors.join('\n')}`,
    );
    assert.equal(
      pageErrors.length,
      0,
      `Expected 0 Page Errors in Extension E2E, found:\n${pageErrors.join('\n')}`,
    );
    logPass('Extension Console & Page Error Audit', '0 Console Errors · 0 Page Errors across Popup, Guide & Content Page');

    reportSummary.gates.extension = {
      status: 'PASS',
      version: manifestJson.version,
      executable: chosenExecutable,
      extensionId: extId,
      localesVerified: ['zh-CN', 'en'],
      guideArenaVerified: true,
      grabsVerified: 5,
      consoleErrors: 0,
      pageErrors: 0,
    };
  } finally {
    await context.close().catch(() => {});
    await fixtureServer.close();
    if (userDataDir) {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Gate 2: Official Bilingual Website `apps/playground/dist` Real Browser E2E */
/* -------------------------------------------------------------------------- */

async function verifyPlaygroundE2E() {
  logSection(
    'Gate 2: Official Bilingual 5-Section Website `apps/playground/dist` Real Browser E2E (Chrome 157)',
  );

  assert.ok(
    fs.existsSync(path.join(PLAYGROUND_DIST_DIR, 'index.html')),
    `Missing built website at ${PLAYGROUND_DIST_DIR}/index.html`,
  );

  const mimeMap = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.ico': 'image/x-icon',
  };

  const httpErrors = [];
  const server = http.createServer((req, res) => {
    const reqUrl = new URL(req.url ?? '/', 'http://127.0.0.1');
    const relPath = decodeURIComponent(reqUrl.pathname === '/' ? '/index.html' : reqUrl.pathname);
    const safePath = path.normalize(relPath).replace(/^(\.\.(\/|\\|$))+/, '');
    const fullPath = path.join(PLAYGROUND_DIST_DIR, safePath);

    if (!fullPath.startsWith(PLAYGROUND_DIST_DIR) || !fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
      httpErrors.push(`HTTP 404: ${reqUrl.pathname}`);
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }

    const ext = path.extname(fullPath).toLowerCase();
    res.writeHead(200, { 'Content-Type': mimeMap[ext] ?? 'application/octet-stream' });
    res.end(fs.readFileSync(fullPath));
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const playgroundUrl = `http://127.0.0.1:${port}/`;

  const browserExe = getStandardBrowserExecutable();
  const browser = await chromium.launch({
    executablePath: browserExe,
    headless: true,
  });

  const consoleErrors = [];
  const pageErrors = [];

  try {
    const webContext = await browser.newContext({
      locale: 'zh-CN',
      viewport: { width: 1440, height: 920 },
    });
    const page = await webContext.newPage();
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', (err) => {
      pageErrors.push(err.message);
    });

    await page.goto(playgroundUrl, { waitUntil: 'networkidle' });

    // 1. Verify auto-detected `zh-CN` locale, 5 primary nav tabs & Section 1 (`Product Overview`)
    const initialHtmlLang = await page.evaluate(() => document.documentElement.lang);
    assert.equal(initialHtmlLang, 'zh-CN', 'Website must auto-detect zh-CN browser locale');

    for (const tabKey of ['overview', 'workflows', 'playground', 'leaderboard', 'quickstart']) {
      await page.locator(`nav[aria-label="Primary Website Navigation"] button[data-tab="${tabKey}"]`).waitFor({
        state: 'visible',
      });
    }

    const overviewSection = page.locator('section[aria-label="Product Overview"]');
    await overviewSection.waitFor({ state: 'visible' });
    const overviewText = await overviewSection.innerText();
    assert.match(overviewText, /点一下就能喂给 AI 1:1 复刻/);
    assert.match(overviewText, /反重力\s*\(Antigravity\)/);
    assert.match(overviewText, /发截图/);
    assert.match(overviewText, /F12 扒源码/);
    logPass('Section 1 · Product Overview (`zh-CN` auto-detected)', 'Plain-Chinese Hero + 3 pain-point cards verified');

    // 2. Section 2 (`AI Workflows Guide` — 3 Antigravity & Codex companion workflows)
    await page.locator('button[data-tab="workflows"]').click();
    const workflowsSection = page.locator('section[aria-label="AI Workflows Guide"]');
    await workflowsSection.waitFor({ state: 'visible' });
    assert.equal(
      await workflowsSection.locator('article[data-workflow-id]').count(),
      3,
      'Workflows section must present all 3 Antigravity/Codex workflows',
    );
    const firstWfCopyBtn = workflowsSection.locator('button[data-action="copy-workflow-prompt"]').first();
    await firstWfCopyBtn.click();
    await page.waitForFunction(() =>
      (document.querySelector('button[data-action="copy-workflow-prompt"]')?.textContent || '').includes('已复制'),
    );
    logPass('Section 2 · AI Workflows Guide', '3 Antigravity/Codex workflows & 1-click prompt copy verified');

    // 3. Section 3 (`Live Distillation Playground` — bilingual prompt + budget folding + dual iframes)
    await page.locator('button[data-tab="playground"]').click();
    const playgroundSection = page.locator('section[aria-label="Live Distillation Playground"]');
    await playgroundSection.waitFor({ state: 'visible' });

    const outputCodeLocator = page.locator('[aria-label="Distilled Output Code"]');
    await outputCodeLocator.waitFor({ state: 'visible' });

    // Verify `prompt` format in `zh-CN` calls `@anygrab/core` with `locale: 'zh-CN'`
    await playgroundSection.locator('button[data-format="prompt"]').click();
    const zhPromptCode = (await outputCodeLocator.textContent()) ?? '';
    assert.match(
      zhPromptCode,
      /请 1:1 视觉与布局还原以下从网页提取的 UI 组件/,
      'Playground in zh-CN must output Chinese AI replication prompt',
    );
    assert.match(zhPromptCode, /## 设计规范（自动提取）/);
    assert.doesNotMatch(zhPromptCode, /css-19x82a/, 'Playground must run real @anygrab/core cleaner');

    // Switch to `tailwind-html` & Preset #6 (Kanban 10 Cards)
    await playgroundSection.locator('button[data-format="tailwind-html"]').click();
    await playgroundSection.locator('button[data-preset-id]').nth(5).click();
    const kanbanCodeNoLimit = (await outputCodeLocator.textContent()) ?? '';
    assert.ok(kanbanCodeNoLimit.includes('ENG-401'), 'Preset #6 Kanban must load ENG-401');
    assert.ok(kanbanCodeNoLimit.includes('ENG-410'), 'Unbudgeted Kanban must show ENG-410');

    // Adjust Token Budget slider & quick budget `600` -> verify AST sibling folding & tag closure
    const slider = page.locator('[aria-label="Token Budget Slider"]');
    await slider.fill('500');
    await slider.dispatchEvent('change');
    await playgroundSection.getByRole('button', { name: '600', exact: true }).click();

    const kanbanCodeBudgeted = (await outputCodeLocator.textContent()) ?? '';
    assert.ok(
      kanbanCodeBudgeted.length < kanbanCodeNoLimit.length,
      `Budgeted output (${kanbanCodeBudgeted.length} chars) must be shorter than unbudgeted (${kanbanCodeNoLimit.length} chars)`,
    );
    assert.match(
      kanbanCodeBudgeted,
      /similar items omitted/i,
      'Kanban under 600-token budget must trigger AST sibling folding comment',
    );
    assertBalancedHtmlTags(kanbanCodeBudgeted, 'Playground Budget=600 Tailwind HTML');

    // Test Left (`Original Sandbox Preview`) & Right (`Tailwind Sandbox Preview`) iframes on Preset #1
    await playgroundSection.locator('button[data-budget="unlimited"]').click();
    await playgroundSection.locator('button[data-preset-id]').nth(0).click();

    await playgroundSection.locator('button[data-left-view="preview"]').click();
    const leftIframe = page.locator('iframe[title="Raw HTML Sandbox Preview"]');
    await leftIframe.waitFor({ state: 'visible' });
    const leftFrameContent = await leftIframe.contentFrame().locator('body').innerText();
    assert.match(leftFrameContent, /Pro Scale/i, 'Left raw sandbox iframe must render SaaS pricing content');

    await playgroundSection.locator('button[data-right-view="preview"]').click();
    const rightIframe = page.locator('iframe[title="Distilled Tailwind Sandbox Preview"]');
    await rightIframe.waitFor({ state: 'visible' });
    const rightFrameContent = await rightIframe
      .contentFrame()
      .locator('#ag-sandbox-root')
      .innerText();
    assert.match(rightFrameContent, /Pro Scale/i, 'Right Tailwind sandbox iframe must render distilled content');
    await page.waitForTimeout(300);
    await playgroundSection.locator('button[data-right-view="code"]').click();
    logPass(
      'Section 3 · Live Distillation Playground',
      `Chinese Prompt + ${kanbanCodeNoLimit.length}→${kanbanCodeBudgeted.length} budget folding + dual <iframe> sandboxes verified`,
    );

    // 4. Section 4 (`AnyGrab-Bench Leaderboard` — plain-Chinese guide + 10 rows + `try-live` jump)
    await page.locator('button[data-tab="leaderboard"]').click();
    const leaderboardSection = page.locator('section[aria-label="AnyGrab-Bench Leaderboard"]');
    await leaderboardSection.waitFor({ state: 'visible' });
    const leaderboardText = await leaderboardSection.innerText();
    assert.match(leaderboardText, /一分钟大白话读懂这份跑分榜/);
    assert.match(leaderboardText, /10 大真实场景/);
    assert.match(leaderboardText, /99\.6/, 'Leaderboard must display refreshed 99.6/100 fidelity score');
    assert.match(leaderboardText, /-85\.0%/, 'Leaderboard must display refreshed -85.0% budget compression');

    const tryLiveButtons = leaderboardSection.locator('button[data-action="try-live"]');
    assert.equal(await tryLiveButtons.count(), 10, 'Leaderboard must list all 10 fixture rows');
    await tryLiveButtons.nth(1).click();
    await page.locator('section[aria-label="Live Distillation Playground"]').waitFor({ state: 'visible' });
    logPass('Section 4 · AnyGrab-Bench Leaderboard & Try Live jump', '10 fixtures + 99.6/100 fidelity verified');

    // 5. Section 5 (`Quick Start and MCP Setup` — 3-step Chrome MV3 guide + 4 MCP client configs)
    await page.locator('button[data-tab="quickstart"]').click();
    const quickStartSection = page.locator('section[aria-label="Quick Start and MCP Setup"]');
    await quickStartSection.waitFor({ state: 'visible' });
    const qsInitialText = await quickStartSection.innerText();
    assert.match(qsInitialText, /chrome:\/\/extensions/);
    assert.match(qsInitialText, /apps\/extension\/dist/);
    assert.match(qsInitialText, /30 秒练习靶场/);

    for (const tabLabel of ['Antigravity', 'Codex CLI', 'Cursor', 'Claude Code']) {
      await quickStartSection.getByRole('tab', { name: tabLabel, exact: true }).click();
      const qsText = await quickStartSection.innerText();
      assert.match(qsText, /@anygrab\/mcp/, `Quick Start ${tabLabel} snippet must configure @anygrab/mcp`);
    }
    logPass('Section 5 · Download & MCP Setup', '3-step Chrome MV3 guide + 4 MCP client snippets verified');

    // 6. Test Top-Bar Runtime Language Switcher (`zh-CN` -> `en` -> `zh-CN`)
    const localeSwitcher = page.locator('[data-testid="locale-switcher"]');
    await localeSwitcher.locator('button[data-locale="en"]').click();
    assert.equal(await page.evaluate(() => document.documentElement.lang), 'en');

    await page.locator('button[data-tab="overview"]').click();
    const overviewEnText = await page.locator('section[aria-label="Product Overview"]').innerText();
    assert.match(overviewEnText, /Grab it in 1 click for Coding Agents!/i);

    await page.locator('button[data-tab="playground"]').click();
    await page.locator('button[data-format="prompt"]').click();
    const enPromptCode = (await page.locator('[aria-label="Distilled Output Code"]').textContent()) ?? '';
    assert.match(enPromptCode, /# AnyGrab Distilled UI Context/);
    assert.match(enPromptCode, /## Design Tokens/);

    // Switch back to `zh-CN` and confirm Chinese prompt restores immediately
    await localeSwitcher.locator('button[data-locale="zh-CN"]').click();
    assert.equal(await page.evaluate(() => document.documentElement.lang), 'zh-CN');
    const restoredZhPrompt = (await page.locator('[aria-label="Distilled Output Code"]').textContent()) ?? '';
    assert.match(restoredZhPrompt, /请 1:1 视觉与布局还原/);
    logPass('Official Website Runtime Language Switcher (`zh-CN` ↔ `en`)', 'UI copy + @anygrab/core prompt switched seamlessly');

    assert.equal(
      httpErrors.length,
      0,
      `Expected 0 HTTP 4xx/5xx asset errors in Official Website, found:\n${httpErrors.join('\n')}`,
    );
    assert.equal(
      consoleErrors.length,
      0,
      `Expected 0 Console Errors in Official Website, found:\n${consoleErrors.join('\n')}`,
    );
    assert.equal(
      pageErrors.length,
      0,
      `Expected 0 Page Errors in Official Website, found:\n${pageErrors.join('\n')}`,
    );
    logPass('Official Website Browser Health Audit', '0 Console Errors · 0 Page Errors · 0 HTTP 404s');

    reportSummary.gates.playground = {
      status: 'PASS',
      executable: browserExe,
      sectionsVerified: ['overview', 'workflows', 'playground', 'leaderboard', 'quickstart'],
      localesVerified: ['zh-CN', 'en'],
      consoleErrors: 0,
      pageErrors: 0,
      httpErrors: 0,
    };

    await webContext.close();
  } finally {
    await browser.close();
    await new Promise((r) => server.close(r));
  }
}

/* -------------------------------------------------------------------------- */
/* Gate 3: CLI & Stdio MCP Server Real Subprocess Verification                */
/* -------------------------------------------------------------------------- */

async function verifyCliAndMcpSubprocesses() {
  logSection('Gate 3: Core SDK, CLI & Stdio MCP Server Real Subprocess Verification');

  assert.ok(fs.existsSync(CLI_BIN_PATH), `Missing CLI bundle at ${CLI_BIN_PATH}`);
  assert.ok(fs.existsSync(MCP_BIN_PATH), `Missing MCP bundle at ${MCP_BIN_PATH}`);

  // 0. Programmatic `@anygrab/core` bilingual `locale: 'zh-CN' | 'en'` SDK verification
  const coreEntryUrl = pathToFileURL(path.join(REPO_ROOT, 'packages', 'core', 'dist', 'index.js')).href;
  const { grab } = await import(coreEntryUrl);
  const sampleHtml = `<div style="display:flex;gap:12px;padding:16px;border-radius:12px;background:#1e293b;color:#f8fafc"><h2>旗舰卡片</h2><span>¥99</span></div>`;
  const zhGrabRes = grab(sampleHtml, { format: 'prompt', locale: 'zh-CN', maxTokens: 400 });
  const enGrabRes = grab(sampleHtml, { format: 'prompt', locale: 'en', maxTokens: 400 });
  assert.match(zhGrabRes.output, /请 1:1 视觉与布局还原以下从网页提取的 UI 组件/);
  assert.match(zhGrabRes.output, /## 设计规范（自动提取）/);
  assert.match(enGrabRes.output, /# AnyGrab Distilled UI Context/);
  assert.match(enGrabRes.output, /## Design Tokens/);
  logPass('`@anygrab/core` SDK bilingual `locale: "zh-CN" | "en"` check', 'Chinese & English prompts verified');

  const fixtureServer = await startFixtureHttpServer();

  try {
    // 1. CLI: HTTP URL with external `<link rel="stylesheet">` + `--hover` -> Tailwind HTML
    const urlRes = await runProcess(process.execPath, [
      CLI_BIN_PATH,
      fixtureServer.baseUrl,
      '-f',
      'tailwind-html',
      '--hover',
    ]);
    assert.equal(urlRes.code, 0, `CLI URL run failed: ${urlRes.stderr}`);
    assert.match(urlRes.stderr, /✔ AnyGrab:/, 'CLI must print compression telemetry to stderr');
    assertBalancedHtmlTags(urlRes.stdout, 'CLI URL Tailwind HTML');
    assert.match(urlRes.stdout, /\bgrid\b/, 'External CSS `.cards-grid` must compile to Tailwind `grid`');
    assert.match(urlRes.stdout, /\bgrid-cols-2\b/, 'External CSS must compile to `grid-cols-2`');
    assert.match(urlRes.stdout, /\bhover:bg-/, 'External CSS `:hover` rule must compile to `hover:bg-*`');
    logPass('CLI URL + external <link rel="stylesheet"> → Tailwind', urlRes.stderr.trim());

    // 2. CLI: stdin pipe (`-f markdown -q`)
    const stdinHtml = `${fixtureServer.html.replace('<link rel="stylesheet" href="/styles.css" />', `<style>${fixtureServer.css}</style>`)}`;
    const stdinRes = await runProcess(
      process.execPath,
      [CLI_BIN_PATH, '-f', 'markdown', '-q'],
      { stdinText: stdinHtml },
    );
    assert.equal(stdinRes.code, 0, `CLI stdin run failed: ${stdinRes.stderr}`);
    assert.equal(stdinRes.stderr.trim(), '', '`-q` flag must keep stderr completely silent');
    assert.match(stdinRes.stdout, /\|\s*Region\s*\|/, 'Markdown output must preserve GFM merged table header');
    assert.match(stdinRes.stdout, /\$14\.2M/, 'Markdown table cells must align cleanly');
    logPass('CLI stdin pipe (`-f markdown -q`)', 'Clean stdout + GFM merged table verified');

    // 3. CLI: `--budget 500` tag closure & AST folding
    const budgetRes = await runProcess(process.execPath, [
      CLI_BIN_PATH,
      fixtureServer.baseUrl,
      '-f',
      'tailwind-html',
      '--budget',
      '500',
    ]);
    assert.equal(budgetRes.code, 0, `CLI --budget 500 failed: ${budgetRes.stderr}`);
    const closedTagCount = assertBalancedHtmlTags(budgetRes.stdout, 'CLI --budget 500 Tailwind HTML');
    assert.match(budgetRes.stdout, /similar items omitted/i, '--budget 500 must fold repeated list items');
    logPass('CLI `--budget 500` AST folding & tag closure', `${closedTagCount} HTML tags 100% balanced`);

    // 4. CLI: `--format jsx` real TypeScript JSX compiler check
    const jsxRes = await runProcess(process.execPath, [
      CLI_BIN_PATH,
      fixtureServer.baseUrl,
      '--format',
      'jsx',
      '--hover',
      '--budget',
      '600',
    ]);
    assert.equal(jsxRes.code, 0, `CLI --format jsx failed: ${jsxRes.stderr}`);
    assertValidJsxSyntax(jsxRes.stdout, 'CLI --format jsx --budget 600');
    assert.match(jsxRes.stdout, /className="/);
    assert.match(jsxRes.stdout, /rowSpan=\{2\}|colSpan=\{2\}/);
    logPass('CLI `--format jsx` syntax validity', '0 TypeScript JSX compiler diagnostics');

    // 5. CLI: `--json` structured payload
    const jsonRes = await runProcess(process.execPath, [
      CLI_BIN_PATH,
      fixtureServer.baseUrl,
      '--json',
      '-q',
    ]);
    assert.equal(jsonRes.code, 0);
    const parsedJson = JSON.parse(jsonRes.stdout);
    assert.ok(parsedJson.metrics.rawTokens > parsedJson.metrics.outputTokens);
    assert.ok(parsedJson.metrics.compressionRatio > 0);
    assert.ok(Array.isArray(parsedJson.designTokens.colors) && parsedJson.designTokens.colors.length > 0);
    logPass(
      'CLI `--json` telemetry & DesignTokens',
      `${parsedJson.metrics.rawTokens} → ${parsedJson.metrics.outputTokens} tok (-${parsedJson.metrics.compressionRatio}%)`,
    );

    // 6. Stdio MCP Server via real `StdioClientTransport`
    const mcpRequire = createRequire(path.join(REPO_ROOT, 'packages', 'mcp', 'package.json'));
    const { Client } = await import(
      pathToFileURL(mcpRequire.resolve('@modelcontextprotocol/sdk/client/index.js')).href
    );
    const { StdioClientTransport } = await import(
      pathToFileURL(mcpRequire.resolve('@modelcontextprotocol/sdk/client/stdio.js')).href
    );

    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [MCP_BIN_PATH],
      cwd: REPO_ROOT,
      stderr: 'pipe',
    });

    const mcpClient = new Client(
      { name: 'anygrab-e2e-verifier', version: '0.1.0' },
      { capabilities: {} },
    );

    await mcpClient.connect(transport);
    try {
      const toolsResult = await mcpClient.listTools();
      const toolNames = toolsResult.tools.map((t) => t.name).sort();
      assert.deepEqual(
        toolNames,
        ['extract_design_tokens', 'grab_html', 'grab_url'],
        'MCP server must expose exact 3 tools',
      );
      logPass('MCP `listTools` over StdioClientTransport', toolNames.join(', '));

      // `grab_url`
      const grabUrlRes = await mcpClient.callTool({
        name: 'grab_url',
        arguments: {
          url: fixtureServer.baseUrl,
          selector: '#cards-grid',
          format: 'tailwind-html',
          includeHoverStyles: true,
          maxTokens: 900,
        },
      });
      assert.ok(!grabUrlRes.isError, 'MCP grab_url returned error');
      const grabUrlHtml = grabUrlRes.content[0]?.text ?? '';
      const grabUrlMeta = JSON.parse(grabUrlRes.content[1]?.text ?? '{}');
      assert.equal(grabUrlMeta.inlinedStylesheets, 1, 'MCP grab_url must inline external stylesheet');
      assertBalancedHtmlTags(grabUrlHtml, 'MCP grab_url');
      assert.match(grabUrlHtml, /\bgrid-cols-2\b/);
      assert.match(grabUrlHtml, /\bhover:bg-/);
      logPass('MCP `grab_url` tool', `inlinedStylesheets=1 · outputTokens=${grabUrlMeta.metrics.outputTokens}`);

      // `grab_html`
      const grabHtmlRes = await mcpClient.callTool({
        name: 'grab_html',
        arguments: {
          html: stdinHtml,
          format: 'jsx',
          maxTokens: 550,
          includeHoverStyles: true,
        },
      });
      assert.ok(!grabHtmlRes.isError, 'MCP grab_html returned error');
      const grabHtmlJsx = grabHtmlRes.content[0]?.text ?? '';
      assertValidJsxSyntax(grabHtmlJsx, 'MCP grab_html JSX');
      logPass('MCP `grab_html` tool', 'JSX syntax + budget folding verified');

      // `extract_design_tokens`
      const tokensRes = await mcpClient.callTool({
        name: 'extract_design_tokens',
        arguments: {
          url: fixtureServer.baseUrl,
        },
      });
      assert.ok(!tokensRes.isError, 'MCP extract_design_tokens returned error');
      const extractedTokens = JSON.parse(tokensRes.content[0]?.text ?? '{}');
      assert.ok(Array.isArray(extractedTokens.colors) && extractedTokens.colors.length >= 2);
      assert.ok(Array.isArray(extractedTokens.radii) && extractedTokens.radii.length >= 1);
      logPass(
        'MCP `extract_design_tokens` tool',
        `${extractedTokens.colors.length} colors, ${extractedTokens.radii.length} radii, ${extractedTokens.spacings.length} spacings`,
      );
    } finally {
      await mcpClient.close();
    }

    reportSummary.gates.cliMcp = {
      status: 'PASS',
      cliChecks: 5,
      mcpToolsVerified: ['grab_url', 'grab_html', 'extract_design_tokens'],
    };
  } finally {
    await fixtureServer.close();
  }
}

/* -------------------------------------------------------------------------- */
/* Gate 4: 1,000-Star Open-Source Purity & Governance Compliance Audit        */
/* -------------------------------------------------------------------------- */

function collectRepoTextFiles(dir, out = []) {
  const ignoredDirs = new Set(['.git', 'node_modules', 'dist', '.turbo', 'coverage']);
  const binaryExts = new Set(['.png', '.ico', '.jpg', '.jpeg', '.webp', '.woff', '.woff2', '.ttf']);

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectRepoTextFiles(full, out);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (!binaryExts.has(ext)) {
        out.push(full);
      }
    }
  }
  return out;
}

async function runWorkspaceToolchainChecks() {
  logSection('Gate 0 / Toolchain: Workspace `typecheck`, `bench`, `build`, `test`');
  for (const scriptName of ['typecheck', 'bench', 'build', 'test']) {
    const res = await runProcess('pnpm', [scriptName], { cwd: REPO_ROOT, timeoutMs: 180_000 });
    assert.equal(
      res.code,
      0,
      `Workspace \`pnpm ${scriptName}\` failed (exit ${res.code}):\n${res.stdout}\n${res.stderr}`,
    );
    logPass(`Workspace \`pnpm ${scriptName}\``, 'exit code 0');
  }
}

async function verifyOpenSourceCompliance({ skipRebuild = false } = {}) {
  logSection('Gate 4: 1,000-Star Open-Source Purity & Engineering Compliance Audit');

  // 1. Workspace `pnpm typecheck`, `pnpm bench`, `pnpm build`, `pnpm test`
  if (!skipRebuild) {
    await runWorkspaceToolchainChecks();
  }

  // 2. `@anygrab/core` strict zero runtime dependencies check
  const corePkg = JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, 'packages', 'core', 'package.json'), 'utf8'),
  );
  const runtimeDepKeys = Object.keys(corePkg.dependencies ?? {});
  assert.equal(
    runtimeDepKeys.length,
    0,
    `packages/core/package.json MUST have 0 runtime dependencies, found: ${runtimeDepKeys.join(', ')}`,
  );
  logPass('`@anygrab/core` zero runtime dependencies', 'dependencies: {}');

  // 3. Full-repo sensitive commercial reverse-engineering keyword scan
  // Constructed from split pairs so `e2e/verify-all.mjs` itself contains 0 literal matches.
  const forbiddenTerms = [
    ['fei', 'shu'].join(''),
    ['la', 'rk'].join(''),
    ['xiao', 'e'].join(''),
    ['mao', 'dan'].join(''),
    ['ima', '.qq'].join(''),
  ];
  const forbiddenRegex = new RegExp(`\\b(${forbiddenTerms.join('|')})`, 'i');
  const chineseForbiddenTerms = [
    ['\u98de', '\u4e66'].join(''),
    ['\u5c0f\u9e45', '\u901a'].join(''),
    ['\u732b', '\u86cb'].join(''),
  ];
  const chineseForbiddenRegex = new RegExp(`(${chineseForbiddenTerms.join('|')})`);

  const repoFiles = collectRepoTextFiles(REPO_ROOT);
  const violations = [];
  for (const filePath of repoFiles) {
    const content = fs.readFileSync(filePath, 'utf8');
    const rel = path.relative(REPO_ROOT, filePath);
    const enMatch = forbiddenRegex.exec(content);
    if (enMatch) {
      violations.push(`${rel}: matched forbidden token "${enMatch[0]}"`);
    }
    const zhMatch = chineseForbiddenRegex.exec(content);
    if (zhMatch) {
      violations.push(`${rel}: matched forbidden token "${zhMatch[0]}"`);
    }
  }
  assert.equal(
    violations.length,
    0,
    `Sensitive private platform residue detected:\n${violations.join('\n')}`,
  );
  logPass('Full-repo clean-room purity scan', `${repoFiles.length} source/doc files 100% clean`);

  // 4. GitHub Actions security & required OSS governance files audit
  const requiredFiles = [
    'LICENSE',
    'README.md',
    'README.zh-CN.md',
    'CONTRIBUTING.md',
    'SECURITY.md',
    'CODE_OF_CONDUCT.md',
    'CHANGELOG.md',
    'docs/GOOD_FIRST_ISSUES.md',
    '.github/PULL_REQUEST_TEMPLATE.md',
    '.github/workflows/ci.yml',
    '.github/workflows/deploy-pages.yml',
  ];

  for (const rel of requiredFiles) {
    const abs = path.join(REPO_ROOT, rel);
    assert.ok(fs.existsSync(abs), `Missing required open-source governance file: ${rel}`);
    const stat = fs.statSync(abs);
    assert.ok(stat.size > 40, `Governance file ${rel} appears empty (${stat.size} bytes)`);
  }

  const workflowsDir = path.join(REPO_ROOT, '.github', 'workflows');
  const dangerousTrigger = ['pull_request', '_target'].join('');
  for (const wfName of fs.readdirSync(workflowsDir)) {
    if (!wfName.endsWith('.yml') && !wfName.endsWith('.yaml')) continue;
    const wfText = fs.readFileSync(path.join(workflowsDir, wfName), 'utf8');
    assert.ok(
      !wfText.includes(dangerousTrigger),
      `SECURITY VIOLATION: ${wfName} must NEVER use dangerous ${dangerousTrigger}`,
    );
    assert.match(wfText, /permissions:/, `Workflow ${wfName} must declare explicit least-privilege permissions`);
  }
  logPass('GitHub Actions & OSS governance files', `${requiredFiles.length} files verified · 0 dangerous workflow triggers`);

  // 5. Cross-verify `benchmarks/results/latest.json` === `playground` === `README.md` & `README.zh-CN.md`
  const latestBench = JSON.parse(
    fs.readFileSync(path.join(REPO_ROOT, 'benchmarks', 'results', 'latest.json'), 'utf8'),
  );
  const playgroundBench = JSON.parse(
    fs.readFileSync(
      path.join(REPO_ROOT, 'apps', 'playground', 'src', 'data', 'bench-results.json'),
      'utf8',
    ),
  );

  assert.deepEqual(
    latestBench.methods.map((m) => ({
      id: m.methodId,
      totalTokens: m.totalTokens,
      compressionPct: m.compressionPct,
      avgFidelity: m.avgFidelity,
    })),
    playgroundBench.methods.map((m) => ({
      id: m.methodId,
      totalTokens: m.totalTokens,
      compressionPct: m.compressionPct,
      avgFidelity: m.avgFidelity,
    })),
    'Playground bench-results.json is out of sync with benchmarks/results/latest.json',
  );

  const agDefault = latestBench.methods.find((m) => m.methodId === 'anygrab-default');
  const agBudget = latestBench.methods.find((m) => m.methodId === 'anygrab-budget-600');
  assert.ok(agDefault && agBudget, 'Missing AnyGrab methods in benchmarks/results/latest.json');
  assert.ok(agDefault.compressionPct > 40, `Expected real compression > 40%, got ${agDefault.compressionPct}%`);
  assert.ok(agDefault.avgFidelity >= 95, `Expected high fidelity >= 95, got ${agDefault.avgFidelity}`);

  const readmeEn = fs.readFileSync(path.join(REPO_ROOT, 'README.md'), 'utf8');
  const readmeZh = fs.readFileSync(path.join(REPO_ROOT, 'README.zh-CN.md'), 'utf8');

  // Verify bilingual cross-links and exact benchmark metrics presence in BOTH READMEs
  assert.match(readmeEn, /README\.zh-CN\.md/, 'README.md must link to README.zh-CN.md');
  assert.match(readmeZh, /README\.md/, 'README.zh-CN.md must link to README.md');

  const expectedMetricStrings = [
    agDefault.compressionPct.toFixed(1), // e.g. "59.4"
    agDefault.avgFidelity.toFixed(1), // e.g. "99.6"
    agBudget.compressionPct.toFixed(1), // e.g. "85.0"
    agBudget.avgFidelity.toFixed(1), // e.g. "83.4"
  ];

  for (const metricToken of expectedMetricStrings) {
    assert.ok(
      readmeEn.includes(metricToken),
      `README.md does not match latest.json metric "${metricToken}"`,
    );
    assert.ok(
      readmeZh.includes(metricToken),
      `README.zh-CN.md does not match latest.json metric "${metricToken}"`,
    );
  }

  logPass(
    'Benchmark consistency (`latest.json` ↔ Playground ↔ Bilingual READMEs)',
    `Default: -${agDefault.compressionPct.toFixed(1)}% (${agDefault.avgFidelity}/100) · Budget600: -${agBudget.compressionPct.toFixed(1)}% (${agBudget.avgFidelity}/100)`,
  );

  reportSummary.gates.compliance = {
    status: 'PASS',
    filesScanned: repoFiles.length,
    coreRuntimeDeps: 0,
    anygrabDefault: {
      totalTokens: agDefault.totalTokens,
      avgTokens: agDefault.avgTokens,
      compressionPct: agDefault.compressionPct,
      avgFidelity: agDefault.avgFidelity,
      avgDurationMs: agDefault.avgDurationMs,
    },
    anygrabBudget600: {
      totalTokens: agBudget.totalTokens,
      avgTokens: agBudget.avgTokens,
      compressionPct: agBudget.compressionPct,
      avgFidelity: agBudget.avgFidelity,
      avgDurationMs: agBudget.avgDurationMs,
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Entrypoint                                                                 */
/* -------------------------------------------------------------------------- */

async function main() {
  const args = process.argv.slice(2);
  const onlyArg = args.find((a) => a.startsWith('--only='))?.split('=')[1];
  const skipRebuild = args.includes('--skip-rebuild');

  const t0 = performance.now();

  let alreadyRebuilt = false;
  if (!onlyArg && !skipRebuild) {
    await runWorkspaceToolchainChecks();
    alreadyRebuilt = true;
  }

  if (!onlyArg || onlyArg === 'ext') {
    await verifyExtensionE2E();
  }
  if (!onlyArg || onlyArg === 'playground') {
    await verifyPlaygroundE2E();
  }
  if (!onlyArg || onlyArg === 'cli-mcp') {
    await verifyCliAndMcpSubprocesses();
  }
  if (!onlyArg || onlyArg === 'audit') {
    await verifyOpenSourceCompliance({ skipRebuild: skipRebuild || alreadyRebuilt });
  }

  const elapsedSec = ((performance.now() - t0) / 1000).toFixed(2);
  reportSummary.completedAt = new Date().toISOString();
  reportSummary.elapsedSeconds = Number(elapsedSec);

  console.log(`\n========================================================================`);
  console.log(`✅ ALL SELECTED ANYGRAB VERIFICATION GATES PASSED IN ${elapsedSec}s`);
  console.log(`========================================================================`);
  console.log(JSON.stringify(reportSummary, null, 2));
}

main().catch((err) => {
  console.error(`\n❌ ANYGRAB VERIFICATION FAILED:`);
  console.error(err instanceof Error ? err.stack || err.message : String(err));
  process.exitCode = 1;
});
