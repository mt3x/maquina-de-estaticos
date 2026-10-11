import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs"; import os from "node:os"; import path from "node:path";
import { interpretar, escreverPrompt, revisar, ajustar, extrairMarca } from "@/worker/cerebro/tarefas";

let resp: string, dados: string;
const pedidos = () => fs.readFileSync(resp + ".pedidos", "utf8").trim().split("\n").map((l) => JSON.parse(l));
beforeEach(() => {
  dados = fs.mkdtempSync(path.join(os.tmpdir(), "maq-")); process.env.MAQUINA_DADOS = dados;
  fs.mkdirSync(path.join(dados, "marcas/marca-teste/logo"), { recursive: true });
  fs.writeFileSync(path.join(dados, "marcas/marca-teste/identidade.json"), JSON.stringify({ aviso_legal: { texto: "AVISO OFICIAL" } }));
  resp = path.join(dados, "r.json"); process.env.CEREBRO_BIN = path.resolve("test/fakes/claude-falso.mjs"); process.env.CEREBRO_RESPOSTAS = resp;
});
const anuncio = { id: "AD02", ref: "ref-02.jpg", copy: "Café fresco", instrucoes: "", apoio: [], temPessoas: false, artes: [] };

describe("tarefas do cérebro", () => {
  it("interpretar manda docx, arquivos e caminhos das refs", async () => {
    fs.writeFileSync(resp, JSON.stringify([JSON.stringify({ anuncios: [{ id: "AD01", ref: "ref-01.jpg", copy: "x", instrucoes: "", apoio: [], temPessoas: true }], duvidas: [] })]));
    const r = await interpretar({ remessa: "R61", marca: "marca-teste", texto: "R61 - AD-01", arquivos: ["ref-01.jpg"], refsAbs: { 1: "/x/ref-01.jpg" }, logDir: path.join(dados, "log") });
    expect(r.anuncios[0].id).toBe("AD01");
    const p = pedidos()[0];
    expect(p.stdin).toContain("R61 - AD-01"); expect(p.stdin).toContain("/x/ref-01.jpg"); expect(p.stdin).toContain("AVISO OFICIAL");
    expect(p.args.join(" ")).toContain("interpretar.md");
  });
  it("escreverPrompt rejeita ingrediente fora do padrão e aceita na 2ª", async () => {
    const bom = { prompt: "x".repeat(250), ingredientes: ["entrada:ref-02.jpg", "marca:logo/logo-cor.png"] };
    fs.writeFileSync(resp, JSON.stringify([JSON.stringify({ ...bom, ingredientes: ["/abs/ref.jpg"] }), JSON.stringify(bom)]));
    const r = await escreverPrompt({ anuncio, formato: "FEED", marca: "marca-teste", entradaDir: "/e", logDir: path.join(dados, "log") });
    expect(r.ingredientes[0]).toBe("entrada:ref-02.jpg");
    expect(pedidos()[0].stdin).toContain("FEED");
  });
  it("revisar e ajustar devolvem o schema", async () => {
    fs.writeFileSync(resp, JSON.stringify([JSON.stringify({ ok: false, gravidade: "grave", problemas: ["copy traduzida"] }), JSON.stringify({ prompt: "y".repeat(250), ingredientes: ["entrada:ref-02.jpg"] })]));
    expect((await revisar({ arteAbs: "/a.png", anuncio, formato: "STORY", marca: "marca-teste", refAbs: "/r.jpg", logDir: dados })).gravidade).toBe("grave");
    expect((await ajustar({ promptAtual: "p", ingredientes: ["entrada:ref-02.jpg"], pedido: "tire a frase X", arteAbs: "/a.png", marca: "marca-teste", entradaDir: "/e", logDir: dados })).prompt.length).toBe(250);
    expect(pedidos()[1].stdin).toContain("tire a frase X");
  });
  it("escreverPrompt manda os exemplos de prompt aprovados", async () => {
    fs.writeFileSync(resp, JSON.stringify([JSON.stringify({ prompt: "x".repeat(250), ingredientes: ["entrada:ref-02.jpg"] })]));
    await escreverPrompt({ anuncio, formato: "STORY", marca: "marca-teste", entradaDir: "/e", logDir: path.join(dados, "log") });
    expect(pedidos()[0].stdin).toContain("EXEMPLO grao-norte-ad01-story.txt"); expect(pedidos()[0].stdin).toContain("LEGAL TEXT");
  });
  it("extrairMarca usa o molde da marca inventada, sem depender de marca cadastrada", async () => {
    fs.writeFileSync(resp, JSON.stringify([JSON.stringify({ identidade: { id: "nova" }, guiaMarkdown: "# Guia\n" + "x".repeat(300) })]));
    await extrairMarca({ folhasAbs: ["/f/folha-1.jpg"], aviso: "AVISO NOVO", nome: "Nova", logDir: path.join(dados, "log") });
    const p = pedidos()[0].stdin;
    expect(p).toContain('"id": "grao-norte"'); expect(p).toContain("Guia de identidade visual — Grão Norte"); expect(p).toContain("AVISO NOVO");
    expect(p).toContain("SELO INFORMADO: (nenhum)");
  });
  it("extrairMarca passa o selo informado pela pessoa (o selo é opt-in)", async () => {
    fs.writeFileSync(resp, JSON.stringify([JSON.stringify({ identidade: { id: "nova" }, guiaMarkdown: "# Guia\n" + "x".repeat(300) })]));
    await extrairMarca({ folhasAbs: ["/f/folha-1.jpg"], aviso: "AV", selo: "*Imagens ilustrativas geradas por IA", nome: "Nova", logDir: path.join(dados, "log") });
    expect(pedidos()[0].stdin).toContain("SELO INFORMADO: *Imagens ilustrativas geradas por IA");
  });
});
