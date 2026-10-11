import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs"; import os from "node:os"; import path from "node:path";
import sharp from "sharp";
import { folhasDeContato, extrairMarcaCmd } from "@/worker/marca";
import { lerJson } from "@/lib/estado";

let dados: string;
beforeEach(() => { dados = fs.mkdtempSync(path.join(os.tmpdir(), "mar-")); process.env.MAQUINA_DADOS = dados; });
async function base(n: number) {
  const d = path.join(dados, "marcas/nova/base"); fs.mkdirSync(d, { recursive: true });
  for (let i = 0; i < n; i++) await sharp({ create: { width: 108, height: 192, channels: 3, background: "#0a5" } }).png().toFile(path.join(d, `a${i}.png`));
  fs.writeFileSync(path.join(dados, "marcas/nova/entrada.json"), JSON.stringify({ nome: "Nova", aviso: "AVISO", paleta: "" }));
}
describe("marca", () => {
  it("monta folhas de 8", async () => {
    await base(10);
    const f = await folhasDeContato(fs.readdirSync(path.join(dados, "marcas/nova/base")).map((n) => path.join(dados, "marcas/nova/base", n)), path.join(dados, "folhas"));
    expect(f.length).toBe(2);
  });
  it("extração grava rascunho pronto (ou erro)", async () => {
    await base(3);
    await extrairMarcaCmd({ id: "1", ts: "", tipo: "extrair_marca", marca: "nova" }, { extrairMarca: async () => ({ identidade: { id: "nova" }, guiaMarkdown: "# Guia\n" + "x".repeat(300) }) } as any);
    expect(lerJson<any>(path.join(dados, "marcas/nova/.rascunho.json")).status).toBe("pronto");
    await extrairMarcaCmd({ id: "2", ts: "", tipo: "extrair_marca", marca: "nova" }, { extrairMarca: async () => { throw new Error("cli fora"); } } as any);
    expect(lerJson<any>(path.join(dados, "marcas/nova/.rascunho.json"))).toMatchObject({ status: "erro", msg: "cli fora" });
  });
  it("extração repassa o selo da entrada (vazio quando a pessoa não informou)", async () => {
    await base(1); const visto: any[] = [];
    const cer = { extrairMarca: async (o: any) => { visto.push(o.selo); return { identidade: { id: "nova" }, guiaMarkdown: "# Guia\n" + "x".repeat(300) }; } } as any;
    await extrairMarcaCmd({ id: "1", ts: "", tipo: "extrair_marca", marca: "nova" }, cer);
    fs.writeFileSync(path.join(dados, "marcas/nova/entrada.json"), JSON.stringify({ nome: "Nova", aviso: "AVISO", paleta: "", selo: "*Selo X" }));
    await extrairMarcaCmd({ id: "2", ts: "", tipo: "extrair_marca", marca: "nova" }, cer);
    expect(visto).toEqual([undefined, "*Selo X"]);
  });
  it("pula imagem corrompida e falha só se nenhuma sobrar", async () => {
    await base(2); const d = path.join(dados, "marcas/nova/base");
    fs.writeFileSync(path.join(d, "a1x.png"), "lixo");
    const todas = fs.readdirSync(d).map((n) => path.join(d, n));
    expect((await folhasDeContato(todas, path.join(dados, "folhas"))).length).toBe(1);
    await expect(folhasDeContato([path.join(d, "a1x.png")], path.join(dados, "f2"))).rejects.toThrow("nenhuma imagem válida na base");
  });
});
