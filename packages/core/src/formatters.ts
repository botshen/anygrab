import type { DistilledComment, DistilledElement, DistilledNode } from './cleaner';
import { escapeHtmlAttr, escapeHtmlText, VOID_HTML_TAGS } from './dom-adapter';
import { renderTableToMarkdown } from './table-extractor';
import type { DesignTokens } from './types';

const SELF_CLOSING_SVG_TAGS = new Set([
  'circle',
  'ellipse',
  'line',
  'path',
  'polygon',
  'polyline',
  'rect',
  'stop',
  'use',
]);

const JSX_ATTR_MAP: Record<string, string> = {
  class: 'className',
  for: 'htmlFor',
  tabindex: 'tabIndex',
  readonly: 'readOnly',
  maxlength: 'maxLength',
  minlength: 'minLength',
  colspan: 'colSpan',
  rowspan: 'rowSpan',
  autocomplete: 'autoComplete',
  autofocus: 'autoFocus',
  novalidate: 'noValidate',
  formaction: 'formAction',
  formenctype: 'formEncType',
  formmethod: 'formMethod',
  formnovalidate: 'formNoValidate',
  formtarget: 'formTarget',
  enctype: 'encType',
  inputmode: 'inputMode',
  crossorigin: 'crossOrigin',
  referrerpolicy: 'referrerPolicy',
  srcset: 'srcSet',
  usemap: 'useMap',
  contenteditable: 'contentEditable',
  spellcheck: 'spellCheck',
  enterkeyhint: 'enterKeyHint',
  accesskey: 'accessKey',
  datetime: 'dateTime',
  cellpadding: 'cellPadding',
  cellspacing: 'cellSpacing',
  frameborder: 'frameBorder',
  allowfullscreen: 'allowFullScreen',
  charset: 'charSet',
  httpequiv: 'httpEquiv',
  // SVG camelCase attributes
  viewbox: 'viewBox',
  preserveaspectratio: 'preserveAspectRatio',
  'stroke-width': 'strokeWidth',
  'stroke-linecap': 'strokeLinecap',
  'stroke-linejoin': 'strokeLinejoin',
  'stroke-dasharray': 'strokeDasharray',
  'stroke-dashoffset': 'strokeDashoffset',
  'stroke-miterlimit': 'strokeMiterlimit',
  'stroke-opacity': 'strokeOpacity',
  'fill-rule': 'fillRule',
  'fill-opacity': 'fillOpacity',
  'clip-rule': 'clipRule',
  'clip-path': 'clipPath',
  'stop-color': 'stopColor',
  'stop-opacity': 'stopOpacity',
  gradientunits: 'gradientUnits',
  gradienttransform: 'gradientTransform',
  patternunits: 'patternUnits',
  patterntransform: 'patternTransform',
  'text-anchor': 'textAnchor',
  'dominant-baseline': 'dominantBaseline',
  'alignment-baseline': 'alignmentBaseline',
  'vector-effect': 'vectorEffect',
  'color-interpolation-filters': 'colorInterpolationFilters',
  'xlink:href': 'xlinkHref',
  'xml:space': 'xmlSpace',
};

const JSX_BOOLEAN_ATTRS = new Set([
  'disabled',
  'required',
  'readOnly',
  'multiple',
  'autoFocus',
  'noValidate',
  'allowFullScreen',
  'open',
  'controls',
  'loop',
  'muted',
  'playsInline',
]);

// ============================================================================
// 1. Tailwind HTML Formatter (`tailwind-html`)
// ============================================================================

export function formatTailwindHtml(root: DistilledElement): string {
  return serializeHtmlNode(root, 0, false).trim();
}

function isInlineOnlyElement(el: DistilledElement): boolean {
  if (el.children.length === 0) return true;
  if (el.children.length === 1 && el.children[0].kind === 'text') {
    return !el.children[0].text.includes('\n') && el.children[0].text.length <= 90;
  }
  return false;
}

function serializeHtmlNode(
  node: DistilledNode,
  depth: number,
  inPreformatted: boolean,
): string {
  const pad = inPreformatted ? '' : '  '.repeat(depth);

  if (node.kind === 'comment') {
    return `${pad}<!-- ${node.text.trim()} -->`;
  }

  if (node.kind === 'text') {
    const escaped = escapeHtmlText(node.text);
    return inPreformatted ? escaped : `${pad}${escaped}`;
  }

  const tag = node.tag;
  const attrParts: string[] = [];
  if (node.classes.length > 0) {
    attrParts.push(`class="${escapeHtmlAttr(node.classes.join(' '))}"`);
  }
  for (const [name, value] of Object.entries(node.attrs)) {
    if (value === '') {
      attrParts.push(name);
    } else {
      attrParts.push(`${name}="${escapeHtmlAttr(value)}"`);
    }
  }

  const openTag = attrParts.length > 0 ? `<${tag} ${attrParts.join(' ')}>` : `<${tag}>`;
  if (VOID_HTML_TAGS.has(tag)) {
    return `${pad}${openTag}`;
  }

  if (node.children.length === 0) {
    return `${pad}${openTag}</${tag}>`;
  }

  const nextPre = inPreformatted || tag === 'pre' || tag === 'code' || tag === 'textarea';
  if (nextPre) {
    const inner = node.children.map((c) => serializeHtmlNode(c, 0, true)).join('');
    return `${pad}${openTag}${inner}</${tag}>`;
  }

  if (isInlineOnlyElement(node)) {
    const first = node.children[0];
    const inner = first.kind === 'text' ? escapeHtmlText(first.text) : '';
    return `${pad}${openTag}${inner}</${tag}>`;
  }

  const innerLines = node.children.map((c) => serializeHtmlNode(c, depth + 1, false));
  return `${pad}${openTag}\n${innerLines.join('\n')}\n${pad}</${tag}>`;
}

// ============================================================================
// 2. React JSX Formatter (`jsx`)
// ============================================================================

export function formatJsx(root: DistilledElement): string {
  return serializeJsxNode(root, 0, false).trim();
}

function mapAttrNameToJsx(tag: string, rawName: string): string | null {
  const lower = rawName.toLowerCase();
  if (lower === 'xmlns:xlink') return null;

  // Keep `aria-*` and `data-*` in standard lowercase kebab-case per React spec
  if (lower.startsWith('aria-') || lower.startsWith('data-')) {
    return lower;
  }

  // Convert uncontrolled form `value` / `checked` safely on `<input>`
  if (tag === 'input' && lower === 'value') return 'defaultValue';
  if (tag === 'input' && lower === 'checked') return 'defaultChecked';
  if (tag === 'option' && lower === 'selected') return null;

  if (JSX_ATTR_MAP[rawName]) return JSX_ATTR_MAP[rawName];
  if (JSX_ATTR_MAP[lower]) return JSX_ATTR_MAP[lower];

  // Convert remaining hyphenated SVG attributes (`stroke-dasharray` -> `strokeDasharray`)
  if (rawName.includes('-')) {
    return lower.replace(/-([a-z])/g, (_, ch: string) => ch.toUpperCase());
  }
  return rawName;
}

function escapeJsxText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\{/g, '&#123;')
    .replace(/\}/g, '&#125;');
}

function serializeJsxNode(
  node: DistilledNode,
  depth: number,
  inPreformatted: boolean,
): string {
  const pad = inPreformatted ? '' : '  '.repeat(depth);

  if (node.kind === 'comment') {
    const safeComment = node.text.trim().replace(/\*\//g, '* /');
    return `${pad}{/* ${safeComment} */}`;
  }

  if (node.kind === 'text') {
    if (inPreformatted) {
      return `{${JSON.stringify(node.text)}}`;
    }
    return `${pad}${escapeJsxText(node.text)}`;
  }

  const tag = node.tag;
  const attrParts: string[] = [];
  if (node.classes.length > 0) {
    attrParts.push(`className="${escapeHtmlAttr(node.classes.join(' '))}"`);
  }

  for (const [rawName, rawValue] of Object.entries(node.attrs)) {
    const jsxName = mapAttrNameToJsx(tag, rawName);
    if (!jsxName) continue;

    if (jsxName === 'defaultChecked') {
      attrParts.push('defaultChecked');
      continue;
    }

    if (JSX_BOOLEAN_ATTRS.has(jsxName) && (rawValue === '' || rawValue.toLowerCase() === jsxName.toLowerCase() || rawValue === 'true')) {
      attrParts.push(jsxName);
      continue;
    }

    if (jsxName === 'colSpan' || jsxName === 'rowSpan' || jsxName === 'tabIndex' || jsxName === 'maxLength' || jsxName === 'minLength') {
      const num = Number.parseInt(rawValue, 10);
      if (Number.isFinite(num)) {
        attrParts.push(`${jsxName}={${num}}`);
        continue;
      }
    }

    attrParts.push(`${jsxName}="${escapeHtmlAttr(rawValue)}"`);
  }

  const attrStr = attrParts.length > 0 ? ` ${attrParts.join(' ')}` : '';
  const shouldSelfClose =
    VOID_HTML_TAGS.has(tag) || (SELF_CLOSING_SVG_TAGS.has(tag) && node.children.length === 0);

  if (shouldSelfClose) {
    return `${pad}<${tag}${attrStr} />`;
  }

  if (node.children.length === 0) {
    return `${pad}<${tag}${attrStr} />`;
  }

  const nextPre = inPreformatted || tag === 'pre' || tag === 'code' || tag === 'textarea';
  if (nextPre) {
    const inner = node.children.map((c) => serializeJsxNode(c, 0, true)).join('');
    return `${pad}<${tag}${attrStr}>${inner}</${tag}>`;
  }

  if (isInlineOnlyElement(node)) {
    const first = node.children[0];
    const inner = first.kind === 'text' ? escapeJsxText(first.text) : '';
    return `${pad}<${tag}${attrStr}>${inner}</${tag}>`;
  }

  const innerLines = node.children.map((c) => serializeJsxNode(c, depth + 1, false));
  return `${pad}<${tag}${attrStr}>\n${innerLines.join('\n')}\n${pad}</${tag}>`;
}

// ============================================================================
// 3. GitHub-Flavored Markdown Formatter (`markdown`)
// ============================================================================

export function formatMarkdown(root: DistilledElement): string {
  const raw = renderBlockNode(root, { listDepth: 0 }).trim();
  return raw.replace(/\n{3,}/g, '\n\n');
}

interface MarkdownCtx {
  listDepth: number;
}

function detectCodeLanguage(el: DistilledElement): string {
  const candidates = [
    el,
    ...el.children.filter((c): c is DistilledElement => c.kind === 'element'),
  ];
  for (const node of candidates) {
    if (node.attrs['data-language']) return node.attrs['data-language'];
    if (node.attrs['data-lang']) return node.attrs['data-lang'];
    for (const cls of node.classes) {
      const m = /^(?:language|lang)-([a-z0-9+#-]+)$/i.exec(cls);
      if (m) return m[1].toLowerCase();
    }
  }
  return '';
}

function extractPlainText(node: DistilledNode): string {
  if (node.kind === 'text') return node.text;
  if (node.kind === 'comment') return '';
  return node.children.map(extractPlainText).join('');
}

function renderInlineNodes(nodes: DistilledNode[]): string {
  const parts: string[] = [];

  for (const node of nodes) {
    if (node.kind === 'comment') {
      parts.push(`<!-- ${node.text.trim()} -->`);
      continue;
    }
    if (node.kind === 'text') {
      parts.push(node.text);
      continue;
    }

    const tag = node.tag;
    if (tag === 'br') {
      parts.push('\n');
      continue;
    }
    if (tag === 'code') {
      const txt = extractPlainText(node).replace(/`/g, '\\`').trim();
      if (txt) parts.push(`\`${txt}\``);
      continue;
    }
    if (tag === 'strong' || tag === 'b') {
      const inner = renderInlineNodes(node.children).trim();
      if (inner) parts.push(`**${inner}**`);
      continue;
    }
    if (tag === 'em' || tag === 'i') {
      const inner = renderInlineNodes(node.children).trim();
      if (inner) parts.push(`*${inner}*`);
      continue;
    }
    if (tag === 'del' || tag === 's') {
      const inner = renderInlineNodes(node.children).trim();
      if (inner) parts.push(`~~${inner}~~`);
      continue;
    }
    if (tag === 'a') {
      const label = renderInlineNodes(node.children).trim() || node.attrs['aria-label'] || '';
      const href = node.attrs['href'] ?? '';
      if (label && href && href !== '#') {
        parts.push(`[${label}](${href})`);
      } else if (label) {
        parts.push(label);
      }
      continue;
    }
    if (tag === 'img') {
      const alt = node.attrs['alt'] ?? '';
      const src = node.attrs['src'] ?? '';
      if (src) parts.push(`![${alt}](${src})`);
      continue;
    }
    if (tag === 'svg') {
      const label = node.attrs['aria-label'];
      if (label) parts.push(`[Icon: ${label}]`);
      continue;
    }
    if (tag === 'button') {
      const label =
        renderInlineNodes(node.children).trim() ||
        node.attrs['aria-label'] ||
        node.attrs['title'] ||
        'Button';
      parts.push(`[Button: ${label}]`);
      continue;
    }
    if (tag === 'input') {
      parts.push(formatInputControlMarkdown(node));
      continue;
    }
    if (tag === 'select') {
      const options = node.children
        .filter((c): c is DistilledElement => c.kind === 'element' && c.tag === 'option')
        .map((o) => extractPlainText(o).trim())
        .filter(Boolean);
      const label = node.attrs['aria-label'] || node.attrs['name'] || 'Select';
      parts.push(
        options.length > 0
          ? `[Select ${label}: ${options.slice(0, 4).join(' | ')}]`
          : `[Select: ${label}]`,
      );
      continue;
    }
    if (tag === 'textarea') {
      const ph = node.attrs['placeholder'] || node.attrs['aria-label'] || 'Text';
      const val = extractPlainText(node).trim();
      parts.push(val ? `[Textarea: ${val}]` : `[Textarea: "${ph}"]`);
      continue;
    }

    parts.push(renderInlineNodes(node.children));
  }

  return parts
    .join(' ')
    .replace(/ +/g, ' ')
    .replace(/ \n /g, '\n')
    .trim();
}

function formatInputControlMarkdown(node: DistilledElement): string {
  const type = (node.attrs['type'] ?? 'text').toLowerCase();
  if (type === 'hidden') return '';
  if (type === 'checkbox' || type === 'radio') {
    const checked = 'checked' in node.attrs;
    const label = node.attrs['aria-label'] ?? node.attrs['name'] ?? '';
    return checked ? `[x]${label ? ` ${label}` : ''}` : `[ ]${label ? ` ${label}` : ''}`;
  }
  const details: string[] = [];
  if (node.attrs['aria-label']) details.push(node.attrs['aria-label']);
  else if (node.attrs['name']) details.push(node.attrs['name']);
  if (node.attrs['placeholder']) details.push(`"${node.attrs['placeholder']}"`);
  if (node.attrs['value']) details.push(`=${node.attrs['value']}`);
  const suffix = details.length > 0 ? `: ${details.join(' ')}` : '';
  return `[Input (${type})${suffix}]`;
}

const BLOCK_LEVEL_MD_TAGS = new Set([
  'address',
  'article',
  'aside',
  'blockquote',
  'details',
  'div',
  'dl',
  'fieldset',
  'figure',
  'footer',
  'form',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'hr',
  'li',
  'main',
  'nav',
  'ol',
  'p',
  'pre',
  'section',
  'table',
  'ul',
]);

function hasBlockChild(el: DistilledElement): boolean {
  return el.children.some(
    (c) =>
      c.kind === 'comment' ||
      (c.kind === 'element' && BLOCK_LEVEL_MD_TAGS.has(c.tag)),
  );
}

function renderBlockNode(node: DistilledNode, ctx: MarkdownCtx): string {
  if (node.kind === 'comment') {
    return `\n<!-- ${node.text.trim()} -->\n`;
  }
  if (node.kind === 'text') {
    return node.text;
  }

  const tag = node.tag;

  if (/^h[1-6]$/.test(tag)) {
    const level = Number.parseInt(tag[1], 10);
    const hashes = '#'.repeat(level);
    const text = renderInlineNodes(node.children);
    return text ? `\n\n${hashes} ${text}\n\n` : '';
  }

  if (tag === 'hr') {
    return '\n\n---\n\n';
  }

  if (tag === 'pre') {
    const lang = detectCodeLanguage(node);
    const code = extractPlainText(node).replace(/^\n+|\n+$/g, '');
    return `\n\n\`\`\`${lang}\n${code}\n\`\`\`\n\n`;
  }

  if (tag === 'table') {
    const mdTable = renderTableToMarkdown(node, renderInlineNodes);
    return mdTable ? `\n\n${mdTable}\n\n` : '';
  }

  if (tag === 'blockquote') {
    const inner = renderChildrenBlocks(node.children, ctx).trim();
    if (!inner) return '';
    const quoted = inner
      .split('\n')
      .map((line) => (line.trim() ? `> ${line}` : '>'))
      .join('\n');
    return `\n\n${quoted}\n\n`;
  }

  if (tag === 'ul' || tag === 'ol') {
    const indent = '  '.repeat(ctx.listDepth);
    const lines: string[] = [];
    let idx = 1;
    for (const child of node.children) {
      if (child.kind === 'comment') {
        lines.push(`${indent}- <!-- ${child.text.trim()} -->`);
        continue;
      }
      if (child.kind !== 'element') continue;
      if (child.tag === 'li') {
        const marker = tag === 'ol' ? `${idx++}.` : '-';
        const liContent = renderListItem(child, { listDepth: ctx.listDepth + 1 });
        if (liContent) {
          lines.push(`${indent}${marker} ${liContent}`);
        }
      }
    }
    return lines.length > 0 ? `\n${lines.join('\n')}\n` : '';
  }

  if (tag === 'p') {
    const text = renderInlineNodes(node.children);
    return text ? `\n\n${text}\n\n` : '';
  }

  if (tag === 'button' || tag === 'input' || tag === 'select' || tag === 'textarea') {
    const ctrl = renderInlineNodes([node]);
    return ctrl ? `${ctrl}\n` : '';
  }

  if (!hasBlockChild(node)) {
    const inline = renderInlineNodes(node.children);
    return inline ? `\n${inline}\n` : '';
  }

  const inner = renderChildrenBlocks(node.children, ctx);
  return `\n${inner}\n`;
}

function renderListItem(li: DistilledElement, nextCtx: MarkdownCtx): string {
  const inlineParts: DistilledNode[] = [];
  const nestedBlocks: string[] = [];

  for (const child of li.children) {
    if (child.kind === 'element' && (child.tag === 'ul' || child.tag === 'ol')) {
      const sub = renderBlockNode(child, nextCtx).trimEnd();
      if (sub) nestedBlocks.push(sub);
    } else {
      inlineParts.push(child);
    }
  }

  const head = renderInlineNodes(inlineParts);
  if (nestedBlocks.length === 0) return head;
  return `${head}\n${nestedBlocks.join('\n')}`.trim();
}

function renderChildrenBlocks(children: DistilledNode[], ctx: MarkdownCtx): string {
  const out: string[] = [];
  let inlineBuffer: DistilledNode[] = [];

  const flushInline = (): void => {
    if (inlineBuffer.length === 0) return;
    const text = renderInlineNodes(inlineBuffer);
    if (text) out.push(text);
    inlineBuffer = [];
  };

  for (const child of children) {
    if (
      child.kind === 'comment' ||
      (child.kind === 'element' && BLOCK_LEVEL_MD_TAGS.has(child.tag))
    ) {
      flushInline();
      const rendered = renderBlockNode(child, ctx).trim();
      if (rendered) out.push(rendered);
    } else {
      inlineBuffer.push(child);
    }
  }
  flushInline();
  return out.join('\n\n');
}

// ============================================================================
// 4. Structured AI Agent Replication Context Bundle (`prompt`)
// ============================================================================

export interface FormatPromptParams {
  root: DistilledElement;
  tailwindHtml: string;
  designTokens: DesignTokens;
  sourceUrl?: string;
  adapterName?: string;
  compactMode?: boolean;
}

export function formatPrompt(params: FormatPromptParams): string {
  const sections: string[] = [];

  const metaLines: string[] = ['# AnyGrab Distilled UI Context'];
  if (params.sourceUrl) metaLines.push(`Source: ${params.sourceUrl}`);
  if (params.adapterName) metaLines.push(`Adapter: ${params.adapterName}`);
  sections.push(metaLines.join('\n'));

  if (!params.compactMode) {
    const tokenLines = summarizeDesignTokens(params.designTokens);
    if (tokenLines.length > 0) {
      sections.push(`## Design Tokens\n${tokenLines.join('\n')}`);
    }
  }

  sections.push(`## Structure (Tailwind HTML)\n\`\`\`html\n${params.tailwindHtml}\n\`\`\``);

  return sections.join('\n\n');
}

function summarizeDesignTokens(tokens: DesignTokens): string[] {
  const lines: string[] = [];
  if (tokens.colors.length > 0) {
    lines.push(`- Colors: ${tokens.colors.slice(0, 8).join(', ')}`);
  }
  if (tokens.fonts.length > 0) {
    lines.push(`- Fonts: ${tokens.fonts.slice(0, 4).join(', ')}`);
  }
  if (tokens.radii.length > 0) {
    lines.push(`- Radii: ${tokens.radii.slice(0, 5).join(', ')}`);
  }
  if (tokens.spacings.length > 0) {
    lines.push(`- Spacings: ${tokens.spacings.slice(0, 6).join(', ')}`);
  }
  if (tokens.shadows.length > 0) {
    lines.push(`- Shadows: ${tokens.shadows.slice(0, 2).join(' | ')}`);
  }
  return lines;
}

export function cloneDistilledNode<T extends DistilledNode>(node: T): T {
  if (node.kind === 'text') {
    return { kind: 'text', text: node.text } as T;
  }
  if (node.kind === 'comment') {
    return { kind: 'comment', text: node.text } as T;
  }
  return {
    kind: 'element',
    tag: node.tag,
    classes: [...node.classes],
    attrs: { ...node.attrs },
    children: node.children.map((c) => cloneDistilledNode(c)),
  } as T;
}

export function countElementsInDistilled(node: DistilledNode): number {
  if (node.kind !== 'element') return 0;
  let total = 1;
  for (const child of node.children) {
    total += countElementsInDistilled(child);
  }
  return total;
}

export function makeOmittedComment(count: number, noun = 'similar items'): DistilledComment {
  return {
    kind: 'comment',
    text: `+${count} ${noun} omitted to fit token budget`,
  };
}
