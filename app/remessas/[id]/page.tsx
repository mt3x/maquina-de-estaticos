"use client";
import { use, useMemo, useState } from "react";
import { Pause, Play, Download, Square } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { CabecalhoPagina } from "@/components/maquina/shell";
import { EtapaBadge } from "@/components/maquina/etapa-badge";
import { Confirmacao } from "@/components/maquina/confirmacao";
import { GradeArtes, chaveArte } from "@/components/maquina/grade-artes";
import { ProcessLogRemessa } from "@/components/maquina/process-log-remessa";
import { Visualizador, type ItemVisualizador } from "@/components/maquina/visualizador";
import { usePolling, postAcao } from "@/lib/api-cliente";
import { MODELOS } from "@/lib/tipos";
import type { RemessaView } from "@/lib/apresentar";
import { tituloErro } from "@/lib/mensagens";

export default function PaginaRemessa({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { dados: r, erro } = usePolling<RemessaView>(`/api/remessas/${id}`);
  const { dados: status } = usePolling<{ saldo?: unknown }>("/api/status", 10000);
  const [aberta, setAberta] = useState<string | null>(null);
  const itens: ItemVisualizador[] = useMemo(() => !r ? [] : r.anuncios.flatMap((an) => an.artes.filter((a) => a.url).map((a) => ({
    chave: chaveArte(an.id, a.modelo, a.formato), titulo: `${r.id} · ${an.id}`, subtitulo: `${MODELOS[a.modelo]} · ${a.formato} · v${a.versaoAtual}`,
    url: a.url!, download: a.url!, versoes: a.versoes, revisao: a.revisao, preferida: an.preferida?.[a.formato] === a.modelo,
    anuncio: an.id, modelo: a.modelo, formato: a.formato, modelosDisponiveis: r.modelos, ajustavel: a.ajustavel, erro: a.erro }))), [r]);
  if (erro && !r) return <p className="text-[var(--ink-1)]">{erro}</p>;
  if (!r) return <div className="space-y-4"><Skeleton className="h-12 w-64" /><Skeleton className="h-96 w-full rounded-2xl" /></div>;
  const pct = r.progresso.total ? Math.round((r.progresso.prontas / r.progresso.total) * 100) : 0;
  const acao = (corpo: object) => postAcao(r.id, corpo).then(() => true, (e: Error) => { toast.error(e.message); return false; });
  const emProducao = !["importada", "interpretando", "aguardando_confirmacao"].includes(r.etapa);
  return (
    <>
      <CabecalhoPagina titulo={`Remessa ${r.id}`} subtitulo={`${r.marca} · ${r.anuncios.length} anúncios`} acoes={<>
        <span className="mr-1 font-mono text-[12px] text-[var(--ink-2)]" title="Saldo do Flow">saldo {typeof status?.saldo === "number" || typeof status?.saldo === "string" ? String(status.saldo) : "—"}</span>
        <EtapaBadge etapa={r.etapa} />
        {r.etapa === "gerando" && <Button variant="outline" onClick={() => acao({ tipo: "pausar" })}><Pause /> Pausar</Button>}
        {(r.etapa === "pausada" || r.etapa === "erro") && <Button variant="outline" onClick={() => acao({ tipo: "retomar" })}><Play /> Retomar</Button>}
        {emProducao && r.etapa !== "concluida" && <Button variant="ghost" onClick={() => confirm("Cancelar as artes que ainda não ficaram prontas?") && acao({ tipo: "cancelar" })}><Square /> Cancelar</Button>}
        {r.progresso.prontas > 0 && <><a href={`/api/remessas/${r.id}/zip?so=preferidas`} className={buttonVariants({ variant: "outline" })}><Download /> Preferidas</a>
          <a href={`/api/remessas/${r.id}/zip`} className={buttonVariants({ variant: "outline" })}><Download /> Baixar tudo</a></>}
      </>} />
      {r.erro && <Alert variant="destructive" className="mb-6"><AlertTitle>{tituloErro(r.erro)}</AlertTitle><AlertDescription className="break-words font-mono text-[12px] [overflow-wrap:anywhere]">{r.erro.msg}</AlertDescription></Alert>}
      {emProducao && r.progresso.total > 0 && <div className="mb-8 flex items-center gap-4"><Progress value={pct} className="flex-1" />
        <span className="font-mono text-[12px] text-[var(--ink-2)]">{r.progresso.prontas}/{r.progresso.total}</span></div>}
      {r.etapa === "aguardando_confirmacao" ? <Confirmacao r={r} />
        : emProducao ? <GradeArtes remessa={r} onAbrir={setAberta} />
        : <div className="space-y-3"><Skeleton className="h-24 w-full rounded-xl" /><p className="text-[var(--ink-1)]">Lendo a pasta e as referências…</p></div>}
      <div className="mt-10"><ProcessLogRemessa log={r.log} /></div>
      {aberta && <Visualizador itens={itens} inicial={aberta} aoFechar={() => setAberta(null)}
        aoPreferida={(it) => acao({ tipo: "preferida", anuncio: it.anuncio, formato: it.formato, modelo: it.modelo })}
        aoAjuste={(it, texto, escopo) => acao({ tipo: "ajuste", anuncio: it.anuncio, formato: it.formato, modelo: it.modelo, escopo, texto }).then((ok) => { if (ok) toast.success("Ajuste na fila — a arte será gerada de novo"); })} />}
    </>
  );
}
