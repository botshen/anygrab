// @vitest-environment node
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import {
  estimateTokens,
  extractDesignTokens,
  grab,
  grabFromFile,
  grabFromHtml,
  grabFromUrl,
  inlineStylesheetsFromFile,
  inlineStylesheetsFromUrl,
  parseHtmlDocument,
  registerAdapter,
  VERSION,
} from '../index';

describe('anygrab SDK exports & HTML/CSS loader', () => {
  const tempDirs: string[] = [];
  const activeServers: Array<ReturnType<typeof createServer>> = [];

  afterEach(async () => {
    await Promise.all(
      activeServers.splice(0).map(
        (srv) =>
          new Promise<void>((resolveClose) => {
            srv.close(() => resolveClose());
          }),
      ),
    );
    await Promise.all(
      tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
    );
  });

  async function startTestServer(
    handler: (req: IncomingMessage, res: ServerResponse) => void,
  ): Promise<string> {
    const server = createServer(handler);
    activeServers.push(server);
    await new Promise<void>((resolveListen) => {
      server.listen(0, '127.0.0.1', () => resolveListen());
    });
    const { port } = server.address() as AddressInfo;
    return `http://127.0.0.1:${port}`;
  }

  it('re-exports @anygrab/core functions and constants cleanly', () => {
    expect(typeof grab).toBe('function');
    expect(typeof estimateTokens).toBe('function');
    expect(typeof extractDesignTokens).toBe('function');
    expect(typeof registerAdapter).toBe('function');
    expect(VERSION).toBe('0.1.0');
  });

  it('normalizes HTML fragments starting with <style> without losing sibling elements', () => {
    const fragment = `
      <style>
        .pricing-badge { background: #6366f1; color: #ffffff; border-radius: 9999px; padding: 4px 12px; }
      </style>
      <div class="pricing-card">
        <span class="pricing-badge">Most Popular</span>
        <h3>Team Plan — $49/mo</h3>
      </div>
    `;
    const result = grabFromHtml(fragment, { format: 'markdown' });
    expect(result.output).toContain('Most Popular');
    expect(result.output).toContain('Team Plan — $49/mo');
    expect(result.metrics.rawTokens).toBeGreaterThan(0);
  });

  it('inlines data:text/css stylesheet links synchronously in grabFromHtml', () => {
    const cssBase64 = Buffer.from('.hero { background: #0f172a; padding: 32px; }').toString(
      'base64',
    );
    const html = `
      <html>
        <head>
          <link rel="stylesheet" href="data:text/css;base64,${cssBase64}" />
        </head>
        <body>
          <section class="hero"><h1>Ship UI Context Fast</h1></section>
        </body>
      </html>
    `;
    const doc = parseHtmlDocument(html);
    expect(doc.querySelectorAll('link').length).toBe(1);

    const result = grabFromHtml(html, { format: 'prompt' });
    expect(result.output).toContain('Ship UI Context Fast');
  });

  it('scopes extraction to options.selector while preserving <head><style> and throwing on missing selector', () => {
    const html = `
      <!doctype html>
      <html>
        <head>
          <style>.target-box { display: flex; gap: 12px; color: #10b981; }</style>
        </head>
        <body>
          <header>Global Navigation Noise</header>
          <main>
            <section id="keep-me" class="target-box">
              <h2>Focused Widget</h2>
              <button>Deploy Now</button>
            </section>
            <aside>Sidebar Ad Banner</aside>
          </main>
          <footer>Copyright Footer Noise</footer>
        </body>
      </html>
    `;

    const result = grabFromHtml(html, {
      selector: '#keep-me',
      format: 'markdown',
    });

    expect(result.output).toContain('Focused Widget');
    expect(result.output).toContain('Deploy Now');
    expect(result.output).not.toContain('Global Navigation Noise');
    expect(result.output).not.toContain('Sidebar Ad Banner');
    expect(result.output).not.toContain('Copyright Footer Noise');

    expect(() => grabFromHtml(html, { selector: '#does-not-exist' })).toThrow(
      /No element matched CSS selector/,
    );
  });

  it('reads local HTML files and inlines relative <link rel="stylesheet"> CSS via grabFromFile', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'anygrab-file-test-'));
    tempDirs.push(dir);

    const cssPath = join(dir, 'theme.css');
    const htmlPath = join(dir, 'component.html');

    await writeFile(
      cssPath,
      '.cta-card { display: flex; background-color: #1e293b; color: #f8fafc; padding: 20px; border-radius: 8px; }',
      'utf8',
    );
    await writeFile(
      htmlPath,
      `<!doctype html>
      <html>
        <head>
          <link rel="stylesheet" href="./theme.css" />
        </head>
        <body>
          <div id="cta" class="cta-card">
            <h2>Local File Component</h2>
            <p>$19 / seat</p>
          </div>
          <footer>Ignore Footer</footer>
        </body>
      </html>`,
      'utf8',
    );

    const doc = parseHtmlDocument(
      '<html><head><link rel="stylesheet" href="./theme.css" /></head><body></body></html>',
    );
    const inlineStats = await inlineStylesheetsFromFile(doc, htmlPath);
    expect(inlineStats.inlinedCount).toBe(1);
    expect(doc.querySelectorAll('link').length).toBe(0);
    expect(doc.querySelector('style')?.textContent).toContain('.cta-card');

    const result = await grabFromFile(htmlPath, {
      selector: '#cta',
      format: 'jsx',
    });
    expect(result.format).toBe('jsx');
    expect(result.output).toContain('Local File Component');
    expect(result.output).not.toContain('Ignore Footer');
  });

  it('fetches public URLs and inlines external <link rel="stylesheet"> CSS in cascade order with timeout resilience', async () => {
    const requestedUrls: string[] = [];

    const baseUrl = await startTestServer((req, res) => {
      const url = req.url ?? '/';
      requestedUrls.push(url);

      if (url === '/page') {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        res.end(`<!doctype html>
          <html>
            <head>
              <link rel="stylesheet" href="/assets/base.css" />
              <style>.override { font-weight: 700; }</style>
              <link rel="stylesheet" href="/assets/components.css" />
              <link rel="stylesheet" href="/assets/print.css" media="print" />
              <link rel="stylesheet" href="/assets/slow.css" />
            </head>
            <body>
              <nav>Top Nav Noise</nav>
              <article id="pricing-card" class="card override">
                <h2>Enterprise Tier</h2>
                <p>$299/month · SSO & Audit Logs</p>
              </article>
            </body>
          </html>`);
        return;
      }

      if (url === '/assets/base.css') {
        res.writeHead(200, { 'content-type': 'text/css' });
        res.end(
          ':root { --brand: #4f46e5; } .card { background: url("../img/bg.png"); padding: 24px; }',
        );
        return;
      }

      if (url === '/assets/components.css') {
        res.writeHead(200, { 'content-type': 'text/css' });
        res.end('.card { border-radius: 16px; color: #ffffff; display: flex; }');
        return;
      }

      if (url === '/assets/slow.css') {
        setTimeout(() => {
          if (!res.destroyed) {
            res.writeHead(200, { 'content-type': 'text/css' });
            res.end('.never-arrives { color: pink; }');
          }
        }, 500);
        return;
      }

      res.writeHead(404);
      res.end('Not Found');
    });

    // Direct check of cascade order and relative URL rewriting inside inlined <style> tags
    const inspectDoc = parseHtmlDocument(`
      <html>
        <head>
          <link rel="stylesheet" href="/assets/base.css" />
          <style>.override { font-weight: 700; }</style>
          <link rel="stylesheet" href="/assets/components.css" />
        </head>
        <body><div class="card">Test</div></body>
      </html>
    `);
    const inlineInfo = await inlineStylesheetsFromUrl(inspectDoc, `${baseUrl}/page`);
    expect(inlineInfo.inlinedCount).toBe(2);
    const styles = Array.from(inspectDoc.head.querySelectorAll('style'));
    expect(styles).toHaveLength(3);
    expect(styles[0]?.textContent).toContain(`${baseUrl}/img/bg.png`);
    expect(styles[1]?.textContent).toContain('.override');
    expect(styles[2]?.textContent).toContain('border-radius: 16px');

    // Full end-to-end grabFromUrl with short cssTimeoutMs (80ms) to verify slow.css never blocks
    const result = await grabFromUrl(`${baseUrl}/page`, {
      selector: '#pricing-card',
      format: 'prompt',
      cssTimeoutMs: 80,
    });

    expect(requestedUrls).toContain('/page');
    expect(requestedUrls).toContain('/assets/base.css');
    expect(requestedUrls).toContain('/assets/components.css');
    expect(requestedUrls).not.toContain('/assets/print.css');
    expect(result.output).toContain('Enterprise Tier');
    expect(result.output).toContain('$299/month');
    expect(result.output).not.toContain('Top Nav Noise');
    expect(result.warnings.some((w) => w.includes('slow.css'))).toBe(true);
  });
});
