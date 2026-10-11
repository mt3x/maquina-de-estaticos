"use client";
import { Checkbox } from "@/components/ui/checkbox";
import { MODELOS, ORDEM_MODELOS, type ModeloId } from "@/lib/tipos";
export function SeletorModelos({ valor, onChange, numAnuncios }: { valor: ModeloId[]; onChange: (v: ModeloId[]) => void; numAnuncios: number }) {
  const artes = numAnuncios * 2 * valor.length; const min = Math.round(artes * 1.5);
  function alternar(m: ModeloId) {
    const novo = valor.includes(m) ? valor.filter((x) => x !== m) : [...valor, m];
    if (novo.length) onChange(ORDEM_MODELOS.filter((x) => novo.includes(x)));
  }
  return (
    <section className="rounded-2xl border vidro p-5">
      <h2 className="mb-3 font-heading text-xl font-semibold">Modelos</h2>
      <div className="flex flex-wrap gap-3">
        {ORDEM_MODELOS.map((m) => (
          <label key={m} htmlFor={`modelo-${m}`} className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-[var(--rule)] px-3.5 py-2.5 text-[14px] transition-colors duration-200 hover:bg-[var(--bg-2)] has-[[data-checked]]:border-foreground">
            <Checkbox id={`modelo-${m}`} checked={valor.includes(m)} onCheckedChange={() => alternar(m)} />{MODELOS[m]}
          </label>))}
      </div>
      <p className="mt-3 font-mono text-[12px] text-[var(--ink-2)]">{artes} artes · ~{min} min de fila · 0 crédito no Flow (ULTRA)</p>
    </section>
  );
}
