import fs from "node:fs"; import os from "node:os"; import path from "node:path";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
vi.mock("@/lib/docx", () => ({ textoDocx: vi.fn(async () => "R61 - AD-01\nREF: ref-01") }));
import { ambiente, remessaImportada, depsFalsas } from "./helpers";
import { ciclo, batimento, limitesFlow } from "@/worker/index";
import { enfileirar } from "@/lib/comandos";
import { lerRemessa, lerJson } from "@/lib/estado";
import { arqStatus, arqWorker } from "@/lib/caminhos";

beforeEach(() => { ambiente(); });
afterEach(() => { process.env.FLOW_PROJETO = "0f1e2d3c-4b5a-6978-8a9b-0c1d2e3f4a5b"; });

describe("ciclo do worker", () => {
  it("importada → interpreta; comando confirmar → prompts → envio → gera e grava status", async () => {
    remessaImportada("R61"); const deps = await depsFalsas(); const chrome = async () => true;
    await ciclo(deps, { chrome }); expect(lerRemessa("R61").etapa).toBe("aguardando_confirmacao");
    enfileirar({ tipo: "confirmar", remessa: "R61", modelos: ["nano-banana-2-1"], anuncios: [{ id: "AD01", copy: "Copy um", instrucoes: "", temPessoas: false, apoio: [] }] });
    for (let i = 0; i < 6; i++) await ciclo(deps, { chrome });
    expect(lerRemessa("R61").etapa).toBe("concluida");
    expect(lerJson<any>(arqStatus()).saldo).toBe(7000);
  });
  it("não envia ao Flow com Chrome fora do ar", async () => {
    remessaImportada("R61"); const deps = await depsFalsas();
    await ciclo(deps, { chrome: async () => true });
    enfileirar({ tipo: "confirmar", remessa: "R61", modelos: ["nano-banana-2-1"], anuncios: [{ id: "AD01", copy: "Copy um", instrucoes: "", temPessoas: false, apoio: [] }] });
    for (let i = 0; i < 4; i++) await ciclo(deps, { chrome: async () => false });
    expect(deps.flow.gerar).not.toHaveBeenCalled();
    expect(lerJson<any>(arqStatus()).chrome).toBe(false);
  });
  it("sem projeto do Flow configurado nunca toca no Flow", async () => {
    remessaImportada("R61"); const deps = await depsFalsas(); const chrome = async () => true; const raizEnv = fs.mkdtempSync(path.join(os.tmpdir(), "env-"));
    await ciclo(deps, { chrome, raizEnv }); process.env.FLOW_PROJETO = "";
    enfileirar({ tipo: "confirmar", remessa: "R61", modelos: ["nano-banana-2-1"], anuncios: [{ id: "AD01", copy: "Copy um", instrucoes: "", temPessoas: false, apoio: [] }] });
    await ciclo(deps, { chrome, raizEnv }); await ciclo(deps, { chrome, raizEnv }); // confirma e escreve os prompts (etapas sem Flow seguem)
    expect(lerRemessa("R61").etapa).toBe("enviando_referencias");
    for (let i = 0; i < 4; i++) await ciclo(deps, { chrome, raizEnv });
    expect(deps.flow.gerar).not.toHaveBeenCalled(); expect(deps.flow.subir).not.toHaveBeenCalled();
    expect(lerRemessa("R61").etapa).toBe("enviando_referencias");
  });
  it("configurar com o sistema no ar: FLOW_PROJETO novo no .env.local destrava o envio sem reiniciar", async () => {
    const raizEnv = fs.mkdtempSync(path.join(os.tmpdir(), "env-")); const chrome = async () => true;
    remessaImportada("R61"); const deps = await depsFalsas();
    await ciclo(deps, { chrome, raizEnv }); process.env.FLOW_PROJETO = "";
    enfileirar({ tipo: "confirmar", remessa: "R61", modelos: ["nano-banana-2-1"], anuncios: [{ id: "AD01", copy: "Copy um", instrucoes: "", temPessoas: false, apoio: [] }] });
    await ciclo(deps, { chrome, raizEnv }); await ciclo(deps, { chrome, raizEnv });
    for (let i = 0; i < 3; i++) await ciclo(deps, { chrome, raizEnv });
    expect(deps.flow.gerar).not.toHaveBeenCalled(); expect(process.env.FLOW_PROJETO).toBe("");
    fs.writeFileSync(path.join(raizEnv, ".env.local"), "FLOW_PROJETO=0f1e2d3c-4b5a-6978-8a9b-0c1d2e3f4a5b\n");
    for (let i = 0; i < 6; i++) await ciclo(deps, { chrome, raizEnv });
    expect(process.env.FLOW_PROJETO).toBe("0f1e2d3c-4b5a-6978-8a9b-0c1d2e3f4a5b"); expect(deps.flow.gerar).toHaveBeenCalled();
  });
  it("comando de remessa inexistente não derruba o ciclo", async () => {
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    const deps = await depsFalsas(); enfileirar({ tipo: "pausar", remessa: "NAOEXISTE" });
    await expect(ciclo(deps, { chrome: async () => true })).resolves.toBeTypeOf("boolean");
    expect(erro).toHaveBeenCalled(); erro.mockRestore();
  });
  it("batimento grava worker.json com pid, ts e ocupado", async () => {
    batimento("flow");
    const w = lerJson<any>(arqWorker());
    expect(w.pid).toBe(process.pid); expect(w.ocupado).toBe("flow"); expect(typeof w.ts).toBe("string");
    batimento(null); expect(lerJson<any>(arqWorker()).ocupado).toBeNull();
  });
  it("sem arte na fila não sonda o Chrome", async () => {
    remessaImportada("R61"); const deps = await depsFalsas(); const chrome = vi.fn(async () => true);
    await ciclo(deps, { chrome }); await ciclo(deps, { chrome });
    expect(chrome).not.toHaveBeenCalled();
  });
});

describe("limitesFlow (travas da conta)", () => {
  it("o .env.local não consegue tirar a pausa nem aumentar tentativas", () => {
    expect(limitesFlow({})).toEqual({ minS: 45, maxS: 60, maxTentativas: 3 });
    expect(limitesFlow({ PAUSA_MIN_S: "45s", PAUSA_MAX_S: "abc", MAX_TENTATIVAS: "x" })).toEqual({ minS: 45, maxS: 60, maxTentativas: 3 });
    expect(limitesFlow({ PAUSA_MIN_S: "5", PAUSA_MAX_S: "10", MAX_TENTATIVAS: "10" })).toEqual({ minS: 45, maxS: 45, maxTentativas: 3 });
    expect(limitesFlow({ PAUSA_MIN_S: "90", PAUSA_MAX_S: "120", MAX_TENTATIVAS: "2" })).toEqual({ minS: 90, maxS: 120, maxTentativas: 2 });
  });
});
