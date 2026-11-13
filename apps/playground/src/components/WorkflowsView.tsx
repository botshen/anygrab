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
      className="mx-auto max-w-[1160px] min-w-0 space-y-6 pt-4"
    >
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="font-mono text-[11px] font-semibold tracking-wider text-[var(--ag-accent)] uppercase">
            04 · AGENT RECIPES
          </div>
          <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-[#F4F5F8] sm:text-3xl">
            {isZh ? '三套 AI 零废话配方' : '3 Zero-Fluff Agent Recipes'}
          </h2>
        </div>

        <span className="font-mono text-xs text-[#7C8292]">
          Antigravity · Codex · Cursor · Claude Code
        </span>
      </div>

      {/* Open Canvas Editorial 3-Column Strip (Breaks outer card-box repetition) */}
      <div className="grid divide-y divide-white/8 border-b border-white/8 lg:grid-cols-3 lg:divide-x lg:divide-y-0">
        {cards.map((card) => {
          const isCopied = copiedId === card.id;
          return (
            <article
              key={card.id}
              data-workflow-id={card.id}
              className="flex flex-col justify-between gap-4 py-6 lg:px-6 lg:first:pl-0 lg:last:pr-0"
            >
              <div>
                <span className="font-mono text-[11px] font-bold text-[var(--ag-accent)]">
                  {card.badge}
                </span>

                <h3 className="mt-2 text-lg font-extrabold tracking-tight text-[#F4F5F8]">
                  {card.title}
                </h3>

                {/* Compact Flow Strip */}
                <div className="mt-3 flex flex-wrap items-center gap-1.5 font-mono text-[11px] text-[#A1A7B5]">
                  {card.flowNodes.map((node, i) => (
                    <span key={node} className="inline-flex items-center gap-1.5">
                      <span className="text-[#F4F5F8]">{node}</span>
                      {i < 2 && <span className="text-[#7C8292]">→</span>}
                    </span>
                  ))}
                </div>

                {/* Crisp 1-Line Copyable Command Strip */}
                <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-[#101217]">
                  <div className="flex items-center justify-between border-b border-white/8 px-3 py-2">
                    <span className="font-mono text-[11px] text-[#7C8292]">
                      {card.promptLabel}
                    </span>
                    <button
                      type="button"
                      data-action="copy-workflow-prompt"
                      onClick={() => handleCopyPrompt(card.id, card.promptToCopy)}
                      className="inline-flex items-center gap-1 rounded-md bg-[#FF4D1C] px-2.5 py-1 text-[11px] font-semibold text-white transition hover:brightness-110"
                    >
                      {isCopied ? (
                        <>
                          <Check className="h-3 w-3" />
                          <span>{isZh ? '已复制' : 'Copied'}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>{isZh ? '复制' : 'Copy'}</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="p-3 font-mono text-[11.5px] leading-[1.6] text-[#D8DCE6]">
                    {card.promptToCopy}
                  </p>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => onNavigate(card.targetTab)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#A1A7B5] transition hover:text-[#F4F5F8]"
                >
                  <span>{card.actionLabel}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
