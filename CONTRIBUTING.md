# Contributing to AnyGrab

Thank you for your interest in contributing to **AnyGrab**! Our goal is to build the fastest, cleanest, zero-dependency DOM & UI context distillation standard for AI Coding Agents, Browser-Use frameworks, and RAG pipelines.

---

## Core Architectural Principles

1. **Zero Runtime Dependencies in `@anygrab/core`:**
   `packages/core/package.json` must maintain `"dependencies": {}` so `@anygrab/core` runs identically in Browsers, Chrome MV3 Service Workers/Content Scripts, Cloudflare Workers, Deno, Bun, and Node.js.
2. **Deterministic, Sub-5ms Execution (Zero Runtime LLM Calls):**
   All distillation rules, CSS-to-Tailwind mappings, virtual-grid table expansions, and AST salience scoring must be deterministic TypeScript algorithms.
3. **100% Standards-Based & Non-Adversarial:**
   AnyGrab operates exclusively on public HTML/CSS standards and user-selected viewport DOM nodes. We strictly reject any code or adapter targeting paywalls, DRM, authentication bypasses, or anti-bot circumvention.
4. **Permissively Licensed Test Fixtures Only:**
   Never commit raw copyrighted HTML dumps from commercial websites. Always write concise synthetic HTML/CSS fixtures (or use MIT / CC-BY-SA public samples) that isolate the structural pattern under test.

---

## Local Development Setup

**Prerequisites:** Node.js `>= 20` and `pnpm >= 10`.

```bash
git clone https://github.com/botshen/anygrab.git
cd anygrab

# Skip Playwright browser binary downloads (uses system Chrome if needed)
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 pnpm install

# Build all packages & apps
pnpm build

# Run strict TypeScript checks, unit tests, and AnyGrab-Bench
pnpm typecheck
pnpm test
pnpm bench
```

### Monorepo Layout

| Path | Package | Description |
| :--- | :--- | :--- |
| `packages/core` | `@anygrab/core` | Zero-dependency DOM/CSS distiller, Tailwind v4 reverse compiler, 2D table grid & AST budget pruner |
| `packages/cli` | `anygrab` | Node.js CLI (`npx anygrab`) + stylesheet inliner + programmatic Node SDK |
| `packages/mcp` | `@anygrab/mcp` | Stdio Model Context Protocol server (`grab_url`, `grab_html`, `extract_design_tokens`) |
| `apps/extension` | `@anygrab/extension` | Chrome Manifest V3 visual element picker (Open Shadow DOM isolated HUD) |
| `apps/playground` | `@anygrab/playground` | Zero-backend Vite + React 19 interactive Playground & `AnyGrab-Bench` leaderboard |
| `benchmarks` | `@anygrab/benchmarks` | 10-fixture DOM torture suite & multi-baseline fidelity evaluator |

---

## Tutorial: Write an `AnyGrabAdapter` in Under 30 Lines

One of the highest-impact ways to contribute is adding a declarative **`AnyGrabAdapter`** for a popular open-source documentation generator or UI component library!

### Step 1: Define the Adapter (`packages/core/src/adapters/`)

Every adapter implements the `AnyGrabAdapter` interface from `packages/core/src/types.ts`. Here is a complete, production-ready example in **26 lines**:

```ts
import { getElementAttr, getLowerTag, LiteElement, queryFirstElement } from '../dom-adapter';
import type { AnyGrabAdapter } from '../types';

export const astroStarlightAdapter: AnyGrabAdapter = {
  name: 'astro-starlight',
  description: 'Astro Starlight documentation sites (strips nav, sidebar, and TOC chrome)',
  priority: 25,
  match: ({ url, root }) =>
    Boolean(
      (url && /starlight\.astro\.build/i.test(url)) ||
        (root && queryFirstElement(root, '.sl-markdown-content, starlight-toc')),
    ),
  excludeSelectors: [
    'header.header',
    'nav.sidebar',
    'starlight-toc',
    'mobile-starlight-toc',
    '.pagination-links',
    'a.sl-anchor-link',
  ],
  rootSelector: '.sl-markdown-content, main',
  transformNode: (node) => {
    if (getLowerTag(node) === 'aside' && !getElementAttr(node, 'role')) {
      const callout = new LiteElement('aside');
      callout.setAttribute('role', 'note');
      for (const child of Array.from(node.childNodes)) callout.appendChild(child);
      return callout as unknown as Element;
    }
  },
};
```

### Step 2: Register & Export

1. Add `astroStarlightAdapter` to `BUILTIN_ADAPTERS` (and optional short aliases in `ADAPTER_SHORT_ALIASES`) inside `packages/core/src/adapters/index.ts`.
2. Re-export it from `packages/core/src/index.ts` if useful for programmatic consumers.

### Step 3: Add a Synthetic Unit Test

Add a test in `packages/core/src/` verifying:
1. Auto-detection triggers via `sourceUrl` or characteristic DOM markers;
2. Navigation/TOC noise is pruned (`excludeSelectors`);
3. Primary content and code/tables remain intact across `markdown`, `tailwind-html`, and `jsx` formats.

```bash
pnpm --filter @anygrab/core test
pnpm --filter @anygrab/core typecheck
```

Looking for ideas? Check [`docs/GOOD_FIRST_ISSUES.md`](./docs/GOOD_FIRST_ISSUES.md) for 12 ready-to-claim 30-minute tasks!

---

## Commit & Pull Request Conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat(core): add astro-starlight documentation adapter`
- `fix(cli): preserve cascade order on relative @import rules`
- `perf(core): fast-path SVG path collapsing`
- `docs: add Cursor & Antigravity MCP setup examples`

Before opening a PR, run `pnpm typecheck && pnpm test && pnpm build` locally to ensure CI stays green.
