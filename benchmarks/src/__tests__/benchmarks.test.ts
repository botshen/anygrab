import { estimateTokens } from '@anygrab/core';
import { describe, expect, it } from 'vitest';
import {
  BENCHMARK_FIXTURES,
  evaluateFidelity,
  evaluateSingleFixture,
  formatMarkdownReport,
  getFixtureById,
  runBenchmarkSuite,
  runFixtureComparison,
  runTurndownGfm,
  simulateNaiveStylePicker,
} from '../index';

describe('AnyGrab-Bench DOM Torture Suite Fixtures', () => {
  it('provides all 10 required copyright-clean synthetic fixtures with unique IDs', () => {
    expect(BENCHMARK_FIXTURES.length).toBeGreaterThanOrEqual(10);
    const ids = BENCHMARK_FIXTURES.map((f) => f.id);
    expect(new Set(ids).size).toBe(BENCHMARK_FIXTURES.length);

    const expectedIds = [
      'saas-pricing',
      'financial-report-table',
      'bento-analytics-dashboard',
      'oauth-auth-modal',
      'api-docs-page',
      'kanban-sprint-board',
      'dark-ai-hero',
      'feature-matrix-20',
      'multi-section-settings',
      'academic-paper-section',
    ];
    for (const id of expectedIds) {
      const fixture = getFixtureById(id);
      expect(fixture, `Expected fixture ${id} to exist`).toBeDefined();
      expect(fixture!.html).toContain('<style>');
      expect(fixture!.groundTruth.expectedKeyTexts.length).toBeGreaterThan(3);
    }
  });

  it('embeds authentic DOM torture patterns across the 10 fixtures', () => {
    const pricing = getFixtureById('saas-pricing')!;
    expect(pricing.html).toContain('css-19x82a');
    expect(pricing.html).toContain('Most Popular');
    expect(pricing.html).toContain('<linearGradient');

    const finance = getFixtureById('financial-report-table')!;
    expect(finance.html).toContain('rowspan="2"');
    expect(finance.html).toContain('colspan="2"');

    const bento = getFixtureById('bento-analytics-dashboard')!;
    expect(bento.html).toContain('data-testid="layout-shell-1"');
    expect(bento.html).toContain('data-testid="layout-shell-20"');
    expect(bento.html).toContain('<svg');

    const auth = getFixtureById('oauth-auth-modal')!;
    expect(auth.html).toContain('role="dialog"');
    expect(auth.html).toContain('type="email"');
    expect(auth.html).toContain('type="password"');

    const docs = getFixtureById('api-docs-page')!;
    expect(docs.html).toContain('language-typescript');
    expect(docs.html).toContain('<aside');
    expect(docs.html).toContain('<table');

    const kanban = getFixtureById('kanban-sprint-board')!;
    expect(kanban.html).toContain('ENG-401');
    expect(kanban.html).toContain('ENG-410');

    const hero = getFixtureById('dark-ai-hero')!;
    expect(hero.html).toContain('aria-hidden="true"');

    const matrix = getFixtureById('feature-matrix-20')!;
    const bodyRows = matrix.html.match(/class="css-matrix-row-\d+"/g) ?? [];
    expect(bodyRows.length).toBe(20);

    const settings = getFixtureById('multi-section-settings')!;
    expect(settings.html).toContain('role="switch"');
    expect(settings.html).toContain('<select');
    expect(settings.html).toContain('<textarea');

    const paper = getFixtureById('academic-paper-section')!;
    expect(paper.html).toContain('Theorem 4.1');
    expect(paper.html).toContain('rowspan="2"');
  });
});

describe('AnyGrab-Bench Baselines & Objective Fidelity Scorer', () => {
  it('simulates Naive Style Picker computed style bloat accurately', () => {
    const pricing = getFixtureById('saas-pricing')!;
    const rawTokens = estimateTokens(pricing.html);
    const naiveHtml = simulateNaiveStylePicker(pricing.html);
    const naiveTokens = estimateTokens(naiveHtml);

    expect(naiveHtml).toContain('box-sizing: border-box');
    expect(naiveTokens).toBeGreaterThan(rawTokens * 1.5);
  });

  it('scores Turndown GFM with 0% visual style recall and lower merged-table/form fidelity', () => {
    const finance = getFixtureById('financial-report-table')!;
    const md = runTurndownGfm(finance.html);
    const score = evaluateFidelity(md, finance);

    expect(score.styleScore).toBe(0);
    expect(score.tableScore).toBeLessThan(85);

    const auth = getFixtureById('oauth-auth-modal')!;
    const authMd = runTurndownGfm(auth.html);
    const authScore = evaluateFidelity(authMd, auth);
    expect(authScore.styleScore).toBe(0);
    expect(authScore.controlScore).toBeLessThan(35);
  });

  it('rewards clean Tailwind-distilled markup over noisy raw HTML and detects broken markup', () => {
    const hero = getFixtureById('dark-ai-hero')!;
    const cleanTailwindHtml = `
      <section class="flex flex-col items-center gap-5 p-12 bg-slate-950 text-white rounded-2xl border border-slate-800 shadow-xl">
        <span class="px-3 py-1 rounded-full bg-indigo-950 text-indigo-300 text-xs font-semibold">New · AetherCode Context Engine v2.4</span>
        <h1 class="text-4xl font-extrabold">Ship Pixel-Accurate UI to Coding Agents in 2 Milliseconds</h1>
        <div class="flex gap-3">
          <button type="button" class="px-5 py-3 rounded-xl bg-indigo-500 font-bold">Install Chrome Extension</button>
          <a href="#benchmarks" class="px-5 py-3 rounded-xl border border-slate-700">Explore AnyGrab-Bench</a>
        </div>
        <code>npx anygrab https://ui.example.dev --format jsx --budget 1200</code>
      </section>
    `;

    const cleanScore = evaluateFidelity(cleanTailwindHtml, hero);
    const rawScore = evaluateFidelity(hero.html, hero);
    const brokenScore = evaluateFidelity('<section class="flex"><h1>Truncated<div class="bg-', hero);

    expect(cleanScore.styleScore).toBe(100);
    expect(cleanScore.overall).toBeGreaterThan(rawScore.overall);
    expect(brokenScore.tableScore).toBeLessThan(cleanScore.tableScore);
  });

  it('executes single-fixture and full-suite comparisons and formats aligned Markdown', () => {
    const subset = BENCHMARK_FIXTURES.slice(0, 3);
    const single = evaluateSingleFixture(subset[0]);
    expect(single.results['raw-html'].tokens).toBeGreaterThan(0);
    expect(single.results['naive-style-picker'].tokens).toBeGreaterThan(single.rawTokens);

    const suite = runBenchmarkSuite(subset, { warmup: false });
    expect(suite.fixtureCount).toBe(3);
    expect(suite.methods).toHaveLength(5);

    const md = formatMarkdownReport(suite);
    expect(md).toContain('# AnyGrab-Bench v0.1.0');
    expect(md).toContain('Naive Style Picker');
    expect(md).toContain('AnyGrab (--budget 600)');

    const legacy = runFixtureComparison('smoke', subset[0].html, 800);
    expect(legacy.rawTokens).toBeGreaterThan(0);
    expect(legacy.turndownTokens).toBeGreaterThan(0);
  });
});
