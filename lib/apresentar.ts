import fs from "node:fs"; import path from "node:path";
import { raizDados, dirEntrada, dirInterno, arqPrompt } from "./caminhos";
import type { Anuncio, Arte, Remessa } from "./tipos";

export const urlArquivo = (abs: string, v?: string | number) =>
  `/api/arquivo?p=${encodeURIComponent(path.relative(raizDados(), abs))}${v !== undefined ? `&v=${v}` : ""}`;
/** `ajustavel`: existe o prompt da versão atual (artes migradas de antes do sistema não têm). */
export type ArteView = Arte & { url?: string; miniUrl?: string; versoes: { rotulo: string; url: string }[]; ajustavel: boolean };
export type RemessaView = Omit<Remessa, "anuncios"> & { anuncios: (Omit<Anuncio, "artes"> & { refUrl: string; artes: ArteView[] })[]; progresso: { prontas: number; total: number } };

/** Ordem numérica: v1-t1, v1-t2, v1, v2, …, v10 (a versão final de vN vem depois das suas tentativas). */
export function compararVersoes(a: string, b: string) {
  const k = (n: string) => { const m = n.match(/^v(\d+)(?:-t(\d+))?(?:-(\d+))?/); return m ? [Number(m[1]), m[2] ? Number(m[2]) : Infinity, Number(m[3] ?? 0)] : [Infinity, Infinity, 0]; };
  const x = k(a), y = k(b);
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1;
  return a.localeCompare(b);
}
function versoes(r: Remessa, an: Anuncio, a: Arte) {
  const d = path.join(dirInterno(r.id), "versoes", `${an.id}-${a.modelo}-${a.formato}`);
  if (!fs.existsSync(d)) return [];
  return fs.readdirSync(d).filter((n) => n.endsWith(".png")).sort(compararVersoes).map((n) => ({ rotulo: n.replace(".png", ""), url: urlArquivo(path.join(d, n)) }));
}
export function apresentarRemessa(r: Remessa): RemessaView {
  let prontas = 0, total = 0;
  const anuncios = r.anuncios.map((an) => ({ ...an, refUrl: urlArquivo(path.join(dirEntrada(r.id), an.ref)),
    artes: an.artes.map((a) => { total++; if (a.status === "pronta") prontas++;
      const v = `${a.versaoAtual}-${a.tentativas}`;
      return { ...a, url: a.arquivo ? urlArquivo(a.arquivo, v) : undefined, miniUrl: a.miniatura ? urlArquivo(a.miniatura, v) : undefined, versoes: versoes(r, an, a),
        ajustavel: fs.existsSync(arqPrompt(r.id, an.id, a.formato, a.modelo, a.versaoAtual)) }; }) }));
  return { ...r, anuncios, progresso: { prontas, total } };
}
export function resumoRemessa(r: Remessa) {
  const v = apresentarRemessa(r);
  const capa = v.anuncios.flatMap((a) => a.artes).find((a) => a.miniUrl)?.miniUrl;
  return { id: r.id, marca: r.marca, etapa: r.etapa, criadaEm: r.criadaEm, progresso: v.progresso, capaUrl: capa, erro: r.erro };
}
