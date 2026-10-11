import { describe, it, expect } from "vitest"; import fs from "node:fs"; import os from "node:os"; import path from "node:path";
import { extrairProjetoFlow, definirVariavel, lerVariavel, gravarEnvLocal } from "@/lib/env-local";
const U = "0f1e2d3c-4b5a-6978-8a9b-0c1d2e3f4a5b";
describe("extrairProjetoFlow", () => {
  it.each([
    [`https://labs.google/fx/tools/flow/project/${U}`],
    [`https://labs.google/fx/pt/tools/flow/project/${U}?foo=1`],
    [`https://flow.google.com/project/${U}/`],
    [`  ${U.toUpperCase()}  `],
  ])("aceita %s", (t) => expect(extrairProjetoFlow(t)).toBe(U));
  it.each([[""], ["https://labs.google/fx/tools/flow"], ["meu projeto"]])("recusa %s", (t) => expect(extrairProjetoFlow(t)).toBeNull());
});
describe("definirVariavel", () => {
  it("substitui só a linha da chave", () => {
    expect(definirVariavel("PORT=3200\nFLOW_PROJETO=\nHOST=127.0.0.1\n", "FLOW_PROJETO", U)).toBe(`PORT=3200\nFLOW_PROJETO=${U}\nHOST=127.0.0.1\n`);
  });
  it("acrescenta quando não existe", () => { expect(definirVariavel("PORT=3200\n", "FLOW_PROJETO", U)).toBe(`PORT=3200\nFLOW_PROJETO=${U}\n`); });
  it("preserva CRLF do Windows", () => { expect(definirVariavel("PORT=3200\r\nFLOW_PROJETO=\r\n", "FLOW_PROJETO", U)).toBe(`PORT=3200\r\nFLOW_PROJETO=${U}\r\n`); });
});
describe("lerVariavel / gravarEnvLocal", () => {
  const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "env-"));
  it("arquivo ausente → undefined", () => { expect(lerVariavel(tmp(), "FLOW_PROJETO")).toBeUndefined(); });
  it("chave ausente → undefined; vazia → ''", () => {
    const d = tmp(); fs.writeFileSync(path.join(d, ".env.local"), "PORT=3200\nFLOW_PROJETO=\n");
    expect(lerVariavel(d, "OUTRA")).toBeUndefined(); expect(lerVariavel(d, "FLOW_PROJETO")).toBe("");
  });
  it("lê valor com CRLF", () => {
    const d = tmp(); fs.writeFileSync(path.join(d, ".env.local"), `PORT=3200\r\nFLOW_PROJETO=${U}\r\n`);
    expect(lerVariavel(d, "FLOW_PROJETO")).toBe(U); expect(lerVariavel(d, "PORT")).toBe("3200");
  });
  it("gravarEnvLocal cria do exemplo e lerVariavel enxerga", () => {
    const d = tmp(); fs.writeFileSync(path.join(d, ".env.local.example"), "PORT=3200\nFLOW_PROJETO=\n");
    gravarEnvLocal(d, "FLOW_PROJETO", U); expect(lerVariavel(d, "FLOW_PROJETO")).toBe(U); expect(lerVariavel(d, "PORT")).toBe("3200");
  });
});
