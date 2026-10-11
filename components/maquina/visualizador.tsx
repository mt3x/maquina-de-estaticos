"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight, Star, Download, Minus, Plus, Maximize, PanelRightClose, PanelRightOpen } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Escopo, Formato, ModeloId } from "@/lib/tipos";

export type ItemVisualizador = { chave: string; titulo: string; subtitulo: string; url: string; download: string; versoes: { rotulo: string; url: string }[];
  revisao?: { ok: boolean; problemas: string[]; gravidade: string }; preferida: boolean; anuncio: string; modelo: ModeloId; formato: Formato; modelosDisponiveis: ModeloId[];
  /** false = arte sem prompt (produção anterior ao sistema): não aceita ajuste. */ ajustavel?: boolean; erro?: string };

export const ESCALA_MIN = 0.05, ESCALA_MAX = 8;
export type Vista = { escala: number; x: number; y: number };
/** Zoom por `fator` mantendo fixo o ponto (cx, cy), medido a partir do centro do palco. Função pura. */
export function zoomEm(v: Vista, fator: number, cx: number, cy: number, min = ESCALA_MIN, max = ESCALA_MAX): Vista {
  const escala = Math.min(max, Math.max(min, v.escala * fator)); const r = escala / v.escala;
  return { escala, x: cx - (cx - v.x) * r, y: cy - (cy - v.y) * r };
}
const campoDeTexto = (t: EventTarget | null) => { const el = t as HTMLElement | null; return !!el && (["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) || el.isContentEditable); };

export function Visualizador({ itens, inicial, aoFechar, aoPreferida, aoAjuste }: {
  itens: ItemVisualizador[]; inicial: string; aoFechar: () => void; aoPreferida: (i: ItemVisualizador) => void; aoAjuste: (i: ItemVisualizador, texto: string, escopo: Escopo) => void }) {
  // A arte aberta é guardada pela CHAVE: se a lista mudar de ordem/tamanho (polling), continua a mesma arte.
  const [chave, setChave] = useState(inicial);
  const ultimoVisto = useRef<{ item: ItemVisualizador; idx: number } | null>(null);
  const achado = itens.findIndex((i) => i.chave === chave);
  if (achado >= 0) ultimoVisto.current = { item: itens[achado], idx: achado };
  const sumiu = achado < 0 && !!ultimoVisto.current; // saiu da lista: mantém a última imagem vista, com aviso
  const it: ItemVisualizador | undefined = achado >= 0 ? itens[achado] : ultimoVisto.current?.item ?? itens[0];
  const idx = achado >= 0 ? achado : Math.min(ultimoVisto.current?.idx ?? 0, Math.max(0, itens.length - 1));
  const [versao, setVersao] = useState<string | null>(null);
  const [vista, setVista] = useState<Vista>({ escala: 1, x: 0, y: 0 }); const [ajustada, setAjustada] = useState(true);
  const { escala } = vista;
  const [arrastando, setArrastando] = useState(false);
  const [natural, setNatural] = useState({ w: 1080, h: 1920 }); const [painel, setPainel] = useState(true);
  const [texto, setTexto] = useState(""); const [escopo, setEscopo] = useState<Escopo>("arte");
  const palco = useRef<HTMLDivElement>(null);
  const ponteiros = useRef(new Map<number, { x: number; y: number }>());
  const gesto = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const distAnterior = useRef(0);
  const n = itens.length;
  const navegar = useCallback((delta: number) => {
    if (!n) return;
    const i = itens.findIndex((x) => x.chave === chave);
    const base = i >= 0 ? i : Math.min(ultimoVisto.current?.idx ?? 0, n - 1) - (delta > 0 ? 1 : 0);
    setChave(itens[(((base + delta) % n) + n) % n].chave);
  }, [itens, chave, n]);

  const escalaAjuste = useCallback(() => {
    const el = palco.current; if (!el || !el.clientWidth) return 0.4;
    return Math.min((el.clientWidth - 48) / natural.w, (el.clientHeight - 48) / natural.h, 1);
  }, [natural]);
  const ajustar = useCallback(() => { setVista({ escala: escalaAjuste(), x: 0, y: 0 }); setAjustada(true); }, [escalaAjuste]);
  const real = useCallback(() => { setVista({ escala: 1, x: 0, y: 0 }); setAjustada(false); }, []);
  const zoom = useCallback((f: number) => { setVista((v) => zoomEm(v, f, 0, 0)); setAjustada(false); }, []);
  const centro = (cx: number, cy: number) => { const r = palco.current!.getBoundingClientRect(); return { x: cx - r.left - r.width / 2, y: cy - r.top - r.height / 2 }; };

  // Ao trocar de arte: limpa versão/ajuste e volta ao "ajustar à tela".
  useEffect(() => { setVersao(null); setTexto(""); setAjustada(true); }, [chave]);
  useEffect(() => { if (ajustada) ajustar(); }, [natural, ajustada, ajustar]);
  // Reajusta (no modo "ajustar") quando o palco muda de tamanho: janela, abrir/fechar painel.
  useEffect(() => {
    const el = palco.current; if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => { if (ajustada) ajustar(); });
    ro.observe(el); return () => ro.disconnect();
  }, [ajustada, ajustar, n]);
  // Roda/trackpad: listener nativo não passivo (impede o zoom da página com ctrl+roda).
  useEffect(() => {
    const el = palco.current; if (!el) return;
    const w = (e: WheelEvent) => {
      e.preventDefault();
      const f = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)); const c = centro(e.clientX, e.clientY);
      setVista((v) => zoomEm(v, f, c.x, c.y)); setAjustada(false);
    };
    el.addEventListener("wheel", w, { passive: false }); return () => el.removeEventListener("wheel", w);
  }, [n]);
  // Trava a rolagem da página por baixo do visualizador.
  useEffect(() => {
    const anterior = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = anterior; };
  }, []);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || campoDeTexto(e.target)) return;
      if (e.key === "Escape") aoFechar();
      else if (e.key === "ArrowRight") navegar(1);
      else if (e.key === "ArrowLeft") navegar(-1);
      else if (e.key === "1") ajustar(); else if (e.key === "2") real();
      else if (e.key === "+" || e.key === "=") zoom(1.25); else if (e.key === "-") zoom(0.8);
    };
    window.addEventListener("keydown", k); return () => window.removeEventListener("keydown", k);
  }, [navegar, aoFechar, ajustar, real, zoom]);

  const aoPressionar = (e: React.PointerEvent) => {
    ponteiros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    if (ponteiros.current.size === 1) { gesto.current = { x: e.clientX, y: e.clientY, vx: vista.x, vy: vista.y }; setArrastando(true); }
    else if (ponteiros.current.size === 2) { const [a, b] = [...ponteiros.current.values()]; distAnterior.current = Math.hypot(a.x - b.x, a.y - b.y); gesto.current = null; }
  };
  const aoMover = (e: React.PointerEvent) => {
    const p = ponteiros.current.get(e.pointerId); if (!p) return;
    p.x = e.clientX; p.y = e.clientY;
    if (ponteiros.current.size >= 2) {
      const [a, b] = [...ponteiros.current.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (!distAnterior.current || !d) { distAnterior.current = d; return; }
      const f = d / distAnterior.current; distAnterior.current = d;
      const c = centro((a.x + b.x) / 2, (a.y + b.y) / 2);
      setVista((v) => zoomEm(v, f, c.x, c.y)); setAjustada(false);
    } else if (gesto.current) {
      const g = gesto.current; setVista((v) => ({ ...v, x: g.vx + e.clientX - g.x, y: g.vy + e.clientY - g.y }));
    }
  };
  const aoSoltar = (e: React.PointerEvent) => {
    ponteiros.current.delete(e.pointerId); distAnterior.current = 0;
    if (ponteiros.current.size === 1) { const [r] = [...ponteiros.current.values()]; gesto.current = { x: r.x, y: r.y, vx: vista.x, vy: vista.y }; }
    else if (ponteiros.current.size === 0) { gesto.current = null; setArrastando(false); }
  };

  if (!it) return null;
  const urlAtual = versao ?? it.url;
  const ghost = "text-inherit hover:bg-white/10";
  // Painel escuro: botões com estilo próprio (o "outline" do tema claro vira pílula branca sem texto aqui).
  const escuro = (ativo = false) => cn("border-white/15 bg-transparent text-[#f2eee6] hover:bg-white/10 hover:text-[#f2eee6] dark:bg-transparent dark:hover:bg-white/10", ativo && "bg-white/15 dark:bg-white/15");
  return (
    <div className="fixed inset-0 z-50 flex bg-[#07070b]/85 text-[#f5f5f7] backdrop-blur-2xl" role="dialog" aria-modal="true" aria-label="Visualizador">
      <div ref={palco} className="relative flex-1 touch-none overflow-hidden"
        onPointerDown={aoPressionar} onPointerMove={aoMover} onPointerUp={aoSoltar} onPointerCancel={aoSoltar}
        onDoubleClick={() => (ajustada ? real() : ajustar())}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={urlAtual} alt={it.titulo} draggable={false} onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
          className="absolute left-1/2 top-1/2 max-w-none select-none shadow-2xl"
          style={{ width: natural.w, height: natural.h, transform: `translate(calc(-50% + ${vista.x}px), calc(-50% + ${vista.y}px)) scale(${escala})`, cursor: arrastando ? "grabbing" : "grab",
            imageRendering: escala >= 2 ? "pixelated" : "auto", transition: arrastando || ponteiros.current.size ? "none" : "transform 160ms var(--ease-organic, ease-out)" }} />
        <div className="absolute left-4 top-4 flex items-center gap-3" onPointerDown={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className={ghost} aria-label="Fechar" onClick={aoFechar}><X /></Button>
          <div><div className="font-heading text-lg font-semibold">{it.titulo}</div><div className="font-mono text-[11px] text-white/50">{it.subtitulo} · {sumiu ? "fora da lista" : `${idx + 1}/${n}`}</div>
            {sumiu && <div role="status" className="mt-1 text-[12px] text-amber-200">Esta arte saiu da lista (mudou de estado). Use ← → para ver as outras.</div>}</div>
        </div>
        <button aria-label="Anterior" onPointerDown={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()} onClick={() => navegar(-1)} className="absolute left-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-white/10 backdrop-blur-xl transition-colors hover:bg-white/20"><ChevronLeft /></button>
        <button aria-label="Próxima" onPointerDown={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()} onClick={() => navegar(1)} className="absolute right-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-white/10 backdrop-blur-xl transition-colors hover:bg-white/20"><ChevronRight /></button>
        <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2 py-1 shadow-[0_10px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl" onPointerDown={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className={ghost} aria-label="Diminuir" onClick={() => zoom(0.8)}><Minus /></Button>
          <span data-testid="zoom" className="w-14 text-center font-mono text-[12px]">{Math.round(escala * 100)}%</span>
          <Button variant="ghost" size="icon" className={ghost} aria-label="Aumentar" onClick={() => zoom(1.25)}><Plus /></Button>
          <Button variant="ghost" size="sm" className={ghost} onClick={ajustar}><Maximize /> Ajustar <kbd className="ml-1 text-white/40">1</kbd></Button>
          <Button variant="ghost" size="sm" className={ghost} onClick={real}>100% <kbd className="ml-1 text-white/40">2</kbd></Button>
          <Button variant="ghost" size="icon" className={ghost} aria-label="Painel" onClick={() => setPainel(!painel)}>{painel ? <PanelRightClose /> : <PanelRightOpen />}</Button>
        </div>
      </div>
      {painel && (
        <aside className="m-3 w-[340px] shrink-0 space-y-6 overflow-y-auto rounded-2xl border border-white/12 bg-white/[0.06] p-5 backdrop-blur-xl">
          <div className="flex gap-2">
            <Button variant="outline" className={cn("flex-1", escuro(it.preferida))} aria-pressed={it.preferida} onClick={() => aoPreferida(it)}><Star className={cn(it.preferida && "fill-current")} /> {it.preferida ? "Preferida" : "Marcar preferida"}</Button>
            <a href={it.download} download aria-label="Baixar" title="Baixar" className={cn(buttonVariants({ variant: "outline", size: "icon" }), escuro())}><Download /></a>
          </div>
          {it.erro && <p role="note" className="rounded-lg border border-amber-300/30 bg-amber-300/10 px-3 py-2 text-[13px] text-amber-100">{it.erro}</p>}
          {it.revisao && (
            <section><h3 className="mb-2 text-[13px] text-white/60">Revisão automática</h3>
              <p className="font-mono text-[12px]">{it.revisao.gravidade === "nenhuma" ? "Sem problemas encontrados" : it.revisao.gravidade}</p>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-[13px] text-white/80">{it.revisao.problemas.map((p, i) => <li key={i}>{p}</li>)}</ul></section>)}
          {it.versoes.length > 0 && (
            <section><h3 className="mb-2 text-[13px] text-white/60">Versões</h3>
              <div className="flex flex-wrap gap-2">
                {it.versoes.map((v) => <Button key={v.url} size="sm" variant="outline" className={escuro(versao === v.url)} aria-pressed={versao === v.url} onClick={() => setVersao(v.url)}>{v.rotulo}</Button>)}
                <Button size="sm" variant="outline" className={escuro(!versao)} aria-pressed={!versao} onClick={() => setVersao(null)}>atual</Button>
              </div></section>)}
          {it.ajustavel === false ? (
            <section><h3 className="mb-2 text-[13px] text-white/60">Pedir ajuste</h3>
              <p className="text-[13px] text-white/70">Esta arte veio de uma produção anterior ao sistema — ajustes não disponíveis.</p></section>
          ) : (
          <section className="space-y-3"><h3 className="text-[13px] text-white/60">Pedir ajuste</h3>
            <Textarea value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Descreva o que mudar (a arte será gerada de novo)…" rows={4} className="bg-black/30" />
            <div className="space-y-1.5 text-[13px]">
              {([["arte", "Só esta arte"], ["formato", "Este formato nos modelos da remessa"], ["anuncio", "O anúncio inteiro (todos os formatos)"]] as const).map(([v, r]) => (
                <label key={v} className="flex items-center gap-2"><input type="radio" name="escopo" aria-label={r} checked={escopo === v} onChange={() => setEscopo(v)} />{r}</label>))}
            </div>
            <Button className="w-full" disabled={!texto.trim()} onClick={() => { aoAjuste(it, texto.trim(), escopo); setTexto(""); }}>Gerar de novo com ajuste</Button>
          </section>)}
          <p className="font-mono text-[11px] text-white/40">← → navegar · 1 ajustar · 2 tamanho real · roda = zoom · arraste para mover · Esc fecha</p>
        </aside>)}
    </div>
  );
}
