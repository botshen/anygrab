import { ArrowRight, Check, Copy, Sparkles, Wand2 } from 'lucide-react';
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
    <section aria-label="AI Workflows Guide" className="space-y-8 py-2">
      {/* Header Banner */}
      <div className="rounded-3xl border border-indigo-500/25 bg-gradient-to-r from-indigo-950/40 via-zinc-900/80 to-zinc-900/60 p-6 sm:p-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/15 px-3 py-1 text-xs font-bold text-indigo-300">
          <Wand2 className="h-3.5 w-3.5" />
          <span>
            {isZh
              ? '零黑话手把手实战教程 · 直接抄作业'
              : 'Hands-On AI Coding Workflows · Ready-to-Copy Prompts'}
          </span>
        </div>
        <h1 className="mt-3 text-2xl font-extrabold text-white sm:text-3xl">
          {isZh
            ? '3 种配合【反重力 Antigravity & Codex】的神仙玩法'
            : '3 Killer Workflows with Antigravity, Codex & Cursor'}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-300">
          {isZh
            ? '很多人装了插件不知道下一步该对 AI 说什么。下面为你整理好了最常用的 3 大实战场景，每张卡片都配好了「一键复制配套提问话术」，直接复制粘进反重力或 Codex 就能出活！'
            : 'Not sure what to ask your coding agent after grabbing a webpage? Pick any of the 3 battle-tested workflows below — each comes with a 1-click ready-to-paste prompt for Antigravity, Codex, or Cursor.'}
        </p>
      </div>

      {/* 3 Workflow Cards */}
      <div className="space-y-6">
        {cards.map((card, index) => {
          const isCopied = copiedId === card.id;
          return (
            <article
              key={card.id}
              data-workflow-id={card.id}
              className="rounded-2xl border border-white/[0.08] bg-zinc-900/65 p-6 shadow-lg transition hover:border-indigo-500/35 sm:p-7"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-950/60 px-3 py-1 text-xs font-bold text-indigo-300">
                  {card.badge}
                </span>
                <span className="font-mono text-xs text-zinc-500">
                  STEP-BY-STEP #{index + 1}
                </span>
              </div>

              <h2 className="mt-3 text-lg font-extrabold text-white sm:text-xl">
                {card.title}
              </h2>
              <p className="mt-1.5 text-xs leading-relaxed text-zinc-400 sm:text-sm">
                {card.scenario}
              </p>

              {/* Step-by-Step Numbered Boxes */}
              <ol className="mt-5 grid gap-3 md:grid-cols-3">
                {card.steps.map((stepText, stepIdx) => (
                  <li
                    key={stepIdx}
                    className="rounded-xl border border-white/[0.06] bg-zinc-950/80 p-4 text-xs leading-relaxed text-zinc-200"
                  >
                    <div className="mb-2 inline-flex h-6 w-6 items-center justify-center rounded-md bg-indigo-600/30 font-mono text-xs font-bold text-indigo-300 border border-indigo-500/30">
                      {stepIdx + 1}
                    </div>
                    <p>{stepText}</p>
                  </li>
                ))}
              </ol>

              {/* Ready-to-Copy Prompt Box */}
              <div className="mt-5 rounded-xl border border-emerald-500/25 bg-[#070b0e] p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>{card.promptLabel}</span>
                  </span>

                  <button
                    type="button"
                    data-action="copy-workflow-prompt"
                    onClick={() => handleCopyPrompt(card.id, card.promptToCopy)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-500"
                  >
                    {isCopied ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>
                          {isZh
                            ? '已复制话术！快去反重力 / Codex 粘贴'
                            : 'Prompt Copied!'}
                        </span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>
                          {isZh ? '一键复制配套提问话术' : 'Copy Companion Prompt'}
                        </span>
                      </>
                    )}
                  </button>
                </div>

                <p className="rounded-lg border border-white/[0.06] bg-zinc-950/90 p-3 font-mono text-xs leading-relaxed text-zinc-200">
                  {card.promptToCopy}
                </p>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => onNavigate(card.targetTab)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-300 transition hover:text-indigo-200"
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
