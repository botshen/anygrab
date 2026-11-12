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
    <section aria-label="AI Workflows Guide" className="space-y-10">
      {/* Clean Editorial Header */}
      <div className="space-y-2 border-b border-[var(--ag-border)] pb-6">
        <div className="font-mono text-[11px] font-semibold tracking-wider text-[var(--ag-accent)] uppercase">
          PRACTICAL AI WORKFLOWS
        </div>
        <h1 className="text-2xl leading-[1.3] font-extrabold tracking-[-0.02em] text-[#141413] sm:text-3xl">
          {isZh
            ? '3 种配合【反重力 Antigravity & Codex】的神仙玩法'
            : '3 Practical Workflows with Antigravity, Codex & Cursor'}
        </h1>
        <p className="max-w-3xl text-sm leading-[1.7] text-[var(--ag-text-secondary)]">
          {isZh
            ? '不知道抓完网页之后该对 AI 说什么？下面整理好了最常用的 3 种真实开发场景，每个场景都配有一键复制的提问话术，直接粘贴进反重力或 Codex 即可开工。'
            : 'Not sure what to ask your coding agent after grabbing a webpage? Pick any of the 3 workflows below — each comes with a ready-to-paste companion prompt for Antigravity, Codex, or Cursor.'}
        </p>
      </div>

      {/* 3 Editorial Workflow Sheets */}
      <div className="space-y-6">
        {cards.map((card, index) => {
          const isCopied = copiedId === card.id;
          return (
            <article
              key={card.id}
              data-workflow-id={card.id}
              className="rounded-[12px] border border-[var(--ag-border)] bg-white p-6 sm:p-7"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-xs font-bold text-[var(--ag-accent)]">
                  {card.badge}
                </span>
                <span className="ag-tabular font-mono text-xs text-[var(--ag-text-muted)]">
                  0{index + 1} / 03
                </span>
              </div>

              <h2 className="mt-2 text-lg leading-[1.38] font-extrabold text-[#141413] sm:text-xl">
                {card.title}
              </h2>
              <p className="mt-1.5 text-[13.5px] leading-[1.68] text-[var(--ag-text-secondary)]">
                {card.scenario}
              </p>

              {/* 3-Step Columns */}
              <ol className="mt-5 grid gap-4 md:grid-cols-3">
                {card.steps.map((stepText, stepIdx) => (
                  <li
                    key={stepIdx}
                    className="rounded-[8px] border border-[var(--ag-border)] bg-[#FAF9F5] p-4 text-[13px] leading-[1.65] text-[#141413]"
                  >
                    <div className="ag-tabular mb-1.5 font-mono text-[11px] font-bold text-[var(--ag-text-muted)]">
                      STEP 0{stepIdx + 1}
                    </div>
                    <p>{stepText}</p>
                  </li>
                ))}
              </ol>

              {/* Carbon Terminal Box for Companion Prompt */}
              <div className="mt-5 overflow-hidden rounded-[8px] bg-[var(--ag-bg-stage)] text-[#EEEDE8]">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-[var(--ag-bg-stage-elevated)] px-4 py-2.5">
                  <span className="text-xs font-medium text-[#C9C6BA]">{card.promptLabel}</span>

                  <button
                    type="button"
                    data-action="copy-workflow-prompt"
                    onClick={() => handleCopyPrompt(card.id, card.promptToCopy)}
                    className="inline-flex items-center gap-1.5 rounded-[5px] bg-[var(--ag-accent)] px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
                  >
                    {isCopied ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>
                          {isZh ? '已复制话术！快去反重力 / Codex 粘贴' : 'Prompt Copied!'}
                        </span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>{isZh ? '一键复制提问话术' : 'Copy Companion Prompt'}</span>
                      </>
                    )}
                  </button>
                </div>

                <p className="p-4 font-mono text-xs leading-[1.7] text-[#EEEDE8]">
                  {card.promptToCopy}
                </p>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => onNavigate(card.targetTab)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#141413] transition hover:text-[var(--ag-accent)]"
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
