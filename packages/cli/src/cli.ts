#!/usr/bin/env node
import { realpathSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { estimateTokens, VERSION, type GrabResult, type OutputFormat } from '@anygrab/core';
import { grabFromFile, grabFromHtml, grabFromUrl, type NodeGrabOptions } from './index';

const VALID_FORMATS = new Set<OutputFormat>(['prompt', 'tailwind-html', 'jsx', 'markdown']);
const NUMBER_FORMATTER = new Intl.NumberFormat('en-US');

export interface ParsedCliArgs {
  target?: string;
  format: OutputFormat;
  maxTokens?: number;
  selector?: string;
  adapter?: string;
  output?: string;
  includeHoverStyles: boolean;
  compactSvg: boolean;
  tokensOnly: boolean;
  json: boolean;
  quiet: boolean;
  help: boolean;
  version: boolean;
}

export interface CliIo {
  stdin: AsyncIterable<Buffer | Uint8Array | string> & { isTTY?: boolean };
  stdout: { write(chunk: string): boolean | void };
  stderr: { write(chunk: string): boolean | void };
}

export function formatHelpText(): string {
  return [
    `AnyGrab v${VERSION} — Token-budget-aware DOM & UI context distillation for Coding Agents`,
    '',
    'Usage:',
    '  anygrab <url | file.html | -> [options]',
    '  cat page.html | anygrab [options]',
    '',
    'Arguments:',
    '  url | file.html | -         Public HTTP(S) URL, local HTML file path, or "-" for stdin',
    '                              (Reads from stdin automatically when piped with no target)',
    '',
    'Options:',
    '  -f, --format <format>       Output format: prompt | tailwind-html | jsx | markdown  [default: prompt]',
    '  -b, --budget <tokens>       Maximum token budget ceiling (maps to maxTokens)',
    '  -s, --selector <css>        Extract only the subtree matching a CSS selector',
    '  -a, --adapter <name>        Explicit adapter (e.g. docs-mdx, github-ui, arxiv-paper)',
    '  -o, --output <path>         Write output to file instead of stdout',
    '      --hover                 Include interactive :hover Tailwind utility hints',
    '      --no-compact-svg        Keep full inline <svg> path data without collapsing',
    '      --tokens-only           Output only extracted DesignTokens as formatted JSON',
    '      --json                  Output the complete GrabResult payload as JSON',
    '  -q, --quiet                 Suppress the compression telemetry line on stderr',
    '  -h, --help                  Display this help documentation',
    '  -v, --version               Print the AnyGrab CLI version',
    '',
    'Examples:',
    '  $ npx anygrab https://example.com -s "main" -b 1200 | pbcopy',
    '  $ npx anygrab ./pricing.html -f jsx --hover -o PricingCard.jsx',
    '  $ npx anygrab https://example.com --tokens-only',
    '  $ curl -sL https://example.com | npx anygrab -f markdown -q',
    '',
  ].join('\n');
}

export function formatTelemetryLine(
  result: GrabResult,
  overrideOutputTokens?: number,
  savedPath?: string,
): string {
  const { rawTokens, durationMs } = result.metrics;
  const outputTokens = overrideOutputTokens ?? result.metrics.outputTokens;
  const ratio =
    overrideOutputTokens !== undefined && rawTokens > 0
      ? Number(((1 - outputTokens / rawTokens) * 100).toFixed(2))
      : result.metrics.compressionRatio;

  const deltaLabel = ratio >= 0 ? `-${ratio.toFixed(2)}%` : `+${Math.abs(ratio).toFixed(2)}%`;
  const rawFormatted = NUMBER_FORMATTER.format(rawTokens);
  const outFormatted = NUMBER_FORMATTER.format(outputTokens);
  const timeFormatted = `${durationMs.toFixed(1)}ms`;
  const savedSuffix = savedPath ? ` · saved to ${savedPath}` : '';

  return `✔ AnyGrab: ${rawFormatted} → ${outFormatted} tokens (${deltaLabel}) · ${timeFormatted}${savedSuffix}`;
}

/**
 * Parses CLI argv into strongly-typed `ParsedCliArgs` using native `node:util` `parseArgs`.
 */
export function parseCliArgs(argv: string[]): ParsedCliArgs {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    allowNegative: true,
    strict: true,
    options: {
      format: { type: 'string', short: 'f', default: 'prompt' },
      budget: { type: 'string', short: 'b' },
      'max-tokens': { type: 'string' },
      selector: { type: 'string', short: 's' },
      adapter: { type: 'string', short: 'a' },
      output: { type: 'string', short: 'o' },
      hover: { type: 'boolean', default: false },
      'compact-svg': { type: 'boolean', default: true },
      'tokens-only': { type: 'boolean', default: false },
      json: { type: 'boolean', default: false },
      quiet: { type: 'boolean', short: 'q', default: false },
      help: { type: 'boolean', short: 'h', default: false },
      version: { type: 'boolean', short: 'v', default: false },
    },
  });

  if (positionals.length > 1) {
    throw new Error(
      `Unexpected extra positional argument "${positionals[1]}". Pass a single <url | file.html | ->.`,
    );
  }

  const rawFormat = (values.format ?? 'prompt').trim();
  if (!VALID_FORMATS.has(rawFormat as OutputFormat)) {
    throw new Error(
      `Invalid format "${rawFormat}". Expected one of: prompt, tailwind-html, jsx, markdown.`,
    );
  }

  let maxTokens: number | undefined;
  const rawBudget = values.budget ?? values['max-tokens'];
  if (rawBudget !== undefined) {
    const parsedBudget = Number(rawBudget);
    if (!Number.isFinite(parsedBudget) || !Number.isInteger(parsedBudget) || parsedBudget <= 0) {
      throw new Error(`Invalid token budget "${rawBudget}". Expected a positive integer.`);
    }
    maxTokens = parsedBudget;
  }

  return {
    target: positionals[0],
    format: rawFormat as OutputFormat,
    maxTokens,
    selector: values.selector,
    adapter: values.adapter,
    output: values.output,
    includeHoverStyles: Boolean(values.hover),
    compactSvg: values['compact-svg'] ?? true,
    tokensOnly: Boolean(values['tokens-only']),
    json: Boolean(values.json),
    quiet: Boolean(values.quiet),
    help: Boolean(values.help),
    version: Boolean(values.version),
  };
}

async function readAllFromStdin(
  stdin: AsyncIterable<Buffer | Uint8Array | string>,
): Promise<string> {
  const chunks: string[] = [];
  for await (const chunk of stdin) {
    if (typeof chunk === 'string') {
      chunks.push(chunk);
    } else {
      chunks.push(Buffer.from(chunk).toString('utf8'));
    }
  }
  return chunks.join('');
}

function isHttpUrl(target: string): boolean {
  return /^https?:\/\//i.test(target.trim());
}

export async function runCli(
  argv: string[] = process.argv.slice(2),
  io: CliIo = { stdin: process.stdin, stdout: process.stdout, stderr: process.stderr },
): Promise<number> {
  let parsed: ParsedCliArgs;
  try {
    parsed = parseCliArgs(argv);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    io.stderr.write(`Error: ${message}\nRun "anygrab --help" for usage information.\n`);
    return 1;
  }

  if (parsed.version) {
    io.stdout.write(`anygrab v${VERSION}\n`);
    return 0;
  }

  if (parsed.help) {
    io.stdout.write(`${formatHelpText()}\n`);
    return 0;
  }

  const shouldReadStdin = parsed.target === '-' || (!parsed.target && !io.stdin.isTTY);

  if (!parsed.target && !shouldReadStdin) {
    io.stdout.write(`${formatHelpText()}\n`);
    return 0;
  }

  const grabOptions: NodeGrabOptions = {
    format: parsed.format,
    maxTokens: parsed.maxTokens,
    selector: parsed.selector,
    adapter: parsed.adapter,
    includeHoverStyles: parsed.includeHoverStyles,
    compactSvg: parsed.compactSvg,
    includeDesignTokens: true,
  };

  try {
    let result: GrabResult;
    if (shouldReadStdin) {
      const stdinHtml = await readAllFromStdin(io.stdin);
      if (!stdinHtml.trim()) {
        io.stderr.write('Error: Received empty HTML input from stdin.\n');
        return 1;
      }
      result = grabFromHtml(stdinHtml, grabOptions);
    } else {
      const target = parsed.target!;
      result = isHttpUrl(target)
        ? await grabFromUrl(target, grabOptions)
        : await grabFromFile(target, grabOptions);
    }

    let payload: string;
    let overrideTokens: number | undefined;
    if (parsed.json) {
      payload = JSON.stringify(result, null, 2);
    } else if (parsed.tokensOnly) {
      payload = JSON.stringify(result.designTokens, null, 2);
      overrideTokens = estimateTokens(payload);
    } else {
      payload = result.output;
    }

    const formattedPayload = payload.endsWith('\n') ? payload : `${payload}\n`;

    if (parsed.output) {
      const outputPath = resolve(parsed.output);
      await mkdir(dirname(outputPath), { recursive: true });
      await writeFile(outputPath, formattedPayload, 'utf8');
      if (!parsed.quiet) {
        io.stderr.write(`${formatTelemetryLine(result, overrideTokens, parsed.output)}\n`);
      }
    } else {
      io.stdout.write(formattedPayload);
      if (!parsed.quiet) {
        io.stderr.write(`${formatTelemetryLine(result, overrideTokens)}\n`);
      }
    }

    return 0;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    io.stderr.write(`Error: ${message}\n`);
    return 1;
  }
}

function checkDirectExecution(): boolean {
  if (typeof process === 'undefined' || !Array.isArray(process.argv) || !process.argv[1]) {
    return false;
  }
  try {
    const invokedPath = realpathSync(process.argv[1]);
    const currentPath = realpathSync(fileURLToPath(import.meta.url));
    return invokedPath === currentPath;
  } catch {
    return (
      process.argv[1].endsWith('/cli.js') ||
      process.argv[1].endsWith('\\cli.js') ||
      process.argv[1].endsWith('/anygrab')
    );
  }
}

if (checkDirectExecution()) {
  runCli().then(
    (code) => {
      process.exitCode = code;
    },
    (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`Error: ${message}\n`);
      process.exitCode = 1;
    },
  );
}
