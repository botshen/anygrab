#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { VERSION, type OutputFormat } from '@anygrab/core';
import { grabFromHtml } from './index';

export async function runCli(argv: string[] = process.argv.slice(2)): Promise<number> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      format: { type: 'string', short: 'f', default: 'prompt' },
      'max-tokens': { type: 'string', short: 'b' },
      selector: { type: 'string', short: 's' },
      help: { type: 'boolean', short: 'h', default: false },
      version: { type: 'boolean', short: 'v', default: false },
    },
  });

  if (values.version) {
    process.stdout.write(`anygrab v${VERSION}\n`);
    return 0;
  }

  if (values.help || positionals.length === 0) {
    process.stdout.write(
      [
        `anygrab v${VERSION} — Token-budget-aware DOM & UI context distillation`,
        '',
        'Usage:',
        '  anygrab <url-or-file> [options]',
        '',
        'Options:',
        '  -f, --format <type>       Output format: prompt | tailwind-html | jsx | markdown',
        '  -b, --max-tokens <num>    Maximum token budget (e.g. 1200)',
        '  -s, --selector <css>      Target CSS selector',
        '  -h, --help                Show help',
        '  -v, --version             Show version',
        '',
      ].join('\n'),
    );
    return 0;
  }

  const target = positionals[0] ?? '';
  const maxTokens = values['max-tokens'] ? Number(values['max-tokens']) : undefined;
  const result = grabFromHtml(target, {
    format: values.format as OutputFormat,
    maxTokens,
    selector: values.selector,
  });
  process.stdout.write(`${result.output}\n`);
  return 0;
}

const isDirectExecution =
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  Boolean(process.argv[1]) &&
  (process.argv[1].endsWith('/cli.js') || process.argv[1].endsWith('\\cli.js') || process.argv[1].endsWith('/anygrab'));

if (isDirectExecution) {
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
