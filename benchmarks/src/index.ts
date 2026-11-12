import { estimateTokens, grab, type GrabResult } from '@anygrab/core';
import { parseHTML } from 'linkedom';
import TurndownService from 'turndown';

export interface BenchmarkComparison {
  name: string;
  rawTokens: number;
  turndownTokens: number;
  anygrabTokens: number;
  anygrabResult: GrabResult;
}

export function runFixtureComparison(name: string, html: string, maxTokens = 1200): BenchmarkComparison {
  const { document } = parseHTML(html);
  const turndown = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
  const turndownMd = turndown.turndown(html);
  const anygrabResult = grab(document as unknown as Document, {
    format: 'markdown',
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
