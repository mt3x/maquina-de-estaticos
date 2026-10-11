"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CabecalhoPagina } from "@/components/maquina/shell";
import { SoltarPasta, type ArquivoComCaminho } from "@/components/maquina/soltar-pasta";

const IMAGEM = /\.(png|jpe?g|webp)$/i;
function Campo({ rotulo, dica, children }: { rotulo: string; dica?: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{rotulo}</Label>{children}{dica && <p className="text-[13px] text-[var(--ink-2)]">{dica}</p>}</div>;
}

export default function NovaMarca() {
  const router = useRouter(); const [base, setBase] = useState<ArquivoComCaminho[]>([]);
  const [nome, setNome] = useState(""); const [aviso, setAviso] = useState(""); const [paleta, setPaleta] = useState(""); const [selo, setSelo] = useState("");
  const [logo, setLogo] = useState<File | null>(null); const [fontes, setFontes] = useState<File[]>([]); const [enviando, setEnviando] = useState(false);
  const imagens = base.filter((b) => IMAGEM.test(b.caminho));
  async function enviar() {
    setEnviando(true); const fd = new FormData(); fd.append("nome", nome); fd.append("aviso", aviso); fd.append("paleta", paleta); fd.append("selo", selo);
    if (logo) fd.append("logo", logo); fontes.forEach((f) => fd.append("fontes", f)); imagens.forEach((b) => fd.append("base", b.arquivo));
    try {
      const r = await fetch("/api/marcas", { method: "POST", body: fd }); const j = await r.json();
      if (r.ok) router.push(`/marcas/${j.id}`); else toast.error(j.erro ?? "Falha ao enviar a marca");
    } catch { toast.error("Não consegui falar com o servidor"); }
    setEnviando(false);
  }
  return (<div className="mx-auto max-w-3xl">
    <CabecalhoPagina titulo="Nova marca" subtitulo="Envie anúncios da marca: o sistema extrai cores, tipografia e estilo, e você revisa antes de salvar." />
    <div className="space-y-8 rounded-2xl border vidro p-8 max-md:p-5">
      <Campo rotulo="Nome"><Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Grão Norte" /></Campo>
      <Campo rotulo="Base de anúncios (pasta)" dica="Quanto mais variados os anúncios, melhor a leitura do estilo. As primeiras 64 imagens são analisadas.">
        <SoltarPasta onArquivos={setBase} titulo="Arraste uma pasta com anúncios da marca" dica="ou clique para escolher · imagens PNG, JPG ou WEBP" />
        {base.length > 0 && <p className="font-mono text-[12px] text-[var(--ink-2)]">{imagens.length} imagens de {base.length} arquivos</p>}
      </Campo>
      <div className="grid grid-cols-2 gap-5 max-md:grid-cols-1">
        <Campo rotulo="Logo (PNG transparente)"><Input type="file" accept="image/png" onChange={(e) => setLogo(e.target.files?.[0] ?? null)} /></Campo>
        <Campo rotulo="Fontes (.otf/.ttf)"><Input type="file" multiple accept=".otf,.ttf" onChange={(e) => setFontes([...(e.target.files ?? [])])} /></Campo>
      </div>
      <Campo rotulo="Paleta oficial (opcional)" dica="Se ficar em branco, as cores são extraídas dos anúncios."><Input value={paleta} onChange={(e) => setPaleta(e.target.value)} placeholder="verde-pinho #2F5D50, creme #F4EDE1…" /></Campo>
      <Campo rotulo="Aviso legal obrigatório"><Textarea rows={5} value={aviso} onChange={(e) => setAviso(e.target.value)} /></Campo>
      <Campo rotulo="Selo de imagem ilustrativa (opcional)" dica="Ex.: *Imagens ilustrativas geradas por IA. Deixe vazio se a sua marca não usa."><Input value={selo} onChange={(e) => setSelo(e.target.value)} /></Campo>
      <Button size="lg" className="w-full" disabled={!nome.trim() || !imagens.length || enviando} onClick={enviar}>{enviando ? "Enviando…" : "Extrair identidade"}</Button>
    </div>
  </div>);
}
