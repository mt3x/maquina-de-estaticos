import fs from "node:fs";
import path from "node:path";
import { dirEntrada } from "./caminhos";

/** Lixo de sistema e arquivos de trava do Word/Office (`~$Remessa 61.docx`). */
export const IGNORAR = /^(\.ds_store|thumbs\.db|desktop\.ini)$|^\._|^~\$/i;

export function normalizarSegmento(nome: string): string {
  const ext = path.extname(nome);
  let base = ext ? nome.slice(0, -ext.length) : nome;
  base = base.replace(/\s*\(\d+\)\s*$/, ""); // "ref-2 (2)" → "ref-2"
  base = base
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const ref = base.match(/^ref-?0*(\d+)$/);
  if (ref) base = `ref-${ref[1].padStart(2, "0")}`;
  return base + ext.toLowerCase();
}

/** Remove a pasta-raiz enviada pelo navegador e normaliza cada segmento. */
export function normalizarCaminho(rel: string): string {
  const partes = rel.split(/[\\/]/).filter(Boolean);
  const semRaiz = partes.length > 1 ? partes.slice(1) : partes;
  return semRaiz.map(normalizarSegmento).join("/");
}

export function idDaPasta(nome: string): string | null {
  const m = nome.match(/remessa[^0-9]*(\d+)/i);
  return m ? `R${Number(m[1])}` : null;
}

export function gravarEntrada(id: string, arquivos: { rel: string; dados: Buffer }[]): string[] {
  const base = dirEntrada(id);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const a of arquivos) {
    const nomeOriginal = a.rel.split(/[\\/]/).pop() || "";
    if (IGNORAR.test(nomeOriginal)) continue;
    const rel = normalizarCaminho(a.rel);
    if (!rel) continue;
    const destino = path.join(base, rel);
    if (!destino.startsWith(base + path.sep)) continue;
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    fs.writeFileSync(destino, a.dados);
    if (!seen.has(rel)) {
      out.push(rel);
      seen.add(rel);
    }
  }
  return out;
}

export function acharRefs(rels: string[]): Record<number, string> {
  const out: Record<number, string> = {};
  for (const r of rels) {
    const m = path.basename(r).match(/^ref-(\d+)\.(jpe?g|png|webp)$/);
    if (m) out[Number(m[1])] = r;
  }
  return out;
}

/** O .docx da remessa: ignora travas do Word e, havendo mais de um, fica com o maior (o documento de verdade). */
export function acharDocx(rels: string[], tamanho?: (rel: string) => number): string | null {
  const docs = rels.filter((r) => r.toLowerCase().endsWith(".docx") && !IGNORAR.test(path.basename(r)));
  if (docs.length <= 1 || !tamanho) return docs[0] ?? null;
  const t = (r: string) => { try { return tamanho(r); } catch { return -1; } };
  return docs.reduce((a, b) => (t(b) > t(a) ? b : a));
}
