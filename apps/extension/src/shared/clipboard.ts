/**
 * Writes `text` to the system clipboard with dual-layer resilience:
 * 1. Modern async `navigator.clipboard.writeText(text)`
 * 2. Fallback off-screen `<textarea>` + `document.execCommand('copy')`
 */
export async function copyTextToClipboard(
  text: string,
  doc: Document = document,
): Promise<boolean> {
  const nav = doc.defaultView?.navigator ?? globalThis.navigator;
  if (nav?.clipboard && typeof nav.clipboard.writeText === 'function') {
    try {
      await nav.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to execCommand fallback
    }
  }

  return copyViaExecCommandFallback(text, doc);
}

export function copyViaExecCommandFallback(text: string, doc: Document = document): boolean {
  const container = doc.body ?? doc.documentElement;
  if (!container) {
    return false;
  }

  const previousActive = doc.activeElement as HTMLElement | null;
  const textarea = doc.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.setAttribute('aria-hidden', 'true');
  textarea.setAttribute('data-anygrab-clipboard-fallback', 'true');
  textarea.style.cssText =
    'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;z-index:-1;';

  container.appendChild(textarea);
  let copied = false;
  try {
    textarea.focus({ preventScroll: true });
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    if (typeof doc.execCommand === 'function') {
      copied = Boolean(doc.execCommand('copy'));
    }
  } catch {
    copied = false;
  } finally {
    textarea.remove();
    if (previousActive && typeof previousActive.focus === 'function') {
      try {
        previousActive.focus({ preventScroll: true });
      } catch {
        // Ignore focus restoration errors
      }
    }
  }

  return copied;
}
