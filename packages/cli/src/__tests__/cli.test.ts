// @vitest-environment node
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { VERSION, type DesignTokens, type GrabResult } from '@anygrab/core';
import { parseCliArgs, runCli, type CliIo } from '../cli';

function createMockIo(options: { stdinText?: string; isTTY?: boolean } = {}): {
  io: CliIo;
  getStdout: () => string;
  getStderr: () => string;
} {
  let stdoutBuf = '';
  let stderrBuf = '';
  const stdinChunks = options.stdinText !== undefined ? [options.stdinText] : [];

  const stdin = {
    isTTY: options.isTTY ?? false,
    async *[Symbol.asyncIterator]() {
      for (const chunk of stdinChunks) {
        yield Buffer.from(chunk, 'utf8');
      }
    },
  };

  return {
    io: {
      stdin,
      stdout: {
        write(chunk: string) {
          stdoutBuf += chunk;
          return true;
        },
      },
      stderr: {
        write(chunk: string) {
          stderrBuf += chunk;
          return true;
        },
      },
    },
    getStdout: () => stdoutBuf,
    getStderr: () => stderrBuf,
  };
}

describe('anygrab CLI argument parser & end-to-end execution', () => {
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

  it('parses all supported short and long CLI flags accurately', () => {
    const parsed = parseCliArgs([
      'https://example.com/pricing',
      '-f',
      'jsx',
      '-b',
      '950',
      '-s',
      '#plans',
      '-a',
      'marketing-pricing',
      '-o',
      './out/plans.jsx',
      '--hover',
      '--no-compact-svg',
      '--tokens-only',
      '--json',
      '-q',
    ]);

    expect(parsed).toEqual({
      target: 'https://example.com/pricing',
      format: 'jsx',
      maxTokens: 950,
      selector: '#plans',
      adapter: 'marketing-pricing',
      output: './out/plans.jsx',
      includeHoverStyles: true,
      compactSvg: false,
      tokensOnly: true,
      json: true,
      quiet: true,
      help: false,
      version: false,
    });
  });

  it('validates invalid format, non-positive budget, unknown flags, and extra positionals', () => {
    expect(() => parseCliArgs(['page.html', '-f', 'xml'])).toThrow(/Invalid format/);
    expect(() => parseCliArgs(['page.html', '-b', '0'])).toThrow(/Invalid token budget/);
    expect(() => parseCliArgs(['page.html', '--budget=-50'])).toThrow(/Invalid token budget/);
    expect(() => parseCliArgs(['page.html', '--budget', 'abc'])).toThrow(/Invalid token budget/);
    expect(() => parseCliArgs(['page.html', '--unknown-flag'])).toThrow(/Unknown option/);
    expect(() => parseCliArgs(['a.html', 'b.html'])).toThrow(/Unexpected extra positional/);
  });

  it('prints --version and --help (including bare TTY invocation) with exit code 0', async () => {
    const verRun = createMockIo({ isTTY: true });
    expect(await runCli(['-v'], verRun.io)).toBe(0);
    expect(verRun.getStdout().trim()).toBe(`anygrab v${VERSION}`);
    expect(verRun.getStderr()).toBe('');

    const helpRun = createMockIo({ isTTY: true });
    expect(await runCli(['--help'], helpRun.io)).toBe(0);
    expect(helpRun.getStdout()).toContain('Usage:');
    expect(helpRun.getStdout()).toContain('--no-compact-svg');
    expect(helpRun.getStdout()).toContain('--tokens-only');
    expect(helpRun.getStdout()).toContain('Examples:');

    const bareTtyRun = createMockIo({ isTTY: true });
    expect(await runCli([], bareTtyRun.io)).toBe(0);
    expect(bareTtyRun.getStdout()).toContain('Usage:');
  });

  it('reads HTML automatically from non-TTY stdin and via explicit "-" target while keeping stdout pure', async () => {
    const sampleHtml = `
      <style>.hero { padding: 24px; background: #111827; color: #f9fafb; }</style>
      <section class="hero">
        <h1>Zero-LLM UI Distillation</h1>
        <p>Pipe directly into pbcopy or your Coding Agent.</p>
      </section>
    `;

    const autoStdin = createMockIo({ stdinText: sampleHtml, isTTY: false });
    const code1 = await runCli(['-f', 'markdown'], autoStdin.io);
    expect(code1).toBe(0);
    expect(autoStdin.getStdout()).toContain('Zero-LLM UI Distillation');
    expect(autoStdin.getStdout()).not.toContain('✔ AnyGrab:');
    expect(autoStdin.getStderr()).toMatch(/✔ AnyGrab: .* → .* tokens \(.*%\) · .*ms/);

    const dashStdin = createMockIo({ stdinText: sampleHtml, isTTY: true });
    const code2 = await runCli(['-', '-f', 'jsx', '-q'], dashStdin.io);
    expect(code2).toBe(0);
    expect(dashStdin.getStdout()).toContain('Zero-LLM UI Distillation');
    expect(dashStdin.getStderr()).toBe('');
  });

  it('supports --json, --tokens-only, and -o / --output file writing on local HTML files', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'anygrab-cli-test-'));
    tempDirs.push(dir);

    const inputHtml = join(dir, 'fixture.html');
    const outputFile = join(dir, 'nested', 'distilled.json');

    await writeFile(
      inputHtml,
      `<!doctype html>
      <html>
        <head>
          <style>.card { color: #38bdf8; border-radius: 10px; padding: 16px; }</style>
        </head>
        <body>
          <div id="widget" class="card"><h3>Billing Overview</h3><p>$120.00</p></div>
        </body>
      </html>`,
      'utf8',
    );

    // 1. --tokens-only to stdout
    const tokensRun = createMockIo({ isTTY: true });
    expect(await runCli([inputHtml, '--tokens-only', '-q'], tokensRun.io)).toBe(0);
    const parsedTokens = JSON.parse(tokensRun.getStdout()) as DesignTokens;
    expect(Array.isArray(parsedTokens.colors)).toBe(true);
    expect(Array.isArray(parsedTokens.fonts)).toBe(true);
    expect(Array.isArray(parsedTokens.radii)).toBe(true);
    expect(Array.isArray(parsedTokens.shadows)).toBe(true);
    expect(Array.isArray(parsedTokens.spacings)).toBe(true);

    // 2. --json written to -o file
    const jsonFileRun = createMockIo({ isTTY: true });
    expect(
      await runCli([inputHtml, '-s', '#widget', '--json', '-o', outputFile], jsonFileRun.io),
    ).toBe(0);
    expect(jsonFileRun.getStdout()).toBe('');
    expect(jsonFileRun.getStderr()).toContain('saved to');

    const savedJson = JSON.parse(await readFile(outputFile, 'utf8')) as GrabResult;
    expect(savedJson.output).toContain('Billing Overview');
    expect(savedJson.metrics.rawTokens).toBeGreaterThan(0);
  });

  it('fetches live HTTP server URLs with external <link rel="stylesheet"> CSS via CLI', async () => {
    let cssFetched = false;
    const server = createServer((req, res) => {
      if (req.url === '/app.css') {
        cssFetched = true;
        res.writeHead(200, { 'content-type': 'text/css' });
        res.end('.badge { background: #22c55e; color: #052e16; border-radius: 6px; }');
        return;
      }
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end(`<!doctype html>
        <html>
          <head><link rel="stylesheet" href="/app.css" /></head>
          <body>
            <header>Skip Header</header>
            <main id="status"><span class="badge">Operational</span></main>
          </body>
        </html>`);
    });
    activeServers.push(server);
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
    const { port } = server.address() as AddressInfo;

    const urlRun = createMockIo({ isTTY: true });
    const exitCode = await runCli(
      [`http://127.0.0.1:${port}/status`, '-s', '#status', '-f', 'tailwind-html', '-b', '500'],
      urlRun.io,
    );

    expect(exitCode).toBe(0);
    expect(cssFetched).toBe(true);
    expect(urlRun.getStdout()).toContain('Operational');
    expect(urlRun.getStdout()).not.toContain('Skip Header');
    expect(urlRun.getStderr()).toContain('✔ AnyGrab:');
  });

  it('returns exit code 1 and writes clear error diagnostics on missing file or empty stdin', async () => {
    const missingRun = createMockIo({ isTTY: true });
    expect(await runCli(['/nonexistent/path/missing-page.html'], missingRun.io)).toBe(1);
    expect(missingRun.getStderr()).toContain('Error:');

    const emptyStdinRun = createMockIo({ stdinText: '   \n  ', isTTY: false });
    expect(await runCli([], emptyStdinRun.io)).toBe(1);
    expect(emptyStdinRun.getStderr()).toContain('Received empty HTML input from stdin');
  });

  it('executes built dist/cli.js binary over child_process stdin/stdout/stderr cleanly', async () => {
    const testDir = fileURLToPath(new URL('.', import.meta.url));
    const cliBin = resolve(testDir, '../../dist/cli.js');
    if (!existsSync(cliBin)) {
      return;
    }

    const result = await new Promise<{ code: number | null; stdout: string; stderr: string }>(
      (resolveProc, rejectProc) => {
        const child = spawn(process.execPath, [cliBin, '-f', 'markdown'], {
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        let stdout = '';
        let stderr = '';
        child.stdout.on('data', (chunk: Buffer) => {
          stdout += chunk.toString('utf8');
        });
        child.stderr.on('data', (chunk: Buffer) => {
          stderr += chunk.toString('utf8');
        });
        child.on('error', rejectProc);
        child.on('close', (code) => resolveProc({ code, stdout, stderr }));
        child.stdin.end('<main><h1>Binary Stdin Pipe Works</h1></main>');
      },
    );

    expect(result.code).toBe(0);
    expect(result.stdout).toContain('Binary Stdin Pipe Works');
    expect(result.stdout).not.toContain('✔ AnyGrab:');
    expect(result.stderr).toContain('✔ AnyGrab:');
  });
});
