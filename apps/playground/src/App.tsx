import { grab, VERSION } from '@anygrab/core';
import { Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';

const SAMPLE_HTML = `<article class="card"><header><h2>AnyGrab Demo</h2></header><p>Token-budget-aware DOM distillation.</p></article>`;

export function App() {
  const [rawHtml, setRawHtml] = useState(SAMPLE_HTML);
  const result = useMemo(() => grab(rawHtml, { format: 'prompt', maxTokens: 1200 }), [rawHtml]);

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      <header className="flex items-center gap-2 border-b border-slate-800 pb-4">
        <Sparkles className="h-5 w-5 text-emerald-400" />
        <h1 className="text-xl font-semibold">AnyGrab v{VERSION} Playground</h1>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        <textarea
          className="h-64 rounded-lg border border-slate-800 bg-slate-900 p-3 font-mono text-sm"
          value={rawHtml}
          onChange={(e) => setRawHtml(e.target.value)}
        />
        <pre className="h-64 overflow-auto rounded-lg border border-slate-800 bg-slate-900 p-3 font-mono text-sm">
          {result.output}
        </pre>
      </div>
    </main>
  );
}
