import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs"; import os from "node:os"; import path from "node:path";
import { apresentarRemessa, compararVersoes } from "@/lib/apresentar";
import { arqPrompt, dirInterno } from "@/lib/caminhos";
import { criarArtes, type Remessa } from "@/lib/tipos";

beforeEach(() => { process.env.MAQUINA_DADOS = fs.mkdtempSync(path.join(os.tmpdir(), "apr-")); });
const rem = (): Remessa => ({ id: "R61", marca: "marca-teste", modelos: ["nano-banana-2-1"], criadaEm: "", atualizadaEm: "", etapa: "concluida", duvidas: [], log: [],
  anuncios: [{ id: "AD01", ref: "ref-01.jpg", copy: "", instrucoes: "", apoio: [], temPessoas: false, artes: criarArtes(["nano-banana-2-1"]) }] });
describe("apresentar", () => {
  it("H3: versões em ordem numérica", () => {
    const d = path.join(dirInterno("R61"), "versoes", "AD01-nano-banana-2-1-STORY"); fs.mkdirSync(d, { recursive: true });
    for (const n of ["v10.png", "v2.png", "v1.png", "v1-t1.png", "v1-t2.png", "v2-t10.png", "v2-t9.png"]) fs.writeFileSync(path.join(d, n), "x");
    expect(apresentarRemessa(rem()).anuncios[0].artes[0].versoes.map((v) => v.rotulo)).toEqual(["v1-t1", "v1-t2", "v1", "v2-t9", "v2-t10", "v2", "v10"]);
    expect(["v10", "v9"].sort(compararVersoes)).toEqual(["v9", "v10"]);
  });
  it("I5: ajustavel só quando existe o prompt da versão atual", () => {
    const p = arqPrompt("R61", "AD01", "STORY", "nano-banana-2-1", 1); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, "{}");
    expect(apresentarRemessa(rem()).anuncios[0].artes.map((a) => a.ajustavel)).toEqual([true, false]);
  });
});
