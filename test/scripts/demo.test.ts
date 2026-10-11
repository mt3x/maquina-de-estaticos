import { describe, it, expect } from "vitest";
import os from "node:os"; import path from "node:path";
import { destinoNoTemp } from "../../scripts/imagens-readme/demo.mjs";
describe("demo das imagens do README", () => {
  it("só aceita destino dentro do diretório temporário do sistema (o montarDemo apaga a pasta)", () => {
    expect(destinoNoTemp(path.join(os.tmpdir(), "maquina-demo", "demo-dados"))).toBe(true);
    expect(destinoNoTemp(os.tmpdir())).toBe(false);
    expect(destinoNoTemp(path.join(os.tmpdir(), "..", "fora"))).toBe(false);
    expect(destinoNoTemp(path.join(os.homedir(), "maquina-demo"))).toBe(false);
  });
});
