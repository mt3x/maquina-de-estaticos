import fs from "node:fs"; import path from "node:path";
import sharp from "sharp";
import { renomear } from "@/lib/estado";
// Sem cache: no Windows o cache do sharp mantém PNGs abertos e o rename seguinte falha (EPERM).
sharp.cache(false);
import { TAMANHO, type Formato } from "@/lib/tipos";

/** Escala para cobrir o tamanho final e corta o excesso no TOPO (o rodapé tem o aviso legal). */
export async function finalizar(bruto: string, destino: string, formato: Formato) {
  const { w, h } = TAMANHO[formato];
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  const tmp = `${destino}.tmp.png`;
  await sharp(bruto).resize(w, h, { fit: "cover", position: "bottom", kernel: "lanczos3" }).png().toFile(tmp);
  renomear(tmp, destino);
  return { w, h };
}
export async function miniatura(arq: string, destino: string) {
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  await sharp(arq).resize({ width: 480 }).webp({ quality: 82 }).toFile(destino);
}
