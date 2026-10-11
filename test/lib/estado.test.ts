import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs"; import os from "node:os"; import path from "node:path";
import { salvarJson, lerJson, salvarRemessa, lerRemessa, listarRemessas, registrar } from "@/lib/estado";
import { dentroDe, raizDados } from "@/lib/caminhos";
import { criarArtes, type Remessa } from "@/lib/tipos";

let dir: string;
beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), "maq-")); process.env.MAQUINA_DADOS = dir; });

const nova = (id: string): Remessa => ({ id, marca: "marca-teste", modelos: ["nano-banana-2-1"], criadaEm: "2026-10-08T00:00:00Z",
  atualizadaEm: "2026-10-08T00:00:00Z", etapa: "importada", duvidas: [], anuncios: [], log: [] });

describe("estado", () => {
  it("grava atômico e lê de volta", () => {
    const arq = path.join(dir, "x", "a.json");
    salvarJson(arq, { a: 1 });
    expect(lerJson(arq)).toEqual({ a: 1 });
    expect(fs.readdirSync(path.dirname(arq))).toEqual(["a.json"]);
  });
  it("lerJson devolve padrão se não existe", () => { expect(lerJson(path.join(dir, "nao.json"), [])).toEqual([]); });
  it("salva, lista e registra log", () => {
    const r = nova("R61"); registrar(r, "importada", "pasta recebida"); salvarRemessa(r);
    expect(lerRemessa("R61").log[0].msg).toBe("pasta recebida");
    expect(listarRemessas().map((x) => x.id)).toEqual(["R61"]);
    expect(raizDados()).toBe(path.resolve(dir));
  });
  it("criarArtes respeita modelos escolhidos e ordem", () => {
    expect(criarArtes(["nano-banana-2-1"]).map((a) => `${a.modelo}/${a.formato}`)).toEqual(["nano-banana-2-1/STORY", "nano-banana-2-1/FEED"]);
    expect(criarArtes(["nano-banana-2-1", "nano-banana-pro"]).length).toBe(4);
    expect(criarArtes(["nano-banana-2-1", "nano-banana-pro"])[0].modelo).toBe("nano-banana-pro");
  });
  it("dentroDe bloqueia traversal", () => {
    expect(dentroDe(dir, "remessas/R1/a.png")).toBe(true);
    expect(dentroDe(dir, "../etc/passwd")).toBe(false);
    expect(dentroDe(dir, "/etc/passwd")).toBe(false);
  });
  it("listarRemessas resiliente a estado.json corrompido", () => {
    const r1 = nova("R1"); salvarRemessa(r1);
    const r2 = nova("R2"); salvarRemessa(r2);
    const estadoR2 = path.join(dir, "remessas", "R2", "estado.json");
    fs.writeFileSync(estadoR2, "{quebrado");
    expect(listarRemessas().map((x) => x.id)).toEqual(["R1"]);
  });
});
