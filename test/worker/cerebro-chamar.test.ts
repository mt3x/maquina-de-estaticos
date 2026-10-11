import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs"; import os from "node:os"; import path from "node:path";
import { z } from "zod";
import { chamarCerebro, extrairJson, ErroCerebro, comandoCerebro } from "@/worker/cerebro/chamar";

const schema = z.object({ ok: z.boolean() });
let resp: string;
function respostas(lista: string[]) { fs.writeFileSync(resp, JSON.stringify(lista)); }
beforeEach(() => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "cer-")); resp = path.join(d, "r.json");
  process.env.CEREBRO_BIN = path.resolve("test/fakes/claude-falso.mjs"); process.env.CEREBRO_RESPOSTAS = resp;
  fs.writeFileSync(path.join(d, "s.md"), "sistema");
});
const chamar = () => chamarCerebro({ tarefa: "t", sistema: path.join(path.dirname(resp), "s.md"), pedido: "faça", dirs: [os.tmpdir()], schema });

describe("extrairJson", () => {
  it("pega bloco ```json", () => { expect(extrairJson('texto\n```json\n{"ok":true}\n```\nfim')).toEqual({ ok: true }); });
  it("pega objeto solto em prosa", () => { expect(extrairJson('Claro! {"ok":false} pronto.')).toEqual({ ok: false }); });
  it("falha sem JSON", () => { expect(() => extrairJson("nada")).toThrow(); });
});
describe("chamarCerebro", () => {
  it("valida e devolve", async () => { respostas(['{"ok":true}']); expect(await chamar()).toEqual({ ok: true }); });
  it("tenta de novo uma vez quando inválido e manda o erro", async () => {
    respostas(['{"ok":"sim"}', 'Aqui: {"ok":true}']);
    expect(await chamar()).toEqual({ ok: true });
    const pedidos = fs.readFileSync(resp + ".pedidos", "utf8").trim().split("\n").map((l) => JSON.parse(l));
    expect(pedidos[1].stdin).toContain("inválida");
    expect(pedidos[0].args).toContain("--allowedTools");
  });
  it("lança ErroCerebro após 2 inválidas", async () => {
    respostas(["sem json", "ainda sem"]); await expect(chamar()).rejects.toBeInstanceOf(ErroCerebro);
  });
  it("lança ErroCerebro se o processo falha", async () => {
    respostas(["__SAIR_1__"]); await expect(chamar()).rejects.toBeInstanceOf(ErroCerebro);
  });
  it("inclui a causa do JSON do stdout quando sai com erro", async () => {
    respostas(["__ERRO_JSON__"]);
    await expect(chamar()).rejects.toThrow(/error_max_turns/);
  });
});
describe("comandoCerebro", () => {
  it("script .mjs/.js (o fake dos testes) roda pelo próprio Node, sem shell, também no Windows", () => {
    expect(comandoCerebro("C:\\proj\\test\\fakes\\claude-falso.mjs", ["-p"], "win32")).toEqual({ cmd: process.execPath, args: ["C:\\proj\\test\\fakes\\claude-falso.mjs", "-p"], shell: false });
    expect(comandoCerebro("/p/claude-falso.mjs", ["-p"], "darwin")).toEqual({ cmd: process.execPath, args: ["/p/claude-falso.mjs", "-p"], shell: false });
  });
  it("o claude de verdade segue o comandoSpawn (shell no Windows)", () => {
    expect(comandoCerebro("claude", ["-p"], "win32").shell).toBe(true);
    expect(comandoCerebro("claude", ["-p"], "darwin")).toEqual({ cmd: "claude", args: ["-p"], shell: false });
  });
});
