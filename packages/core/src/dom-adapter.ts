import type { GrabInput } from './types';

export const VOID_HTML_TAGS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

const RAW_TEXT_TAGS = new Set(['script', 'style']);

const BLOCK_AUTOCLOSE_P = new Set([
  'address',
  'article',
  'aside',
  'blockquote',
  'details',
  'div',
  'dl',
  'fieldset',
  'figcaption',
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
  'main',
  'nav',
  'ol',
  'p',
  'pre',
  'section',
  'table',
  'ul',
]);

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  '#39': "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  bull: '•',
  hellip: '…',
  copy: '©',
  reg: '®',
  trade: '™',
  times: '×',
  divide: '÷',
  plusmn: '±',
  rarr: '→',
  larr: '←',
  uarr: '↑',
  darr: '↓',
  check: '✓',
  checkmark: '✓',
  starf: '★',
  le: '≤',
  ge: '≥',
  ne: '≠',
  approx: '≈',
  infty: '∞',
};

export function decodeHtmlEntities(input: string): string {
  if (!input || !input.includes('&')) return input;
  return input.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z0-9]+);/g, (full, entity: string) => {
    if (entity.startsWith('#x') || entity.startsWith('#X')) {
      const code = Number.parseInt(entity.slice(2), 16);
      return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : full;
    }
    if (entity.startsWith('#')) {
      const code = Number.parseInt(entity.slice(1), 10);
      return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : full;
    }
    return NAMED_ENTITIES[entity] ?? NAMED_ENTITIES[entity.toLowerCase()] ?? full;
  });
}

export function escapeHtmlText(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function parseInlineStyleMap(styleText: string | null | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!styleText) return result;

  // Split by `;` outside parentheses and quotes (protects url("data:image/svg+xml;utf8,...") and gradients)
  let current = '';
  let parenDepth = 0;
  let quote: string | null = null;

  for (let i = 0; i < styleText.length; i++) {
    const ch = styleText[i];
    if (quote) {
      current += ch;
      if (ch === quote && styleText[i - 1] !== '\\') quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
      continue;
    }
    if (ch === '(') {
      parenDepth++;
      current += ch;
      continue;
    }
    if (ch === ')') {
      parenDepth = Math.max(0, parenDepth - 1);
      current += ch;
      continue;
    }
    if (ch === ';' && parenDepth === 0) {
      addDeclaration(current, result);
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim()) {
    addDeclaration(current, result);
  }
  return result;
}

function addDeclaration(decl: string, target: Record<string, string>): void {
  const colonIdx = decl.indexOf(':');
  if (colonIdx <= 0) return;
  const prop = decl.slice(0, colonIdx).trim();
  let val = decl.slice(colonIdx + 1).trim();
  if (!prop || !val) return;
  val = val.replace(/\s*!important\s*$/i, '').trim();
  const normalizedProp = prop.startsWith('--') ? prop : prop.toLowerCase();
  target[normalizedProp] = val;
}

// ============================================================================
// Universal Cross-Realm DOM Duck-Typed Helpers
// ============================================================================

export function isElementLike(node: unknown): node is Element {
  return Boolean(node && typeof node === 'object' && (node as { nodeType?: number }).nodeType === 1);
}

export function isTextLike(node: unknown): node is Text {
  return Boolean(node && typeof node === 'object' && (node as { nodeType?: number }).nodeType === 3);
}

export function isCommentLike(node: unknown): node is Comment {
  return Boolean(node && typeof node === 'object' && (node as { nodeType?: number }).nodeType === 8);
}

export function isDocumentLike(node: unknown): node is Document {
  return Boolean(node && typeof node === 'object' && (node as { nodeType?: number }).nodeType === 9);
}

export function isFragmentLike(node: unknown): node is DocumentFragment {
  return Boolean(
    node && typeof node === 'object' && (node as { nodeType?: number }).nodeType === 11,
  );
}

export function getLowerTag(el: Element): string {
  const raw =
    (el as { localName?: string }).localName ||
    el.tagName ||
    (el as { nodeName?: string }).nodeName ||
    'div';
  return String(raw).toLowerCase();
}

/**
 * Safely reads an element's class string across HTML and SVG elements
 * (in browsers, SVGElement.className is an SVGAnimatedString object).
 */
export function getClassString(el: Element): string {
  if (typeof el.getAttribute === 'function') {
    const attr = el.getAttribute('class');
    if (typeof attr === 'string') return attr;
  }
  const cn = (el as { className?: unknown }).className;
  if (typeof cn === 'string') return cn;
  if (cn && typeof cn === 'object' && 'baseVal' in cn) {
    return String((cn as { baseVal: unknown }).baseVal ?? '');
  }
  return '';
}

export function getElementAttr(el: Element, name: string): string | null {
  if (typeof el.getAttribute === 'function') {
    const val = el.getAttribute(name);
    if (val !== null && val !== undefined) return String(val);
    const lower = name.toLowerCase();
    if (lower !== name) {
      const fallback = el.getAttribute(lower);
      if (fallback !== null && fallback !== undefined) return String(fallback);
    }
  }
  return null;
}

export function getElementAttrs(el: Element): Array<{ name: string; value: string }> {
  const attrs = (el as { attributes?: ArrayLike<{ name: string; value: string }> }).attributes;
  if (!attrs) return [];
  const out: Array<{ name: string; value: string }> = [];
  for (let i = 0; i < attrs.length; i++) {
    const item = attrs[i];
    if (item && typeof item.name === 'string') {
      out.push({ name: item.name, value: String(item.value ?? '') });
    }
  }
  return out;
}

export function getChildNodeArray(node: Node): Node[] {
  const cn = (node as { childNodes?: ArrayLike<Node> }).childNodes;
  if (!cn) return [];
  return Array.from(cn);
}

export function getElementChildren(node: Node): Element[] {
  const children = (node as { children?: ArrayLike<Element> }).children;
  if (children && typeof children.length === 'number') {
    return Array.from(children).filter(isElementLike);
  }
  return getChildNodeArray(node).filter(isElementLike);
}

export function getParentElementSafe(el: Element): Element | null {
  const pe = (el as { parentElement?: Element | null }).parentElement;
  if (pe && isElementLike(pe)) return pe;
  const pn = (el as { parentNode?: Node | null }).parentNode;
  if (pn && isElementLike(pn)) return pn;
  return null;
}

// ============================================================================
// Pure Zero-Dependency Lightweight HTML DOM Fallback (Node / Serverless)
// ============================================================================

export class LiteStyleDeclaration {
  private map: Record<string, string> = {};
  private raw = '';

  constructor(initial = '') {
    this.cssText = initial;
  }

  get cssText(): string {
    return this.raw;
  }

  set cssText(val: string) {
    this.raw = val || '';
    this.map = parseInlineStyleMap(this.raw);
  }

  getPropertyValue(prop: string): string {
    const key = prop.startsWith('--') ? prop : prop.toLowerCase();
    return this.map[key] ?? '';
  }

  setProperty(prop: string, value: string): void {
    const key = prop.startsWith('--') ? prop : prop.toLowerCase();
    this.map[key] = value;
    this.raw = Object.entries(this.map)
      .map(([k, v]) => `${k}: ${v}`)
      .join('; ');
  }
}

export class LiteNode {
  nodeType: number;
  nodeName: string;
  parentNode: LiteNode | null = null;
  ownerDocument: LiteDocument | null = null;
  childNodes: LiteNode[] = [];

  constructor(nodeType: number, nodeName: string) {
    this.nodeType = nodeType;
    this.nodeName = nodeName;
  }

  get parentElement(): LiteElement | null {
    return this.parentNode instanceof LiteElement ? this.parentNode : null;
  }

  get children(): LiteElement[] {
    return this.childNodes.filter((c): c is LiteElement => c instanceof LiteElement);
  }

  get firstElementChild(): LiteElement | null {
    return this.children[0] ?? null;
  }

  get lastElementChild(): LiteElement | null {
    const list = this.children;
    return list.length > 0 ? list[list.length - 1] : null;
  }

  get nextElementSibling(): LiteElement | null {
    if (!this.parentNode) return null;
    const siblings = this.parentNode.childNodes;
    const idx = siblings.indexOf(this);
    if (idx < 0) return null;
    for (let i = idx + 1; i < siblings.length; i++) {
      if (siblings[i] instanceof LiteElement) return siblings[i] as LiteElement;
    }
    return null;
  }

  get previousElementSibling(): LiteElement | null {
    if (!this.parentNode) return null;
    const siblings = this.parentNode.childNodes;
    const idx = siblings.indexOf(this);
    if (idx <= 0) return null;
    for (let i = idx - 1; i >= 0; i--) {
      if (siblings[i] instanceof LiteElement) return siblings[i] as LiteElement;
    }
    return null;
  }

  appendChild<T extends LiteNode>(child: T): T {
    if (child.parentNode) {
      child.remove();
    }
    child.parentNode = this;
    child.ownerDocument = this instanceof LiteDocument ? this : this.ownerDocument;
    this.childNodes.push(child);
    return child;
  }

  remove(): void {
    if (!this.parentNode) return;
    const idx = this.parentNode.childNodes.indexOf(this);
    if (idx >= 0) {
      this.parentNode.childNodes.splice(idx, 1);
    }
    this.parentNode = null;
  }

  get textContent(): string {
    return this.childNodes.map((c) => c.textContent).join('');
  }

  set textContent(value: string) {
    this.childNodes = [];
    if (value) {
      const txt = new LiteText(value);
      this.appendChild(txt);
    }
  }
}

export class LiteText extends LiteNode {
  data: string;

  constructor(data: string) {
    super(3, '#text');
    this.data = data;
  }

  override get textContent(): string {
    return this.data;
  }

  override set textContent(val: string) {
    this.data = val;
  }
}

export class LiteComment extends LiteNode {
  data: string;

  constructor(data: string) {
    super(8, '#comment');
    this.data = data;
  }

  override get textContent(): string {
    return '';
  }
}

export class LiteElement extends LiteNode {
  tagName: string;
  localName: string;
  private attrMap = new Map<string, { name: string; value: string }>();
  private styleObj = new LiteStyleDeclaration();

  constructor(tag: string) {
    const clean = tag.trim();
    const lower = clean.toLowerCase();
    super(1, clean.toUpperCase());
    this.tagName = clean.toUpperCase();
    this.localName = lower;
  }

  get attributes(): Array<{ name: string; value: string }> {
    return Array.from(this.attrMap.values());
  }

  get id(): string {
    return this.getAttribute('id') ?? '';
  }

  set id(val: string) {
    this.setAttribute('id', val);
  }

  get className(): string {
    return this.getAttribute('class') ?? '';
  }

  set className(val: string) {
    this.setAttribute('class', val);
  }

  get classList() {
    return {
      contains: (cls: string): boolean =>
        this.className.split(/\s+/).filter(Boolean).includes(cls),
      add: (...tokens: string[]): void => {
        const set = new Set(this.className.split(/\s+/).filter(Boolean));
        for (const t of tokens) if (t) set.add(t);
        this.className = Array.from(set).join(' ');
      },
      remove: (...tokens: string[]): void => {
        const set = new Set(this.className.split(/\s+/).filter(Boolean));
        for (const t of tokens) set.delete(t);
        this.className = Array.from(set).join(' ');
      },
    };
  }

  get style(): LiteStyleDeclaration {
    return this.styleObj;
  }

  getAttribute(name: string): string | null {
    const entry = this.attrMap.get(name.toLowerCase());
    return entry ? entry.value : null;
  }

  setAttribute(name: string, value: string): void {
    const lower = name.toLowerCase();
    this.attrMap.set(lower, { name, value: String(value) });
    if (lower === 'style') {
      this.styleObj.cssText = String(value);
    }
  }

  removeAttribute(name: string): void {
    const lower = name.toLowerCase();
    this.attrMap.delete(lower);
    if (lower === 'style') {
      this.styleObj.cssText = '';
    }
  }

  hasAttribute(name: string): boolean {
    return this.attrMap.has(name.toLowerCase());
  }

  getAttributeNames(): string[] {
    return Array.from(this.attrMap.values()).map((a) => a.name);
  }

  get innerHTML(): string {
    return this.childNodes.map((n) => serializeLiteNode(n)).join('');
  }

  get outerHTML(): string {
    return serializeLiteNode(this);
  }

  matches(selector: string): boolean {
    return matchesSelector(this as unknown as Element, selector);
  }

  querySelector(selector: string): Element | null {
    return queryFirstElement(this as unknown as Element, selector);
  }

  querySelectorAll(selector: string): Element[] {
    return queryAllElements(this as unknown as Element, selector);
  }

  cloneLite(deep = false): LiteElement {
    const copy = new LiteElement(this.localName);
    copy.ownerDocument = this.ownerDocument;
    for (const { name, value } of this.attributes) {
      copy.setAttribute(name, value);
    }
    if (deep) {
      for (const child of this.childNodes) {
        if (child instanceof LiteElement) {
          copy.appendChild(child.cloneLite(true));
        } else if (child instanceof LiteText) {
          copy.appendChild(new LiteText(child.data));
        } else if (child instanceof LiteComment) {
          copy.appendChild(new LiteComment(child.data));
        }
      }
    }
    return copy;
  }

  cloneNode(deep = false): LiteElement {
    return this.cloneLite(deep);
  }
}

export class LiteDocument extends LiteNode {
  documentElement: LiteElement;
  head: LiteElement;
  body: LiteElement;

  constructor() {
    super(9, '#document');
    this.ownerDocument = this;
    this.documentElement = new LiteElement('html');
    this.head = new LiteElement('head');
    this.body = new LiteElement('body');
    this.appendChild(this.documentElement);
    this.documentElement.appendChild(this.head);
    this.documentElement.appendChild(this.body);
  }

  createElement(tag: string): LiteElement {
    const el = new LiteElement(tag);
    el.ownerDocument = this;
    return el;
  }

  createTextNode(text: string): LiteText {
    const node = new LiteText(text);
    node.ownerDocument = this;
    return node;
  }

  querySelector(selector: string): Element | null {
    return queryFirstElement(this as unknown as Document, selector);
  }

  querySelectorAll(selector: string): Element[] {
    return queryAllElements(this as unknown as Document, selector);
  }
}

function serializeLiteNode(node: LiteNode): string {
  if (node instanceof LiteText) {
    const parentTag = node.parentElement?.localName;
    if (parentTag && RAW_TEXT_TAGS.has(parentTag)) {
      return node.data;
    }
    return escapeHtmlText(node.data);
  }
  if (node instanceof LiteComment) {
    return `<!--${node.data}-->`;
  }
  if (node instanceof LiteElement) {
    const tag = node.localName;
    const attrs = node.attributes
      .map(({ name, value }) => (value === '' ? name : `${name}="${escapeHtmlAttr(value)}"`))
      .join(' ');
    const open = attrs ? `<${tag} ${attrs}>` : `<${tag}>`;
    if (VOID_HTML_TAGS.has(tag)) return open;
    return `${open}${node.innerHTML}</${tag}>`;
  }
  return '';
}

/**
 * Zero-dependency HTML string -> LiteDocument parser for pure Node.js environments
 * where global `DOMParser` is absent.
 */
export function parseHtmlFallback(html: string): LiteDocument {
  const doc = new LiteDocument();
  if (!html) return doc;

  const hasExplicitHtml = /<html[\s>]/i.test(html);
  const hasExplicitBody = /<body[\s>]/i.test(html);

  const stack: LiteElement[] = [doc.body];
  let i = 0;
  const len = html.length;

  const currentParent = (): LiteElement => stack[stack.length - 1] ?? doc.body;

  while (i < len) {
    const lt = html.indexOf('<', i);
    if (lt < 0) {
      const tail = decodeHtmlEntities(html.slice(i));
      if (tail) currentParent().appendChild(new LiteText(tail));
      break;
    }

    if (lt > i) {
      const text = decodeHtmlEntities(html.slice(i, lt));
      if (text) currentParent().appendChild(new LiteText(text));
    }

    // Comment <!-- ... -->
    if (html.startsWith('<!--', lt)) {
      const endComment = html.indexOf('-->', lt + 4);
      if (endComment < 0) {
        currentParent().appendChild(new LiteComment(html.slice(lt + 4)));
        break;
      }
      currentParent().appendChild(new LiteComment(html.slice(lt + 4, endComment)));
      i = endComment + 3;
      continue;
    }

    // CDATA <![CDATA[ ... ]]>
    if (html.startsWith('<![CDATA[', lt)) {
      const endCdata = html.indexOf(']]>', lt + 9);
      if (endCdata < 0) {
        currentParent().appendChild(new LiteText(html.slice(lt + 9)));
        break;
      }
      currentParent().appendChild(new LiteText(html.slice(lt + 9, endCdata)));
      i = endCdata + 3;
      continue;
    }

    // Doctype / declarations <!DOCTYPE ...> or <?xml ...?>
    if (html[lt + 1] === '!' || html[lt + 1] === '?') {
      const closeGt = html.indexOf('>', lt + 2);
      i = closeGt < 0 ? len : closeGt + 1;
      continue;
    }

    // Closing tag </tag>
    if (html[lt + 1] === '/') {
      const closeGt = html.indexOf('>', lt + 2);
      if (closeGt < 0) break;
      const closeTag = html.slice(lt + 2, closeGt).trim().toLowerCase();
      if (closeTag && closeTag !== 'html' && closeTag !== 'body' && closeTag !== 'head') {
        for (let s = stack.length - 1; s >= 1; s--) {
          if (stack[s].localName === closeTag) {
            stack.length = s;
            break;
          }
        }
      } else if (closeTag === 'head') {
        stack.length = 1;
        stack[0] = doc.body;
      }
      i = closeGt + 1;
      continue;
    }

    // Opening tag <tag attr="val">
    const tagMatch = /^<([a-zA-Z][a-zA-Z0-9:-]*)/.exec(html.slice(lt));
    if (!tagMatch) {
      currentParent().appendChild(new LiteText('<'));
      i = lt + 1;
      continue;
    }

    const rawTagName = tagMatch[1];
    const lowerTag = rawTagName.toLowerCase();
    let cursor = lt + tagMatch[0].length;
    const attrs: Array<{ name: string; value: string }> = [];
    let selfClosing = false;

    while (cursor < len) {
      while (cursor < len && /\s/.test(html[cursor])) cursor++;
      if (cursor >= len) break;
      if (html[cursor] === '>') {
        cursor++;
        break;
      }
      if (html[cursor] === '/' && html[cursor + 1] === '>') {
        selfClosing = true;
        cursor += 2;
        break;
      }

      const nameStart = cursor;
      while (cursor < len && !/[\s=/>]/.test(html[cursor])) cursor++;
      const attrName = html.slice(nameStart, cursor);
      if (!attrName) {
        cursor++;
        continue;
      }

      while (cursor < len && /\s/.test(html[cursor])) cursor++;
      let attrValue = '';
      if (html[cursor] === '=') {
        cursor++;
        while (cursor < len && /\s/.test(html[cursor])) cursor++;
        const quote = html[cursor];
        if (quote === '"' || quote === "'") {
          cursor++;
          const valStart = cursor;
          const endQuote = html.indexOf(quote, cursor);
          if (endQuote < 0) {
            attrValue = decodeHtmlEntities(html.slice(valStart));
            cursor = len;
          } else {
            attrValue = decodeHtmlEntities(html.slice(valStart, endQuote));
            cursor = endQuote + 1;
          }
        } else {
          const valStart = cursor;
          while (cursor < len && !/[\s>]/.test(html[cursor])) cursor++;
          attrValue = decodeHtmlEntities(html.slice(valStart, cursor));
        }
      }
      attrs.push({ name: attrName, value: attrValue });
    }

    i = cursor;

    // Merge attributes onto document structural elements when present in full HTML
    if (lowerTag === 'html' && hasExplicitHtml) {
      for (const a of attrs) doc.documentElement.setAttribute(a.name, a.value);
      continue;
    }
    if (lowerTag === 'head') {
      for (const a of attrs) doc.head.setAttribute(a.name, a.value);
      stack[0] = doc.head;
      stack.length = 1;
      continue;
    }
    if (lowerTag === 'body' && hasExplicitBody) {
      for (const a of attrs) doc.body.setAttribute(a.name, a.value);
      stack[0] = doc.body;
      stack.length = 1;
      continue;
    }

    // Handle HTML implicit auto-closing rules
    applyImplicitAutoClose(stack, lowerTag);

    const el = doc.createElement(rawTagName);
    for (const a of attrs) {
      el.setAttribute(a.name, a.value);
    }

    // Place top-level <style>/<title>/<meta>/<link> in head when parsed at root, or keep in tree
    if (lowerTag === 'style' && stack.length === 1 && stack[0] === doc.body) {
      doc.head.appendChild(el);
    } else {
      currentParent().appendChild(el);
    }

    if (RAW_TEXT_TAGS.has(lowerTag) && !selfClosing) {
      const closeRe = new RegExp(`</${lowerTag}\\s*>`, 'i');
      const rest = html.slice(i);
      const matchClose = closeRe.exec(rest);
      if (matchClose) {
        const rawInner = rest.slice(0, matchClose.index);
        if (rawInner) el.appendChild(new LiteText(rawInner));
        i += matchClose.index + matchClose[0].length;
      } else {
        if (rest) el.appendChild(new LiteText(rest));
        i = len;
      }
      continue;
    }

    if (!selfClosing && !VOID_HTML_TAGS.has(lowerTag)) {
      if (el.parentNode !== doc.head || stack[0] === doc.head) {
        stack.push(el);
      }
    }
  }

  return doc;
}

function applyImplicitAutoClose(stack: LiteElement[], openingTag: string): void {
  if (stack.length <= 1) return;
  const top = stack[stack.length - 1].localName;

  if (top === 'p' && BLOCK_AUTOCLOSE_P.has(openingTag)) {
    stack.pop();
    return;
  }
  if (openingTag === 'li') {
    for (let s = stack.length - 1; s >= 1; s--) {
      const t = stack[s].localName;
      if (t === 'ul' || t === 'ol' || t === 'menu') break;
      if (t === 'li') {
        stack.length = s;
        break;
      }
    }
    return;
  }
  if (openingTag === 'td' || openingTag === 'th') {
    for (let s = stack.length - 1; s >= 1; s--) {
      const t = stack[s].localName;
      if (t === 'tr' || t === 'table') break;
      if (t === 'td' || t === 'th') {
        stack.length = s;
        break;
      }
    }
    return;
  }
  if (openingTag === 'tr') {
    for (let s = stack.length - 1; s >= 1; s--) {
      const t = stack[s].localName;
      if (t === 'thead' || t === 'tbody' || t === 'tfoot' || t === 'table') break;
      if (t === 'tr') {
        stack.length = s;
        break;
      }
    }
    return;
  }
  if (openingTag === 'thead' || openingTag === 'tbody' || openingTag === 'tfoot') {
    for (let s = stack.length - 1; s >= 1; s--) {
      const t = stack[s].localName;
      if (t === 'table') break;
      if (t === 'thead' || t === 'tbody' || t === 'tfoot') {
        stack.length = s;
        break;
      }
    }
  }
}

// ============================================================================
// Built-in Zero-Dependency CSS Selector Engine (DOM + Style Rule Matching)
// ============================================================================

export interface SelectorMatchOptions {
  /** Match `:hover` / `:focus` interactive state selectors */
  hoverState?: boolean;
}

export type SpecificityTuple = [ids: number, classesAttrsPseudos: number, tags: number];

interface CompoundStep {
  combinator: '' | ' ' | '>' | '+' | '~';
  compound: string;
}

export function splitSelectorList(selectorGroup: string): string[] {
  const parts: string[] = [];
  let cur = '';
  let paren = 0;
  let bracket = 0;
  let quote: string | null = null;

  for (let i = 0; i < selectorGroup.length; i++) {
    const ch = selectorGroup[i];
    if (quote) {
      cur += ch;
      if (ch === quote && selectorGroup[i - 1] !== '\\') quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      cur += ch;
      continue;
    }
    if (ch === '(') paren++;
    else if (ch === ')') paren = Math.max(0, paren - 1);
    else if (ch === '[') bracket++;
    else if (ch === ']') bracket = Math.max(0, bracket - 1);

    if (ch === ',' && paren === 0 && bracket === 0) {
      if (cur.trim()) parts.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

function tokenizeComplexSelector(selector: string): CompoundStep[] | null {
  const trimmed = selector.trim();
  if (!trimmed) return null;

  // Reject pseudo-elements (`::before`, `::after`, `:before`, `:after`, `::placeholder`, `::-webkit-*`)
  if (/::|:(before|after|first-line|first-letter|selection|placeholder)\b/i.test(trimmed)) {
    return null;
  }

  const steps: CompoundStep[] = [];
  let cur = '';
  let pendingCombinator: '' | ' ' | '>' | '+' | '~' = '';
  let paren = 0;
  let bracket = 0;
  let quote: string | null = null;

  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (quote) {
      cur += ch;
      if (ch === quote && trimmed[i - 1] !== '\\') quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      cur += ch;
      continue;
    }
    if (ch === '(') {
      paren++;
      cur += ch;
      continue;
    }
    if (ch === ')') {
      paren = Math.max(0, paren - 1);
      cur += ch;
      continue;
    }
    if (ch === '[') {
      bracket++;
      cur += ch;
      continue;
    }
    if (ch === ']') {
      bracket = Math.max(0, bracket - 1);
      cur += ch;
      continue;
    }

    if (paren === 0 && bracket === 0 && (ch === '>' || ch === '+' || ch === '~' || /\s/.test(ch))) {
      if (cur) {
        steps.push({ combinator: pendingCombinator, compound: cur });
        cur = '';
        pendingCombinator = ' ';
      }
      if (ch === '>' || ch === '+' || ch === '~') {
        pendingCombinator = ch;
      } else if (!pendingCombinator) {
        pendingCombinator = ' ';
      }
      continue;
    }
    cur += ch;
  }

  if (cur) {
    steps.push({ combinator: steps.length === 0 ? '' : pendingCombinator || ' ', compound: cur });
  }
  return steps.length > 0 ? steps : null;
}

export function selectorHasHover(singleSelector: string): boolean {
  return /:hover\b/i.test(singleSelector);
}

export function computeSelectorSpecificity(singleSelector: string): SpecificityTuple {
  let ids = 0;
  let classes = 0;
  let tags = 0;

  // Strip :where(...) because :where() has 0 specificity
  const cleaned = singleSelector.replace(/:where\([^)]*\)/g, '');
  const steps = tokenizeComplexSelector(cleaned);
  if (!steps) return [0, 0, 0];

  for (const { compound } of steps) {
    let i = 0;
    while (i < compound.length) {
      const ch = compound[i];
      if (ch === '#') {
        ids++;
        i++;
        while (i < compound.length && /[a-zA-Z0-9_-]/.test(compound[i])) i++;
      } else if (ch === '.') {
        classes++;
        i++;
        while (i < compound.length && /[a-zA-Z0-9_-]|\\./.test(compound[i])) i++;
      } else if (ch === '[') {
        classes++;
        const close = compound.indexOf(']', i + 1);
        i = close < 0 ? compound.length : close + 1;
      } else if (ch === ':') {
        i++;
        const start = i;
        while (i < compound.length && /[a-zA-Z0-9_-]/.test(compound[i])) i++;
        const name = compound.slice(start, i).toLowerCase();
        if (compound[i] === '(') {
          let depth = 1;
          i++;
          const argStart = i;
          while (i < compound.length && depth > 0) {
            if (compound[i] === '(') depth++;
            else if (compound[i] === ')') depth--;
            i++;
          }
          const inner = compound.slice(argStart, i - 1);
          if (name === 'not' || name === 'is' || name === 'has') {
            const innerSubs = splitSelectorList(inner);
            let best: SpecificityTuple = [0, 0, 0];
            for (const sub of innerSubs) {
              const sp = computeSelectorSpecificity(sub);
              if (compareSpecificity(sp, best) > 0) best = sp;
            }
            ids += best[0];
            classes += best[1];
            tags += best[2];
          } else {
            classes++;
          }
        } else {
          classes++;
        }
      } else if (ch === '*') {
        i++;
      } else if (/[a-zA-Z]/.test(ch)) {
        tags++;
        while (i < compound.length && /[a-zA-Z0-9_-]/.test(compound[i])) i++;
      } else {
        i++;
      }
    }
  }
  return [ids, classes, tags];
}

export function compareSpecificity(a: SpecificityTuple, b: SpecificityTuple): number {
  if (a[0] !== b[0]) return a[0] - b[0];
  if (a[1] !== b[1]) return a[1] - b[1];
  return a[2] - b[2];
}

function matchesCompound(el: Element, compound: string, opts?: SelectorMatchOptions): boolean {
  let i = 0;
  const len = compound.length;

  while (i < len) {
    const ch = compound[i];
    if (ch === '*') {
      i++;
      continue;
    }
    if (ch === '#') {
      i++;
      const start = i;
      while (i < len && !/[.#[:\s>+~]/.test(compound[i])) i++;
      const id = compound.slice(start, i).replace(/\\/g, '');
      if ((getElementAttr(el, 'id') ?? '') !== id) return false;
      continue;
    }
    if (ch === '.') {
      i++;
      const start = i;
      while (i < len && (!/[.#[:\s>+~]/.test(compound[i]) || compound[i - 1] === '\\')) i++;
      const cls = compound.slice(start, i).replace(/\\/g, '');
      const classes = getClassString(el).split(/\s+/).filter(Boolean);
      if (!classes.includes(cls)) return false;
      continue;
    }
    if (ch === '[') {
      let close = i + 1;
      let quote: string | null = null;
      while (close < len) {
        const c = compound[close];
        if (quote) {
          if (c === quote && compound[close - 1] !== '\\') quote = null;
        } else if (c === '"' || c === "'") {
          quote = c;
        } else if (c === ']') {
          break;
        }
        close++;
      }
      const expr = compound.slice(i + 1, close).trim();
      i = close + 1;
      if (!matchAttributeExpr(el, expr)) return false;
      continue;
    }
    if (ch === ':') {
      i++;
      const start = i;
      while (i < len && /[a-zA-Z0-9_-]/.test(compound[i])) i++;
      const pseudo = compound.slice(start, i).toLowerCase();
      let arg = '';
      if (compound[i] === '(') {
        let depth = 1;
        i++;
        const argStart = i;
        while (i < len && depth > 0) {
          if (compound[i] === '(') depth++;
          else if (compound[i] === ')') depth--;
          i++;
        }
        arg = compound.slice(argStart, i - 1).trim();
      }
      if (!matchPseudoClass(el, pseudo, arg, opts)) return false;
      continue;
    }
    // Tag selector
    const start = i;
    while (i < len && /[a-zA-Z0-9_-]/.test(compound[i])) i++;
    if (i === start) return false;
    const tag = compound.slice(start, i).toLowerCase();
    if (getLowerTag(el) !== tag) return false;
  }

  return true;
}

function matchAttributeExpr(el: Element, expr: string): boolean {
  const m = /^([a-zA-Z0-9_:-]+)\s*(?:([~|^$*]?=)\s*(.*))?$/.exec(expr);
  if (!m) return false;
  const attrName = m[1];
  const op = m[2];
  let rawVal = (m[3] ?? '').trim();
  const actual = getElementAttr(el, attrName);
  if (actual === null) return false;
  if (!op) return true;

  let caseInsensitive = false;
  if (/\s+[iI]$/.test(rawVal)) {
    caseInsensitive = true;
    rawVal = rawVal.replace(/\s+[iI]$/, '').trim();
  }
  if (
    (rawVal.startsWith('"') && rawVal.endsWith('"')) ||
    (rawVal.startsWith("'") && rawVal.endsWith("'"))
  ) {
    rawVal = rawVal.slice(1, -1);
  }
  const lhs = caseInsensitive ? actual.toLowerCase() : actual;
  const rhs = caseInsensitive ? rawVal.toLowerCase() : rawVal;

  switch (op) {
    case '=':
      return lhs === rhs;
    case '^=':
      return rhs.length > 0 && lhs.startsWith(rhs);
    case '$=':
      return rhs.length > 0 && lhs.endsWith(rhs);
    case '*=':
      return rhs.length > 0 && lhs.includes(rhs);
    case '~=':
      return rhs.length > 0 && lhs.split(/\s+/).includes(rhs);
    case '|=':
      return lhs === rhs || lhs.startsWith(`${rhs}-`);
    default:
      return false;
  }
}

function matchPseudoClass(
  el: Element,
  pseudo: string,
  arg: string,
  opts?: SelectorMatchOptions,
): boolean {
  switch (pseudo) {
    case 'root': {
      const tag = getLowerTag(el);
      return tag === 'html' || getParentElementSafe(el) === null;
    }
    case 'hover':
    case 'focus':
    case 'focus-visible':
      return Boolean(opts?.hoverState);
    case 'active':
    case 'visited':
      return false;
    case 'link':
      return getLowerTag(el) === 'a' && getElementAttr(el, 'href') !== null;
    case 'disabled':
      return getElementAttr(el, 'disabled') !== null;
    case 'enabled':
      return getElementAttr(el, 'disabled') === null;
    case 'checked':
      return getElementAttr(el, 'checked') !== null;
    case 'empty':
      return getChildNodeArray(el).every(
        (n) => isCommentLike(n) || (isTextLike(n) && !(n.textContent ?? '').trim()),
      );
    case 'first-child': {
      const parent = getParentElementSafe(el);
      if (!parent) return true;
      const children = getElementChildren(parent);
      return children[0] === el;
    }
    case 'last-child': {
      const parent = getParentElementSafe(el);
      if (!parent) return true;
      const children = getElementChildren(parent);
      return children[children.length - 1] === el;
    }
    case 'only-child': {
      const parent = getParentElementSafe(el);
      if (!parent) return true;
      const children = getElementChildren(parent);
      return children.length === 1 && children[0] === el;
    }
    case 'nth-child': {
      const parent = getParentElementSafe(el);
      if (!parent) return false;
      const children = getElementChildren(parent);
      const index = children.indexOf(el) + 1;
      if (index <= 0) return false;
      return matchNthExpression(index, arg);
    }
    case 'not':
      return !matchesSelector(el, arg, opts);
    case 'is':
    case 'where':
      return matchesSelector(el, arg, opts);
    default:
      return false;
  }
}

function matchNthExpression(index: number, expr: string): boolean {
  const clean = expr.replace(/\s+/g, '').toLowerCase();
  if (clean === 'odd') return index % 2 === 1;
  if (clean === 'even') return index % 2 === 0;
  if (/^\d+$/.test(clean)) return index === Number.parseInt(clean, 10);
  const m = /^([+-]?\d*)n([+-]\d+)?$/.exec(clean);
  if (!m) return false;
  const a = m[1] === '' || m[1] === '+' ? 1 : m[1] === '-' ? -1 : Number.parseInt(m[1], 10);
  const b = m[2] ? Number.parseInt(m[2], 10) : 0;
  if (a === 0) return index === b;
  const diff = index - b;
  return diff % a === 0 && diff / a >= 0;
}

function matchStepsAtIndex(
  el: Element,
  steps: CompoundStep[],
  stepIdx: number,
  opts?: SelectorMatchOptions,
): boolean {
  if (!matchesCompound(el, steps[stepIdx].compound, opts)) return false;
  if (stepIdx === 0) return true;

  const comb = steps[stepIdx].combinator;
  if (comb === '>') {
    const parent = getParentElementSafe(el);
    return parent ? matchStepsAtIndex(parent, steps, stepIdx - 1, opts) : false;
  }
  if (comb === ' ') {
    let ancestor = getParentElementSafe(el);
    while (ancestor) {
      if (matchStepsAtIndex(ancestor, steps, stepIdx - 1, opts)) return true;
      ancestor = getParentElementSafe(ancestor);
    }
    return false;
  }
  if (comb === '+') {
    const prev = getPreviousElementSiblingSafe(el);
    return prev ? matchStepsAtIndex(prev, steps, stepIdx - 1, opts) : false;
  }
  if (comb === '~') {
    let prev = getPreviousElementSiblingSafe(el);
    while (prev) {
      if (matchStepsAtIndex(prev, steps, stepIdx - 1, opts)) return true;
      prev = getPreviousElementSiblingSafe(prev);
    }
    return false;
  }
  return false;
}

function getPreviousElementSiblingSafe(el: Element): Element | null {
  const prev = (el as { previousElementSibling?: Element | null }).previousElementSibling;
  if (prev && isElementLike(prev)) return prev;
  const parent = getParentElementSafe(el);
  if (!parent) return null;
  const kids = getElementChildren(parent);
  const idx = kids.indexOf(el);
  return idx > 0 ? kids[idx - 1] : null;
}

export function matchesSingleSelector(
  el: Element,
  singleSelector: string,
  opts?: SelectorMatchOptions,
): boolean {
  const steps = tokenizeComplexSelector(singleSelector);
  if (!steps) return false;
  return matchStepsAtIndex(el, steps, steps.length - 1, opts);
}

export function matchesSelector(
  el: Element,
  selectorGroup: string,
  opts?: SelectorMatchOptions,
): boolean {
  if (!selectorGroup) return false;
  const list = splitSelectorList(selectorGroup);
  for (const single of list) {
    if (matchesSingleSelector(el, single, opts)) return true;
  }
  return false;
}

export function queryAllElements(
  root: Element | Document | DocumentFragment,
  selector: string,
): Element[] {
  if (!selector.trim()) return [];
  const matches: Element[] = [];
  const walk = (node: Node): void => {
    for (const child of getElementChildren(node)) {
      if (matchesSelector(child, selector)) {
        matches.push(child);
      }
      walk(child);
    }
  };
  walk(root);
  return matches;
}

export function queryFirstElement(
  root: Element | Document | DocumentFragment,
  selector: string,
): Element | null {
  if (!selector.trim()) return null;
  // Prefer native querySelector if available and safe, falling back on syntax errors
  if (typeof (root as { querySelector?: unknown }).querySelector === 'function') {
    try {
      const found = (root as ParentNode).querySelector(selector);
      if (found && isElementLike(found)) return found;
    } catch {
      // Fall back to built-in selector engine
    }
  }
  const walk = (node: Node): Element | null => {
    for (const child of getElementChildren(node)) {
      if (matchesSelector(child, selector)) return child;
      const inner = walk(child);
      if (inner) return inner;
    }
    return null;
  };
  return walk(root);
}

// ============================================================================
// Unified Input Normalization (Browser / LinkeDOM / Happy-DOM / Pure Node String)
// ============================================================================

export interface NormalizedDomInput {
  /** Resolved root element to distill */
  rootElement: Element;
  /** Whether the root element was a document/fragment wrapper (e.g. `<body>`) */
  isSyntheticWrapper: boolean;
  /** Raw HTML representation used for rawChars/rawTokens telemetry */
  rawHtml: string;
  /** Concatenated CSS text extracted from `<style>` elements across document/subtree */
  extractedCssText: string;
  /** Whether the pure-Node fallback HTML parser was used */
  usedFallbackParser: boolean;
  /** Diagnostics collected during input parsing / selector scoping */
  warnings: string[];
}

export interface NormalizeInputOptions {
  selector?: string;
  rootSelector?: string;
  /** Force built-in zero-dependency HTML parser even when DOMParser exists (for testing) */
  forceFallbackParser?: boolean;
}

export function normalizeDomInput(
  input: GrabInput,
  opts: NormalizeInputOptions = {},
): NormalizedDomInput {
  const warnings: string[] = [];
  let usedFallbackParser = false;
  let rawHtml = '';
  let docOrRoot: Element | Document | DocumentFragment;
  let inputWasString = false;
  let stringHadExplicitBody = false;

  if (typeof input === 'string') {
    inputWasString = true;
    rawHtml = input;
    stringHadExplicitBody = /<body[\s>]/i.test(input);

    if (!opts.forceFallbackParser && typeof DOMParser !== 'undefined') {
      try {
        const parser = new DOMParser();
        docOrRoot = parser.parseFromString(input, 'text/html');
      } catch {
        usedFallbackParser = true;
        docOrRoot = parseHtmlFallback(input) as unknown as Document;
      }
    } else {
      usedFallbackParser = true;
      docOrRoot = parseHtmlFallback(input) as unknown as Document;
    }
  } else {
    docOrRoot = input;
    rawHtml = serializeDomInputRaw(input);
  }

  // Collect all <style> text from document / ownerDocument / fragment / element BEFORE scoping
  const extractedCssText = collectStylesheetText(docOrRoot);

  // Resolve root element
  let rootElement: Element | null = null;
  let isSyntheticWrapper = false;

  if (opts.selector) {
    if (isElementLike(docOrRoot) && matchesSelector(docOrRoot, opts.selector)) {
      rootElement = docOrRoot;
    } else {
      rootElement = queryFirstElement(docOrRoot, opts.selector);
    }
    if (!rootElement) {
      warnings.push(
        `Selector "${opts.selector}" did not match any element; falling back to root.`,
      );
    }
  }

  if (!rootElement && opts.rootSelector && (isDocumentLike(docOrRoot) || inputWasString)) {
    rootElement = queryFirstElement(docOrRoot, opts.rootSelector);
  }

  if (!rootElement) {
    if (isElementLike(docOrRoot)) {
      rootElement = docOrRoot;
    } else if (isDocumentLike(docOrRoot)) {
      const body =
        (docOrRoot as { body?: Element | null }).body ??
        queryFirstElement(docOrRoot, 'body') ??
        (docOrRoot as { documentElement?: Element | null }).documentElement;

      if (body && isElementLike(body)) {
        const unwrapCandidate = pickSingleSnippetRoot(body, inputWasString && !stringHadExplicitBody);
        if (unwrapCandidate) {
          rootElement = unwrapCandidate;
        } else {
          rootElement = body;
          isSyntheticWrapper = inputWasString && !stringHadExplicitBody;
        }
      }
    } else if (isFragmentLike(docOrRoot)) {
      const kids = getElementChildren(docOrRoot).filter(
        (el) => !['script', 'style', 'noscript', 'template', 'link', 'meta'].includes(getLowerTag(el)),
      );
      if (kids.length === 1) {
        rootElement = kids[0];
      } else {
        const wrapper = new LiteElement('div');
        for (const child of getChildNodeArray(docOrRoot)) {
          wrapper.appendChild(cloneIntoLiteNode(child));
        }
        rootElement = wrapper as unknown as Element;
        isSyntheticWrapper = true;
      }
    }
  }

  if (!rootElement) {
    const empty = new LiteElement('div');
    rootElement = empty as unknown as Element;
    isSyntheticWrapper = true;
  }

  return {
    rootElement,
    isSyntheticWrapper,
    rawHtml,
    extractedCssText,
    usedFallbackParser,
    warnings,
  };
}

function pickSingleSnippetRoot(body: Element, isSnippet: boolean): Element | null {
  if (!isSnippet) return null;
  if (getClassString(body).trim() || getElementAttr(body, 'style')) return null;

  const meaningfulElements: Element[] = [];
  for (const node of getChildNodeArray(body)) {
    if (isTextLike(node) && (node.textContent ?? '').trim()) {
      // Direct non-empty text outside elements -> keep wrapper
      return null;
    }
    if (isElementLike(node)) {
      const tag = getLowerTag(node);
      if (!['script', 'style', 'noscript', 'template', 'link', 'meta'].includes(tag)) {
        meaningfulElements.push(node);
      }
    }
  }
  return meaningfulElements.length === 1 ? meaningfulElements[0] : null;
}

function collectStylesheetText(target: Element | Document | DocumentFragment): string {
  const chunks: string[] = [];
  const seen = new Set<Element>();

  const collectFrom = (root: Element | Document | DocumentFragment): void => {
    if (isElementLike(root) && getLowerTag(root) === 'style' && !seen.has(root)) {
      seen.add(root);
      const txt = root.textContent ?? '';
      if (txt.trim()) chunks.push(txt);
    }
    const styles = queryAllElements(root, 'style');
    for (const s of styles) {
      if (!seen.has(s)) {
        seen.add(s);
        const txt = s.textContent ?? '';
        if (txt.trim()) chunks.push(txt);
      }
    }
  };

  if (isElementLike(target)) {
    const ownerDoc = (target as { ownerDocument?: Document | null }).ownerDocument;
    if (ownerDoc && isDocumentLike(ownerDoc)) {
      collectFrom(ownerDoc);
    }
  }
  collectFrom(target);

  return chunks.join('\n');
}

function serializeDomInputRaw(input: Element | Document | DocumentFragment): string {
  if ('outerHTML' in input && typeof input.outerHTML === 'string') {
    return input.outerHTML;
  }
  if ('documentElement' in input && input.documentElement && typeof input.documentElement.outerHTML === 'string') {
    return input.documentElement.outerHTML;
  }
  return cloneIntoLiteNode(input as Node).textContent;
}

export function cloneIntoLiteNode(node: Node): LiteNode {
  if (node instanceof LiteElement) {
    return node.cloneLite(true);
  }
  if (node instanceof LiteNode) {
    return new LiteText(node.textContent);
  }
  if (isTextLike(node)) {
    return new LiteText(node.textContent ?? '');
  }
  if (isCommentLike(node)) {
    return new LiteComment((node as { data?: string }).data ?? '');
  }
  if (isElementLike(node)) {
    const copy = new LiteElement(getLowerTag(node));
    for (const { name, value } of getElementAttrs(node)) {
      copy.setAttribute(name, value);
    }
    for (const child of getChildNodeArray(node)) {
      copy.appendChild(cloneIntoLiteNode(child));
    }
    return copy;
  }
  const wrapper = new LiteElement('div');
  for (const child of getChildNodeArray(node)) {
    wrapper.appendChild(cloneIntoLiteNode(child));
  }
  return wrapper;
}
