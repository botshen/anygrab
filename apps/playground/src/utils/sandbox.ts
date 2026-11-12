import type { OutputFormat } from '@anygrab/core';
import type { SiteLocale } from '../i18n';

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
export function buildTailwindSandboxDoc(tailwindHtml: string, compactScale = false): string {
  const safeBody = stripScriptsAndInlineHandlers(tailwindHtml);

  return `<!doctype html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      margin: 0;
      padding: ${compactScale ? '12px 14px' : '20px'};
      ${compactScale ? 'zoom: 0.62;' : ''}
      background-color: #090d16;
      color: #f8fafc;
      font-family: Inter, system-ui, -apple-system, sans-serif;
      line-height: 1.5;
    }
    h1, h2, h3, h4, p, ul, ol { margin: 0; }
    ul, ol { padding-left: 1rem; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 8px 12px; border: 1px solid rgba(148, 163, 184, 0.2); }
    th { background-color: rgba(30, 41, 59, 0.75); font-weight: 600; text-align: left; }
    pre { padding: 14px; border-radius: 10px; background: #020617; border: 1px solid #1e293b; overflow-x: auto; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
    button, input, select, textarea { font: inherit; color: inherit; }
    .block { display: block; }
    .inline-block { display: inline-block; }
    .flex { display: flex; }
    .inline-flex { display: inline-flex; }
    .grid { display: grid; }
    .hidden { display: none; }
    .flex-col { flex-direction: column; }
    .flex-wrap { flex-wrap: wrap; }
    .flex-1 { flex: 1 1 0%; }
    .items-center { align-items: center; }
    .items-start { align-items: flex-start; }
    .items-baseline { align-items: baseline; }
    .justify-between { justify-content: space-between; }
    .justify-center { justify-content: center; }
    .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
    .gap-1 { gap: 0.25rem; }
    .gap-1\\.5 { gap: 0.375rem; }
    .gap-2 { gap: 0.5rem; }
    .gap-3 { gap: 0.75rem; }
    .gap-4 { gap: 1rem; }
    .gap-5 { gap: 1.25rem; }
    .gap-6 { gap: 1.5rem; }
    .space-y-2 > * + * { margin-top: 0.5rem; }
    .space-y-3 > * + * { margin-top: 0.75rem; }
    .space-y-4 > * + * { margin-top: 1rem; }
    .space-y-6 > * + * { margin-top: 1.5rem; }
    .mt-1 { margin-top: 0.25rem; }
    .mt-2 { margin-top: 0.5rem; }
    .mt-3 { margin-top: 0.75rem; }
    .mt-4 { margin-top: 1rem; }
    .mt-6 { margin-top: 1.5rem; }
    .mb-2 { margin-bottom: 0.5rem; }
    .mb-4 { margin-bottom: 1rem; }
    .mb-6 { margin-bottom: 1.5rem; }
    .p-1 { padding: 0.25rem; }
    .p-2 { padding: 0.5rem; }
    .p-3 { padding: 0.75rem; }
    .p-4 { padding: 1rem; }
    .p-5 { padding: 1.25rem; }
    .p-6 { padding: 1.5rem; }
    .p-8 { padding: 2rem; }
    .px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
    .px-2\\.5 { padding-left: 0.625rem; padding-right: 0.625rem; }
    .px-3 { padding-left: 0.75rem; padding-right: 0.75rem; }
    .px-4 { padding-left: 1rem; padding-right: 1rem; }
    .py-0\\.5 { padding-top: 0.125rem; padding-bottom: 0.125rem; }
    .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
    .py-1\\.5 { padding-top: 0.375rem; padding-bottom: 0.375rem; }
    .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
    .py-2\\.5 { padding-top: 0.625rem; padding-bottom: 0.625rem; }
    .py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
    .rounded { border-radius: 0.25rem; }
    .rounded-md { border-radius: 0.375rem; }
    .rounded-lg { border-radius: 0.5rem; }
    .rounded-xl { border-radius: 0.75rem; }
    .rounded-2xl { border-radius: 1rem; }
    .rounded-full { border-radius: 9999px; }
    .border { border: 1px solid rgba(148, 163, 184, 0.22); }
    .bg-white { background-color: #ffffff; }
    .bg-slate-950 { background-color: #020617; }
    .bg-slate-900 { background-color: #0f172a; }
    .bg-slate-800 { background-color: #1e293b; }
    .bg-indigo-600 { background-color: #4f46e5; }
    .bg-indigo-500 { background-color: #6366f1; }
    .text-white { color: #ffffff; }
    .text-slate-200 { color: #e2e8f0; }
    .text-slate-300 { color: #cbd5e1; }
    .text-slate-400 { color: #94a3b8; }
    .text-indigo-300 { color: #a5b4fc; }
    .text-emerald-400 { color: #34d399; }
    .font-medium { font-weight: 500; }
    .font-semibold { font-weight: 600; }
    .font-bold { font-weight: 700; }
    .font-extrabold { font-weight: 800; }
    .text-xs { font-size: 0.75rem; }
    .text-sm { font-size: 0.875rem; }
    .text-base { font-size: 1rem; }
    .text-lg { font-size: 1.125rem; }
    .text-xl { font-size: 1.25rem; }
    .text-2xl { font-size: 1.5rem; }
    .text-3xl { font-size: 1.875rem; }
    .text-4xl { font-size: 2.25rem; }
    .leading-tight { line-height: 1.2; }
    .tracking-tight { letter-spacing: -0.025em; }
    .uppercase { text-transform: uppercase; }
    .text-center { text-align: center; }
    .w-full { width: 100%; }
    .mx-auto { margin-left: auto; margin-right: auto; }
  </style>
</head>
<body>
  <div id="ag-sandbox-root">${safeBody}</div>
  <script>
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
          var m = cls.match(/^(bg|text|border|p|px|py|pt|pb|m|mt|mb|gap|rounded|w|max-w|min-h|leading|tracking)-\\[([^\\]]+)\\]$/);
          if (!m) continue;
          var esc = cls.replace(/([^a-zA-Z0-9_-])/g, '\\\\$1');
          var val = m[2].replace(/_/g, ' ');
          var prop =
            m[1] === 'bg' ? 'background-color:' + val :
            m[1] === 'text' ? (val.charAt(0) === '#' || val.indexOf('rgb') === 0 || val.indexOf('hsl') === 0 ? 'color:' + val : 'font-size:' + val) :
            m[1] === 'border' ? (val.charAt(0) === '#' || val.indexOf('rgb') === 0 ? 'border:1px solid ' + val : 'border-width:' + val) :
            m[1] === 'p' ? 'padding:' + val :
            m[1] === 'px' ? 'padding-left:' + val + ';padding-right:' + val :
            m[1] === 'py' ? 'padding-top:' + val + ';padding-bottom:' + val :
            m[1] === 'pt' ? 'padding-top:' + val :
            m[1] === 'pb' ? 'padding-bottom:' + val :
            m[1] === 'm' ? 'margin:' + val :
            m[1] === 'mt' ? 'margin-top:' + val :
            m[1] === 'mb' ? 'margin-bottom:' + val :
            m[1] === 'gap' ? 'gap:' + val :
            m[1] === 'rounded' ? 'border-radius:' + val :
            m[1] === 'w' ? 'width:' + val :
            m[1] === 'max-w' ? 'max-width:' + val :
            m[1] === 'min-h' ? 'min-height:' + val :
            m[1] === 'leading' ? 'line-height:' + val :
            m[1] === 'tracking' ? 'letter-spacing:' + val : '';
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
  <script async defer src="https://cdn.tailwindcss.com"></script>
</body>
</html>`;
}

/**
 * Formats distilled output with optional Coding Agent instruction wrapper
 * when copying directly into Antigravity, Codex, Cursor, or Claude Code.
 */
export function buildAgentCopyPayload(
  output: string,
  format: OutputFormat,
  sourceUrl?: string,
  locale: SiteLocale = 'en',
): string {
  if (format === 'prompt') {
    return output;
  }
  const fence =
    format === 'jsx' ? 'tsx' : format === 'tailwind-html' ? 'html' : 'markdown';
  if (locale === 'zh-CN') {
    const srcHint = sourceUrl ? `（来源：${sourceUrl}）` : '';
    const lead = `请 1:1 视觉与结构还原以下由 AnyGrab 提纯的网页组件${srcHint}：\n\n`;
    return format === 'markdown' ? `${lead}${output}` : `${lead}\`\`\`${fence}\n${output}\n\`\`\``;
  }
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
