"use client";
import { useState } from "react";
import { toast } from "sonner";
import { MODELOS, type Formato, type ModeloId } from "@/lib/tipos";
import type { RemessaView } from "@/lib/apresentar";
import { postAcao } from "@/lib/api-cliente";
import { Miniatura } from "./miniatura";
import { cn } from "@/lib/utils";
export const chaveArte = (anuncio: string, modelo: ModeloId, formato: Formato) => `${anuncio}|${modelo}|${formato}`;
export function GradeArtes({ remessa, onAbrir }: { remessa: RemessaView; onAbrir: (chave: string) => void }) {
  const [modo, setModo] = useState<"anuncio" | "todas">("anuncio");
  const pref = (anuncio: string, formato: Formato, modelo: ModeloId) => postAcao(remessa.id, { tipo: "preferida", anuncio, formato, modelo }).catch((e) => toast.error(e.message));
  const deNovo = (anuncio: string, formato: Formato, modelo: ModeloId) => postAcao(remessa.id, { tipo: "tentar_de_novo", anuncio, formato, modelo })
    .then(() => toast.success("Na fila de novo — a arte será gerada outra vez"), (e) => toast.error(e.message));
  const Botao = ({ v, r }: { v: typeof modo; r: string }) => <button aria-pressed={modo === v} onClick={() => setModo(v)} className={cn("rounded-full px-3.5 py-1 text-[13px] transition-all duration-200", modo === v ? "bg-[var(--bg-2)] font-medium text-foreground shadow-[0_1px_4px_rgba(0,0,0,0.1)]" : "text-[var(--ink-1)] hover:text-foreground")}>{r}</button>;
  return (
    <div className="space-y-8">
      <div className="flex justify-end"><div className="vidro flex gap-0.5 rounded-full border p-1"><Botao v="anuncio" r="Por anúncio" /><Botao v="todas" r="Todas as miniaturas" /></div></div>
      {modo === "todas" ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] items-start gap-4">
          {remessa.anuncios.flatMap((an) => an.artes.map((a) => (
            <Miniatura key={chaveArte(an.id, a.modelo, a.formato)} arte={a} preferida={an.preferida?.[a.formato] === a.modelo}
              onAbrir={() => onAbrir(chaveArte(an.id, a.modelo, a.formato))} onPreferida={() => pref(an.id, a.formato, a.modelo)} onTentarDeNovo={() => deNovo(an.id, a.formato, a.modelo)} />)))}
        </div>
      ) : remessa.anuncios.map((an) => (
        <section key={an.id} className="rounded-2xl border vidro p-5">
          <header className="mb-4 flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1"><h2 className="font-heading text-2xl font-semibold">{remessa.id} · {an.id}</h2>
            <p className="line-clamp-1 min-w-0 [overflow-wrap:anywhere] text-[14px] text-[var(--ink-1)]">{an.copy.split("\n")[0]}</p></header>
          <div className="flex items-start gap-4 overflow-x-auto pb-1">
            <figure className="w-[120px] shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={an.refUrl} alt="referência" className="w-full rounded-[10px] border border-[var(--rule)] opacity-80" />
              <figcaption className="mt-1 font-mono text-[10px] text-[var(--ink-2)]">referência</figcaption></figure>
            {an.artes.map((a) => (
              <figure key={chaveArte(an.id, a.modelo, a.formato)} className={a.formato === "STORY" ? "w-[180px] shrink-0" : "w-[260px] shrink-0"}>
                <Miniatura arte={a} preferida={an.preferida?.[a.formato] === a.modelo} onAbrir={() => onAbrir(chaveArte(an.id, a.modelo, a.formato))} onPreferida={() => pref(an.id, a.formato, a.modelo)} onTentarDeNovo={() => deNovo(an.id, a.formato, a.modelo)} />
                <figcaption className="mt-1.5 flex justify-between font-mono text-[10px] text-[var(--ink-2)]"><span>{MODELOS[a.modelo]}</span><span>{a.formato}</span></figcaption>
              </figure>))}
          </div>
        </section>))}
    </div>
  );
}
