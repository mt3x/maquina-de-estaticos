import { describe, it, expect } from "vitest";
import path from "node:path";
import { pythonBin, comandoSpawn } from "@/lib/plataforma";
import { comandoSpawn as comandoSpawnBase, venvPronto } from "../../scripts/verificacoes-base.mjs";
const comandos = [comandoSpawn, comandoSpawnBase];

describe("pythonBin", () => {
  it("usa PYTHON_BIN quando definido", () => {
    expect(pythonBin({ env: { PYTHON_BIN: "/opt/py" }, existe: () => false })).toBe("/opt/py");
  });
  it("usa o .venv do Mac", () => {
    const raiz = "/proj";
    expect(pythonBin({ plataforma: "darwin", raiz, env: {}, existe: (p) => p === path.join(raiz, ".venv", "bin", "python") }))
      .toBe(path.join(raiz, ".venv", "bin", "python"));
  });
  it("usa o .venv do Windows, inclusive com espaço no caminho", () => {
    const raiz = "C:\\Pessoas\\Maria Silva\\maquina";
    const esperado = path.join(raiz, ".venv", "Scripts", "python.exe");
    expect(pythonBin({ plataforma: "win32", raiz, env: {}, existe: (p) => p === esperado })).toBe(esperado);
  });
  it("sem .venv cai para python3 (Mac) e python (Windows)", () => {
    expect(pythonBin({ plataforma: "darwin", raiz: "/x", env: {}, existe: () => false })).toBe("python3");
    expect(pythonBin({ plataforma: "win32", raiz: "C:\\x", env: {}, existe: () => false })).toBe("python");
  });
});

describe("comandoSpawn", () => {
  it("no Mac chama direto, sem shell", () => {
    expect(comandoSpawn("claude", ["-p"], "darwin")).toEqual({ cmd: "claude", args: ["-p"], shell: false });
  });
  it("no Windows usa shell e protege argumentos com espaço e aspas", () => {
    const r = comandoSpawn("claude", ["--add-dir", "C:\\Pessoas\\Maria Silva\\x", 'diz "oi"'], "win32");
    expect(r.shell).toBe(true);
    expect(r.cmd).toBe("claude");
    expect(r.args).toEqual(["--add-dir", '"C:\\Pessoas\\Maria Silva\\x"', '"diz \\"oi\\""']);
  });
  it("no Windows põe aspas em argumentos com & | < > ^ % ( ) (o cmd.exe interpreta esses caracteres)", () => {
    for (const c of comandos) {
      const args = ["a&b", "a|b", "a<b", "a>b", "a^b", "50%", "(x)", "simples"];
      expect(c("npm", args, "win32").args).toEqual(['"a&b"', '"a|b"', '"a<b"', '"a>b"', '"a^b"', '"50%"', '"(x)"', "simples"]);
    }
  });
  it("no Windows não mexe em binário com caminho absoluto .exe", () => {
    expect(comandoSpawn("C:\\py\\python.exe", ["a b"], "win32")).toEqual({ cmd: "C:\\py\\python.exe", args: ["a b"], shell: false });
  });
});

describe("venvPronto (npm run instalar)", () => {
  it("só conta como pronto se o Python do .venv existir (Mac e Windows)", () => {
    const mac = path.join("/proj", ".venv", "bin", "python"); const win = path.join("C:\\proj", ".venv", "Scripts", "python.exe");
    expect(venvPronto({ raiz: "/proj", plataforma: "darwin", existe: (p) => p === mac })).toBe(true);
    expect(venvPronto({ raiz: "C:\\proj", plataforma: "win32", existe: (p) => p === win })).toBe(true);
    // .venv meio criado (pasta sem o binário) não conta
    expect(venvPronto({ raiz: "/proj", plataforma: "darwin", existe: (p) => p === path.join("/proj", ".venv") })).toBe(false);
  });
});
