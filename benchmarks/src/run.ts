import { runFixtureComparison } from './index';

const SAMPLE_FIXTURE = `<!doctype html><html><body><nav><a href="/">Home</a></nav><main><h1>Benchmark Sample</h1><p>Structured DOM distillation benchmark.</p></main></body></html>`;

const summary = runFixtureComparison('smoke-sample', SAMPLE_FIXTURE);
process.stdout.write(`${JSON.stringify({
  name: summary.name,
  rawTokens: summary.rawTokens,
  turndownTokens: summary.turndownTokens,
  anygrabTokens: summary.anygrabTokens,
}, null, 2)}\n`);
