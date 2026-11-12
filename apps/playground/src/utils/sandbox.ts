import type { OutputFormat } from '@anygrab/core';

function stripScriptsAndInlineHandlers(html: string): string {
  const withoutScripts = html.replace(/<script[\s\S]*?<\/script>/gi, '');
  return withoutScripts.replace(
    /<([a-zA-Z][a-zA-Z0-9:-]*)((?:\s+(?:[^>"']|"[^"]*"|'[^']*')*)?)>/g,
    (fullTag, tagName: string, attrs?: string) => {
      if (!attrs) return fullTag;
      const cleanedAttrs = attrs.replace(
        /\s+on[a-zA-Z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+)/g,
        '',
      );
      return `<${tagName}${cleanedAttrs}>`;
    },
  );
}

/**
 * Sanitizes executable `<script>` blocks and inline `on*=` event attributes from raw HTML
 * while keeping all `<style>` and DOM markup intact for live `<iframe srcDoc>` previewing.
 */
export function buildRawSandboxDoc(rawHtml: string): string {
  const safeHtml = stripScriptsAndInlineHandlers(rawHtml);
  if (/<!doctype\s+html/i.test(safeHtml) || /<html[\s>]/i.test(safeHtml)) {
    return safeHtml;
  }
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    body {
      margin: 0;
      padding: 20px;
      background-color: #090d16;
      color: #f8fafc;
      font-family: Inter, system-ui, -apple-system, sans-serif;
    }
  </style>
</head>
<body>
${safeHtml}
</body>
</html>`;
}

/**
 * Builds an `<iframe srcDoc>` document that renders distilled `tailwindHtml`
 * using BOTH the official Tailwind CDN script AND an instant built-in fallback
 * CSS utility layer + micro JIT parser for arbitrary values (`bg-[#...]`, `p-[...]`, etc.),
 * guaranteeing crisp rendering both online and in offline/headless sandboxes.
 */
export function buildTailwindSandboxDoc(tailwindHtml: string): string {
  const safeBody = stripScriptsAndInlineHandlers(tailwindHtml);

  return `<!doctype html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 20px;
      background-color: #090d16;
      color: #f8fafc;
      font-family: Inter, system-ui, -apple-system, sans-serif;
      line-height: 1.5;
    }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 8px 12px; border: 1px solid rgba(148, 163, 184, 0.2); }
    th { background-color: rgba(30, 41, 59, 0.75); font-weight: 600; text-align: left; }
    pre { padding: 14px; border-radius: 10px; background: #020617; border: 1px solid #1e293b; overflow-x: auto; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
    button, input, select, textarea { font: inherit; color: inherit; }
    .flex { display: flex; }
    .inline-flex { display: inline-flex; }
    .grid { display: grid; }
    .hidden { display: none; }
    .flex-col { flex-direction: column; }
    .items-center { align-items: center; }
    .items-start { align-items: flex-start; }
    .items-baseline { align-items: baseline; }
    .justify-between { justify-content: space-between; }
    .justify-center { justify-content: center; }
    .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    .gap-2 { gap: 0.5rem; }
    .gap-3 { gap: 0.75rem; }
    .gap-4 { gap: 1rem; }
    .gap-5 { gap: 1.25rem; }
    .gap-6 { gap: 1.5rem; }
    .p-3 { padding: 0.75rem; }
    .p-4 { padding: 1rem; }
    .p-5 { padding: 1.25rem; }
    .p-6 { padding: 1.5rem; }
    .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
    .px-4 { padding-left: 1rem; padding-right: 1rem; }
    .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
    .py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
    .rounded-lg { border-radius: 0.5rem; }
    .rounded-xl { border-radius: 0.75rem; }
    .rounded-2xl { border-radius: 1rem; }
    .rounded-full { border-radius: 9999px; }
    .border { border: 1px solid rgba(148, 163, 184, 0.22); }
    .font-medium { font-weight: 500; }
    .font-semibold { font-weight: 600; }
    .font-bold { font-weight: 700; }
    .font-extrabold { font-weight: 800; }
    .text-xs { font-size: 0.75rem; }
    .text-sm { font-size: 0.875rem; }
    .text-lg { font-size: 1.125rem; }
    .text-xl { font-size: 1.25rem; }
    .text-2xl { font-size: 1.5rem; }
    .text-3xl { font-size: 1.875rem; }
    .text-4xl { font-size: 2.25rem; }
    .text-center { text-align: center; }
    .w-full { width: 100%; }
    .mx-auto { margin-left: auto; margin-right: auto; }
  </style>
</head>
<body>
  <div id="ag-sandbox-root">${safeBody}</div>
  <script>
    // Instant arbitrary-value CSS rule synthesizer for offline / fast initial paint
    (function () {
      var rules = [];
      var seen = {};
      var els = document.querySelectorAll('[class]');
      for (var i = 0; i < els.length; i++) {
        var list = (els[i].getAttribute('class') || '').split(/\\s+/);
        for (var j = 0; j < list.length; j++) {
          var cls = list[j];
          if (!cls || seen[cls]) continue;
          seen[cls] = true;
          var m = cls.match(/^(bg|text|border|p|px|py|gap|rounded|w|max-w)-\\[([^\\]]+)\\]$/);
          if (!m) continue;
          var esc = cls.replace(/([^a-zA-Z0-9_-])/g, '\\\\$1');
          var val = m[2].replace(/_/g, ' ');
          var prop =
            m[1] === 'bg' ? 'background-color:' + val :
            m[1] === 'text' ? (val.charAt(0) === '#' || val.indexOf('rgb') === 0 ? 'color:' + val : 'font-size:' + val) :
            m[1] === 'border' ? 'border-color:' + val :
            m[1] === 'p' ? 'padding:' + val :
            m[1] === 'px' ? 'padding-left:' + val + ';padding-right:' + val :
            m[1] === 'py' ? 'padding-top:' + val + ';padding-bottom:' + val :
            m[1] === 'gap' ? 'gap:' + val :
            m[1] === 'rounded' ? 'border-radius:' + val :
            m[1] === 'w' ? 'width:' + val :
            m[1] === 'max-w' ? 'max-width:' + val : '';
          if (prop) rules.push('.' + esc + '{' + prop + '}');
        }
      }
      if (rules.length) {
        var st = document.createElement('style');
        st.textContent = rules.join('\\n');
        document.head.appendChild(st);
      }
    })();
  </script>
</body>
</html>`;
}

/**
 * Formats distilled output with optional Coding Agent instruction wrapper
 * when copying directly into Codex, Antigravity, Cursor, or Claude Code.
 */
export function buildAgentCopyPayload(
  output: string,
  format: OutputFormat,
  sourceUrl?: string,
): string {
  if (format === 'prompt') {
    return output;
  }
  const fence =
    format === 'jsx' ? 'tsx' : format === 'tailwind-html' ? 'html' : 'markdown';
  const header = sourceUrl
    ? `<!-- Distilled by AnyGrab from ${sourceUrl} (${format}) -->\n`
    : '';
  return format === 'markdown'
    ? `${header}${output}`
    : `${header}\`\`\`${fence}\n${output}\n\`\`\``;
}

/**
 * Extracts fallback visual hex/rgb swatches directly from raw CSS/HTML when
 * running against minimal snippets or placeholder token extractors.
 */
export function extractFallbackColors(html: string, existing: string[]): string[] {
  if (existing.length > 0) return existing.slice(0, 10);
  const matches = html.match(/#[0-9a-fA-F]{6}\b/g) ?? [];
  const unique: string[] = [];
  for (const hex of matches) {
    const normalized = hex.toLowerCase();
    if (!unique.includes(normalized)) {
      unique.push(normalized);
    }
    if (unique.length >= 8) break;
  }
  return unique;
}
