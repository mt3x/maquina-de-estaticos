"use client";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CabecalhoPagina } from "@/components/maquina/shell";
import { BlurFade } from "@/components/magicui/blur-fade";
import { usePolling } from "@/lib/api-cliente";

type Checagem = { id: string; ok: boolean; detalhe: string; comoResolver?: string };
type Config = { checagens: Checagem[]; configurado: boolean; projeto: string | null };
const NOMES: Record<string, string> = { node: "Node.js", python: "Python", chrome: "Google Chrome", claude: "Claude Code", disco: "Espaço em disco" };

function Cartao({ titulo, i = 0, children }: { titulo: string; i?: number; children: React.ReactNode }) {
  return <BlurFade delay={i * 0.05} className="h-full"><div className="vidro h-full rounded-2xl border p-6">
    <div className="text-[13px] text-[var(--ink-1)]">{titulo}</div>{children}</div></BlurFade>;
}

export default function Configuracao() {
  const [cfg, setCfg] = useState<Config | null>(null); const [erro, setErro] = useState<string | null>(null);
  const [testando, setTestando] = useState(false); const [link, setLink] = useState(""); const [salvando, setSalvando] = useState(false);
  const { dados: status } = usePolling<{ chrome: boolean }>("/api/status", 4000);
  const carregar = useCallback(async (claude = false) => {
    const r = await fetch(`/api/configuracao${claude ? "?claude=1" : ""}`).catch(() => null);
    if (!r?.ok) { setErro("Não consegui verificar os programas."); return; }
    setErro(null); const novo = await r.json() as Config;
    setCfg((velho) => claude || !velho ? novo : { ...novo, checagens: [...novo.checagens, ...velho.checagens.filter((c) => c.id === "claude")] });
  }, []);
  useEffect(() => { void carregar(); }, [carregar]);
  const testarClaude = async () => { setTestando(true); await carregar(true); setTestando(false); };
  const salvar = async () => {
    setSalvando(true);
    const r = await fetch("/api/configuracao", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ link }) }).catch(() => null);
    setSalvando(false);
    const j = await r?.json().catch(() => null);
    if (r?.ok) { toast.success("Projeto do Flow salvo."); setLink(""); void carregar(); } else toast.error(j?.erro ?? "Não consegui salvar o link.");
  };
  return (<>
    <CabecalhoPagina titulo="Configuração" subtitulo="Confira se está tudo pronto para gerar as artes, sem precisar do Claude." />
    {!cfg ? (erro
      ? <p className="vidro rounded-2xl border p-6 text-[var(--ink-1)]">{erro}</p>
      : <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}</div>)
    : <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] items-start gap-5">
      <Cartao titulo="Programas necessários">
        <ul className="mt-3 space-y-3">{cfg.checagens.map((c) => <li key={c.id} className="text-[14px]">
          <div><span aria-hidden>{c.ok ? "✅" : "❌"}</span> <span className="font-semibold">{NOMES[c.id] ?? c.id}</span> <span className="font-mono text-[12px] text-[var(--ink-2)]">{c.detalhe}</span></div>
          {!c.ok && c.comoResolver && <div className="mt-1 whitespace-pre-line text-[13px] text-[var(--ink-1)]">{c.comoResolver}</div>}</li>)}</ul>
        <Button className="mt-4" variant="outline" disabled={testando} onClick={testarClaude}>{testando ? "Testando…" : "Testar Claude"}</Button>
      </Cartao>
      <Cartao i={1} titulo="Chrome do Flow">
        <div className="mt-3 font-heading text-3xl font-bold">{status === undefined || status === null ? "—" : status.chrome ? "No ar" : "Fora do ar"}</div>
        <p className="mt-2 text-[13px] text-[var(--ink-1)]">Faça login com a sua conta Google na janela que abrir.</p>
        <Button className="mt-4" variant="outline" onClick={() => fetch("/api/status/abrir-chrome", { method: "POST" }).then((r) => r.ok ? toast("Abrindo o Chrome do Flow…") : toast.error("Não consegui abrir o Chrome"))}>Abrir Chrome do Flow</Button>
      </Cartao>
      <Cartao i={2} titulo="Projeto do Flow">
        <div className="mt-3 font-heading text-3xl font-bold">{cfg.configurado ? "Configurado" : "Não configurado"}</div>
        {cfg.projeto && <div className="mt-1.5 break-all font-mono text-[12px] text-[var(--ink-2)]">{cfg.projeto}</div>}
        <label className="mt-4 block text-[13px] text-[var(--ink-1)]" htmlFor="link-flow">Cole aqui o link do projeto do Flow</label>
        <input id="link-flow" value={link} onChange={(e) => setLink(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && link.trim() && !salvando) void salvar(); }} placeholder="https://labs.google/fx/tools/flow/project/…"
          className="mt-1.5 w-full rounded-lg border bg-transparent px-3 py-2 font-mono text-[13px]" />
        <Button className="mt-3" disabled={!link.trim() || salvando} onClick={salvar}>Salvar</Button>
      </Cartao>
    </div>}</>);
}
