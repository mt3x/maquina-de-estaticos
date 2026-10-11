"use client";
import { Star, AlertTriangle, RotateCw, Info, RefreshCw } from "lucide-react";
import { ActivityIndicator } from "@/components/ai/activity-indicator";
import { cn } from "@/lib/utils";
import type { ArteView } from "@/lib/apresentar";
const ROTULO: Record<string, string> = { pendente: "Aguardando", na_fila: "Na fila", gerando: "Gerando", pos: "Finalizando", revisando: "Revisando", pronta: "Pronta", defeito: "Revisar", falhou: "Falhou" };
export function Miniatura({ arte, preferida, onAbrir, onPreferida, onTentarDeNovo }: {
  arte: ArteView; preferida: boolean; onAbrir: () => void; onPreferida: () => void; onTentarDeNovo?: () => void }) {
  const story = arte.formato === "STORY"; const temImagem = !!arte.miniUrl;
  const ativo = ["gerando", "pos", "revisando"].includes(arte.status);
  const alerta = arte.status === "defeito" || arte.status === "falhou";
  const tentarDeNovo = alerta && onTentarDeNovo
    ? <button type="button" onClick={onTentarDeNovo} className="pointer-events-auto inline-flex items-center gap-1 rounded-md border vidro px-2 py-1 text-[12px] text-foreground transition-colors hover:bg-[var(--bg-2)]">
        <RefreshCw className="size-3" /> Gerar de novo</button> : null;
  return (
    <div className={cn("group relative overflow-hidden rounded-[14px] border border-[var(--rule)] bg-[var(--bg-2)] shadow-[0_4px_14px_rgba(0,0,0,0.06)] transition-all duration-200 ease-[var(--ease-organic)] hover:-translate-y-0.5", story ? "aspect-[9/16]" : "aspect-square")}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {temImagem && <img src={arte.miniUrl} alt="" loading="lazy" className={cn("size-full object-cover transition-transform duration-500 ease-[var(--ease-organic)] group-hover:scale-[1.015]", ativo && "opacity-60")} />}
      {!temImagem && <div className="grid size-full place-items-center p-3 text-center"><div className="space-y-2">
        {ativo && <div className="flex justify-center"><ActivityIndicator active /></div>}
        <div className={cn("text-[13px]", alerta ? "text-destructive" : "text-[var(--ink-1)]")}>{alerta && <AlertTriangle className="mr-1 inline size-3.5" />}{ROTULO[arte.status]}</div>
        {arte.erro && <p className="line-clamp-3 text-[11px] text-[var(--ink-2)]" title={arte.erro}>{arte.erro}</p>}
        {tentarDeNovo}</div></div>}
      {temImagem && <button aria-label="Abrir em tamanho real" onClick={onAbrir} className="absolute inset-0 cursor-zoom-in outline-none focus-visible:ring-3 focus-visible:ring-ring/50" />}
      {(temImagem || arte.ajustePendente) && <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-2">
        {/* só erro real usa o vermelho; o resto é neutro */}
        {temImagem && <span className={cn("rounded-full px-2 py-0.5 font-mono text-[10px] backdrop-blur-md", alerta ? "bg-[var(--destructive)] text-white" : "border border-white/25 bg-white/20 text-white shadow-sm")}>
          {arte.status === "defeito" && <AlertTriangle className="mr-1 inline size-3" />}{temImagem && ativo ? ROTULO[arte.status] : arte.status === "pronta" ? `v${arte.versaoAtual}` : ROTULO[arte.status]}
        </span>}
        <span className="flex items-center gap-1.5">
          {temImagem && arte.erro && <span role="img" aria-label={`Aviso: ${arte.erro}`} title={arte.erro} className="pointer-events-auto grid size-6 place-items-center rounded-full bg-black/50 text-white backdrop-blur"><Info className="size-3.5" /></span>}
          {arte.ajustePendente && <RotateCw className="size-4 text-white drop-shadow" />}
        </span>
      </div>}
      {temImagem && tentarDeNovo && <div className="absolute bottom-2 left-2">{tentarDeNovo}</div>}
      {temImagem && <button aria-label={preferida ? "Preferida" : "Marcar como preferida"} aria-pressed={preferida} onClick={onPreferida}
        className={cn("absolute bottom-2 right-2 grid size-8 place-items-center rounded-full bg-black/40 text-white backdrop-blur transition-opacity",
          preferida ? "opacity-100" : "opacity-0 focus-visible:opacity-100 group-hover:opacity-100")}>
        <Star className={cn("size-4", preferida && "fill-current")} /></button>}
    </div>
  );
}
