"use client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CabecalhoPagina } from "@/components/maquina/shell";
import { usePolling } from "@/lib/api-cliente";
import { cn } from "@/lib/utils";
import { NumberTicker } from "@/components/magicui/number-ticker";
import { BlurFade } from "@/components/magicui/blur-fade";
import type { BloqueioFlow } from "@/lib/tipos";

type Estado = { chrome: boolean; worker: { vivo: boolean; ocupado: string | null; pid?: number }; saldo?: number | string; saldoEm?: string;
  ultima?: { alvo: { anuncio: string; formato: string }; status: string; em?: string }; fila: number; proxima?: { remessa: string; anuncio: string; formato: string; modelo: string } | null; discoLivreGb?: number;
  bloqueio?: BloqueioFlow | null; porta?: number };

/** valor numérico sobe contando (Number Ticker); sufixo opcional ("GB", "artes"). */
function Cartao({ titulo, valor, numero, sufixo, ok, detalhe, children, i = 0 }: { titulo: string; valor?: string; numero?: number; sufixo?: string; ok?: boolean; detalhe?: string; children?: React.ReactNode; i?: number }) {
  return <BlurFade delay={i * 0.05} className="h-full"><div className="vidro h-full rounded-2xl border p-6">
    <div className="flex items-center gap-2 text-[13px] text-[var(--ink-1)]">
      {ok !== undefined && <span className="relative flex size-2" aria-hidden>
        {ok && <span className="absolute inline-flex size-full rounded-full bg-[var(--win)] opacity-60 motion-safe:animate-ping" />}
        <span className={cn("relative inline-flex size-2 rounded-full", ok ? "bg-[var(--win)]" : "bg-[var(--destructive)]")} /></span>}{titulo}</div>
    <div className="mt-3 font-heading text-3xl font-bold">{numero !== undefined ? <><NumberTicker value={numero} decimalPlaces={Number.isInteger(numero) ? 0 : 1} />{sufixo && <span className="ml-1.5 text-xl font-semibold text-[var(--ink-1)]">{sufixo}</span>}</> : valor}</div>
    {detalhe && <div className="mt-1.5 whitespace-pre-line break-words font-mono text-[12px] text-[var(--ink-2)]">{detalhe}</div>}{children}</div></BlurFade>;
}

export default function Status() {
  const { dados: s, erro, recarregar } = usePolling<Estado>("/api/status", 3000);
  const liberar = async () => {
    if (!confirm("Liberar o Flow? Só faça isso depois de conferir a conta no navegador — a fila volta a enviar gerações.")) return;
    const r = await fetch("/api/status/desbloquear", { method: "POST" }).catch(() => null);
    if (r?.ok) { toast("Liberando o Flow… a fila volta em instantes"); void recarregar(); } else toast.error("Não consegui liberar o Flow");
  };
  const cabecalho = <CabecalhoPagina titulo="Status" subtitulo="O que está ligado e o que está acontecendo agora." />;
  if (!s) return <>{cabecalho}{erro
    ? <p className="vidro rounded-2xl border p-6 text-[var(--ink-1)]">Não consegui ler o status: <span className="font-mono text-[13px]">{erro}</span></p>
    : <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-5">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}</div>}</>;
  const pouco = s.discoLivreGb !== undefined && s.discoLivreGb < 2;
  return (<>
    {cabecalho}
    <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-5">
      <Cartao titulo="Flow" valor={s.bloqueio ? "Bloqueado" : "Liberado"} ok={!s.bloqueio}
        detalhe={s.bloqueio ? `${s.bloqueio.tipo === "flow_custo" ? "custo acima de 0" : "bloqueio"}${s.bloqueio.remessa ? ` na ${s.bloqueio.remessa}` : ""} · ${new Date(s.bloqueio.em).toLocaleString("pt-BR")}\n${s.bloqueio.msg}` : "nenhum bloqueio"}>
        {s.bloqueio && <Button className="mt-4" variant="outline" onClick={liberar}>Desbloquear</Button>}</Cartao>
      <Cartao i={1} titulo={`Chrome do Flow (porta ${s.porta ?? 9231})`} valor={s.chrome ? "No ar" : "Fora do ar"} ok={s.chrome}>
        {!s.chrome && <Button className="mt-4" variant="outline" onClick={() => fetch("/api/status/abrir-chrome", { method: "POST" }).then((r) => r.ok ? toast("Abrindo o Chrome do Flow…") : toast.error("Não consegui abrir o Chrome"))}>Abrir Chrome do Flow</Button>}</Cartao>
      <Cartao i={2} titulo="Worker" valor={s.worker.vivo ? (s.worker.ocupado ? "Trabalhando" : "Ocioso") : "Parado"} ok={s.worker.vivo}
        detalhe={s.worker.vivo ? (s.worker.ocupado ?? (s.worker.pid ? `pid ${s.worker.pid}` : undefined)) : "sem batimento há mais de 15 s"} />
      <Cartao i={3} titulo="Saldo do Flow" {...(s.saldo !== undefined && !Number.isNaN(Number(s.saldo)) ? { numero: Number(s.saldo) } : { valor: "—" })} detalhe={s.saldoEm ? `lido ${new Date(s.saldoEm).toLocaleString("pt-BR")}` : "ainda não lido"} />
      <Cartao i={4} titulo="Fila" numero={s.fila} sufixo={s.fila === 1 ? "arte" : "artes"} detalhe={[s.proxima ? `próxima: ${s.proxima.remessa} · ${s.proxima.anuncio} ${s.proxima.formato}` : null,
        s.ultima ? `última: ${s.ultima.alvo.anuncio} ${s.ultima.alvo.formato} · ${s.ultima.status}${s.ultima.em ? ` · ${new Date(s.ultima.em).toLocaleTimeString("pt-BR")}` : ""}` : null].filter(Boolean).join("\n") || undefined} />
      <Cartao i={5} titulo="Disco livre" {...(s.discoLivreGb !== undefined ? { numero: s.discoLivreGb, sufixo: "GB" } : { valor: "—" })} ok={s.discoLivreGb === undefined ? undefined : !pouco} detalhe={pouco ? "abaixo de 2 GB — libere espaço" : undefined} />
    </div></>);
}
