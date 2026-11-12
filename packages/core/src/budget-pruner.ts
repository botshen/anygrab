import type { DistilledElement, DistilledNode } from './cleaner';
import { countElementsInDistilled, makeOmittedComment } from './formatters';

export interface BudgetPruneResult {
  prunedElementsCount: number;
  didFold: boolean;
  compactPromptMeta: boolean;
}

const HIGH_VALUE_PRICE_OR_METRIC_RE =
  /(?:[$€£¥]\s?\d|\b\d+(?:\.\d+)?%|\b(?:free|pro|enterprise|team|starter|popular)\b)/i;

/**
 * Computes semantic saliency of an AST subtree so critical UI/data primitives
 * (headings, interactive controls, prices/KPIs, table headers, code blocks) survive
 * token budget folding while peripheral chrome & repetitive siblings fold first.
 */
export function computeSubtreeSaliency(node: DistilledNode): number {
  if (node.kind === 'comment') return 5;
  if (node.kind === 'text') {
    const t = node.text.trim();
    if (!t) return 0;
    if (HIGH_VALUE_PRICE_OR_METRIC_RE.test(t)) return 75;
    return Math.min(25, Math.ceil(t.length / 16));
  }

  const tag = node.tag;
  const role = (node.attrs['role'] ?? '').toLowerCase();

  // Negative/low base saliency for peripheral layout chrome
  if (tag === 'footer' || role === 'contentinfo') return -40;
  if (tag === 'aside' || role === 'complementary') return -30;
  if (tag === 'nav' || role === 'navigation') return -20;

  let score = 10;
  if (tag === 'h1') score += 110;
  else if (tag === 'h2') score += 90;
  else if (tag === 'h3') score += 75;
  else if (tag === 'h4' || tag === 'h5' || tag === 'h6') score += 55;
  else if (
    tag === 'button' ||
    tag === 'input' ||
    tag === 'select' ||
    tag === 'textarea' ||
    role === 'button' ||
    role === 'tab' ||
    role === 'switch'
  ) {
    score += 85;
  } else if (tag === 'thead' || tag === 'th') {
    score += 95;
  } else if (tag === 'pre' || tag === 'code') {
    score += 70;
  } else if (tag === 'table' || tag === 'form' || tag === 'main' || tag === 'article') {
    score += 55;
  } else if (tag === 'label' || tag === 'caption') {
    score += 50;
  } else if (tag === 'a' && node.classes.some((c) => /^bg-|rounded|px-/.test(c))) {
    // CTA button-styled link
    score += 75;
  }

  let bestChild = 0;
  let sumChildren = 0;
  for (const child of node.children) {
    const cs = computeSubtreeSaliency(child);
    if (cs > bestChild) bestChild = cs;
    if (cs > 0) sumChildren += Math.min(cs, 35);
  }

  return score + Math.max(bestChild * 0.65, Math.min(90, sumChildren * 0.35));
}

function getHomologySignature(el: DistilledElement): string {
  if (el.tag === 'li' || el.tag === 'tr' || el.tag === 'option') {
    return el.tag;
  }
  const childTags = el.children
    .filter((c): c is DistilledElement => c.kind === 'element')
    .slice(0, 4)
    .map((c) => c.tag)
    .join(',');

  // Group repeated cards/rows sharing tag + child tag skeleton (or primary layout class)
  if (childTags) {
    return `${el.tag}:${childTags}`;
  }
  const layoutKey = el.classes.slice(0, 2).join('.');
  return `${el.tag}#${layoutKey}`;
}

function estimateSubtreeWeight(node: DistilledNode): number {
  if (node.kind === 'comment') return 8;
  if (node.kind === 'text') return Math.max(1, Math.ceil(node.text.length / 4));
  let weight = 4 + node.classes.length * 2 + Object.keys(node.attrs).length * 3;
  for (const child of node.children) {
    weight += estimateSubtreeWeight(child);
  }
  return weight;
}

function isProtectedNode(el: DistilledElement): boolean {
  if (el.tag === 'thead' || el.tag === 'th' || el.tag === 'h1') return true;
  if (
    el.children.some(
      (c) => c.kind === 'element' && (c.tag === 'h1' || c.tag === 'thead'),
    )
  ) {
    return true;
  }
  return false;
}

/**
 * Losslessly folds `root` AST in-place to fit within `maxTokens` without EVER slicing raw
 * output strings or breaking closing HTML/JSX/Markdown tags.
 */
export function applyTokenBudgetPruning(
  root: DistilledElement,
  maxTokens: number,
  measureTokens: (compactPromptMeta: boolean) => number,
): BudgetPruneResult {
  let prunedElementsCount = 0;
  let didFold = false;
  let compactPromptMeta = false;

  if (measureTokens(false) <= maxTokens) {
    return { prunedElementsCount: 0, didFold: false, compactPromptMeta: false };
  }

  // Stage 1: Prune peripheral low-saliency chrome (`footer`, `aside`, secondary `nav`)
  const prunePeripheral = (parent: DistilledElement): boolean => {
    for (let i = parent.children.length - 1; i >= 0; i--) {
      const child = parent.children[i];
      if (child.kind !== 'element') continue;
      const role = (child.attrs['role'] ?? '').toLowerCase();
      const isPeripheral =
        child.tag === 'footer' ||
        child.tag === 'aside' ||
        child.tag === 'nav' ||
        role === 'contentinfo' ||
        role === 'complementary' ||
        role === 'navigation';

      if (isPeripheral && parent.children.length > 1) {
        prunedElementsCount += countElementsInDistilled(child);
        parent.children.splice(i, 1);
        didFold = true;
        if (measureTokens(false) <= maxTokens) return true;
      } else if (prunePeripheral(child)) {
        return true;
      }
    }
    return false;
  };

  if (prunePeripheral(root)) {
    return { prunedElementsCount, didFold, compactPromptMeta };
  }

  // Stage 2: Fold homologous sibling sequences (>3 similar siblings -> keep first K + comment)
  // Pass 2a: keep first 3 items (triggers on >3 siblings as specified in contract)
  // Pass 2b: if still over budget, tighten to keep first 2, then 1 representative item
  for (const keepLimit of [3, 2, 1]) {
    if (foldIsomorphicSiblingsPass(root, keepLimit)) {
      didFold = true;
      if (measureTokens(false) <= maxTokens) {
        return { prunedElementsCount, didFold, compactPromptMeta };
      }
    }
  }

  function foldIsomorphicSiblingsPass(parent: DistilledElement, keepLimit: number): boolean {
    let changed = false;

    // Recurse into children first so inner lists/rows fold cleanly before outer grids
    for (const child of parent.children) {
      if (child.kind === 'element') {
        if (foldIsomorphicSiblingsPass(child, keepLimit)) {
          changed = true;
          if (measureTokens(false) <= maxTokens) return true;
        }
      }
    }

    if (parent.tag === 'thead' || parent.tag === 'tr') return changed;

    // Identify runs of homologous element siblings
    let idx = 0;
    while (idx < parent.children.length) {
      const first = parent.children[idx];
      if (first.kind !== 'element') {
        idx++;
        continue;
      }
      const sig = getHomologySignature(first);
      let runEnd = idx + 1;
      while (runEnd < parent.children.length) {
        const next = parent.children[runEnd];
        if (next.kind === 'element' && getHomologySignature(next) === sig) {
          runEnd++;
        } else {
          break;
        }
      }

      const runLength = runEnd - idx;
      const threshold = Math.max(keepLimit + 1, keepLimit === 3 ? 4 : keepLimit + 1);
      if (runLength >= threshold) {
        const toOmit = parent.children.slice(idx + keepLimit, runEnd);
        let omittedItemCount = toOmit.length;
        for (const removed of toOmit) {
          prunedElementsCount += countElementsInDistilled(removed);
        }

        // Merge with an immediately following omitted comment if an earlier pass already folded tail items
        const afterRun = parent.children[runEnd];
        let extraDelete = 0;
        if (afterRun && afterRun.kind === 'comment') {
          const prevMatch = /^\+(\d+)\s+similar items/.exec(afterRun.text.trim());
          if (prevMatch) {
            omittedItemCount += Number.parseInt(prevMatch[1], 10);
            extraDelete = 1;
          }
        }

        parent.children.splice(
          idx + keepLimit,
          toOmit.length + extraDelete,
          makeOmittedComment(omittedItemCount, 'similar items'),
        );
        changed = true;
        didFold = true;
        if (measureTokens(false) <= maxTokens) return true;
        idx += keepLimit + 1;
      } else {
        idx = runEnd;
      }
    }

    return changed;
  }

  // Enable compact prompt metadata if budget is tight
  compactPromptMeta = true;
  if (measureTokens(true) <= maxTokens) {
    return { prunedElementsCount, didFold: true, compactPromptMeta };
  }

  // Stage 3: Saliency-ranked subtree pruning (lowest saliency/cost ratio pruned first)
  interface PruneCandidate {
    parent: DistilledElement;
    node: DistilledElement;
    ratio: number;
  }

  for (let guard = 0; guard < 120; guard++) {
    if (measureTokens(true) <= maxTokens) break;

    const candidates: PruneCandidate[] = [];
    const collectCandidates = (parent: DistilledElement): void => {
      if (parent.tag === 'thead' || parent.tag === 'tr') return;
      const elemKids = parent.children.filter(
        (c): c is DistilledElement => c.kind === 'element',
      );
      for (const child of elemKids) {
        if (!isProtectedNode(child) && elemKids.length > 1) {
          const sal = computeSubtreeSaliency(child);
          const weight = Math.max(4, estimateSubtreeWeight(child));
          candidates.push({
            parent,
            node: child,
            ratio: sal / weight,
          });
        }
        collectCandidates(child);
      }
    };

    collectCandidates(root);
    if (candidates.length === 0) break;

    candidates.sort((a, b) => a.ratio - b.ratio);
    const victim = candidates[0];
    const pos = victim.parent.children.indexOf(victim.node);
    if (pos >= 0) {
      prunedElementsCount += countElementsInDistilled(victim.node);
      // Merge or insert compact budget comment
      const prev = victim.parent.children[pos - 1];
      const next = victim.parent.children[pos + 1];
      if (prev && prev.kind === 'comment' && prev.text.includes('omitted to fit token budget')) {
        const m = /^\+(\d+)\s+(.*)$/.exec(prev.text.trim());
        if (m) prev.text = `+${Number.parseInt(m[1], 10) + 1} ${m[2]}`;
        victim.parent.children.splice(pos, 1);
      } else if (next && next.kind === 'comment' && next.text.includes('omitted to fit token budget')) {
        const m = /^\+(\d+)\s+(.*)$/.exec(next.text.trim());
        if (m) next.text = `+${Number.parseInt(m[1], 10) + 1} ${m[2]}`;
        victim.parent.children.splice(pos, 1);
      } else {
        victim.parent.children.splice(pos, 1, makeOmittedComment(1, 'similar items'));
      }
      didFold = true;
    } else {
      break;
    }
  }

  if (measureTokens(true) <= maxTokens) {
    return { prunedElementsCount, didFold, compactPromptMeta };
  }

  // Stage 4: Lossless AST text & code block compaction (keeps 100% valid closed tags!)
  const trimVerboseTextNodes = (node: DistilledElement, charCap: number): void => {
    for (const child of node.children) {
      if (child.kind === 'text' && child.text.length > charCap) {
        if (node.tag === 'code' || node.tag === 'pre') {
          const lines = child.text.split('\n');
          if (lines.length > 4) {
            child.text = `${lines.slice(0, 3).join('\n')}\n// ... (+${lines.length - 3} lines omitted)`;
          } else {
            child.text = `${child.text.slice(0, charCap)}…`;
          }
        } else {
          const cut = child.text.slice(0, charCap).replace(/\s+\S*$/, '');
          child.text = `${cut || child.text.slice(0, charCap)}…`;
        }
        didFold = true;
      } else if (child.kind === 'element') {
        trimVerboseTextNodes(child, charCap);
      }
    }
  };

  for (const cap of [140, 72, 32]) {
    trimVerboseTextNodes(root, cap);
    if (measureTokens(true) <= maxTokens) {
      return { prunedElementsCount, didFold, compactPromptMeta };
    }
  }

  // Final safety valve for ultra-small budgets (e.g. maxTokens < 60): collapse non-essential classes & deep children
  const stripSecondaryClasses = (node: DistilledElement): void => {
    if (node.classes.length > 3) {
      node.classes = node.classes.slice(0, 3);
      didFold = true;
    }
    for (const child of node.children) {
      if (child.kind === 'element') stripSecondaryClasses(child);
    }
  };
  stripSecondaryClasses(root);

  while (measureTokens(true) > maxTokens && root.children.length > 1) {
    const popped = root.children.pop()!;
    prunedElementsCount += countElementsInDistilled(popped);
    didFold = true;
  }

  return { prunedElementsCount, didFold, compactPromptMeta };
}
