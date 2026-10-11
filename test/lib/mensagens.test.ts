import { describe, it, expect } from "vitest";
import { tituloErro } from "@/lib/mensagens";
describe("tituloErro (D2)", () => {
  it("diferencia custo não lido de custo > 0", () => {
    expect(tituloErro({ tipo: "flow_custo", msg: "custo não lido na UI: …" })).toBe("Não consegui ler o custo na tela do Flow — nada foi enviado.");
    expect(tituloErro({ tipo: "flow_custo", msg: "CUSTO>0 na UI (Generating will use 20 credits) — não submetido" })).toMatch(/acima de 0 créditos/);
    expect(tituloErro({ tipo: "flow_bloqueio", msg: "403" })).toMatch(/bloqueou/);
  });
});
