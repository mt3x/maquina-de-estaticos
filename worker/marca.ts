import fs from "node:fs"; import path from "node:path";
import sharp from "sharp";
import { dirMarca } from "@/lib/caminhos";
import { lerJson, salvarJson } from "@/lib/estado";
import type { Comando } from "@/lib/tipos";
import * as tarefas from "./cerebro/tarefas";

export async function folhasDeContato(imagens: string[], destinoDir: string): Promise<string[]> {
  fs.mkdirSync(destinoDir, { recursive: true }); const out: string[] = []; const C = 300, colunas = 4, H = Math.round(C * 16 / 9);
  // Imagem ilegível é pulada; só falha se nenhuma sobrar.
  const buffers: Buffer[] = [];
  for (const img of imagens) {
    try { buffers.push(await sharp(img).resize(C, H, { fit: "contain", background: "#fff" }).png().toBuffer()); } catch { /* pula a ruim */ }
  }
  if (!buffers.length) throw new Error("nenhuma imagem válida na base");
  for (let i = 0; i < buffers.length; i += 8) {
    const lote = buffers.slice(i, i + 8); const linhas = Math.ceil(lote.length / colunas);
    const celulas = lote.map((input, j) => ({ input, left: (j % colunas) * C, top: Math.floor(j / colunas) * H }));
    const arq = path.join(destinoDir, `folha-${i / 8 + 1}.jpg`);
    await sharp({ create: { width: C * colunas, height: H * linhas, channels: 3, background: "#fff" } }).composite(celulas).jpeg({ quality: 80 }).toFile(arq);
    out.push(arq);
  }
  return out;
}

export async function extrairMarcaCmd(cmd: Extract<Comando, { tipo: "extrair_marca" }>, cerebro: Pick<typeof tarefas, "extrairMarca"> = tarefas) {
  const d = dirMarca(cmd.marca); const rascunho = path.join(d, ".rascunho.json");
  salvarJson(rascunho, { status: "extraindo" });
  try {
    const ent = lerJson<{ nome: string; aviso: string; paleta?: string; selo?: string }>(path.join(d, "entrada.json"));
    const baseDir = path.join(d, "base");
    const imgs = fs.existsSync(baseDir) ? fs.readdirSync(baseDir).filter((n) => /\.(png|jpe?g|webp)$/i.test(n)).sort().map((n) => path.join(baseDir, n)) : [];
    const folhas = await folhasDeContato(imgs.slice(0, 64), path.join(d, ".folhas"));
    const logo = path.join(d, "logo/logo-oficial.png");
    const s = await cerebro.extrairMarca({ folhasAbs: folhas, logoAbs: fs.existsSync(logo) ? logo : undefined, aviso: ent.aviso, paleta: ent.paleta, selo: ent.selo, nome: ent.nome, logDir: path.join(d, ".cerebro") });
    salvarJson(rascunho, { ...s, status: "pronto" });
  } catch (e) { salvarJson(rascunho, { status: "erro", msg: e instanceof Error ? e.message : String(e) }); }
}
