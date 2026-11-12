import { estimateTokens, grab, type GrabResult } from '@anygrab/core';
import { parseHTML } from 'linkedom';
import { runTurndownGfm } from './evaluator';

export * from './fixtures';
export * from './evaluator';

export interface BenchmarkComparison {
  name: string;
  rawTokens: number;
  turndownTokens: number;
  anygrabTokens: number;
  anygrabResult: GrabResult;
}

export function runFixtureComparison(
  name: string,
  html: string,
  maxTokens = 1200,
): BenchmarkComparison {
  const { document } = parseHTML(html);
  const turndownMd = runTurndownGfm(html);
  const anygrabResult = grab(document as unknown as Document, {
    format: 'tailwind-html',
    maxTokens,
  });

  return {
    name,
    rawTokens: estimateTokens(html),
    turndownTokens: estimateTokens(turndownMd),
    anygrabTokens: anygrabResult.metrics.outputTokens,
    anygrabResult,
  };
}
