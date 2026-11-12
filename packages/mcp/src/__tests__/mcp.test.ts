// @vitest-environment node
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AddressInfo } from 'node:net';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { afterEach, describe, expect, it } from 'vitest';
import type { DesignTokens, GrabMetrics } from '@anygrab/core';
import { createAnyGrabMcpServer } from '../index';

interface TextContentBlock {
  type: 'text';
  text: string;
}

function getTextBlocks(result: Record<string, unknown>): TextContentBlock[] {
  if (!Array.isArray(result.content)) return [];
  return result.content.filter(
    (item): item is TextContentBlock =>
      Boolean(item) &&
      typeof item === 'object' &&
      (item as { type?: unknown }).type === 'text' &&
      typeof (item as { text?: unknown }).text === 'string',
  );
}

describe('@anygrab/mcp protocol server & tools', () => {
  const activeServers: Array<ReturnType<typeof createServer>> = [];
  const activeCleanup: Array<() => Promise<void>> = [];

  afterEach(async () => {
    while (activeCleanup.length > 0) {
      const clean = activeCleanup.pop();
      if (clean) await clean();
    }
    await Promise.all(
      activeServers.splice(0).map(
        (srv) =>
          new Promise<void>((resolveClose) => {
            srv.close(() => resolveClose());
          }),
      ),
    );
  });

  async function createConnectedMcpPair(): Promise<Client> {
    const server = createAnyGrabMcpServer();
    const client = new Client({ name: 'anygrab-test-client', version: '0.1.0' });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    activeCleanup.push(async () => {
      await client.close();
      await server.close();
    });

    return client;
  }

  async function startHttpFixtureServer(
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

  it('exposes grab_url, grab_html, and extract_design_tokens via listTools with complete schemas', async () => {
    const client = await createConnectedMcpPair();
    const { tools } = await client.listTools();

    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual(['extract_design_tokens', 'grab_html', 'grab_url']);

    const grabUrlTool = tools.find((t) => t.name === 'grab_url')!;
    expect(grabUrlTool.description).toContain('link rel="stylesheet"');
    expect(grabUrlTool.inputSchema.properties).toHaveProperty('url');
    expect(grabUrlTool.inputSchema.properties).toHaveProperty('selector');
    expect(grabUrlTool.inputSchema.properties).toHaveProperty('format');
    expect(grabUrlTool.inputSchema.properties).toHaveProperty('maxTokens');
    expect(grabUrlTool.inputSchema.properties).toHaveProperty('compactSvg');
    expect(grabUrlTool.inputSchema.properties).toHaveProperty('includeHoverStyles');

    const grabHtmlTool = tools.find((t) => t.name === 'grab_html')!;
    expect(grabHtmlTool.inputSchema.properties).toHaveProperty('html');
    expect(grabHtmlTool.inputSchema.properties).toHaveProperty('format');

    const tokensTool = tools.find((t) => t.name === 'extract_design_tokens')!;
    expect(tokensTool.inputSchema.properties).toHaveProperty('url');
    expect(tokensTool.inputSchema.properties).toHaveProperty('html');
  });

  it('executes grab_html end-to-end across prompt, tailwind-html, jsx, and markdown formats', async () => {
    const client = await createConnectedMcpPair();

    const dirtyFragment = `
      <style>
        .pricing-tier { display: flex; flex-direction: column; gap: 16px; background: #0f172a; color: #f8fafc; padding: 24px; border-radius: 12px; }
        .cta-btn:hover { background: #4f46e5; }
      </style>
      <header>Unwanted Marketing Banner</header>
      <section id="pro-plan" class="pricing-tier">
        <h2>Pro Developer</h2>
        <p>$29 / month</p>
        <button class="cta-btn">Start Free Trial</button>
      </section>
    `;

    for (const format of ['prompt', 'tailwind-html', 'jsx', 'markdown'] as const) {
      const response = await client.callTool({
        name: 'grab_html',
        arguments: {
          html: dirtyFragment,
          selector: '#pro-plan',
          format,
          maxTokens: 600,
          compactSvg: true,
          includeHoverStyles: true,
        },
      });

      expect(response.isError).toBeFalsy();
      const blocks = getTextBlocks(response);
      expect(blocks.length).toBeGreaterThanOrEqual(2);
      expect(blocks[0]!.text).toContain('Pro Developer');
      expect(blocks[0]!.text).toContain('$29 / month');
      expect(blocks[0]!.text).not.toContain('Unwanted Marketing Banner');

      const telemetry = JSON.parse(blocks[1]!.text) as {
        format: string;
        metrics: GrabMetrics;
      };
      expect(telemetry.format).toBe(format);
      expect(telemetry.metrics.rawTokens).toBeGreaterThan(0);
      expect(telemetry.metrics.outputTokens).toBeGreaterThan(0);
    }
  });

  it('executes grab_url with automatic external <link rel="stylesheet"> CSS inlining and telemetry', async () => {
    const client = await createConnectedMcpPair();
    const fetchedPaths: string[] = [];

    const baseUrl = await startHttpFixtureServer((req, res) => {
      const path = req.url ?? '/';
      fetchedPaths.push(path);

      if (path === '/styles/dashboard.css') {
        res.writeHead(200, { 'content-type': 'text/css' });
        res.end(`
          .kpi-grid { display: grid; gap: 16px; background-color: #111827; padding: 24px; border-radius: 12px; }
          .kpi-value { font-size: 28px; font-weight: 700; color: #34d399; }
          .kpi-card:hover { box-shadow: 0 10px 25px rgba(0,0,0,0.25); }
        `);
        return;
      }

      if (path === '/dashboard') {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        res.end(`<!doctype html>
          <html>
            <head>
              <link rel="stylesheet" href="/styles/dashboard.css" />
            </head>
            <body>
              <nav>Sidebar Noise</nav>
              <main id="bento" class="kpi-grid">
                <div class="kpi-card">
                  <span>Monthly Recurring Revenue</span>
                  <strong class="kpi-value">$84,200</strong>
                  <svg viewBox="0 0 24 24" width="16" height="16"><path d="M3 17l6-6 4 4 8-8" /></svg>
                </div>
              </main>
            </body>
          </html>`);
        return;
      }

      res.writeHead(404);
      res.end('Not found');
    });

    const response = await client.callTool({
      name: 'grab_url',
      arguments: {
        url: `${baseUrl}/dashboard`,
        selector: '#bento',
        format: 'jsx',
        maxTokens: 800,
        compactSvg: true,
        includeHoverStyles: true,
      },
    });

    expect(response.isError).toBeFalsy();
    expect(fetchedPaths).toContain('/dashboard');
    expect(fetchedPaths).toContain('/styles/dashboard.css');

    const blocks = getTextBlocks(response);
    expect(blocks[0]!.text).toContain('Monthly Recurring Revenue');
    expect(blocks[0]!.text).toContain('$84,200');
    expect(blocks[0]!.text).not.toContain('Sidebar Noise');

    const meta = JSON.parse(blocks[1]!.text) as {
      sourceUrl: string;
      format: string;
      inlinedStylesheets: number;
      metrics: GrabMetrics;
    };
    expect(meta.sourceUrl).toBe(`${baseUrl}/dashboard`);
    expect(meta.format).toBe('jsx');
    expect(meta.inlinedStylesheets).toBe(1);
    expect(meta.metrics.rawTokens).toBeGreaterThan(0);

    // Verify clean MCP error response when URL returns HTTP 404
    const errResponse = await client.callTool({
      name: 'grab_url',
      arguments: { url: `${baseUrl}/missing-route` },
    });
    expect(errResponse.isError).toBe(true);
  });

  it('executes extract_design_tokens for both raw HTML and remote URLs (and rejects missing inputs)', async () => {
    const client = await createConnectedMcpPair();
    let tokensCssRequested = false;

    const baseUrl = await startHttpFixtureServer((req, res) => {
      if (req.url === '/tokens.css') {
        tokensCssRequested = true;
        res.writeHead(200, { 'content-type': 'text/css' });
        res.end(`
          .surface {
            background-color: #0f172a;
            color: #e2e8f0;
            font-family: "Inter", sans-serif;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(15, 23, 42, 0.4);
            padding: 16px;
          }
        `);
        return;
      }
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end(
        '<!doctype html><html><head><link rel="stylesheet" href="/tokens.css"></head><body><div class="surface">Tokens</div></body></html>',
      );
    });

    // 1. From URL
    const urlResult = await client.callTool({
      name: 'extract_design_tokens',
      arguments: { url: `${baseUrl}/` },
    });
    expect(urlResult.isError).toBeFalsy();
    expect(tokensCssRequested).toBe(true);
    const urlTokens = JSON.parse(getTextBlocks(urlResult)[0]!.text) as DesignTokens;
    expect(Array.isArray(urlTokens.colors)).toBe(true);
    expect(Array.isArray(urlTokens.fonts)).toBe(true);
    expect(Array.isArray(urlTokens.radii)).toBe(true);
    expect(Array.isArray(urlTokens.shadows)).toBe(true);
    expect(Array.isArray(urlTokens.spacings)).toBe(true);

    // 2. From raw HTML
    const htmlResult = await client.callTool({
      name: 'extract_design_tokens',
      arguments: {
        html: '<style>.pill { background: #6366f1; border-radius: 9999px; padding: 8px 16px; }</style><span class="pill">New</span>',
      },
    });
    expect(htmlResult.isError).toBeFalsy();
    const htmlTokens = JSON.parse(getTextBlocks(htmlResult)[0]!.text) as DesignTokens;
    expect(htmlTokens).toHaveProperty('colors');
    expect(htmlTokens).toHaveProperty('spacings');

    // 3. Validation error when neither url nor html is supplied
    const invalidResult = await client.callTool({
      name: 'extract_design_tokens',
      arguments: {},
    });
    expect(invalidResult.isError).toBe(true);
  });

  it('communicates cleanly over real child-process StdioServerTransport when dist/index.js is built', async () => {
    const testDir = fileURLToPath(new URL('.', import.meta.url));
    const builtEntry = resolve(testDir, '../../dist/index.js');
    if (!existsSync(builtEntry)) {
      return;
    }

    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [builtEntry],
      stderr: 'pipe',
    });
    const stdioClient = new Client({ name: 'stdio-e2e-client', version: '0.1.0' });
    await stdioClient.connect(transport);
    activeCleanup.push(async () => {
      await stdioClient.close();
    });

    const { tools } = await stdioClient.listTools();
    expect(tools).toHaveLength(3);

    const callRes = await stdioClient.callTool({
      name: 'grab_html',
      arguments: {
        html: '<article><h1>Stdio Protocol Verified</h1></article>',
        format: 'markdown',
      },
    });
    expect(callRes.isError).toBeFalsy();
    expect(getTextBlocks(callRes)[0]!.text).toContain('Stdio Protocol Verified');
  });
});
