/**
 * AnyGrab-Bench — 100% Original MIT Synthetic DOM Torture Suite
 *
 * Covers 10 real-world dirty DOM + <style> archetypes engineered to test
 * token compression, CSS-to-Tailwind compilation, complex merged tables,
 * SVG compaction, noise pruning, and AST-aware token budget folding.
 *
 * Copyright (c) 2026 botshen & AnyGrab Contributors. MIT License.
 */

export type StyleSignalCategory =
  | 'flex'
  | 'grid'
  | 'color'
  | 'spacing'
  | 'radius'
  | 'border'
  | 'typography'
  | 'shadow';

export interface TableExpectation {
  minRows: number;
  minCols: number;
  hasMergedCells: boolean;
  sampleCells: string[];
}

export interface ControlExpectation {
  kind: 'button' | 'input' | 'select' | 'textarea' | 'link' | 'aria';
  /** Expected text label or attribute token (case-insensitive substring match) */
  token: string;
}

export interface FixtureGroundTruth {
  /** High-saliency anchor texts (headings, KPIs, prices, primary CTAs) */
  expectedKeyTexts: string[];
  /** Repeated or lower-priority item texts that may fold gracefully under tight budget */
  secondaryTexts?: string[];
  /** Noise strings inside scripts, hidden modals, or decorative layers */
  noiseTexts: string[];
  /** Expected layout and visual style categories */
  expectedStyleSignals: StyleSignalCategory[];
  /** Expected table integrity spec, or null if non-tabular */
  expectedTable: TableExpectation | null;
  /** Expected interactive affordances */
  expectedControls: ControlExpectation[];
}

export interface BenchmarkFixture {
  id: string;
  index: number;
  name: string;
  category: string;
  description: string;
  tags: string[];
  sourceUrl: string;
  recommendedBudget: number;
  html: string;
  groundTruth: FixtureGroundTruth;
}

const BLOAT_RESET_STYLE =
  'box-sizing: border-box; border: 0px solid rgb(226, 232, 240); margin: 0px; opacity: 1; visibility: visible; position: static; float: none;';

function bloatedCheckSvg(colorHex: string, idSuffix: string): string {
  return `<svg class="css-svg-icon-${idSuffix} sc-icon-check" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" data-testid="feature-check-svg-${idSuffix}" data-v-88a12f="" style="width: 18px; height: 18px; flex-shrink: 0; color: ${colorHex};">
    <defs>
      <linearGradient id="grad-${idSuffix}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${colorHex}" stop-opacity="1" />
        <stop offset="50%" stop-color="${colorHex}" stop-opacity="0.92" />
        <stop offset="100%" stop-color="${colorHex}" stop-opacity="0.85" />
      </linearGradient>
      <clipPath id="clip-${idSuffix}"><rect width="24" height="24" rx="12" /></clipPath>
    </defs>
    <g clip-path="url(#clip-${idSuffix})" data-layer="icon-backdrop">
      <circle cx="12" cy="12" r="10.75" stroke="${colorHex}" stroke-opacity="0.28" stroke-width="1.5" />
      <path d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2ZM16.7071 9.70711L11.2071 15.2071C10.8166 15.5976 10.1834 15.5976 9.79289 15.2071L7.29289 12.7071C6.90237 12.3166 6.90237 11.6834 7.29289 11.2929C7.68342 10.9024 8.31658 10.9024 8.70711 11.2929L10.5 13.0858L15.2929 8.29289C15.6834 7.90237 16.3166 7.90237 16.7071 8.29289C17.0976 8.68342 17.0976 9.31658 16.7071 9.70711Z" fill="url(#grad-${idSuffix})" />
      <path d="M8.5 12.1L10.55 14.15L15.6 9.1" stroke="${colorHex}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    </g>
  </svg>`;
}

function wrapInRedundantDivs(innerHtml: string, depth: number): string {
  let wrapped = innerHtml;
  for (let i = depth; i >= 1; i--) {
    wrapped = `<div class="css-19x82a-nest-${i} sc-bdnxRM jsx-wrapper-${i}" data-testid="layout-shell-${i}" data-v-91f02a="" style="display: block; box-sizing: border-box; border: 0px solid;">${wrapped}</div>`;
  }
  return wrapped;
}

/* -------------------------------------------------------------------------- */
/* 1. SaaS Three-Tier Gradient Pricing Cards                                  */
/* -------------------------------------------------------------------------- */
function createSaasPricingFixture(): BenchmarkFixture {
  const tiers = [
    {
      id: 'starter',
      title: 'Starter',
      subtitle: 'For solo indie builders prototyping AI workflows.',
      price: '$0',
      period: '/month',
      popular: false,
      cta: 'Start Building Free',
      accent: '#38bdf8',
      features: [
        '5,000 DOM distillations / mo',
        'Local CLI & Markdown export',
        'Standard table extraction',
        'Community Discord support',
      ],
    },
    {
      id: 'pro',
      title: 'Pro Scale',
      subtitle: 'Production context pipelines for engineering teams.',
      price: '$29',
      period: '/month',
      popular: true,
      cta: 'Upgrade to Pro',
      accent: '#818cf8',
      features: [
        '250,000 DOM distillations / mo',
        'Tailwind v4 & React JSX compiler',
        'Token-budget AST smart folding',
        'Stdio & Remote MCP Server sync',
        'Design Token palette extraction',
      ],
    },
    {
      id: 'enterprise',
      title: 'Enterprise',
      subtitle: 'Dedicated browser clusters & custom site adapters.',
      price: '$99',
      period: '/seat/mo',
      popular: false,
      cta: 'Contact Architecture Sales',
      accent: '#34d399',
      features: [
        'Unlimited zero-telemetry runs',
        'Custom private DOM adapters',
        'SSO / SAML & audit logs',
        '99.99% SLA & dedicated engineer',
      ],
    },
  ];

  const cardsHtml = tiers
    .map(
      (tier, idx) => `
      <article class="tier-card ${tier.popular ? 'tier-card-popular' : ''} css-19x82a sc-pCard-${idx} _pricingCard_19x_1" data-testid="pricing-tier-${tier.id}" data-reactid=".0.1.${idx}" style="${BLOAT_RESET_STYLE}">
        ${
          tier.popular
            ? `<div class="popular-badge css-badge-99x" aria-label="Most Popular Plan">Most Popular</div>`
            : `<div class="css-empty-slot" aria-hidden="true" style="display: none;">Hidden Promo Banner ${idx}</div>`
        }
        <div class="css-wrap-head"><div class="tier-header">
          <h3 class="tier-title css-h3-77k">${tier.title}</h3>
          <p class="tier-subtitle css-sub-12p">${tier.subtitle}</p>
        </div></div>
        <div class="tier-price-row css-price-box">
          <span class="tier-price">${tier.price}</span>
          <span class="tier-period">${tier.period}</span>
        </div>
        <ul class="tier-features css-list-ul" role="list">
          ${tier.features
            .map(
              (feat, fIdx) => `
            <li class="tier-feature-item css-li-91a" data-testid="feat-${idx}-${fIdx}" style="${BLOAT_RESET_STYLE} display: flex; align-items: center; gap: 10px;">
              ${bloatedCheckSvg(tier.accent, `${idx}-${fIdx}`)}
              <span class="feature-text">${feat}</span>
            </li>`,
            )
            .join('')}
        </ul>
        <button type="button" class="tier-cta ${tier.popular ? 'tier-cta-primary' : 'tier-cta-secondary'} css-btn-action" onclick="window.__trackPricingClick && window.__trackPricingClick('${tier.id}')">
          ${tier.cta}
        </button>
      </article>`,
    )
    .join('\n');

  const html = `<!doctype html>
<html lang="en">
<head>
  <style>
    :root {
      --bg-canvas: #090d16;
      --bg-card: #111827;
      --bg-popular: #172036;
      --brand-indigo: #6366f1;
      --brand-violet: #8b5cf6;
      --text-main: #f8fafc;
      --text-muted: #94a3b8;
    }
    body { margin: 0; background-color: var(--bg-canvas); color: var(--text-main); font-family: Inter, system-ui, sans-serif; }
    .pricing-section { max-width: 1080px; margin: 0 auto; padding: 40px 24px; background-color: var(--bg-canvas); }
    .pricing-hero { text-align: center; margin-bottom: 32px; display: flex; flex-direction: column; align-items: center; gap: 12px; }
    .eyebrow-pill { display: inline-flex; align-items: center; padding: 4px 12px; border-radius: 9999px; background-color: #1e1b4b; color: #a5b4fc; font-size: 12px; font-weight: 600; border: 1px solid #312e81; }
    .pricing-heading { font-size: 32px; font-weight: 800; color: #f8fafc; margin: 0; letter-spacing: -0.02em; }
    .billing-toggle { display: inline-flex; align-items: center; gap: 8px; padding: 4px; background-color: #1e293b; border-radius: 10px; border: 1px solid #334155; }
    .toggle-pill { padding: 6px 14px; border-radius: 8px; font-size: 13px; font-weight: 600; color: #f8fafc; background-color: var(--brand-indigo); border: none; cursor: pointer; }
    .toggle-pill-muted { padding: 6px 14px; border-radius: 8px; font-size: 13px; font-weight: 500; color: #94a3b8; background: transparent; border: none; }
    .pricing-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px; align-items: stretch; }
    .tier-card { display: flex; flex-direction: column; justify-content: space-between; padding: 24px; border-radius: 16px; background-color: var(--bg-card); border: 1px solid #1f2937; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35); position: relative; }
    .tier-card-popular { background-color: var(--bg-popular); border: 2px solid var(--brand-indigo); box-shadow: 0 20px 40px rgba(99, 102, 241, 0.22); }
    .popular-badge { display: inline-block; align-self: flex-start; margin-bottom: 12px; padding: 4px 10px; border-radius: 9999px; background: linear-gradient(90deg, #6366f1, #8b5cf6); color: #ffffff; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
    .tier-title { font-size: 20px; font-weight: 700; color: #f8fafc; margin: 0 0 6px 0; }
    .tier-subtitle { font-size: 13px; color: var(--text-muted); line-height: 1.5; margin: 0 0 16px 0; }
    .tier-price-row { display: flex; align-items: baseline; gap: 4px; margin-bottom: 20px; }
    .tier-price { font-size: 36px; font-weight: 800; color: #ffffff; }
    .tier-period { font-size: 14px; color: var(--text-muted); }
    .tier-features { list-style: none; padding: 0; margin: 0 0 24px 0; display: flex; flex-direction: column; gap: 10px; font-size: 13px; color: #cbd5e1; }
    .tier-cta { width: 100%; padding: 12px 16px; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; border: 1px solid #334155; }
    .tier-cta-primary { background-color: var(--brand-indigo); color: #ffffff; border-color: var(--brand-indigo); }
    .tier-cta-primary:hover { background-color: #4f46e5; }
    .tier-cta-secondary { background-color: #1f2937; color: #e2e8f0; }
    .tier-cta-secondary:hover { background-color: #374151; }
  </style>
  <script>
    window.__ANALYTICS_QUEUE__ = [['init', 'UA-998123-SYNTH'], ['track', 'PricingImpression']];
  </script>
</head>
<body>
  <section class="pricing-section css-19x82a" data-testid="pricing-root">
    <div aria-hidden="true" style="display: none;">Legacy Modal LegacyTrackingPixel_99812</div>
    <header class="pricing-hero">
      <span class="eyebrow-pill">VeloCloud Predictable Pricing</span>
      <h2 class="pricing-heading">Scale UI Context Without Burning Token Quota</h2>
      <div class="billing-toggle" role="group" aria-label="Billing frequency">
        <button type="button" class="toggle-pill" aria-pressed="true">Annual Billing (-20%)</button>
        <button type="button" class="toggle-pill-muted" aria-pressed="false">Monthly</button>
      </div>
    </header>
    <div class="pricing-grid">
      ${cardsHtml}
    </div>
  </section>
</body>
</html>`;

  return {
    id: 'saas-pricing',
    index: 1,
    name: 'SaaS 3-Tier Gradient Pricing',
    category: 'SaaS Marketing',
    description:
      'Three-tier pricing grid with CSS-in-JS hashed classes (css-19x82a), 13 bloated multi-path SVG icons, Popular badge, and CSS variables.',
    tags: ['CSS-in-JS', '13x Giant SVGs', '3-Col Grid', 'Popular Badge'],
    sourceUrl: 'https://velocloud.example.dev/pricing',
    recommendedBudget: 900,
    html,
    groundTruth: {
      expectedKeyTexts: [
        'Scale UI Context Without Burning Token Quota',
        'Starter',
        '$0',
        'Pro Scale',
        '$29',
        'Most Popular',
        'Enterprise',
        '$99',
        'Upgrade to Pro',
      ],
      noiseTexts: ['UA-998123-SYNTH', 'LegacyTrackingPixel_99812', 'Hidden Promo Banner'],
      expectedStyleSignals: ['grid', 'flex', 'color', 'spacing', 'radius', 'border', 'typography', 'shadow'],
      expectedTable: null,
      expectedControls: [
        { kind: 'button', token: 'Annual Billing' },
        { kind: 'button', token: 'Start Building Free' },
        { kind: 'button', token: 'Upgrade to Pro' },
        { kind: 'button', token: 'Contact Architecture Sales' },
      ],
    },
  };
}

/* -------------------------------------------------------------------------- */
/* 2. Merged-Header Financial Statement (rowspan + colspan)                   */
/* -------------------------------------------------------------------------- */
function createFinancialReportFixture(): BenchmarkFixture {
  const rows = [
    {
      segment: 'Cloud Compute Runtime',
      q3Rev: '$42.8M',
      q3Margin: '74.2%',
      q4Rev: '$51.4M',
      q4Margin: '76.8%',
      yoy: '+38.4%',
      status: 'Audited',
      statusClass: 'badge-emerald',
    },
    {
      segment: 'Agent Distillation API',
      q3Rev: '$18.6M',
      q3Margin: '82.5%',
      q4Rev: '$27.9M',
      q4Margin: '85.1%',
      yoy: '+94.2%',
      status: 'Outperforming',
      statusClass: 'badge-indigo',
    },
    {
      segment: 'Managed Browser Fleet',
      q3Rev: '$11.2M',
      q3Margin: '61.0%',
      q4Rev: '$13.5M',
      q4Margin: '64.4%',
      yoy: '+24.7%',
      status: 'Audited',
      statusClass: 'badge-emerald',
    },
    {
      segment: 'Enterprise Compliance Suite',
      q3Rev: '$7.4M',
      q3Margin: '79.0%',
      q4Rev: '$9.2M',
      q4Margin: '80.3%',
      yoy: '+31.5%',
      status: 'Preliminary',
      statusClass: 'badge-amber',
    },
  ];

  const html = `<!doctype html>
<html lang="en">
<head>
  <style>
    .fin-card { max-width: 960px; margin: 24px auto; padding: 24px; border-radius: 14px; background-color: #0f172a; color: #f1f5f9; border: 1px solid #1e293b; font-family: Inter, system-ui, sans-serif; }
    .fin-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; gap: 16px; }
    .fin-title { font-size: 20px; font-weight: 700; color: #f8fafc; margin: 0; }
    .fin-subtitle { font-size: 13px; color: #94a3b8; margin: 4px 0 0 0; }
    .export-btn { padding: 8px 14px; border-radius: 8px; background-color: #1e293b; color: #e2e8f0; border: 1px solid #334155; font-size: 12px; font-weight: 600; cursor: pointer; }
    .fin-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .fin-table th { background-color: #1e293b; color: #cbd5e1; font-weight: 600; padding: 10px 12px; border: 1px solid #334155; text-align: left; }
    .fin-table td { padding: 10px 12px; border: 1px solid #1e293b; color: #e2e8f0; }
    .num-cell { text-align: right; font-family: ui-monospace, SFMono-Regular, monospace; }
    .badge-emerald { display: inline-block; padding: 2px 8px; border-radius: 9999px; background-color: #064e3b; color: #6ee7b7; font-size: 11px; font-weight: 600; }
    .badge-indigo { display: inline-block; padding: 2px 8px; border-radius: 9999px; background-color: #312e81; color: #a5b4fc; font-size: 11px; font-weight: 600; }
    .badge-amber { display: inline-block; padding: 2px 8px; border-radius: 9999px; background-color: #78350f; color: #fcd34d; font-size: 11px; font-weight: 600; }
    .tfoot-row td { background-color: #172033; font-weight: 700; color: #ffffff; border-top: 2px solid #475569; }
  </style>
  <script>console.debug('LedgerCore internal table hydrator v4.2');</script>
</head>
<body style="background-color: #020617; margin: 0; padding: 16px;">
  <section class="fin-card css-table-shell-88x" data-testid="ledger-statement">
    <div class="fin-header">
      <div>
        <h2 class="fin-title">LedgerCore FY2026 Consolidated Segment Revenue</h2>
        <p class="fin-subtitle">GAAP &amp; Operating Gross Margin Schedule (USD Millions, Unaudited Q4 Flash)</p>
      </div>
      <button type="button" class="export-btn" aria-label="Download CSV Schedule">Export XBRL / CSV</button>
    </div>
    <table class="fin-table" aria-label="Consolidated Revenue Table">
      <thead>
        <tr>
          <th rowspan="2" data-col-key="segment" style="${BLOAT_RESET_STYLE}">Operating Segment</th>
          <th colspan="2" style="${BLOAT_RESET_STYLE} text-align: center;">Q3 FY2026</th>
          <th colspan="2" style="${BLOAT_RESET_STYLE} text-align: center;">Q4 FY2026</th>
          <th rowspan="2" style="${BLOAT_RESET_STYLE} text-align: right;">YoY Growth</th>
          <th rowspan="2" style="${BLOAT_RESET_STYLE}">Audit Status</th>
        </tr>
        <tr>
          <th style="${BLOAT_RESET_STYLE} text-align: right;">Revenue</th>
          <th style="${BLOAT_RESET_STYLE} text-align: right;">Gross Margin</th>
          <th style="${BLOAT_RESET_STYLE} text-align: right;">Revenue</th>
          <th style="${BLOAT_RESET_STYLE} text-align: right;">Gross Margin</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (r, i) => `
        <tr data-row-id="seg-${i}" class="css-tr-row-${i}">
          <td style="${BLOAT_RESET_STYLE} font-weight: 600;">${r.segment}</td>
          <td class="num-cell" style="${BLOAT_RESET_STYLE}">${r.q3Rev}</td>
          <td class="num-cell" style="${BLOAT_RESET_STYLE}">${r.q3Margin}</td>
          <td class="num-cell" style="${BLOAT_RESET_STYLE}">${r.q4Rev}</td>
          <td class="num-cell" style="${BLOAT_RESET_STYLE}">${r.q4Margin}</td>
          <td class="num-cell" style="${BLOAT_RESET_STYLE} color: #34d399;">${r.yoy}</td>
          <td style="${BLOAT_RESET_STYLE}"><span class="${r.statusClass}">${r.status}</span></td>
        </tr>`,
          )
          .join('')}
      </tbody>
      <tfoot>
        <tr class="tfoot-row">
          <td colspan="1">Total Consolidated</td>
          <td class="num-cell">$80.0M</td>
          <td class="num-cell">74.7%</td>
          <td class="num-cell">$102.0M</td>
          <td class="num-cell">77.8%</td>
          <td class="num-cell">+48.9%</td>
          <td><span class="badge-emerald">Verified</span></td>
        </tr>
      </tfoot>
    </table>
  </section>
</body>
</html>`;

  return {
    id: 'financial-report-table',
    index: 2,
    name: 'Merged-Header Financial Statement',
    category: 'Enterprise Finance',
    description:
      'Multi-level financial statement with rowspan=2 & colspan=2 headers, tfoot summary, numeric alignment, and status badges that break naive Markdown converters.',
    tags: ['rowspan + colspan', 'Multi-Axis Header', 'Status Pills', 'tfoot'],
    sourceUrl: 'https://investor.ledgercore.example.com/q4-2026',
    recommendedBudget: 800,
    html,
    groundTruth: {
      expectedKeyTexts: [
        'LedgerCore FY2026 Consolidated Segment Revenue',
        'Operating Segment',
        'Cloud Compute Runtime',
        '$51.4M',
        'Agent Distillation API',
        '+94.2%',
        'Total Consolidated',
        '$102.0M',
      ],
      noiseTexts: ['LedgerCore internal table hydrator v4.2'],
      expectedStyleSignals: ['flex', 'color', 'spacing', 'radius', 'border', 'typography'],
      expectedTable: {
        minRows: 7,
        minCols: 7,
        hasMergedCells: true,
        sampleCells: ['Operating Segment', 'Q3 FY2026', 'Q4 FY2026', 'Gross Margin', '$51.4M', '$102.0M'],
      },
      expectedControls: [{ kind: 'button', token: 'Export XBRL / CSV' }],
    },
  };
}

/* -------------------------------------------------------------------------- */
/* 3. Bento Analytics Dashboard Grid (4 KPIs + SVG Chart + 20x Div Soup)      */
/* -------------------------------------------------------------------------- */
function createBentoDashboardFixture(): BenchmarkFixture {
  const kpis = [
    { label: 'Active Agent Sessions', value: '48,920', delta: '+18.4%', trend: 'up' },
    { label: 'P99 Distillation Latency', value: '1.84 ms', delta: '-42.1%', trend: 'up' },
    { label: 'Context Tokens Saved (24h)', value: '1.42 B', delta: '+94.6%', trend: 'up' },
    { label: 'DOM Parse Failure Rate', value: '0.012%', delta: '-0.04%', trend: 'up' },
  ];

  const innerDashboard = `
    <div class="bento-container">
      <div class="bento-topbar">
        <div>
          <h2 class="bento-title">PulseMetrics Realtime Telemetry</h2>
          <p class="bento-sub">Cluster us-east-prod · Rolling 24h window</p>
        </div>
        <div class="bento-controls">
          <select aria-label="Time Range" class="bento-select">
            <option value="24h" selected>Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          <button type="button" class="bento-refresh">Refresh Live</button>
        </div>
      </div>
      <div class="kpi-grid">
        ${kpis
          .map(
            (k, i) => `
          <div class="kpi-card css-kpi-${i}" style="${BLOAT_RESET_STYLE}">
            <span class="kpi-label">${k.label}</span>
            <div class="kpi-val-row">
              <strong class="kpi-value">${k.value}</strong>
              <span class="kpi-delta">${k.delta}</span>
            </div>
          </div>`,
          )
          .join('')}
      </div>
      <div class="chart-panel">
        <div class="chart-head">
          <h3 class="chart-title">Token Compression Throughput (Req/sec)</h3>
          <span class="chart-legend">Peak: 14,820 req/s</span>
        </div>
        <svg class="chart-svg" viewBox="0 0 640 160" width="640" height="160" role="img" aria-label="Throughput Area Line Chart">
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#6366f1" stop-opacity="0.45"/>
              <stop offset="100%" stop-color="#6366f1" stop-opacity="0.0"/>
            </linearGradient>
          </defs>
          <g stroke="#1e293b" stroke-dasharray="4 4">
            <line x1="0" y1="30" x2="640" y2="30" />
            <line x1="0" y1="75" x2="640" y2="75" />
            <line x1="0" y1="120" x2="640" y2="120" />
          </g>
          <path d="M0,132 L40,125 L80,118 L120,122 L160,96 L200,88 L240,94 L280,68 L320,54 L360,61 L400,42 L440,36 L480,44 L520,28 L560,22 L600,19 L640,14 L640,155 L0,155 Z" fill="url(#areaGrad)" />
          <path d="M0,132 L40,125 L80,118 L120,122 L160,96 L200,88 L240,94 L280,68 L320,54 L360,61 L400,42 L440,36 L480,44 L520,28 L560,22 L600,19 L640,14" fill="none" stroke="#818cf8" stroke-width="2.5" />
        </svg>
      </div>
    </div>`;

  const html = `<!doctype html>
<html lang="en">
<head>
  <style>
    body { margin: 0; background-color: #09090b; color: #fafafa; font-family: Inter, system-ui, sans-serif; padding: 20px; }
    .bento-container { max-width: 980px; margin: 0 auto; padding: 24px; border-radius: 16px; background-color: #121217; border: 1px solid #27272a; display: flex; flex-direction: column; gap: 20px; }
    .bento-topbar { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
    .bento-title { font-size: 20px; font-weight: 700; margin: 0; color: #f4f4f5; }
    .bento-sub { font-size: 12px; color: #a1a1aa; margin: 4px 0 0 0; }
    .bento-controls { display: flex; align-items: center; gap: 10px; }
    .bento-select { padding: 7px 12px; border-radius: 8px; background-color: #18181b; color: #e4e4e7; border: 1px solid #3f3f46; font-size: 12px; }
    .bento-refresh { padding: 7px 14px; border-radius: 8px; background-color: #4f46e5; color: #ffffff; border: none; font-size: 12px; font-weight: 600; cursor: pointer; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
    .kpi-card { padding: 16px; border-radius: 12px; background-color: #18181f; border: 1px solid #27272a; display: flex; flex-direction: column; gap: 8px; }
    .kpi-label { font-size: 12px; color: #a1a1aa; font-weight: 500; }
    .kpi-val-row { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
    .kpi-value { font-size: 22px; font-weight: 700; color: #ffffff; }
    .kpi-delta { font-size: 11px; font-weight: 600; padding: 2px 6px; border-radius: 6px; background-color: #052e16; color: #4ade80; }
    .chart-panel { padding: 18px; border-radius: 12px; background-color: #18181f; border: 1px solid #27272a; }
    .chart-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .chart-title { font-size: 14px; font-weight: 600; margin: 0; color: #e4e4e7; }
    .chart-legend { font-size: 12px; color: #818cf8; font-weight: 600; }
    .chart-svg { width: 100%; height: auto; display: block; }
  </style>
</head>
<body>
  ${wrapInRedundantDivs(innerDashboard, 20)}
</body>
</html>`;

  return {
    id: 'bento-analytics-dashboard',
    index: 3,
    name: 'Bento KPI Dashboard (20x Div Soup)',
    category: 'Analytics UI',
    description:
      '4-card Bento KPI grid + multi-series SVG area chart wrapped inside 20 layers of unstyled single-child CSS-in-JS <div> shells.',
    tags: ['20-Layer Div Soup', '4x KPI Grid', 'SVG Chart', 'Select + Button'],
    sourceUrl: 'https://app.pulsemetrics.example.io/telemetry',
    recommendedBudget: 750,
    html,
    groundTruth: {
      expectedKeyTexts: [
        'PulseMetrics Realtime Telemetry',
        'Active Agent Sessions',
        '48,920',
        'P99 Distillation Latency',
        '1.84 ms',
        'Context Tokens Saved (24h)',
        '1.42 B',
        'Token Compression Throughput',
      ],
      noiseTexts: [],
      expectedStyleSignals: ['grid', 'flex', 'color', 'spacing', 'radius', 'border', 'typography'],
      expectedTable: null,
      expectedControls: [
        { kind: 'select', token: 'Time Range' },
        { kind: 'button', token: 'Refresh Live' },
      ],
    },
  };
}

/* -------------------------------------------------------------------------- */
/* 4. OAuth + Credentials Login Modal (Form Inputs + ARIA States)             */
/* -------------------------------------------------------------------------- */
function createOauthModalFixture(): BenchmarkFixture {
  const html = `<!doctype html>
<html lang="en">
<head>
  <style>
    body { margin: 0; background-color: #090d16; color: #f8fafc; font-family: Inter, system-ui, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 460px; padding: 24px; }
    .auth-modal { width: 100%; max-width: 420px; padding: 28px; border-radius: 18px; background-color: #111827; border: 1px solid #1f2937; box-shadow: 0 24px 48px rgba(0,0,0,0.5); display: flex; flex-direction: column; gap: 18px; }
    .auth-title { font-size: 22px; font-weight: 700; color: #ffffff; margin: 0; }
    .auth-desc { font-size: 13px; color: #94a3b8; margin: 4px 0 0 0; }
    .oauth-row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
    .oauth-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 10px 12px; border-radius: 10px; background-color: #1e293b; border: 1px solid #334155; color: #f1f5f9; font-size: 13px; font-weight: 600; cursor: pointer; }
    .oauth-btn:hover { background-color: #334155; }
    .divider { text-align: center; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; }
    .field-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
    .field-label { font-size: 12px; font-weight: 600; color: #cbd5e1; }
    .field-input { padding: 10px 12px; border-radius: 10px; background-color: #090d16; border: 1px solid #334155; color: #f8fafc; font-size: 13px; }
    .field-error { font-size: 11px; color: #f87171; margin: 0; }
    .remember-row { display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #94a3b8; margin-bottom: 14px; }
    .submit-btn { width: 100%; padding: 11px 16px; border-radius: 10px; background-color: #6366f1; color: #ffffff; border: none; font-size: 14px; font-weight: 600; cursor: pointer; }
    .forgot-link { color: #818cf8; text-decoration: none; }
  </style>
</head>
<body>
  <div role="dialog" aria-modal="true" aria-labelledby="nova-auth-heading" class="auth-modal css-auth-dialog-72f" data-testid="auth-dialog">
    <input type="text" name="bot_honeypot_trap" hidden value="trap_token_ignore" />
    <div>
      <h1 id="nova-auth-heading" class="auth-title">Sign in to NovaAuth Studio</h1>
      <p class="auth-desc">Authenticate with your developer identity or SSO workspace.</p>
    </div>
    <div class="oauth-row">
      <button type="button" class="oauth-btn" aria-label="Continue with GitHub">
        ${bloatedCheckSvg('#f8fafc', 'gh')}
        <span>GitHub</span>
      </button>
      <button type="button" class="oauth-btn" aria-label="Continue with Google">
        ${bloatedCheckSvg('#38bdf8', 'gg')}
        <span>Google SSO</span>
      </button>
    </div>
    <div class="divider" role="separator">Or continue with work email</div>
    <form action="/api/session" method="post" aria-label="Email Sign In Form">
      <div class="field-group">
        <label for="work-email" class="field-label">Work Email</label>
        <input id="work-email" name="email" type="email" class="field-input" placeholder="alex@company.dev" required aria-required="true" aria-invalid="false" />
      </div>
      <div class="field-group">
        <label for="work-password" class="field-label">Password</label>
        <input id="work-password" name="password" type="password" class="field-input" placeholder="••••••••••••" required aria-invalid="true" aria-describedby="pw-policy-hint" />
        <p id="pw-policy-hint" class="field-error" role="alert">Hardware security key or 12+ char passphrase required.</p>
      </div>
      <div class="remember-row">
        <label><input type="checkbox" name="remember" checked /> Trust device for 30 days</label>
        <a href="/reset-password" class="forgot-link">Forgot password?</a>
      </div>
      <button type="submit" class="submit-btn">Sign in to Workspace</button>
    </form>
  </div>
</body>
</html>`;

  return {
    id: 'oauth-auth-modal',
    index: 4,
    name: 'OAuth & Credentials Auth Modal',
    category: 'Auth & Forms',
    description:
      'Accessible authentication dialog with role="dialog", OAuth buttons, email/password inputs, ARIA validation states, checkbox, and hidden honeypot trap.',
    tags: ['ARIA Dialog', 'OAuth Buttons', 'Form Inputs', 'Hidden Honeypot'],
    sourceUrl: 'https://auth.novastudio.example.dev/login',
    recommendedBudget: 650,
    html,
    groundTruth: {
      expectedKeyTexts: [
        'Sign in to NovaAuth Studio',
        'GitHub',
        'Google SSO',
        'Work Email',
        'Password',
        'Hardware security key or 12+ char passphrase required.',
        'Sign in to Workspace',
      ],
      noiseTexts: ['trap_token_ignore'],
      expectedStyleSignals: ['grid', 'flex', 'color', 'spacing', 'radius', 'border', 'typography', 'shadow'],
      expectedTable: null,
      expectedControls: [
        { kind: 'aria', token: 'dialog' },
        { kind: 'button', token: 'GitHub' },
        { kind: 'button', token: 'Google SSO' },
        { kind: 'input', token: 'alex@company.dev' },
        { kind: 'button', token: 'Sign in to Workspace' },
      ],
    },
  };
}

/* -------------------------------------------------------------------------- */
/* 5. Technical API Documentation Page (Nav/Sidebar Noise + TS Code + Table)  */
/* -------------------------------------------------------------------------- */
function createApiDocsFixture(): BenchmarkFixture {
  const sidebarLinks = Array.from(
    { length: 18 },
    (_, i) =>
      `<li><a href="/docs/legacy-endpoint-${i + 1}" class="side-link">Legacy v0 Endpoint #${i + 1}</a></li>`,
  ).join('');

  const html = `<!doctype html>
<html lang="en">
<head>
  <style>
    body { margin: 0; background-color: #0b1120; color: #e2e8f0; font-family: Inter, system-ui, sans-serif; }
    .top-nav { display: flex; justify-content: space-between; align-items: center; padding: 12px 24px; background-color: #0f172a; border-bottom: 1px solid #1e293b; }
    .docs-shell { display: grid; grid-template-columns: 220px 1fr; max-width: 1100px; margin: 0 auto; }
    .docs-sidebar { padding: 20px; border-right: 1px solid #1e293b; font-size: 12px; color: #64748b; }
    .docs-main { padding: 28px 32px; display: flex; flex-direction: column; gap: 18px; }
    .endpoint-pill { display: inline-flex; align-items: center; gap: 8px; padding: 4px 10px; border-radius: 8px; background-color: #1e1b4b; color: #a5b4fc; font-family: monospace; font-size: 12px; font-weight: 700; align-self: flex-start; }
    .doc-h1 { font-size: 26px; font-weight: 800; color: #f8fafc; margin: 0; }
    .doc-lead { font-size: 14px; color: #94a3b8; line-height: 1.6; margin: 0; }
    .code-block { padding: 16px; border-radius: 12px; background-color: #020617; border: 1px solid #1e293b; color: #e2e8f0; font-family: ui-monospace, SFMono-Regular, monospace; font-size: 12px; overflow-x: auto; }
    .param-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .param-table th { text-align: left; padding: 10px; background-color: #1e293b; color: #f1f5f9; border: 1px solid #334155; }
    .param-table td { padding: 10px; border: 1px solid #1e293b; color: #cbd5e1; }
  </style>
</head>
<body>
  <header class="top-nav" role="banner">
    <span>EdgeStream Docs</span>
    <nav aria-label="Global Marketing Nav">
      <a href="/blog">Blog</a> · <a href="/careers">Careers (Hiring!)</a> · <a href="/changelog">Changelog</a> · <a href="/ merch">Swag Store</a>
    </nav>
  </header>
  <div class="cookie-banner" role="region" aria-label="Cookie Consent" style="display: none;">We use analytics cookies to personalize marketing campaigns.</div>
  <div class="docs-shell">
    <aside class="docs-sidebar" aria-label="Sidebar Navigation">
      <p>Deprecated Endpoints</p>
      <ul>${sidebarLinks}</ul>
    </aside>
    <main class="docs-main">
      <article>
        <div class="endpoint-pill">POST /v1/distill</div>
        <h1 class="doc-h1">Distill Webpage Subtree</h1>
        <p class="doc-lead">Deterministically compiles dirty HTML &amp; CSS rules into token-budgeted Tailwind HTML, JSX, or GFM Markdown in under 5ms.</p>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <h2>TypeScript SDK Example</h2>
          <button type="button" class="endpoint-pill" style="cursor: pointer; border: 1px solid #312e81;">Copy SDK Snippet</button>
        </div>
        <pre class="code-block"><code class="language-typescript">import { grab } from '@anygrab/core';

const result = grab(document.querySelector('main')!, {
  format: 'jsx',
  maxTokens: 1200,
  compactSvg: true,
});
console.log(result.metrics.compressionRatio);</code></pre>
        <h2>Request Body Parameters</h2>
        <table class="param-table">
          <thead>
            <tr>
              <th>Parameter</th>
              <th>Type</th>
              <th>Default</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>format</code></td>
              <td><code>'prompt' | 'tailwind-html' | 'jsx' | 'markdown'</code></td>
              <td><code>'prompt'</code></td>
              <td>Target serialization format for downstream coding agents.</td>
            </tr>
            <tr>
              <td><code>maxTokens</code></td>
              <td><code>number</code></td>
              <td><code>undefined</code></td>
              <td>Token ceiling triggering AST saliency sibling folding.</td>
            </tr>
            <tr>
              <td><code>compactSvg</code></td>
              <td><code>boolean</code></td>
              <td><code>true</code></td>
              <td>Collapses verbose vector paths into semantic icon placeholders.</td>
            </tr>
          </tbody>
        </table>
      </article>
    </main>
  </div>
</body>
</html>`;

  return {
    id: 'api-docs-page',
    index: 5,
    name: 'API Reference Docs + TS Code',
    category: 'Developer Docs',
    description:
      'Technical endpoint documentation surrounded by top marketing nav clutter, 18 deprecated sidebar TOC links, TypeScript <pre><code> block, and parameter schema table.',
    tags: ['Nav/Sidebar Noise', 'TS <pre><code>', 'Schema Table', 'docs-mdx'],
    sourceUrl: 'https://docs.edgestream.example.dev/api/distill',
    recommendedBudget: 700,
    html,
    groundTruth: {
      expectedKeyTexts: [
        'POST /v1/distill',
        'Distill Webpage Subtree',
        "import { grab } from '@anygrab/core'",
        'maxTokens',
        'compactSvg',
        'Request Body Parameters',
      ],
      noiseTexts: ['Swag Store', 'Cookie Consent', 'Legacy v0 Endpoint #15'],
      expectedStyleSignals: ['grid', 'flex', 'color', 'spacing', 'radius', 'border', 'typography'],
      expectedTable: {
        minRows: 4,
        minCols: 4,
        hasMergedCells: false,
        sampleCells: ['Parameter', 'format', 'maxTokens', 'compactSvg'],
      },
      expectedControls: [{ kind: 'button', token: 'Copy SDK Snippet' }],
    },
  };
}

/* -------------------------------------------------------------------------- */
/* 6. Kanban Sprint Column (10 Isomorphic Cards -> Token Budget Folding)      */
/* -------------------------------------------------------------------------- */
function createKanbanBoardFixture(): BenchmarkFixture {
  const tasks = [
    { id: 'ENG-401', title: 'Implement CSS cascade specificity matcher', pts: '5 pt', priority: 'P0', owner: 'Lin' },
    { id: 'ENG-402', title: 'Fold isomorphic sibling nodes under token ceiling', pts: '8 pt', priority: 'P0', owner: 'Maya' },
    { id: 'ENG-403', title: 'Expand rowspan & colspan matrices in GFM exporter', pts: '5 pt', priority: 'P1', owner: 'Devon' },
    { id: 'ENG-404', title: 'Ship Shadow DOM HUD picker keyboard navigation', pts: '3 pt', priority: 'P1', owner: 'Sora' },
    { id: 'ENG-405', title: 'Add Stdio MCP tools grab_url and grab_html', pts: '5 pt', priority: 'P1', owner: 'Kai' },
    { id: 'ENG-406', title: 'Strip CSS-in-JS Emotion and Styled-Components hashes', pts: '3 pt', priority: 'P2', owner: 'Lin' },
    { id: 'ENG-407', title: 'Extract top-12 deduplicated hex/rgb design tokens', pts: '2 pt', priority: 'P2', owner: 'Maya' },
    { id: 'ENG-408', title: 'Inline same-origin external stylesheets in CLI fetcher', pts: '3 pt', priority: 'P2', owner: 'Devon' },
    { id: 'ENG-409', title: 'Benchmark against Naive Style Picker & Turndown GFM', pts: '5 pt', priority: 'P2', owner: 'Sora' },
    { id: 'ENG-410', title: 'Publish zero-backend Vite static Playground bundle', pts: '3 pt', priority: 'P2', owner: 'Kai' },
  ];

  const html = `<!doctype html>
<html lang="en">
<head>
  <style>
    body { margin: 0; background-color: #090d16; color: #f8fafc; font-family: Inter, system-ui, sans-serif; padding: 20px; }
    .kanban-col { max-width: 520px; margin: 0 auto; padding: 18px; border-radius: 16px; background-color: #111827; border: 1px solid #1f2937; display: flex; flex-direction: column; gap: 12px; }
    .col-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 8px; border-bottom: 1px solid #1f2937; }
    .col-title { font-size: 16px; font-weight: 700; color: #f8fafc; margin: 0; }
    .col-count { font-size: 12px; padding: 2px 8px; border-radius: 9999px; background-color: #312e81; color: #c7d2fe; font-weight: 600; }
    .add-card-btn { padding: 6px 12px; border-radius: 8px; background-color: #4f46e5; color: #ffffff; border: none; font-size: 12px; font-weight: 600; cursor: pointer; }
    .card-stack { display: flex; flex-direction: column; gap: 10px; list-style: none; padding: 0; margin: 0; }
    .task-card { padding: 14px; border-radius: 12px; background-color: #1e293b; border: 1px solid #334155; display: flex; flex-direction: column; gap: 8px; }
    .task-top { display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #94a3b8; font-family: monospace; }
    .task-title { font-size: 13px; font-weight: 600; color: #f1f5f9; margin: 0; }
    .task-meta { display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #cbd5e1; }
    .prio-pill { padding: 2px 6px; border-radius: 6px; background-color: #3730a3; color: #e0e7ff; font-weight: 700; }
  </style>
</head>
<body>
  <section class="kanban-col css-sprint-col" aria-label="In Progress Sprint Column">
    <header class="col-header">
      <div style="display: flex; align-items: center; gap: 8px;">
        <h2 class="col-title">Sprint 24 · In Progress</h2>
        <span class="col-count">10 Issues</span>
      </div>
      <button type="button" class="add-card-btn">+ New Issue</button>
    </header>
    <ul class="card-stack">
      ${tasks
        .map(
          (t, i) => `
      <li class="task-card css-rbd-card-${i}" data-rbd-draggable-id="${t.id}" data-testid="kanban-card-${i}" style="${BLOAT_RESET_STYLE}">
        <div class="task-top">
          <span>${t.id}</span>
          <span class="prio-pill">${t.priority}</span>
        </div>
        <h3 class="task-title">${t.title}</h3>
        <div class="task-meta">
          <span style="display: inline-flex; align-items: center; gap: 6px;">${bloatedCheckSvg('#818cf8', `kb-${i}`)} Assignee: ${t.owner}</span>
          <span>${t.pts}</span>
        </div>
      </li>`,
        )
        .join('')}
    </ul>
  </section>
</body>
</html>`;

  return {
    id: 'kanban-sprint-board',
    index: 6,
    name: 'Kanban Column (10 Isomorphic Cards)',
    category: 'Product Workflow',
    description:
      'Sprint column containing 10 structurally identical issue cards with SVG drag metadata — purpose-built to test AST sibling folding under --budget 600 without broken tags.',
    tags: ['10x Sibling Cards', 'Budget Folding Test', 'SVG Metadata', 'Drag-Drop Attrs'],
    sourceUrl: 'https://sprintflow.example.app/team/core/board',
    recommendedBudget: 600,
    html,
    groundTruth: {
      expectedKeyTexts: [
        'Sprint 24 · In Progress',
        '10 Issues',
        '+ New Issue',
        'ENG-401',
        'Implement CSS cascade specificity matcher',
      ],
      secondaryTexts: ['ENG-402', 'ENG-403', 'ENG-408', 'ENG-410'],
      noiseTexts: [],
      expectedStyleSignals: ['flex', 'color', 'spacing', 'radius', 'border', 'typography'],
      expectedTable: null,
      expectedControls: [{ kind: 'button', token: '+ New Issue' }],
    },
  };
}

/* -------------------------------------------------------------------------- */
/* 7. Dark AI Product Hero Section (aria-hidden Glow Blobs + Dual CTAs)       */
/* -------------------------------------------------------------------------- */
function createDarkAiHeroFixture(): BenchmarkFixture {
  const decorativeBlobs = Array.from(
    { length: 8 },
    (_, i) =>
      `<div class="glow-orb-${i} css-aurora-blob" aria-hidden="true" style="position: absolute; width: 420px; height: 420px; border-radius: 9999px; filter: blur(110px); opacity: 0.25; pointer-events: none; background: radial-gradient(circle, #6366f1 0%, transparent 70%);"></div>`,
  ).join('\n');

  const html = `<!doctype html>
<html lang="en">
<head>
  <style>
    body { margin: 0; background-color: #050811; color: #f8fafc; font-family: Inter, system-ui, sans-serif; }
    .hero-wrap { position: relative; overflow: hidden; max-width: 1040px; margin: 0 auto; padding: 56px 28px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 20px; background-color: #050811; }
    .release-pill { display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 9999px; background-color: #172554; border: 1px solid #1e40af; color: #93c5fd; font-size: 12px; font-weight: 600; }
    .hero-h1 { font-size: 42px; line-height: 1.12; font-weight: 800; color: #ffffff; max-width: 780px; margin: 0; letter-spacing: -0.03em; }
    .hero-sub { font-size: 16px; line-height: 1.6; color: #94a3b8; max-width: 640px; margin: 0; }
    .cta-group { display: flex; align-items: center; justify-content: center; gap: 14px; margin-top: 8px; }
    .cta-primary { padding: 12px 22px; border-radius: 12px; background-color: #6366f1; color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; border: 1px solid #818cf8; box-shadow: 0 12px 28px rgba(99,102,241,0.35); cursor: pointer; }
    .cta-secondary { padding: 12px 22px; border-radius: 12px; background-color: #0f172a; color: #e2e8f0; font-size: 14px; font-weight: 600; text-decoration: none; border: 1px solid #334155; }
    .cli-box { margin-top: 14px; padding: 12px 20px; border-radius: 10px; background-color: #0f172a; border: 1px solid #1e293b; font-family: ui-monospace, SFMono-Regular, monospace; font-size: 13px; color: #a5b4fc; display: inline-flex; align-items: center; gap: 12px; }
  </style>
</head>
<body>
  <section class="hero-wrap">
    ${decorativeBlobs}
    <svg aria-hidden="true" width="1200" height="600" viewBox="0 0 1200 600" style="position: absolute; inset: 0; pointer-events: none; opacity: 0.12;">
      <path d="M0 100 H1200 M0 200 H1200 M0 300 H1200 M0 400 H1200 M0 500 H1200 M200 0 V600 M400 0 V600 M600 0 V600 M800 0 V600 M1000 0 V600" stroke="#6366f1" stroke-width="1" />
    </svg>
    <span class="release-pill">New · AetherCode Context Engine v2.4</span>
    <h1 class="hero-h1">Ship Pixel-Accurate UI to Coding Agents in 2 Milliseconds</h1>
    <p class="hero-sub">Eliminate 94% of DOM bloat, inline SVG noise, and computed style clutter before it hits Claude Code, Cursor, Codex, or Antigravity.</p>
    <div class="cta-group">
      <button type="button" class="cta-primary">Install Chrome Extension</button>
      <a href="#benchmarks" class="cta-secondary">Explore AnyGrab-Bench</a>
    </div>
    <div class="cli-box" role="region" aria-label="Quick Install Command">
      <code>npx anygrab https://ui.example.dev --format jsx --budget 1200</code>
    </div>
  </section>
</body>
</html>`;

  return {
    id: 'dark-ai-hero',
    index: 7,
    name: 'Dark AI Hero + Decorative Blobs',
    category: 'Landing Hero',
    description:
      'High-contrast AI devtool hero section polluted by 8 aria-hidden="true" radial blur orbs, background grid SVG mesh, dual CTAs, and CLI command box.',
    tags: ['8x aria-hidden Blobs', 'Dual CTAs', 'Decorative SVG Mesh', 'CLI Snippet'],
    sourceUrl: 'https://aethercode.example.dev/',
    recommendedBudget: 550,
    html,
    groundTruth: {
      expectedKeyTexts: [
        'AetherCode Context Engine v2.4',
        'Ship Pixel-Accurate UI to Coding Agents in 2 Milliseconds',
        'Install Chrome Extension',
        'Explore AnyGrab-Bench',
        'npx anygrab https://ui.example.dev --format jsx --budget 1200',
      ],
      noiseTexts: [],
      expectedStyleSignals: ['flex', 'color', 'spacing', 'radius', 'border', 'typography', 'shadow'],
      expectedTable: null,
      expectedControls: [
        { kind: 'button', token: 'Install Chrome Extension' },
        { kind: 'link', token: 'Explore AnyGrab-Bench' },
      ],
    },
  };
}

/* -------------------------------------------------------------------------- */
/* 8. 20-Row Feature Comparison Matrix Table                                  */
/* -------------------------------------------------------------------------- */
function createFeatureMatrixFixture(): BenchmarkFixture {
  const matrixRows: Array<[string, string, string, string, string]> = [
    ['Sub-5ms Local Execution', 'Performance', 'Yes', 'Yes', 'Yes (<2ms)'],
    ['Zero LLM API Cost', 'Performance', 'Yes', 'Yes', 'Yes ($0)'],
    ['CSS-to-Tailwind v4 Reverse Compiler', 'Styling', 'No (Raw CSS)', 'No (0%)', 'Yes (Deterministic)'],
    ['Default Browser Style Subtraction', 'Styling', 'No', 'No', 'Yes (300+ rules)'],
    ['Parent-Child Inherited Style Dedup', 'Styling', 'No', 'No', 'Yes'],
    ['CSS-in-JS Hash Class Stripping', 'Hygiene', 'No', 'Partial', 'Yes'],
    ['Inline SVG Vector Compaction', 'Hygiene', 'No', 'Drops SVGs', 'Yes (Semantic Icon)'],
    ['Hidden & aria-hidden Node Pruning', 'Hygiene', 'No', 'No', 'Yes'],
    ['20-Layer Wrapper Div Collapsing', 'Hygiene', 'No', 'Flattens All', 'Yes (Smart Unwrap)'],
    ['Merged Table colspan & rowspan', 'Tables', 'Yes', 'Broken Alignment', 'Yes (100% Intact)'],
    ['GFM Pipe Table Header Expansion', 'Tables', 'No', 'No', 'Yes'],
    ['Syntax-Highlighted Code Preservation', 'Content', 'Noisy Spans', 'Yes', 'Yes (Language Tagged)'],
    ['Interactive Form & ARIA Retention', 'Semantics', 'Yes', 'Stripped', 'Yes'],
    ['Token-Budget AST Sibling Folding', 'Budgeting', 'No', 'No', 'Yes (Never Breaks Tags)'],
    ['Design Token Palette Extraction', 'Tokens', 'No', 'No', 'Yes (Hex/RGB/Fonts)'],
    ['Valid React JSX CamelCase Output', 'Formats', 'No', 'No', 'Yes'],
    ['Structured Coding Agent Prompt Pack', 'Formats', 'No', 'No', 'Yes'],
    ['Chrome MV3 Shadow DOM Live Picker', 'Ecosystem', 'No', 'No', 'Yes'],
    ['Stdio MCP Server for Coding IDEs', 'Ecosystem', 'No', 'No', 'Yes (3 Tools)'],
    ['Declarative Public Site Adapters', 'Ecosystem', 'No', 'No', 'Yes (MIT Extensible)'],
  ];

  const html = `<!doctype html>
<html lang="en">
<head>
  <style>
    body { margin: 0; background-color: #090d16; color: #f8fafc; font-family: Inter, system-ui, sans-serif; padding: 20px; }
    .matrix-wrap { max-width: 1020px; margin: 0 auto; padding: 24px; border-radius: 16px; background-color: #111827; border: 1px solid #1f2937; }
    .matrix-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .matrix-title { font-size: 20px; font-weight: 700; margin: 0; color: #ffffff; }
    .matrix-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .matrix-table th { padding: 10px 12px; background-color: #1e293b; color: #f1f5f9; border: 1px solid #334155; text-align: left; }
    .matrix-table td { padding: 8px 12px; border: 1px solid #1f2937; color: #cbd5e1; }
    .anygrab-col { background-color: rgba(99, 102, 241, 0.12); color: #a5b4fc; font-weight: 600; }
    .matrix-cta { padding: 8px 14px; border-radius: 8px; background-color: #6366f1; color: #ffffff; border: none; font-size: 12px; font-weight: 600; cursor: pointer; }
  </style>
</head>
<body>
  <section class="matrix-wrap">
    <div class="matrix-head">
      <h2 class="matrix-title">20-Point DOM Distillation Capability Matrix</h2>
      <button type="button" class="matrix-cta">Copy Benchmark Spec</button>
    </div>
    <table class="matrix-table" aria-label="20-Row Capability Matrix">
      <thead>
        <tr>
          <th>Capability</th>
          <th>Domain</th>
          <th>Raw HTML</th>
          <th>Turndown GFM</th>
          <th>AnyGrab Engine</th>
        </tr>
      </thead>
      <tbody>
        ${matrixRows
          .map(
            (row, idx) => `
        <tr class="css-matrix-row-${idx}" data-row-index="${idx}" style="${BLOAT_RESET_STYLE}">
          <td style="${BLOAT_RESET_STYLE} font-weight: 600;">${row[0]}</td>
          <td style="${BLOAT_RESET_STYLE}">${row[1]}</td>
          <td style="${BLOAT_RESET_STYLE}">${row[2]}</td>
          <td style="${BLOAT_RESET_STYLE}">${row[3]}</td>
          <td class="anygrab-col" style="${BLOAT_RESET_STYLE}">${row[4]}</td>
        </tr>`,
          )
          .join('')}
      </tbody>
    </table>
  </section>
</body>
</html>`;

  return {
    id: 'feature-matrix-20',
    index: 8,
    name: '20-Row Capability Matrix Table',
    category: 'Comparison Matrix',
    description:
      'Dense 20-row × 5-column engineering capability comparison table with per-cell CSS reset bloat and highlighted target column.',
    tags: ['20x5 Dense Table', 'Cell Style Bloat', 'Column Highlight'],
    sourceUrl: 'https://cloudscale.example.dev/compare',
    recommendedBudget: 850,
    html,
    groundTruth: {
      expectedKeyTexts: [
        '20-Point DOM Distillation Capability Matrix',
        'Capability',
        'AnyGrab Engine',
        'Sub-5ms Local Execution',
        'CSS-to-Tailwind v4 Reverse Compiler',
      ],
      secondaryTexts: [
        'Merged Table colspan & rowspan',
        'Token-Budget AST Sibling Folding',
        'Declarative Public Site Adapters',
      ],
      noiseTexts: [],
      expectedStyleSignals: ['flex', 'color', 'spacing', 'radius', 'border', 'typography'],
      expectedTable: {
        minRows: 21,
        minCols: 5,
        hasMergedCells: false,
        sampleCells: ['Capability', 'Turndown GFM', 'AnyGrab Engine', 'Sub-5ms Local Execution'],
      },
      expectedControls: [{ kind: 'button', token: 'Copy Benchmark Spec' }],
    },
  };
}

/* -------------------------------------------------------------------------- */
/* 9. Multi-Section Workspace Settings Form Panel                             */
/* -------------------------------------------------------------------------- */
function createSettingsFormFixture(): BenchmarkFixture {
  const html = `<!doctype html>
<html lang="en">
<head>
  <style>
    body { margin: 0; background-color: #090d16; color: #f8fafc; font-family: Inter, system-ui, sans-serif; padding: 20px; }
    .settings-panel { max-width: 760px; margin: 0 auto; display: flex; flex-direction: column; gap: 18px; }
    .settings-card { padding: 22px; border-radius: 14px; background-color: #111827; border: 1px solid #1f2937; display: flex; flex-direction: column; gap: 14px; }
    .danger-card { border-color: #7f1d1d; background-color: #181014; }
    .sec-title { font-size: 16px; font-weight: 700; color: #ffffff; margin: 0; }
    .sec-desc { font-size: 12px; color: #94a3b8; margin: 2px 0 0 0; }
    .form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
    .ctrl-label { display: flex; flex-direction: column; gap: 6px; font-size: 12px; font-weight: 600; color: #cbd5e1; }
    .ctrl-input, .ctrl-select, .ctrl-textarea { padding: 9px 12px; border-radius: 8px; background-color: #090d16; border: 1px solid #334155; color: #f8fafc; font-size: 13px; }
    .switch-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-top: 1px solid #1f2937; }
    .switch-btn { padding: 4px 12px; border-radius: 9999px; background-color: #4f46e5; color: #ffffff; border: none; font-size: 11px; font-weight: 700; cursor: pointer; }
    .footer-actions { display: flex; justify-content: flex-end; gap: 10px; }
    .btn-save { padding: 9px 18px; border-radius: 8px; background-color: #6366f1; color: #ffffff; border: none; font-size: 13px; font-weight: 600; cursor: pointer; }
    .btn-reset { padding: 9px 16px; border-radius: 8px; background-color: #1e293b; color: #cbd5e1; border: 1px solid #334155; font-size: 13px; cursor: pointer; }
    .btn-danger { align-self: flex-start; padding: 8px 14px; border-radius: 8px; background-color: #dc2626; color: #ffffff; border: none; font-size: 12px; font-weight: 600; cursor: pointer; }
  </style>
</head>
<body>
  <form class="settings-panel css-rhf-form" aria-label="Workspace Distillation Settings">
    <template id="unsaved-toast-tpl"><div>Unsaved template payload ignore_tpl_91</div></template>
    <section class="settings-card" aria-labelledby="sec-general">
      <div>
        <h2 id="sec-general" class="sec-title">1. Workspace Profile &amp; Defaults</h2>
        <p class="sec-desc">Configure default serialization format and token ceiling across CLI and MCP clients.</p>
      </div>
      <div class="form-grid">
        <label class="ctrl-label">
          Workspace Slug
          <input type="text" name="workspaceSlug" value="acme-agent-infra" class="ctrl-input" />
        </label>
        <label class="ctrl-label">
          Default Output Format
          <select name="defaultFormat" class="ctrl-select">
            <option value="prompt" selected>AI Prompt Bundle</option>
            <option value="tailwind-html">Tailwind v4 HTML</option>
            <option value="jsx">React JSX Component</option>
            <option value="markdown">GFM Markdown</option>
          </select>
        </label>
      </div>
      <label class="ctrl-label">
        Custom Exclusion Selectors (CSS)
        <textarea name="excludeSelectors" rows="2" class="ctrl-textarea">.cookie-modal, [data-ad-slot], aside. intercom-launcher</textarea>
      </label>
    </section>

    <section class="settings-card" aria-labelledby="sec-guardrails">
      <div>
        <h2 id="sec-guardrails" class="sec-title">2. Token Budget &amp; Privacy Guardrails</h2>
        <p class="sec-desc">Enforce deterministic context limits and strip sensitive form values locally.</p>
      </div>
      <div class="switch-row">
        <span>Compact Inline SVG Paths Automatically</span>
        <button type="button" role="switch" aria-checked="true" class="switch-btn">Enabled</button>
      </div>
      <div class="switch-row">
        <span>Include :hover Interactive Utility Classes</span>
        <button type="button" role="switch" aria-checked="false" class="switch-btn" style="background-color: #334155;">Disabled</button>
      </div>
    </section>

    <section class="settings-card danger-card" aria-labelledby="sec-danger">
      <h2 id="sec-danger" class="sec-title">3. Danger Zone · API Credentials</h2>
      <p class="sec-desc">Immediately invalidate active local MCP bridge tokens on this workstation.</p>
      <button type="button" class="btn-danger">Revoke All Bridge Tokens</button>
    </section>

    <div class="footer-actions">
      <button type="reset" class="btn-reset">Discard</button>
      <button type="submit" class="btn-save">Save Workspace Settings</button>
    </div>
  </form>
</body>
</html>`;

  return {
    id: 'multi-section-settings',
    index: 9,
    name: 'Multi-Section Settings Form',
    category: 'Workspace Admin',
    description:
      'Three-section admin settings form with text input, select dropdown, textarea, ARIA role="switch" toggles, <template> noise, and danger zone controls.',
    tags: ['3x Form Sections', 'ARIA Switches', 'Select + Textarea', '<template> Noise'],
    sourceUrl: 'https://studio.velocloud.example.dev/settings',
    recommendedBudget: 750,
    html,
    groundTruth: {
      expectedKeyTexts: [
        '1. Workspace Profile & Defaults',
        'Default Output Format',
        '2. Token Budget & Privacy Guardrails',
        'Compact Inline SVG Paths Automatically',
        '3. Danger Zone · API Credentials',
        'Revoke All Bridge Tokens',
        'Save Workspace Settings',
      ],
      noiseTexts: ['ignore_tpl_91'],
      expectedStyleSignals: ['grid', 'flex', 'color', 'spacing', 'radius', 'border', 'typography'],
      expectedTable: null,
      expectedControls: [
        { kind: 'input', token: 'acme-agent-infra' },
        { kind: 'select', token: 'AI Prompt Bundle' },
        { kind: 'textarea', token: 'cookie-modal' },
        { kind: 'aria', token: 'switch' },
        { kind: 'button', token: 'Save Workspace Settings' },
      ],
    },
  };
}

/* -------------------------------------------------------------------------- */
/* 10. Academic Paper Section (Theorem Callout + Multi-Dim Ablation Table)    */
/* -------------------------------------------------------------------------- */
function createAcademicPaperFixture(): BenchmarkFixture {
  const html = `<!doctype html>
<html lang="en">
<head>
  <style>
    body { margin: 0; background-color: #0b0f19; color: #e2e8f0; font-family: Georgia, Cambria, serif; padding: 20px; }
    .paper-article { max-width: 880px; margin: 0 auto; padding: 32px; border-radius: 12px; background-color: #111827; border: 1px solid #1f2937; display: flex; flex-direction: column; gap: 16px; }
    .sec-heading { font-family: Inter, system-ui, sans-serif; font-size: 22px; font-weight: 700; color: #f8fafc; margin: 0; }
    .paper-p { font-size: 14px; line-height: 1.7; color: #cbd5e1; margin: 0; }
    .theorem-box { padding: 16px 20px; border-radius: 10px; background-color: #172036; border-left: 4px solid #818cf8; color: #e0e7ff; font-size: 14px; line-height: 1.6; }
    .ablation-table { width: 100%; border-collapse: collapse; font-family: Inter, system-ui, sans-serif; font-size: 12px; margin-top: 8px; }
    .ablation-table th { padding: 9px 10px; background-color: #1e293b; color: #f1f5f9; border: 1px solid #334155; }
    .ablation-table td { padding: 8px 10px; border: 1px solid #1f2937; color: #cbd5e1; text-align: right; }
    .ablation-table td:first-child { text-align: left; font-weight: 600; }
    .cite-btn { align-self: flex-start; padding: 6px 12px; border-radius: 6px; background-color: #1e293b; color: #93c5fd; border: 1px solid #334155; font-family: Inter, sans-serif; font-size: 12px; cursor: pointer; }
  </style>
</head>
<body>
  <nav aria-label="arXiv Header Banner" style="display: none;">arXiv:2611.00421v1 [cs.SE] Donate to institution banner</nav>
  <article class="paper-article ltx_document">
    <h2 class="sec-heading">§4. Sub-Linear AST Saliency Pruning &amp; Empirical Ablations</h2>
    <p class="paper-p">
      Given an input DOM tree <em>T = (V, E)</em> and token budget <em>B</em>, naive character slicing corrupts closing tags and drops bottom-heavy tabular summaries. We instead assign deterministic structural saliency weights <em>w(v)</em> over semantic landmarks.
    </p>
    <div class="theorem-box" role="note" aria-label="Theorem 4.1">
      <strong>Theorem 4.1 (Tag-Closed Budget Monotonicity).</strong>
      For any valid DOM subtree <em>T</em> with <em>|V|</em> nodes and budget <em>B &ge; B_min</em>, single-pass post-order sibling folding terminates in <em>O(|V|)</em> time and guarantees 100% balanced HTML/JSX element closure while preserving top-<em>k</em> salient landmarks.
    </div>
    <table class="ablation-table" aria-label="Table 2: Ablation Study across DOM Distillation Variants">
      <thead>
        <tr>
          <th rowspan="2">Method Variant</th>
          <th colspan="2" style="text-align: center;">Context Cost</th>
          <th colspan="2" style="text-align: center;">UI Reconstruction Fidelity</th>
        </tr>
        <tr>
          <th>Mean Tokens</th>
          <th>Latency (ms)</th>
          <th>Layout Recall (%)</th>
          <th>Merged Table F1 (%)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Raw Unfiltered DOM</td>
          <td>4,820</td>
          <td>0.02</td>
          <td>71.4</td>
          <td>96.0</td>
        </tr>
        <tr>
          <td>Turndown (GFM Pipe)</td>
          <td>412</td>
          <td>2.85</td>
          <td>0.0</td>
          <td>54.2</td>
        </tr>
        <tr>
          <td>AnyGrab w/o Style Differ</td>
          <td>1,290</td>
          <td>1.40</td>
          <td>68.5</td>
          <td>98.5</td>
        </tr>
        <tr>
          <td>AnyGrab Full (Lossless)</td>
          <td>540</td>
          <td>1.92</td>
          <td>96.8</td>
          <td>100.0</td>
        </tr>
        <tr>
          <td>AnyGrab Full (Budget B=600)</td>
          <td>398</td>
          <td>2.05</td>
          <td>94.1</td>
          <td>98.2</td>
        </tr>
      </tbody>
    </table>
    <button type="button" class="cite-btn">Copy BibTeX Citation</button>
  </article>
</body>
</html>`;

  return {
    id: 'academic-paper-section',
    index: 10,
    name: 'Academic Paper + Theorem & Ablations',
    category: 'Research & RAG',
    description:
      'arXiv-style HTML experimental section featuring formal Theorem 4.1 callout box, inline mathematical notation, and rowspan/colspan ablation table.',
    tags: ['Theorem Callout', 'Multi-Dim Table', 'arXiv HTML', 'Math Notation'],
    sourceUrl: 'https://arxiv.org/html/2611.00421v1',
    recommendedBudget: 650,
    html,
    groundTruth: {
      expectedKeyTexts: [
        '§4. Sub-Linear AST Saliency Pruning & Empirical Ablations',
        'Theorem 4.1 (Tag-Closed Budget Monotonicity)',
        'O(|V|)',
        'Method Variant',
        'AnyGrab Full (Lossless)',
        '100.0',
      ],
      noiseTexts: ['Donate to institution banner'],
      expectedStyleSignals: ['flex', 'color', 'spacing', 'radius', 'border', 'typography'],
      expectedTable: {
        minRows: 7,
        minCols: 5,
        hasMergedCells: true,
        sampleCells: ['Method Variant', 'Context Cost', 'Mean Tokens', 'Layout Recall (%)', 'AnyGrab Full (Lossless)'],
      },
      expectedControls: [{ kind: 'button', token: 'Copy BibTeX Citation' }],
    },
  };
}

export const BENCHMARK_FIXTURES: BenchmarkFixture[] = [
  createSaasPricingFixture(),
  createFinancialReportFixture(),
  createBentoDashboardFixture(),
  createOauthModalFixture(),
  createApiDocsFixture(),
  createKanbanBoardFixture(),
  createDarkAiHeroFixture(),
  createFeatureMatrixFixture(),
  createSettingsFormFixture(),
  createAcademicPaperFixture(),
];

export function getFixtureById(id: string): BenchmarkFixture | undefined {
  return BENCHMARK_FIXTURES.find((f) => f.id === id);
}
