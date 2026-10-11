import { describe, it, expect, beforeEach, vi } from "vitest";
import fs from "node:fs"; import path from "node:path";
import sharp from "sharp";
vi.mock("@/lib/docx", () => ({ textoDocx: vi.fn(async () => "R60 - AD-01\nREF: ref-01\nCopy: Copy um") }));
import { ambiente, remessaImportada, depsFalsas } from "./helpers";
import { interpretarRemessa, confirmarRemessa, escreverPrompts, enviarReferencias, processarProximaArte, aplicarAjuste, aplicarControle, recuperarAoIniciar } from "@/worker/remessa";
import { lerRemessa, salvarRemessa, lerJson } from "@/lib/estado";
import { arqEntrega, raizDados } from "@/lib/caminhos";

beforeEach(() => { ambiente(); });

async function ateGerando(modelos: ("nano-banana-pro" | "nano-banana-2-1")[], deps: any, id = "R61") {
  await interpretarRemessa(id, deps);
  confirmarRemessa({ id: "c", ts: "", tipo: "confirmar", remessa: id, modelos, anuncios: [{ id: "AD01", copy: "Copy um", instrucoes: "", temPessoas: true, apoio: [] }] });
  await escreverPrompts(id, deps); await enviarReferencias(id, deps);
}

describe("interpretação e confirmação", () => {
  it("levanta dúvida de id divergente e de ref ausente", async () => {
    remessaImportada("R61"); const deps = await depsFalsas();
    (deps.cerebro.interpretar as any).mockResolvedValueOnce({ anuncios: [{ id: "AD01", ref: "ref-01.jpg", copy: "a", instrucoes: "", apoio: [], temPessoas: false }, { id: "AD02", ref: "ref-02.jpg", copy: "b", instrucoes: "", apoio: ["foto.png"], temPessoas: false }], duvidas: [] });
    await interpretarRemessa("R61", deps);
    const r = lerRemessa("R61");
    expect(r.etapa).toBe("aguardando_confirmacao");
    const p = r.duvidas.map((d) => d.pergunta).join(" | ");
    expect(p).toMatch(/R60/); expect(p).toMatch(/ref-02/); expect(p).toMatch(/foto\.png/);
  });
  it("responder reinterpreta com as respostas no pedido", async () => {
    remessaImportada("R61"); const deps = await depsFalsas();
    await interpretarRemessa("R61", deps, { d1: "Uma versão por foto" });
    expect((deps.cerebro.interpretar as any).mock.calls[0][0].texto).toContain("Uma versão por foto");
  });
  it("confirmar com 1 modelo cria 2 artes e grava preferência", async () => {
    remessaImportada("R61"); const deps = await depsFalsas();
    await ateGerando(["nano-banana-2-1"], deps);
    const r = lerRemessa("R61");
    expect(r.anuncios[0].artes.map((a) => `${a.modelo}/${a.formato}`)).toEqual(["nano-banana-2-1/STORY", "nano-banana-2-1/FEED"]);
    expect(lerJson<any>(path.join(raizDados(), "preferencias.json")).ultimosModelos).toEqual(["nano-banana-2-1"]);
    expect(r.etapa).toBe("gerando");
    expect(deps.flow.subir).toHaveBeenCalledTimes(2); // ref + logo, sem repetir
    await enviarReferencias("R61", deps, false); expect(deps.flow.subir).toHaveBeenCalledTimes(2);
  });
});

describe("geração", () => {
  it("ok → pronta, 1080x1920 na entrega, selo só com pessoas, conclui", async () => {
    remessaImportada("R61"); const deps = await depsFalsas();
    await ateGerando(["nano-banana-2-1"], deps);
    await processarProximaArte(deps); await processarProximaArte(deps);
    const r = lerRemessa("R61"); const a = r.anuncios[0].artes[0];
    expect(a.status).toBe("pronta");
    const m = await sharp(arqEntrega("R61", "AD01", "nano-banana-2-1", "STORY")).metadata();
    expect([m.width, m.height]).toEqual([1080, 1920]);
    expect(deps.pos.aplicarSelo).toHaveBeenCalledTimes(2);
    expect(r.etapa).toBe("concluida");
    expect(await processarProximaArte(deps)).toBeNull();
  });
  it("falha leve repete no fim da fila e falha após 3", async () => {
    remessaImportada("R61"); const deps = await depsFalsas([{ status: "falha_leve" }]);
    await ateGerando(["nano-banana-2-1"], deps);
    for (let i = 0; i < 6; i++) await processarProximaArte(deps);
    const artes = lerRemessa("R61").anuncios[0].artes;
    expect(artes.map((a) => a.status)).toEqual(["falhou", "falhou"]);
    expect(artes[0].tentativas).toBe(3);
  });
  it("bloqueio para a remessa", async () => {
    remessaImportada("R61"); const deps = await depsFalsas([{ status: "bloqueio", msg: "403" }]);
    await ateGerando(["nano-banana-2-1"], deps);
    await processarProximaArte(deps);
    const r = lerRemessa("R61"); expect(r.etapa).toBe("erro"); expect(r.erro?.tipo).toBe("flow_bloqueio");
    expect(await processarProximaArte(deps)).toBeNull();
  });
  it("revisão grave gera de novo; após 3 vira defeito", async () => {
    remessaImportada("R61");
    const deps = await depsFalsas([{ status: "ok" }], [{ ok: false, gravidade: "grave", problemas: ["copy traduzida"] }]);
    await ateGerando(["nano-banana-2-1"], deps);
    for (let i = 0; i < 6; i++) await processarProximaArte(deps);
    const a = lerRemessa("R61").anuncios[0].artes[0];
    expect(a.status).toBe("defeito"); expect(a.tentativas).toBe(3); expect(a.revisao?.problemas).toContain("copy traduzida");
  });
});

describe("ajuste, controle e recuperação", () => {
  it("ajuste com escopo formato e 1 modelo afeta só a arte existente e versiona", async () => {
    remessaImportada("R61"); const deps = await depsFalsas();
    await ateGerando(["nano-banana-2-1"], deps);
    await processarProximaArte(deps); await processarProximaArte(deps);
    await aplicarAjuste({ id: "a", ts: "", tipo: "ajuste", remessa: "R61", anuncio: "AD01", formato: "STORY", modelo: "nano-banana-2-1", escopo: "formato", texto: "tire a frase X" }, deps);
    const r = lerRemessa("R61"); const [s, f] = r.anuncios[0].artes;
    expect(s).toMatchObject({ status: "na_fila", versaoAtual: 2, prioridade: 1 }); expect(f.status).toBe("pronta");
    expect(r.etapa).toBe("gerando");
    const entrega = arqEntrega("R61", "AD01", "nano-banana-2-1", "STORY"); const v1 = path.join(raizDados(), "remessas/R61/.interno/versoes/AD01-nano-banana-2-1-STORY/v1.png");
    // I4: a imagem entregue continua lá até a nova versão existir
    expect(fs.existsSync(entrega)).toBe(true); expect(fs.existsSync(v1)).toBe(false); expect(s.arquivo).toBe(entrega);
    expect(fs.readFileSync(path.join(raizDados(), "remessas/R61/.interno/prompts/AD01-STORY-nano-banana-2-1-v2.txt"), "utf8")).toContain("AJUSTADO");
    const antes = fs.readFileSync(entrega);
    await processarProximaArte(deps);
    expect(fs.readFileSync(v1).equals(antes)).toBe(true); expect(fs.existsSync(entrega)).toBe(true);
    expect(lerRemessa("R61").anuncios[0].artes[0]).toMatchObject({ status: "pronta", versaoAtual: 2, versaoEntregue: 2 });
  });
  it("pausar, retomar, cancelar e preferida", async () => {
    remessaImportada("R61"); const deps = await depsFalsas();
    await ateGerando(["nano-banana-pro", "nano-banana-2-1"], deps);
    await aplicarControle({ id: "1", ts: "", tipo: "pausar", remessa: "R61" });
    expect(lerRemessa("R61").etapa).toBe("pausada"); expect(await processarProximaArte(deps)).toBeNull();
    await aplicarControle({ id: "2", ts: "", tipo: "retomar", remessa: "R61" }); expect(lerRemessa("R61").etapa).toBe("gerando");
    await aplicarControle({ id: "3", ts: "", tipo: "preferida", remessa: "R61", anuncio: "AD01", formato: "FEED", modelo: "nano-banana-pro" });
    expect(lerRemessa("R61").anuncios[0].preferida?.FEED).toBe("nano-banana-pro");
    await aplicarControle({ id: "4", ts: "", tipo: "cancelar", remessa: "R61" });
    const r = lerRemessa("R61"); expect(r.etapa).toBe("concluida"); expect(r.anuncios[0].artes.every((a) => a.status === "falhou")).toBe(true);
  });
  it("reinício com arte gerando → na_fila (mediaId mantido) e remessa pausada", async () => {
    remessaImportada("R61"); const deps = await depsFalsas();
    await ateGerando(["nano-banana-2-1"], deps);
    const r = lerRemessa("R61"); Object.assign(r.anuncios[0].artes[0], { status: "gerando", tentativas: 1, mediaId: "m9" }); salvarRemessa(r);
    recuperarAoIniciar();
    const r2 = lerRemessa("R61");
    expect(r2.anuncios[0].artes[0]).toMatchObject({ status: "na_fila", mediaId: "m9", tentativas: 1 });
    expect(r2.etapa).toBe("pausada"); expect(r2.etapaAntesDaPausa).toBe("gerando");
  });
});

describe("rodada de correções", () => {
  it("C1: bloqueio leva todas as remessas em gerando para erro", async () => {
    remessaImportada("R61"); remessaImportada("R62", { "ref-01.jpg": "x", "remessa.docx": "" });
    const deps = await depsFalsas([{ status: "bloqueio", msg: "403" }]);
    await ateGerando(["nano-banana-2-1"], deps, "R61"); await ateGerando(["nano-banana-2-1"], deps, "R62");
    await processarProximaArte(deps);
    expect(await processarProximaArte(deps)).toBeNull();
    const a = lerRemessa("R61"), b = lerRemessa("R62");
    expect([a.etapa, b.etapa]).toEqual(["erro", "erro"]);
    expect(a.erro?.tipo).toBe("flow_bloqueio"); expect(b.erro?.tipo).toBe("flow_bloqueio");
    expect(b.erro?.msg).toMatch(/parada global.*R61/);
  });
  it("I1: retomar após erro volta para a etapa em que parou", async () => {
    remessaImportada("R61"); const deps = await depsFalsas();
    await interpretarRemessa("R61", deps);
    confirmarRemessa({ id: "c", ts: "", tipo: "confirmar", remessa: "R61", modelos: ["nano-banana-2-1"], anuncios: [{ id: "AD01", copy: "c", instrucoes: "", temPessoas: false, apoio: [] }] });
    (deps.cerebro.escreverPrompt as any).mockRejectedValueOnce(new Error("falhou"));
    await escreverPrompts("R61", deps);
    expect(lerRemessa("R61").etapa).toBe("erro");
    await aplicarControle({ id: "1", ts: "", tipo: "retomar", remessa: "R61" });
    expect(lerRemessa("R61").etapa).toBe("escrevendo_prompts");
  });
  it("I2: exceção no pós não deixa a arte travada", async () => {
    remessaImportada("R61"); const deps = await depsFalsas();
    (deps.pos.finalizar as any) = vi.fn(async () => { throw new Error("sharp quebrou"); });
    await ateGerando(["nano-banana-2-1"], deps);
    await processarProximaArte(deps);
    const r = lerRemessa("R61");
    expect(["pos", "gerando"]).not.toContain(r.anuncios[0].artes[0].status);
    expect(r.etapa).toBe("erro"); expect(r.erro?.tipo).toBe("outro");
  });
  it("I4: ajuste de 2 modelos cuja 2ª chamada falha não muda estado nem arquivos", async () => {
    remessaImportada("R61"); const deps = await depsFalsas();
    await ateGerando(["nano-banana-pro", "nano-banana-2-1"], deps);
    for (let i = 0; i < 4; i++) await processarProximaArte(deps);
    const antes = lerRemessa("R61").anuncios[0].artes.map((a) => a.versaoAtual);
    (deps.cerebro.ajustar as any).mockResolvedValueOnce({ prompt: "p", ingredientes: [] }).mockRejectedValueOnce(new Error("cérebro caiu"));
    await aplicarAjuste({ id: "a", ts: "", tipo: "ajuste", remessa: "R61", anuncio: "AD01", formato: "STORY", modelo: "nano-banana-pro", escopo: "anuncio", texto: "x" }, deps);
    const r = lerRemessa("R61");
    expect(r.anuncios[0].artes.map((a) => a.versaoAtual)).toEqual(antes);
    expect(r.anuncios[0].artes.every((a) => a.status === "pronta" && /ajuste falhou/.test(a.erro ?? ""))).toBe(true);
    expect(r.etapa).not.toBe("erro");
    expect(fs.existsSync(path.join(raizDados(), "remessas/R61/.interno/versoes"))).toBe(false);
  });
  it("I5: dúvida determinística já respondida não volta", async () => {
    remessaImportada("R61"); const deps = await depsFalsas();
    await interpretarRemessa("R61", deps);
    expect(lerRemessa("R61").duvidas.map((d) => d.id)).toContain("id-divergente");
    await interpretarRemessa("R61", deps, { "id-divergente": "R61" });
    expect(lerRemessa("R61").duvidas.map((d) => d.id)).not.toContain("id-divergente");
  });
  it("I6: confirmar fora de aguardando_confirmacao lança", async () => {
    remessaImportada("R61");
    expect(() => confirmarRemessa({ id: "c", ts: "", tipo: "confirmar", remessa: "R61", modelos: ["nano-banana-2-1"], anuncios: [] })).toThrow(/aguardando confirmação/);
  });
  it("S1: nova tentativa por revisão grave guarda a versão entregue", async () => {
    remessaImportada("R61");
    const deps = await depsFalsas([{ status: "ok" }], [{ ok: false, gravidade: "grave", problemas: ["x"] }, { ok: true, gravidade: "nenhuma", problemas: [] }]);
    await ateGerando(["nano-banana-2-1"], deps);
    for (let i = 0; i < 3; i++) await processarProximaArte(deps);
    expect(fs.existsSync(path.join(raizDados(), "remessas/R61/.interno/versoes/AD01-nano-banana-2-1-STORY/v1-t1.png"))).toBe(true);
  });
});
