import { describe, it, expect } from "vitest";
import { avaliarVersao, checarNode, checarPython, checarChrome, checarDisco, checarClaude, descobrirPython, discoLivreGb } from "@/lib/verificacoes";
describe("verificações", () => {
  it("avaliarVersao", () => {
    expect(avaliarVersao("Python 3.11.4", [3, 10])).toBe(true); expect(avaliarVersao("Python 3.9.1", [3, 10])).toBe(false); expect(avaliarVersao("lixo", [3, 10])).toBe(false);
    expect(avaliarVersao("22.1.0", [20, 12])).toBe(true); expect(avaliarVersao("20.2.0", [20, 12])).toBe(false);
  });
  it("node", () => {
    expect(checarNode("20.12.0").ok).toBe(true); expect(checarNode("22.3.0").ok).toBe(true);
    expect(checarNode("20.11.0").ok).toBe(false); expect(checarNode("18.19.0").ok).toBe(false);
  });
  it("python: tenta python3 e python, e diz como instalar", () => {
    expect(checarPython((bin) => (bin === "python" ? "Python 3.12.0" : null), "win32").ok).toBe(true);
    const r = checarPython(() => null, "darwin"); expect(r.ok).toBe(false); expect(r.comoResolver).toMatch(/brew install python/);
    expect(checarPython(() => null, "win32").comoResolver).toMatch(/winget install/);
    expect(checarPython(() => "Python 3.9.6", "darwin").ok).toBe(false);
  });
  it("python no Windows: o atalho da Microsoft Store (sem saída) não conta; tenta py -3 e devolve comando + args", () => {
    const rodar = (bin: string, args: string[]) => (bin === "py" && args[0] === "-3" ? "Python 3.12.1" : null);
    expect(descobrirPython(rodar, "win32")).toEqual({ cmd: "py", args: ["-3"], versao: "Python 3.12.1", ok: true });
    expect(checarPython(rodar, "win32")).toMatchObject({ ok: true, detalhe: "Python 3.12.1 (py -3)" });
    expect(descobrirPython((bin) => (bin === "python3" ? "Python 3.11.0" : null), "darwin")).toEqual({ cmd: "python3", args: [], versao: "Python 3.11.0", ok: true });
    const tentados: string[] = []; descobrirPython((b, a) => { tentados.push([b, ...a.slice(0, -1)].join(" ")); return null; }, "darwin");
    expect(tentados).not.toContain("py -3");
  });
  it("winget sempre com -e --id e aceitando os acordos (sem perguntas no terminal); node pelo brew sem keg", () => {
    const W = /^winget install -e --id \S+ --accept-source-agreements --accept-package-agreements$/;
    expect(checarNode("18.0.0", "win32").comoResolver).toMatch(W); expect(checarPython(() => null, "win32").comoResolver).toMatch(W);
    expect(checarChrome(() => null, "win32").comoResolver).toMatch(W);
    expect(checarNode("18.0.0", "darwin").comoResolver).toBe("brew install node");
  });
  it("chrome", () => { expect(checarChrome(() => "/x/chrome").ok).toBe(true); expect(checarChrome(() => null).ok).toBe(false); });
  it("disco", () => { expect(checarDisco(10).ok).toBe(true); expect(checarDisco(2.5).ok).toBe(false); });
  it("disco livre em GB decimais (1e9), a mesma unidade do /api/status", () => {
    expect(discoLivreGb("/x", () => ({ bavail: 3_000_000, bsize: 1000 }) as any)).toBe(3);
    expect(discoLivreGb("/x", () => { throw new Error("sem statfs"); })).toBe(0);
  });
  it("claude: instalado e logado", () => {
    expect(checarClaude(() => JSON.stringify({ is_error: false, result: "ok" })).ok).toBe(true);
    expect(checarClaude(() => null).comoResolver).toMatch(/claude\.com|claude\.ai/);
    expect(checarClaude(() => JSON.stringify({ is_error: true, result: "Invalid API key · Please run /login" })).detalhe).toMatch(/login/i);
    expect(checarClaude(() => "não é json").ok).toBe(false);
  });
});
