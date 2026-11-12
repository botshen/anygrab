# Good First Issues (30-Minute Contributor Tasks)

Welcome! Each issue below is scoped to take **~20–30 minutes**, touches **1–2 isolated files**, and helps make **AnyGrab** cleaner across public developer ecosystems.

> Before starting, read the 30-line adapter guide in [`CONTRIBUTING.md`](../CONTRIBUTING.md). All fixtures must be **synthetic or MIT/CC-BY licensed**.

---

### 1. `[Adapter]` Astro Starlight Documentation (`astro-starlight`)
- **Scope:** `packages/core/src/adapters/` + unit test
- **Goal:** Detect `.sl-markdown-content` / `starlight-toc`, strip `header.header`, `nav.sidebar`, `starlight-toc`, `.pagination-links`, and `a.sl-anchor-link`, and preserve Starlight `<aside>` callouts with `role="note"`.
- **Acceptance Criteria:** `grab(html, { format: 'markdown' })` strips Starlight navigation chrome while preserving tabbed code blocks and callouts.

### 2. `[Adapter]` Storybook Component Canvas (`storybook-docs`)
- **Scope:** `packages/core/src/adapters/` + unit test
- **Goal:** Target `#storybook-root`, `#storybook-docs`, and `.sbdocs-content` while pruning `.sb-bar`, `.sidebar-container`, and `.docblock-code-toggle` chrome so developers can grab clean JSX/Tailwind examples straight from public Storybook registries.
- **Acceptance Criteria:** Add synthetic Storybook DocsPage fixture test verifying clean `jsx` and `tailwind-html` extraction.

### 3. `[Adapter]` MDN Web Docs Reference Pages (`mdn-reference`)
- **Scope:** `packages/core/src/adapters/` + unit test
- **Goal:** Match `developer.mozilla.org` or `article.main-page-content`, strip `.sidebar-container`, `.top-navigation`, `.article-actions-container`, and interactive iframe chrome while preserving syntax tables and `<dl>` parameter definitions.
- **Acceptance Criteria:** Browser compatibility & specification tables render with 100% column alignment in `markdown`.

### 4. `[Adapter]` MkDocs Material Technical Sites (`mkdocs-material`)
- **Scope:** `packages/core/src/adapters/` + unit test
- **Goal:** Match `.md-content__inner` / `meta[name="generator"][content*="mkdocs-material"]`, strip `.md-header`, `.md-sidebar`, `.md-footer`, and `a.headerlink`, and preserve `.admonition` blocks (`note`, `warning`, `tip`).
- **Acceptance Criteria:** Synthetic MkDocs Material fixture passes with >70% token reduction and intact admonition titles.

### 5. `[Adapter]` Sphinx & ReadTheDocs Python API Docs (`sphinx-autodoc`)
- **Scope:** `packages/core/src/adapters/` + unit test
- **Goal:** Match `div.sphinxsidebar` / `dl.py.class` / `dl.py.function`, strip `.sphinxsidebar`, `.related`, and `a.headerlink` (`¶`), and format Python class/method signature `<dt>`/`<dd>` blocks cleanly in Markdown & Prompt outputs.
- **Acceptance Criteria:** `¶` permalink symbols never leak into headings or function signatures.

### 6. `[Adapter]` Swagger UI / Redoc OpenAPI Reference (`openapi-spec`)
- **Scope:** `packages/core/src/adapters/` + unit test
- **Goal:** Match `.swagger-ui` or `[data-section-id]` (Redoc), strip server-selector dropdown noise and collapsed authorization modals, while preserving HTTP method badges (`GET`, `POST`), endpoint paths, request schema tables, and JSON examples.
- **Acceptance Criteria:** Synthetic OpenAPI endpoint HTML distills into a compact `<500` token prompt with intact HTTP method, path, and parameter table.

### 7. `[Adapter]` Shadcn / Radix UI Documentation Preview (`shadcn-preview`)
- **Scope:** `packages/core/src/adapters/` + unit test
- **Goal:** Detect `[data-rehype-pretty-code-figure]` and component preview tabs (`Preview` vs `Code` tab panels), stripping copy-button overlays and inactive duplicate tab panels so component previews aren't emitted twice.
- **Acceptance Criteria:** Duplicate preview + raw-code tab clutter is deduplicated cleanly.

### 8. `[Adapter]` Wikipedia / MediaWiki Technical Articles (`mediawiki`)
- **Scope:** `packages/core/src/adapters/` + unit test
- **Goal:** Match `#mw-content-text .mw-parser-output`, strip `.mw-editsection` (`[edit]`), `.navbox`, `.catlinks`, `sup.reference` citation clutter (optional or compact), while preserving `.infobox` key-value tables and `<math>` formulas.
- **Acceptance Criteria:** `[edit]` links and bottom navboxes are completely removed; infobox tables stay aligned.

### 9. `[Core]` CSS Grid Template Areas & Auto-Fit Mapping (`tailwind-mapper.ts`)
- **Scope:** `packages/core/src/tailwind-mapper.ts` + unit test
- **Goal:** Map `grid-template-columns: repeat(auto-fit, minmax(240px, 1fr))` and `repeat(auto-fill, minmax(...))` patterns to clean arbitrary Tailwind v4 classes (`grid-cols-[repeat(auto-fit,minmax(240px,1fr))]`).
- **Acceptance Criteria:** Responsive CSS Grid card layouts retain single-class Tailwind grid definitions without inline style fallback.

### 10. `[Core]` CSS `aspect-ratio` & `object-fit` Utility Mapping (`tailwind-mapper.ts`)
- **Scope:** `packages/core/src/tailwind-mapper.ts` + unit test
- **Goal:** Ensure `aspect-ratio: 16 / 9`, `1 / 1`, `4 / 3` map to `aspect-video`, `aspect-square`, `aspect-[4/3]`, and `object-fit` / `object-position` map to `object-cover`, `object-contain`, `object-center`, etc.
- **Acceptance Criteria:** Media card thumbnails emit idiomatic Tailwind v4 aspect/object classes in both `tailwind-html` and `jsx`.

### 11. `[CLI]` Shell Completion Generator (`anygrab --completions zsh|bash|fish`)
- **Scope:** `packages/cli/src/cli.ts` + unit test
- **Goal:** Add a lightweight zero-dependency `--completions <shell>` flag printing completion scripts for all CLI flags (`--format`, `--budget`, `--selector`, `--adapter`, `--hover`, `--tokens-only`, `--json`).
- **Acceptance Criteria:** `anygrab --completions zsh` outputs valid Zsh `_arguments` completion script to `stdout` with 0 external dependencies.

### 12. `[Benchmarks]` Add Accessible Modal & Combobox ARIA Torture Fixture (`benchmarks/src/fixtures.ts`)
- **Scope:** `benchmarks/src/fixtures.ts` + `benchmarks` test
- **Goal:** Contribute a synthetic WAI-ARIA 1.2 Combobox + Listbox +Popover HTML/CSS fixture testing preservation of `role="combobox"`, `aria-expanded`, `aria-controls`, and keyboard shortcut hints under `--budget 600`.
- **Acceptance Criteria:** `pnpm bench` runs cleanly and verifies >85/100 interactive ARIA fidelity score.
