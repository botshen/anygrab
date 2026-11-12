import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatMarkdownReport, runBenchmarkSuite, type BenchmarkSuiteReport } from './evaluator';
import { BENCHMARK_FIXTURES } from './fixtures';

const currentDir = dirname(fileURLToPath(import.meta.url));
const benchResultsPath = resolve(currentDir, '../results/latest.json');
const playgroundDataPath = resolve(
  currentDir,
  '../../apps/playground/src/data/bench-results.json',
);
const playgroundPresetsPath = resolve(
  currentDir,
  '../../apps/playground/src/data/presets.json',
);

function stripVolatileTimings(report: BenchmarkSuiteReport): unknown {
  return {
    benchmarkVersion: report.benchmarkVersion,
    fixtureCount: report.fixtureCount,
    methods: report.methods.map(({ avgDurationMs: _avgDurationMs, ...rest }) => rest),
    fixtures: report.fixtures.map((f) => ({
      ...f,
      results: Object.fromEntries(
        Object.entries(f.results).map(([k, v]) => {
          const { durationMs: _durationMs, ...stable } = v;
          return [k, stable];
        }),
      ),
    })),
  };
}

function hasDeterministicMetricsChanged(nextReport: BenchmarkSuiteReport, filePath: string): boolean {
  if (!existsSync(filePath)) return true;
  try {
    const existing = JSON.parse(readFileSync(filePath, 'utf8')) as BenchmarkSuiteReport;
    return (
      JSON.stringify(stripVolatileTimings(existing)) !==
      JSON.stringify(stripVolatileTimings(nextReport))
    );
  } catch {
    return true;
  }
}

export function executeBenchmarkCli(argv: string[] = process.argv.slice(2)): void {
  const forceWrite = argv.includes('--write');
  const report = runBenchmarkSuite(BENCHMARK_FIXTURES, { warmup: true });
  const markdownTable = formatMarkdownReport(report);
  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  const presetsPayload = BENCHMARK_FIXTURES.map((f) => ({
    id: f.id,
    index: f.index,
    name: f.name,
    category: f.category,
    description: f.description,
    tags: f.tags,
    sourceUrl: f.sourceUrl,
    recommendedBudget: f.recommendedBudget,
    html: f.html,
  }));
  const serializedPresets = `${JSON.stringify(presetsPayload, null, 2)}\n`;

  mkdirSync(dirname(benchResultsPath), { recursive: true });
  mkdirSync(dirname(playgroundDataPath), { recursive: true });

  const latestChanged = forceWrite || hasDeterministicMetricsChanged(report, benchResultsPath);
  const playgroundChanged =
    forceWrite || hasDeterministicMetricsChanged(report, playgroundDataPath);
  const presetsChanged =
    forceWrite ||
    !existsSync(playgroundPresetsPath) ||
    readFileSync(playgroundPresetsPath, 'utf8') !== serializedPresets;

  if (latestChanged || playgroundChanged) {
    writeFileSync(benchResultsPath, serialized, 'utf8');
    writeFileSync(playgroundDataPath, serialized, 'utf8');
  }
  if (presetsChanged) {
    writeFileSync(playgroundPresetsPath, serializedPresets, 'utf8');
  }

  process.stdout.write(`${markdownTable}\n\n`);
  process.stdout.write(
    `✔ Verified JSON report (${latestChanged || playgroundChanged ? 'updated' : 'unchanged deterministic metrics'}):\n  - ${benchResultsPath}\n  - ${playgroundDataPath}\n  - ${playgroundPresetsPath}\n`,
  );
}

executeBenchmarkCli();
