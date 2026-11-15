import { ArrowRight, Check, Copy } from 'lucide-react';
import { useState } from 'react';
import type { ActiveTab } from '../data/types';
import { getWorkflowsCopy, type SiteLocale } from '../i18n';

interface WorkflowsViewProps {
  locale: SiteLocale;
  onNavigate: (tab: ActiveTab) => void;
}

export function WorkflowsView({ locale, onNavigate }: WorkflowsViewProps) {
  const isZh = locale === 'zh-CN';
  const cards = getWorkflowsCopy(locale);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyPrompt = (id: string, text: string) => {
    try {
      void navigator.clipboard?.writeText(text)?.catch(() => {});
    } catch {
      // Ignore in test environments
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1800);
  };

  return (
    <section
      id="workflows"
      aria-label="AI Workflows Guide"
      className="bg-[var(--ag-bg-alt)] py-14 sm:py-20"
    >
      <div className="ag-wrap space-y-8">
        <h2 className="text-[clamp(1.75rem,2.4vw,2.65rem)] leading-[1.12] font-medium tracking-[-0.032em] text-[var(--ag-ink)]">
          {isZh ? '三套 AI 零废话配方。' : 'Three agent workflows.'}{' '}
          <span className="text-[var(--ag-muted)]">
            {isZh
              ? '复制一句指令，直接喂给编码代理。'
              : 'One prompt for Antigravity, Codex, or Cursor.'}
          </span>
        </h2>

        <div className="grid gap-5 lg:grid-cols-3">
          {cards.map((card) => {
            const isCopied = copiedId === card.id;
            return (
              <article
                key={card.id}
                data-workflow-id={card.id}
                className="ag-card-lift flex flex-col justify-between gap-5 rounded-[16px] border border-[var(--ag-line)] bg-[var(--ag-panel)] p-6"
              >
                <div>
                  <h3 className="text-[20px] font-medium tracking-[-0.02em] text-[var(--ag-ink)]">
                    {card.title}
                  </h3>

                  <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[13px] text-[var(--ag-muted)]">
                    {card.flowNodes.map((node, i) => (
                      <span key={node} className="inline-flex items-center gap-1.5">
                        <span className="text-[var(--ag-ink-secondary)]">{node}</span>
                        {i < 2 && <span aria-hidden="true">→</span>}
                      </span>
                    ))}
                  </div>

                  <p className="mt-4 rounded-xl border border-[var(--ag-line)] bg-[var(--ag-code-bg)] p-3.5 font-mono text-[13px] leading-[1.6] text-[var(--ag-code-ink)]">
                    {card.promptToCopy}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <button
                    type="button"
                    data-action="copy-workflow-prompt"
                    onClick={() => handleCopyPrompt(card.id, card.promptToCopy)}
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-full bg-[var(--ag-accent)] px-4 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
                  >
                    {isCopied ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>{isZh ? '已复制' : 'Copied'}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>{isZh ? '复制指令' : 'Copy prompt'}</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => onNavigate(card.targetTab)}
                    className="ag-link inline-flex items-center gap-1 text-[14px] font-medium text-[var(--ag-ink)]"
                  >
                    <span>{card.actionLabel}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
