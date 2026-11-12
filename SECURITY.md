# Security Policy

## Supported Versions

| Version | Supported |
| :--- | :--- |
| `0.1.x` | ✅ Active security updates |

## Security & Privacy Architecture Guarantees

AnyGrab is designed with a **Local-First, Zero-Telemetry** security posture:

1. **Zero Cloud Relay:** `@anygrab/core`, `anygrab` CLI, `@anygrab/mcp`, and `@anygrab/extension` execute 100% locally on your machine. Extracted DOM structures, CSS tokens, and prompts are never transmitted to any AnyGrab server.
2. **Minimal Chrome MV3 Permissions (`@anygrab/extension`):**
   - Requests only `activeTab`, `scripting`, `storage`, and `clipboardWrite`.
   - Declares **no `<all_urls>` host permissions** and remains completely inert (0 DOM nodes injected) until explicitly invoked by the user (`Alt+Shift+G` or toolbar action).
   - Mounts picker UI inside an isolated Shadow Root (`#__anygrab-host__`) and never executes page `<script>` or inline `on*` event handlers.
3. **Sandboxed Preview (`@anygrab/playground`):**
   - Live HTML previews strip `<script>` tags and dangerous `on*` attributes before rendering inside isolated `<iframe srcDoc>` sandboxes.
4. **Bounded Stylesheet Fetching (`anygrab` CLI & `@anygrab/mcp`):**
   - External `<link rel="stylesheet">` fetches enforce strict `AbortController` timeouts (default `4000ms`), `http:`/`https:` protocol allowlists, and `credentials: 'omit'`.

## Reporting a Vulnerability

Please **do not** report security vulnerabilities (such as XSS in the Playground preview, SSRF in the CLI/MCP loader, or privilege escalation in the Chrome extension) via public GitHub issues.

Instead, please report them privately via:
- **GitHub Private Vulnerability Reporting:** Use the **Security → Report a vulnerability** tab on this repository.

Include a minimal proof-of-concept reproduction and affected package name. We acknowledge all valid reports within **48 hours** and aim to release a patch within **7 days**.
