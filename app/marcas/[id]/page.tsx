"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ActivityIndicator } from "@/components/ai/activity-indicator";
import { CabecalhoPagina } from "@/components/maquina/shell";
import { usePolling } from "@/lib/api-cliente";

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function Marca({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { dados, erro } = usePolling<{ identidade: any; guia: string | null; rascunho: any; logoUrl?: string; fontes?: string[] }>(`/api/marcas/${id}`, 3000);
  const fonte = dados?.rascunho?.status === "pronto" ? { identidade: dados.rascunho.identidade, guia: dados.rascunho.guiaMarkdown } : { identidade: dados?.identidade, guia: dados?.guia };
  const [json, setJson] = useState(""); const [guia, setGuia] = useState("");
  // Só recarrega os campos quando a fonte muda (rascunho pronto / salvo); a cada 3 s o polling não pode apagar edições.
  useEffect(() => { if (fonte.identidade) { setJson(JSON.stringify(fonte.identidade, null, 2)); setGuia(fonte.guia ?? ""); } },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dados?.rascunho?.status, !!dados]);
  if (!dados) return erro ? <CabecalhoPagina titulo={id} subtitulo={`Não consegui carregar a marca: ${erro}`} /> : <Skeleton className="h-96 w-full rounded-xl" />;
  if (dados.rascunho?.status === "extraindo") return <>
    <CabecalhoPagina titulo={id} subtitulo="Lendo os anúncios e montando a identidade. Pode levar alguns minutos." />
    <div className="rounded-2xl border vidro p-6"><ActivityIndicator active label="Extraindo a identidade dos anúncios…" /></div>
    <Skeleton className="mt-5 h-64 w-full rounded-xl" /></>;
  if (dados.rascunho?.status === "erro") return <>
    <CabecalhoPagina titulo={id} subtitulo="A extração não terminou." acoes={<Link href="/marcas/nova" className="text-[14px] underline underline-offset-4">Tentar de novo</Link>} />
    <div className="rounded-2xl border vidro p-6"><p className="font-mono text-[13px] text-[var(--destructive)]">{dados.rascunho.msg}</p></div></>;
  if (!fonte.identidade) return <CabecalhoPagina titulo={id} subtitulo="Marca não encontrada." acoes={<Link href="/marcas" className="text-[14px] underline underline-offset-4">Voltar às marcas</Link>} />;
  const cores: Record<string, string> = (() => { try { return JSON.parse(json).cores?.oficial ?? {}; } catch { return {}; } })();
  const aviso: string = (() => { try { return JSON.parse(json).aviso_legal?.texto ?? ""; } catch { return ""; } })();
  function editarAviso(texto: string) {
    try { const o = JSON.parse(json); o.aviso_legal = { ...(o.aviso_legal ?? {}), texto }; setJson(JSON.stringify(o, null, 2)); } catch { toast.error("Corrija o JSON antes de editar o aviso"); }
  }
  async function salvar() {
    let identidade; try { identidade = JSON.parse(json); } catch { return toast.error("JSON inválido"); }
    const r = await fetch(`/api/marcas/${id}`, { method: "POST", body: JSON.stringify({ identidade, guiaMarkdown: guia }) });
    if (r.ok) toast.success("Marca salva"); else toast.error("Falha ao salvar");
  }
  return (<>
    <CabecalhoPagina titulo={fonte.identidade?.nome ?? id} subtitulo={dados.rascunho?.status === "pronto" ? "Revise a identidade extraída e salve." : "Identidade em uso."}
      acoes={<Button size="lg" onClick={salvar}>Salvar marca</Button>} />
    <div className="mb-8 flex flex-wrap gap-3">{Object.entries(cores).map(([n, c]) => <div key={n} className="flex items-center gap-2.5 rounded-lg border vidro px-3 py-2">
      <span className="size-6 rounded-md border border-[var(--rule)]" style={{ background: String(c) }} /><span className="text-[13px]">{n}</span><span className="font-mono text-[12px] text-[var(--ink-2)]">{String(c)}</span></div>)}</div>
    <div className="mb-8 grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-6 max-lg:grid-cols-1">
      <div className="space-y-4">
        <div className="grid h-28 place-items-center rounded-xl border border-[var(--rule)] bg-[var(--bg-2)] dark:bg-white/90">
          {dados.logoUrl ? <img src={dados.logoUrl} alt="Logo" className="max-h-14 max-w-[70%] object-contain" /> : <span className="text-[13px] text-[var(--ink-2)]">sem logo</span>}</div>
        <div><h2 className="mb-1.5 text-[13px] text-[var(--ink-1)]">Fontes</h2>
          {dados.fontes?.length ? <ul className="space-y-1">{dados.fontes.map((f) => <li key={f} className="font-mono text-[12px] text-[var(--ink-2)]">{f}</li>)}</ul> : <p className="text-[13px] text-[var(--ink-2)]">nenhuma enviada</p>}</div>
      </div>
      <div className="space-y-2"><h2 className="text-[13px] text-[var(--ink-1)]">Aviso legal</h2>
        <Textarea rows={5} className="bg-[var(--bg-1)]" value={aviso} onChange={(e) => editarAviso(e.target.value)} /></div>
    </div>
    <div className="grid grid-cols-2 gap-6 max-lg:grid-cols-1">
      <section className="space-y-2"><h2 className="font-heading text-xl font-semibold">Identidade</h2><p className="font-mono text-[11px] text-[var(--ink-2)]">identidade.json</p>
        <Textarea className="min-h-[520px] bg-[var(--bg-1)] font-mono text-[12px] leading-relaxed" spellCheck={false} value={json} onChange={(e) => setJson(e.target.value)} /></section>
      <section className="space-y-2"><h2 className="font-heading text-xl font-semibold">Guia da marca</h2><p className="font-mono text-[11px] text-[var(--ink-2)]">guia-marca.md</p>
        <Textarea className="min-h-[520px] bg-[var(--bg-1)] font-mono text-[12px] leading-relaxed" value={guia} onChange={(e) => setGuia(e.target.value)} /></section>
    </div></>);
}
