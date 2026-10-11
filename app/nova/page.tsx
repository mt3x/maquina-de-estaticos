"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { CabecalhoPagina } from "@/components/maquina/shell";
import { SoltarPasta, type ArquivoComCaminho } from "@/components/maquina/soltar-pasta";

type Marca = { id: string; nome: string };

export default function Nova() {
  const router = useRouter();
  const [arquivos, setArquivos] = useState<ArquivoComCaminho[]>([]);
  const [marcas, setMarcas] = useState<Marca[] | null>(null); // null = carregando
  const [marca, setMarca] = useState("");
  const [id, setId] = useState("");
  const [envio, setEnvio] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/marcas").then((r) => r.json()).then((l) => {
      const lista: Marca[] = Array.isArray(l) ? l : []; setMarcas(lista); setMarca(lista[0]?.id ?? "");
    }).catch(() => setMarcas([]));
  }, []);
  useEffect(() => {
    const nome = arquivos[0]?.caminho.split("/")[0] ?? "";
    const m = nome.match(/remessa[^0-9]*(\d+)/i);
    if (m) setId(`R${Number(m[1])}`);
  }, [arquivos]);
  const pasta = arquivos[0]?.caminho.split("/")[0];

  function enviar() {
    const fd = new FormData(); fd.append("marca", marca); fd.append("id", id);
    fd.append("caminhos", JSON.stringify(arquivos.map((a) => a.caminho)));
    arquivos.forEach((a) => fd.append("arquivos", a.arquivo));
    const xhr = new XMLHttpRequest(); xhr.open("POST", "/api/remessas");
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) setEnvio(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => {
      let j: { id?: string; erro?: string } = {};
      try { j = JSON.parse(xhr.responseText || "{}"); } catch { /* resposta não-JSON */ }
      if (xhr.status === 200 && j.id) router.push(`/remessas/${j.id}`);
      else { setEnvio(null); toast.error(j.erro || "falha no envio"); }
    };
    xhr.onerror = () => { setEnvio(null); toast.error("falha de rede"); };
    setEnvio(0); xhr.send(fd);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <CabecalhoPagina titulo="Nova remessa" subtitulo="O sistema lê o documento, confere as referências e te mostra as dúvidas antes de gerar qualquer coisa." />
      <SoltarPasta onArquivos={setArquivos} />
      {arquivos.length > 0 && (
        <div className="mt-6 space-y-5 rounded-2xl border vidro p-6">
          <div className="flex items-baseline justify-between">
            <span className="font-heading text-lg font-semibold">{pasta}</span>
            <span className="font-mono text-[12px] text-[var(--ink-2)]">{arquivos.length} arquivos</span>
          </div>
          <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
            <div className="space-y-1.5"><Label htmlFor="marca">Marca</Label>
              {marcas?.length === 0
                ? <div className="flex h-9 items-center justify-between gap-3 text-sm"><span className="text-[var(--ink-2)]">Nenhuma marca cadastrada ainda.</span>
                    <Link href="/marcas/nova" className={buttonVariants({ size: "sm", variant: "outline" })}>Cadastrar marca</Link></div>
                : <select id="marca" value={marca} onChange={(e) => setMarca(e.target.value)} disabled={envio !== null || !marcas}
                    className="h-9 w-full rounded-lg border border-[var(--rule)] bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                    {(marcas ?? []).map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
                  </select>}</div>
            <div className="space-y-1.5"><Label htmlFor="ident">Identificação</Label>
              <Input id="ident" className="font-mono" value={id} disabled={envio !== null} onChange={(e) => setId(e.target.value.toUpperCase())} placeholder="R61" /></div>
          </div>
          {envio !== null
            ? <div className="space-y-1.5"><Progress value={envio} /><div className="font-mono text-[11px] text-[var(--ink-2)]">enviando · {envio}%</div></div>
            : <Button size="lg" className="w-full" disabled={!marca || !id} onClick={enviar}>Enviar remessa</Button>}
        </div>
      )}
    </div>
  );
}
