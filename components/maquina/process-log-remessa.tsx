"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
export function ProcessLogRemessa({ log }: { log: { ts: string; etapa: string; msg: string; ms?: number }[] }) {
  const [aberto, setAberto] = useState(false);
  const itens = aberto ? log.slice(-60).reverse() : log.slice(-3).reverse();
  return (
    <div className="rounded-2xl border vidro">
      <button aria-expanded={aberto} onClick={() => setAberto(!aberto)} className="flex w-full items-center justify-between px-4 py-3 text-[13px] text-[var(--ink-1)]">
        <span>Registro do processo</span><ChevronDown className={`size-4 transition-transform duration-200 ${aberto ? "rotate-180" : ""}`} /></button>
      <ol className="space-y-1 px-4 pb-4 font-mono text-[12px] text-[var(--ink-1)]">
        {itens.map((l, i) => <li key={i} className="flex gap-3"><span className="text-[var(--ink-2)]">{new Date(l.ts).toLocaleTimeString("pt-BR")}</span>
          <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{l.msg}</span>{l.ms !== undefined && <span className="text-[var(--ink-2)]">{(l.ms / 1000).toFixed(1)}s</span>}</li>)}
        {itens.length === 0 && <li className="text-[var(--ink-2)]">Nada registrado ainda.</li>}
      </ol>
    </div>
  );
}
