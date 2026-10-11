"use client";
import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CabecalhoPagina } from "@/components/maquina/shell";
import { CartaoRemessa, type ResumoRemessa } from "@/components/maquina/cartao-remessa";
import { usePolling } from "@/lib/api-cliente";
import { BlurFade } from "@/components/magicui/blur-fade";

const GRADE = "grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-5";

export default function Remessas() {
  const { dados, erro } = usePolling<ResumoRemessa[]>("/api/remessas", 4000);
  return (
    <>
      <CabecalhoPagina titulo="Remessas" subtitulo="Cada remessa vira anúncios prontos em 9:16 e 1:1."
        acoes={<Link href="/nova" className={buttonVariants({ size: "lg" })}><Plus /> Nova remessa</Link>} />
      {!dados ? (
        erro ? <p className="vidro rounded-2xl border p-6 text-[var(--ink-1)]">Não consegui carregar as remessas: <span className="font-mono text-[13px]">{erro}</span></p>
          : <div className={GRADE}>{[0, 1, 2].map((i) => <Skeleton key={i} className="aspect-[4/5] rounded-2xl" />)}</div>
      ) : dados.length === 0 ? (
        <div className="vidro rounded-2xl border border-dashed p-16 text-center">
          <p className="font-heading text-2xl font-semibold">Nenhuma remessa ainda</p>
          <p className="mt-2 text-[var(--ink-1)]">Arraste a pasta com o .docx, as referências e o material de apoio.</p>
          <Link href="/nova" className={buttonVariants({ size: "lg", className: "mt-6" })}>Enviar a primeira remessa</Link>
        </div>
      ) : <div className={GRADE}>{dados.map((r, i) => <BlurFade key={r.id} delay={Math.min(i, 12) * 0.04}><CartaoRemessa r={r} /></BlurFade>)}</div>}
    </>
  );
}
