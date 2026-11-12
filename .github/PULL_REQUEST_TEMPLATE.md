## Summary

<!-- Briefly describe what this PR changes and why. Link the related issue (e.g., Closes #12). -->

## Package Scope

- [ ] `@anygrab/core` (`packages/core`)
- [ ] `anygrab` CLI / Node SDK (`packages/cli`)
- [ ] `@anygrab/mcp` (`packages/mcp`)
- [ ] `@anygrab/extension` (`apps/extension`)
- [ ] `@anygrab/playground` (`apps/playground`)
- [ ] `@anygrab/benchmarks` (`benchmarks`)
- [ ] Docs / CI

## Quality & Compliance Checklist

- [ ] `@anygrab/core` retains **zero runtime dependencies** (`"dependencies": {}`).
- [ ] `pnpm typecheck`, `pnpm test`, `pnpm build`, and `pnpm bench` all pass with 0 errors.
- [ ] Added unit test(s) using **synthetic or permissively licensed (MIT / CC-BY)** HTML fixtures (no copyrighted third-party page dumps).
- [ ] Contains **zero** anti-scraping, paywall circumvention, or proprietary platform bypass logic.
