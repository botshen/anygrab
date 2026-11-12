# Changelog

All notable changes to the **AnyGrab** monorepo will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-11-12

### Added

- **`@anygrab/core` (`packages/core`):**
  - Zero-dependency cross-environment HTML/DOM parser (`DOMParser` + pure-Node fallback parser & CSS selector engine).
  - Dual-mode CSS cascade resolver (`window.getComputedStyle` + `<style>`/inline specificity engine with CSS custom property `var(--x)` expansion and 300+ browser default style subtractions).
  - Deterministic CSS-to-Tailwind CSS v4 reverse compiler with CSS-in-JS / CSS Modules hash class stripping (`css-*`, `sc-*`, `jsx-*`) and optional `:hover` utility extraction.
  - 2D virtual grid matrix table extractor preserving nested `rowspan` and `colspan` headers across GFM Markdown, Tailwind HTML, and React JSX.
  - AST salience-based lossless token budget pruner (`maxTokens`) with sibling list folding (`>3` repeated items) that guarantees valid tag closure.
  - Design token extractor (`colors`, `fonts`, `radii`, `shadows`, `spacings`) and 4 built-in public adapters (`docs-mdx`, `github-ui`, `arxiv-paper`, `marketing-pricing`).
- **`anygrab` (`packages/cli`):**
  - Zero-config CLI (`npx anygrab <url | file.html | ->`) with concurrent `<link rel="stylesheet">` fetching & inlining (`4000ms` timeout protection), `--budget`, `--format`, `--selector`, `--hover`, `--tokens-only`, `--json`, and stderr compression telemetry.
  - Node.js programmatic SDK (`grabFromUrl`, `grabFromFile`, `grabFromHtml`) re-exporting `@anygrab/core`.
- **`@anygrab/mcp` (`packages/mcp`):**
  - Stdio Model Context Protocol server (`anygrab-mcp`) exposing `grab_url`, `grab_html`, and `extract_design_tokens` tools for Antigravity, Claude Code, Cursor, and Codex.
- **`@anygrab/extension` (`apps/extension`):**
  - Chrome Manifest V3 visual element picker (`Alt+Shift+G`) mounted inside an Open Shadow Root (`#__anygrab-host__`) with `ArrowUp`/`ArrowDown` ancestor/child navigation, `Tab` live format cycling, token budget controls, and recent history popup.
- **`@anygrab/playground` & `@anygrab/benchmarks`:**
  - `AnyGrab-Bench` 10-fixture synthetic DOM torture suite comparing `Raw HTML + CSS`, `Naive Style Picker`, `Turndown (GFM)`, `AnyGrab (Default)`, and `AnyGrab (--budget 600)`.
  - Zero-backend interactive Playground & Leaderboard web app built with Vite, React 19, and Tailwind CSS v4.
