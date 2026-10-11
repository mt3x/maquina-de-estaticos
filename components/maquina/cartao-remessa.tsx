import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import { MagicCard } from "@/components/magicui/magic-card";
import { BorderBeam } from "@/components/magicui/border-beam";
import { NumberTicker } from "@/components/magicui/number-ticker";
import { EtapaBadge, ETAPAS_ATIVAS } from "./etapa-badge";

export type ResumoRemessa = { id: string; marca: string; etapa: string; criadaEm: string; progresso: { prontas: number; total: number }; capaUrl?: string; erro?: string };

export function CartaoRemessa({ r }: { r: ResumoRemessa }) {
  const pct = r.progresso.total ? Math.round((r.progresso.prontas / r.progresso.total) * 100) : 0;
  const ativa = ETAPAS_ATIVAS.includes(r.etapa);
  return (
    <Link href={`/remessas/${r.id}`} className="vidro group relative block overflow-hidden rounded-2xl border outline-none transition-all duration-300 ease-[var(--ease-organic)] hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(0,0,0,0.08)] focus-visible:ring-3 focus-visible:ring-ring/50">
      <MagicCard gradientColor="var(--spot)" gradientSize={260} gradientOpacity={1} className="rounded-2xl">
        <div className="p-2 pb-0">
          <div className="aspect-[4/3] overflow-hidden rounded-[12px] bg-[var(--bg-2)]">
            {r.capaUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={r.capaUrl} alt="" className="size-full object-cover transition-transform duration-500 ease-[var(--ease-organic)] group-hover:scale-[1.03]" />
              : <div className="grid size-full place-items-center text-4xl font-bold tracking-tight text-[var(--ink-2)]">{r.id}</div>}
          </div>
        </div>
        <div className="space-y-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="font-heading text-lg font-semibold">{r.id}</span>
            <EtapaBadge etapa={r.etapa} />
          </div>
          <div className="flex items-center justify-between font-mono text-[11px] text-[var(--ink-2)]">
            <span>{r.marca}</span><span>{new Date(r.criadaEm).toLocaleDateString("pt-BR")}</span>
          </div>
          {r.progresso.total > 0 && (
            <div className="space-y-1.5">
              <Progress value={pct} />
              <div className="font-mono text-[11px] text-[var(--ink-2)]"><NumberTicker value={r.progresso.prontas} />/{r.progresso.total} artes</div>
            </div>
          )}
          {r.erro && <p className="line-clamp-2 text-[13px] text-destructive">{r.erro}</p>}
        </div>
      </MagicCard>
      {ativa && <BorderBeam size={90} duration={7} borderWidth={1.5} colorFrom="var(--beam-de)" colorTo="var(--beam-para)" className="motion-reduce:hidden" />}
    </Link>
  );
}
