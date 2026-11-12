import benchResultsRaw from './bench-results.json';
import presetsRaw from './presets.json';

export type ActiveTab = 'overview' | 'workflows' | 'playground' | 'leaderboard' | 'quickstart';

export interface PlaygroundPreset {
  id: string;
  index: number;
  name: string;
  category: string;
  description: string;
  tags: string[];
  sourceUrl: string;
  recommendedBudget: number;
  html: string;
}

export interface FidelityBreakdownData {
  overall: number;
  textScore: number;
  styleScore: number;
  tableScore: number;
  controlScore: number;
}

export interface MethodFixtureRunData {
  methodId: string;
  methodName: string;
  fixtureId: string;
  fixtureName: string;
  category: string;
  chars: number;
  tokens: number;
  compressionPct: number;
  durationMs: number;
  fidelity: FidelityBreakdownData;
}

export interface MethodAggregateData {
  methodId: string;
  methodName: string;
  description: string;
  totalTokens: number;
  avgTokens: number;
  compressionPct: number;
  avgDurationMs: number;
  avgFidelity: number;
  avgTextScore: number;
  avgStyleScore: number;
  avgTableScore: number;
  avgControlScore: number;
}

export interface FixtureComparisonData {
  fixtureId: string;
  index: number;
  name: string;
  category: string;
  tags: string[];
  rawTokens: number;
  results: {
    'raw-html': MethodFixtureRunData;
    'naive-style-picker': MethodFixtureRunData;
    'turndown-gfm': MethodFixtureRunData;
    'anygrab-default': MethodFixtureRunData;
    'anygrab-budget-600': MethodFixtureRunData;
  };
}

export interface BenchmarkReportData {
  benchmarkVersion: string;
  generatedAt: string;
  fixtureCount: number;
  methods: MethodAggregateData[];
  fixtures: FixtureComparisonData[];
}

export const PLAYGROUND_PRESETS: PlaygroundPreset[] = presetsRaw as PlaygroundPreset[];
export const BENCHMARK_REPORT: BenchmarkReportData = benchResultsRaw as BenchmarkReportData;
