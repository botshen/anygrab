# Changelog

All notable changes to the **AnyGrab** monorepo will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-11-12

### Added

- **Bilingual AI Replication Prompts (`@anygrab/core`):**
  - Added `locale?: 'en' | 'zh-CN'` (`GrabLocale`) to `GrabOptions`. When `format: 'prompt'` and `locale: 'zh-CN'`, AnyGrab generates zero-jargon, ready-to-paste Simplified Chinese UI replication instructions with localized design-token annotations for Antigravity, Codex, Cursor, and Claude Code.
- **Bilingual Chrome MV3 Extension & Interactive Practice Arena (`@anygrab/extension`):**
  - Standard Chrome `_locales/{en,zh_CN}/messages.json` internationalization plus automatic `navigator.language` detection and one-click `中 / EN` runtime switching across both the Popup and floating Shadow-DOM HUD.
  - Plain-language beginner-friendly labels, format subtitles, and actionable clipboard toasts guiding users directly into Antigravity / Codex (`Cmd+V`).
  - Built-in full-screen **30-Second Interactive Onboarding Guide & Live Practice Arena (`guide.html`)** featuring 3-step visual walkthroughs, copyable AI IDE prompt starters, and 2 live practice targets (Gradient Pricing Card & Merged-Header Financial Table) for instant hands-on picking.
- **5-Section Bilingual Official Website (`@anygrab/playground`):**
  - Upgraded static site into a full bilingual (`中文 / EN`) product website spanning **Overview**, **AI Workflows** (copy-ready Antigravity / Codex / Cursor workflows), **Live Playground** (dual sandboxed iframes + live locale-synced prompt output), **AnyGrab-Bench Leaderboard** (plain-language takeaways + `Try Live` deep links), and **Quick Start & Extension Install**.
- **End-to-End Verification (`e2e/verify-all.mjs`):**
  - Expanded Playwright real-browser E2E suite to verify `zh-CN` ↔ `en` switching, `guide.html` live practice target captures, and all 5 website navigation views with 0 console/page/HTTP errors.

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
  - Chrome Manifest V3 visual element picker (`Alt+Shift+G`) mounted inside an isolated Open Shadow Root (`#__anygrab-host__`) with `ArrowUp`/`ArrowDown` ancestor/child navigation, `Tab` live format cycling, token budget controls, and recent history popup.
- **`@anygrab/playground` & `@anygrab/benchmarks`:**
  - `AnyGrab-Bench` 10-fixture synthetic DOM torture suite comparing `Raw HTML + CSS`, `Naive Style Picker`, `Turndown (GFM)`, `AnyGrab (Default)`, and `AnyGrab (--budget 600)`.
  - Zero-backend interactive Playground & Leaderboard web app built with Vite, React 19, and Tailwind CSS v4.
