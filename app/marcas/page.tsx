"use client";
import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CabecalhoPagina } from "@/components/maquina/shell";
import { usePolling } from "@/lib/api-cliente";
import { BlurFade } from "@/components/magicui/blur-fade";

type Marca = { id: string; nome: string; cores: Record<string, string>; logoUrl?: string };
const GRADE = "grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5";

export default function Marcas() {
  const { dados, erro } = usePolling<Marca[]>("/api/marcas", 10000);
  return (<>
    <CabecalhoPagina titulo="Marcas" subtitulo="A identidade que o sistema aplica em cada anúncio."
      acoes={<Link href="/marcas/nova" className={buttonVariants({ size: "lg" })}><Plus /> Nova marca</Link>} />
    {!dados ? (
      erro ? <p className="rounded-xl border border-[var(--rule)] p-6 text-[var(--ink-1)]">Não consegui carregar as marcas: <span className="font-mono text-[13px]">{erro}</span></p>
        : <div className={GRADE}>{[0, 1, 2].map((i) => <Skeleton key={i} className="h-52 rounded-xl" />)}</div>
    ) : dados.length === 0 ? (
      <div className="vidro rounded-2xl border border-dashed p-16 text-center">
        <p className="font-heading text-2xl font-semibold">Nenhuma marca cadastrada</p>
        <p className="mt-2 text-[var(--ink-1)]">Envie anúncios de uma marca e o sistema extrai cores, tipografia e estilo para você revisar.</p>
        <Link href="/marcas/nova" className={buttonVariants({ size: "lg", className: "mt-6" })}>Cadastrar a primeira marca</Link>
      </div>
    ) : (
      <div className={GRADE}>
        {dados.map((m, i) => (
          <BlurFade key={m.id} delay={Math.min(i, 12) * 0.04}><Link href={`/marcas/${m.id}`}
            className="group block rounded-2xl border vidro p-5 transition-all duration-200 ease-[var(--ease-organic)] hover:-translate-y-0.5 hover:bg-[var(--bg-2)]">
            <div className="grid h-28 place-items-center rounded-xl bg-[var(--bg-2)] transition-colors dark:bg-white/90">
              {m.logoUrl ? <img src={m.logoUrl} alt={m.nome} className="max-h-14 max-w-[70%] object-contain" /> : <span className="font-heading text-3xl font-semibold tracking-tight">{m.nome}</span>}
            </div>
            <div className="mt-5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate font-heading text-xl font-semibold">{m.nome}</div>
                <div className="font-mono text-[11px] text-[var(--ink-2)]">{m.id}</div>
              </div>
              <div className="flex -space-x-1.5">
                {Object.values(m.cores).slice(0, 5).map((c, i) => <span key={`${c}-${i}`} className="size-5 rounded-full border-2 border-[var(--bg-2)] shadow-sm ring-1 ring-[var(--rule)]" style={{ background: c }} />)}
              </div>
            </div>
          </Link></BlurFade>))}
      </div>
    )}
  </>);
}
