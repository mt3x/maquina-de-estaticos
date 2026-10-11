import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs"; import os from "node:os"; import path from "node:path";
import { enfileirar, consumirComandos } from "@/lib/comandos";

beforeEach(() => { process.env.MAQUINA_DADOS = fs.mkdtempSync(path.join(os.tmpdir(), "maq-")); });

describe("comandos", () => {
  it("consome em ordem e apaga", () => {
    enfileirar({ tipo: "pausar", remessa: "R1" });
    enfileirar({ tipo: "retomar", remessa: "R1" });
    const c = consumirComandos();
    expect(c.map((x) => x.tipo)).toEqual(["pausar", "retomar"]);
    expect(c[0].id).toBeTruthy();
    expect(consumirComandos()).toEqual([]);
  });
  it("ignora arquivo corrompido e null sem travar", () => {
    enfileirar({ tipo: "pausar", remessa: "R1" });
    const d = path.join(process.env.MAQUINA_DADOS!, "fila", "comandos");
    fs.writeFileSync(path.join(d, "0000-ruim.json"), "{nao json");
    fs.writeFileSync(path.join(d, "0001-null.json"), "null");
    expect(consumirComandos().map((x) => x.tipo)).toEqual(["pausar"]);
  });
  it("50 comandos em tight loop mantêm ordem exata", () => {
    const tipos: string[] = [];
    for (let i = 0; i < 50; i++) {
      const tipo = i % 2 === 0 ? "pausar" : "retomar";
      tipos.push(tipo);
      enfileirar({ tipo, remessa: `R${i}` });
    }
    const c = consumirComandos();
    expect(c.map((x) => x.tipo)).toEqual(tipos);
    expect(c.map((x) => (x as { remessa?: string }).remessa)).toEqual(tipos.map((_, i) => `R${i}`));
  });
});
