"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { postAcao } from "@/lib/api-cliente";
import type { RemessaView } from "@/lib/apresentar";
import type { ModeloId } from "@/lib/tipos";
import { SeletorModelos } from "./seletor-modelos";

type Edicao = { copy: string; instrucoes: string; temPessoas: boolean };

export function Confirmacao({ r }: { r: RemessaView }) {
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  // Edições locais por id de anúncio; o resto (e o `apoio`) vem sempre do servidor, então nada some quando o polling traz dados novos.
  const [edicoes, setEdicoes] = useState<Record<string, Partial<Edicao>>>({});
  const [apoioLocal, setApoioLocal] = useState<Record<string, string[]>>({});
  const [modelos, setModelos] = useState<ModeloId[]>(r.modelos.length ? r.modelos : ["nano-banana-pro", "nano-banana-2-1"]);
  const [enviando, setEnviando] = useState(false);
  const [travadoEm, setTravadoEm] = useState<string | null>(null);
  const chave = `${r.etapa}|${r.duvidas.map((d) => d.id).join(",")}`;
  const travado = travadoEm === chave; // envio feito: só destrava quando a etapa ou as dúvidas mudam
  const anuncios = r.anuncios.map((an) => ({ id: an.id, copy: an.copy, instrucoes: an.instrucoes, temPessoas: an.temPessoas, ...edicoes[an.id],
    apoio: [...new Set([...an.apoio, ...(apoioLocal[an.id] ?? [])])] }));
  const respostasAtuais = Object.fromEntries(r.duvidas.filter((d) => respostas[d.id] !== undefined).map((d) => [d.id, respostas[d.id]]));
  const pendentes = r.duvidas.filter((d) => !respostas[d.id]?.trim());
  async function acao(corpo: object, ok: string) {
    setEnviando(true); setTravadoEm(chave);
    try { await postAcao(r.id, corpo); toast.success(ok); } catch (e) { setTravadoEm(null); toast.error(String((e as Error).message)); } finally { setEnviando(false); }
  }
  const mudar = (id: string, parte: Partial<Edicao>) => setEdicoes((e) => ({ ...e, [id]: { ...e[id], ...parte } }));
  return (
    <div className="space-y-10">
      {r.duvidas.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-heading text-2xl font-semibold">Antes de gerar, preciso de você</h2>
          {r.duvidas.map((d) => (
            <div key={d.id} className="rounded-2xl border vidro p-5">
              <p className="text-[15px]">{d.anuncio && <span className="mr-2 font-mono text-[12px] text-[var(--ink-2)]">{d.anuncio}</span>}{d.pergunta}</p>
              {d.sugestao && <p className="mt-1 text-[13px] text-[var(--ink-1)]">Sugestão: {d.sugestao}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {d.opcoes?.map((o) => <Button key={o} size="sm" variant={respostas[d.id] === o ? "secondary" : "outline"} aria-pressed={respostas[d.id] === o} onClick={() => setRespostas({ ...respostas, [d.id]: o })}>{o}</Button>)}
                <Input className="h-8 max-w-sm" placeholder="Outra resposta…" value={d.opcoes?.includes(respostas[d.id]) ? "" : respostas[d.id] ?? ""}
                  onChange={(e) => setRespostas({ ...respostas, [d.id]: e.target.value })} />
              </div>
            </div>))}
          <Button variant="secondary" disabled={pendentes.length > 0 || enviando || travado} onClick={() => acao({ tipo: "responder", respostas: respostasAtuais }, "Respostas enviadas — reinterpretando a remessa")}>
            Enviar respostas {pendentes.length > 0 && `(${pendentes.length} pendentes)`}</Button>
        </section>
      )}
      <section className="space-y-4">
        <h2 className="font-heading text-2xl font-semibold">Anúncios</h2>
        {anuncios.map((a, i) => { const an = r.anuncios[i]; return (
          <div key={a.id} className="grid grid-cols-[120px_1fr] gap-5 rounded-2xl border vidro p-5 max-md:grid-cols-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={an.refUrl} alt="referência" className="w-[120px] rounded-lg border border-[var(--rule)]" />
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-heading text-xl">{r.id} · {a.id}</span>
                <label className="flex items-center gap-2 text-[13px] text-[var(--ink-1)]"><Checkbox checked={a.temPessoas} onCheckedChange={(v) => mudar(a.id, { temPessoas: !!v })} />Tem pessoas (selo “*Imagem ilustrativa”)</label></div>
              <Textarea aria-label={`Copy do ${a.id}`} value={a.copy} rows={Math.min(10, a.copy.split("\n").length + 1)} onChange={(e) => mudar(a.id, { copy: e.target.value })} />
              <Textarea aria-label={`Instruções do ${a.id}`} value={a.instrucoes} placeholder="Instruções adicionais" rows={2} onChange={(e) => mudar(a.id, { instrucoes: e.target.value })} />
              <div className="flex flex-wrap items-center gap-3">
                {a.apoio.length > 0 && <p className="font-mono text-[11px] text-[var(--ink-2)]">apoio: {a.apoio.join(" · ")}</p>}
                <label className="cursor-pointer text-[13px] text-[var(--ink-1)] underline-offset-4 hover:underline">+ enviar arquivo de apoio
                  <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                    const f = e.target.files?.[0]; if (!f) return; const fd = new FormData(); fd.append("arquivo", f); fd.append("anuncio", a.id);
                    try {
                      const resp = await fetch(`/api/remessas/${r.id}/apoio`, { method: "POST", body: fd });
                      const j = resp.ok ? await resp.json().catch(() => ({})) : {};
                      if (resp.ok && j.arquivo) { toast.success(`${f.name} anexado ao ${a.id}`); setApoioLocal((l) => ({ ...l, [a.id]: [...(l[a.id] ?? []), j.arquivo] })); } else toast.error("falha ao enviar o arquivo");
                    } catch { toast.error("falha ao enviar o arquivo"); }
                    e.target.value = ""; }} /></label>
              </div>
            </div>
          </div>); })}
      </section>
      <SeletorModelos valor={modelos} onChange={setModelos} numAnuncios={anuncios.length} />
      <div className="sticky bottom-4 flex justify-end">
        <Button size="lg" disabled={r.duvidas.length > 0 || enviando || travado || !anuncios.length} onClick={() => acao({ tipo: "confirmar", anuncios, modelos }, "Produção iniciada")}>Gerar anúncios</Button>
      </div>
    </div>
  );
}
