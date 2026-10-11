import fs from "node:fs"; import os from "node:os"; import path from "node:path";
import sharp from "sharp";
import { vi } from "vitest";
import { Ritmo } from "@/worker/fila-flow";
import type { Deps } from "@/worker/remessa";
import type { ResultadoGeracao } from "@/worker/flow-driver";
import { salvarRemessa } from "@/lib/estado";
import { dirEntrada } from "@/lib/caminhos";
import type { Remessa } from "@/lib/tipos";
import { finalizar, miniatura } from "@/worker/pos/finalizar";

export function ambiente() {
  const dados = fs.mkdtempSync(path.join(os.tmpdir(), "maq-")); process.env.MAQUINA_DADOS = dados; process.env.FLOW_PROJETO = "0f1e2d3c-4b5a-6978-8a9b-0c1d2e3f4a5b"; // projeto de teste: o worker só toca no Flow (falso) se configurado
  fs.mkdirSync(path.join(dados, "marcas/marca-teste/logo"), { recursive: true });
  fs.writeFileSync(path.join(dados, "marcas/marca-teste/identidade.json"), JSON.stringify({ aviso_legal: { texto: "AVISO" } }));
  fs.writeFileSync(path.join(dados, "marcas/marca-teste/logo/logo-cor.png"), "png");
  return dados;
}
export function remessaImportada(id = "R61", arquivos: Record<string, string> = { "ref-01.jpg": "x", "remessa.docx": "" }): Remessa {
  for (const [rel, c] of Object.entries(arquivos)) { const a = path.join(dirEntrada(id), rel); fs.mkdirSync(path.dirname(a), { recursive: true }); fs.writeFileSync(a, c); }
  const r: Remessa = { id, marca: "marca-teste", modelos: [], criadaEm: new Date().toISOString(), atualizadaEm: "", etapa: "importada", duvidas: [], anuncios: [], log: [] };
  salvarRemessa(r); return r;
}
/** gerações: lista de resultados que o flow falso devolve em sequência (cria PNG quando ok). */
export async function depsFalsas(geracoes: Partial<ResultadoGeracao>[] = [{ status: "ok" }], revisoes: { ok: boolean; gravidade: "nenhuma" | "leve" | "grave"; problemas: string[] }[] = [{ ok: true, gravidade: "nenhuma", problemas: [] }]) {
  let gi = 0, ri = 0;
  const deps: Deps = {
    cerebro: {
      interpretar: vi.fn(async () => ({ anuncios: [{ id: "AD01", ref: "ref-01.jpg", copy: "Copy um", instrucoes: "", apoio: [], temPessoas: true }], duvidas: [] })),
      escreverPrompt: vi.fn(async (o: any) => ({ prompt: `PROMPT ${o.anuncio.id} ${o.formato} ` + "x".repeat(200), ingredientes: ["entrada:ref-01.jpg", "marca:logo/logo-cor.png"] })),
      revisar: vi.fn(async () => revisoes[Math.min(ri++, revisoes.length - 1)]),
      ajustar: vi.fn(async (o: any) => ({ prompt: o.promptAtual + " AJUSTADO", ingredientes: o.ingredientes })),
    } as any,
    flow: {
      gerar: vi.fn(async (o: any) => {
        const g = geracoes[Math.min(gi++, geracoes.length - 1)];
        if (g.status === "ok") { const [w, h] = o.formato === "STORY" ? [768, 1376] : [1024, 1024];
          fs.mkdirSync(path.dirname(o.destino), { recursive: true });
          await sharp({ create: { width: w, height: h, channels: 3, background: "#456" } }).png().toFile(o.destino);
          return { status: "ok", arquivo: o.destino, segundos: 36, creditos: 0, saldo: 7000, mediaId: `m${gi}`, largura: w, altura: h, ...g } as ResultadoGeracao; }
        return { status: "erro", ...g } as ResultadoGeracao;
      }),
      subir: vi.fn(async () => {}), limparCompositor: vi.fn(async () => {}),
    } as any,
    pos: { finalizar, miniatura, aplicarSelo: vi.fn(async () => {}) } as any,
    ritmo: new Ritmo({ dormir: async () => {}, agora: () => Date.now(), aleatorio: () => 0, minS: 0, maxS: 0 }),
    dormir: async () => {}, maxTentativas: 3,
  };
  return deps;
}
