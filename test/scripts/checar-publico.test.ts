import { describe, it, expect } from "vitest";
import { acharProibidos, TERMOS, ENTRADAS } from "../../scripts/checar-publico.mjs";
describe("checar-publico", () => {
  it("acha termo no conteúdo e no nome, sem diferenciar caixa", () => {
    const r = acharProibidos([{ caminho: "a/ok.txt", conteudo: "linha 1\nSegredo-X aqui" }, { caminho: "proibido/x.png", conteudo: "" }], ["segredo-x", "proibido"]);
    expect(r).toEqual([{ caminho: "a/ok.txt", termo: "segredo-x", linha: 2 }, { caminho: "proibido/x.png", termo: "proibido", linha: 0 }]);
  });
  it("termo de palavra inteira não casa dentro de outra palavra", () => {
    const t = [{ termo: "lish", palavra: true }];
    expect(acharProibidos([{ caminho: "a.txt", conteudo: "we publish it" }], t)).toEqual([]);
    expect(acharProibidos([{ caminho: "a.txt", conteudo: "x LISH y" }], t)).toEqual([{ caminho: "a.txt", termo: "lish", linha: 1 }]);
  });
  it("caminho do Windows (barra invertida) também casa com o termo de caminho", () => {
    const arqs = [{ caminho: "a.txt", conteudo: "ok\nC:\\Fulano\\Segredo\\x" }];
    expect(acharProibidos(arqs, ["/fulano/"])).toEqual([{ caminho: "a.txt", termo: "/fulano/", linha: 2 }]);
    expect(acharProibidos([{ caminho: "b.txt", conteudo: "/Fulano/x" }], ["\\fulano\\"])).toEqual([{ caminho: "b.txt", termo: "\\fulano\\", linha: 1 }]);
  });
  it("a lista padrão inclui o termo de caminho do Windows", () => {
    expect(TERMOS).toContain(["\\", "users", "\\"].join(""));
  });
  it("a lista padrão cobre os termos do autor sem escrevê-los em claro", () => {
    expect(TERMOS.length).toBeGreaterThanOrEqual(5);
    expect(TERMOS.every((t: string) => t === t.toLowerCase())).toBe(true);
    expect(ENTRADAS.length).toBe(TERMOS.length);
  });
});
