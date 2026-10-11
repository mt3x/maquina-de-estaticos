import { describe, it, expect, beforeEach, vi } from "vitest";
import fs from "node:fs"; import path from "node:path";
vi.mock("@/lib/docx", () => ({ textoDocx: vi.fn(async () => "R60 - AD-01\nREF: ref-01\nCopy: Copy um") }));
import { ambiente, remessaImportada, depsFalsas } from "./helpers";
import { interpretarRemessa, confirmarRemessa, escreverPrompts, enviarReferencias, processarProximaArte, aplicarAjuste, aplicarControle, recuperarAoIniciar } from "@/worker/remessa";
import { ciclo, processarComandos, outroWorkerVivo } from "@/worker/index";
import { Ritmo } from "@/worker/fila-flow";
import { ErroBloqueioFlow } from "@/worker/flow-driver";
import { lerBloqueio, lerStatus, bloquear } from "@/worker/status";
import { enfileirar } from "@/lib/comandos";
import { lerRemessa, salvarRemessa } from "@/lib/estado";
import { arqEntrega, raizDados } from "@/lib/caminhos";

beforeEach(() => { ambiente(); });
const confirmar = (id: string, modelos: ("nano-banana-pro" | "nano-banana-2-1")[] = ["nano-banana-2-1"]) =>
  confirmarRemessa({ id: "c", ts: "", tipo: "confirmar", remessa: id, modelos, anuncios: [{ id: "AD01", copy: "Copy um", instrucoes: "", temPessoas: false, apoio: [] }] });
async function ateGerando(deps: any, id = "R61") { await interpretarRemessa(id, deps); confirmar(id); await escreverPrompts(id, deps); await enviarReferencias(id, deps); }
const ajuste = (texto = "tire a frase X") => ({ id: "a", ts: "", tipo: "ajuste" as const, remessa: "R61", anuncio: "AD01", formato: "STORY" as const, modelo: "nano-banana-2-1" as const, escopo: "arte" as const, texto });
const bloqueioR61 = () => bloquear({ tipo: "flow_bloqueio", msg: "HTTP 403", em: new Date().toISOString(), remessa: "R61" });

describe("C2: parada global persistente", () => {
  it("bloqueio na geração grava status.json e impede R62 (prompts → referências) de subir e gerar", async () => {
    remessaImportada("R61"); remessaImportada("R62");
    const deps = await depsFalsas([{ status: "bloqueio", msg: "HTTP 403 PUBLIC_ERROR" }]);
    await ateGerando(deps, "R61");
    await interpretarRemessa("R62", deps); confirmar("R62"); // R62 parada em escrevendo_prompts
    await processarProximaArte(deps);
    expect(lerBloqueio()).toMatchObject({ tipo: "flow_bloqueio", remessa: "R61" });
    (deps.flow.subir as any).mockClear(); (deps.flow.gerar as any).mockClear();
    for (let i = 0; i < 5; i++) await ciclo(deps, { chrome: async () => true });
    const r62 = lerRemessa("R62");
    expect(r62.etapa).toBe("enviando_referencias"); // esperando, sem erro e sem consumir tentativas
    expect(r62.anuncios[0].artes.every((a) => a.tentativas === 0)).toBe(true);
    expect(deps.flow.subir).not.toHaveBeenCalled(); expect(deps.flow.gerar).not.toHaveBeenCalled();
  });
  it("remessa já em gerando não gera com bloqueio ativo (mesmo sem estar em erro)", async () => {
    remessaImportada("R62"); const deps = await depsFalsas();
    await ateGerando(deps, "R62"); bloqueioR61();
    expect(await processarProximaArte(deps)).toBeNull();
    expect(deps.flow.gerar).not.toHaveBeenCalled(); expect(lerRemessa("R62").anuncios[0].artes[0].tentativas).toBe(0);
  });
  it("ajuste com bloqueio não toca no Flow", async () => {
    remessaImportada("R61"); const deps = await depsFalsas();
    await ateGerando(deps); await processarProximaArte(deps); await processarProximaArte(deps);
    (deps.cerebro.ajustar as any).mockImplementationOnce(async (o: any) => ({ prompt: o.promptAtual + " NOVO", ingredientes: [...o.ingredientes, "entrada:ref-01.jpg", "marca:logo/novo.png"] }));
    fs.writeFileSync(path.join(raizDados(), "marcas/marca-teste/logo/novo.png"), "png");
    (deps.flow.subir as any).mockClear(); (deps.flow.gerar as any).mockClear(); bloqueioR61();
    await aplicarAjuste(ajuste(), deps);
    for (let i = 0; i < 3; i++) await ciclo(deps, { chrome: async () => true });
    expect(deps.flow.subir).not.toHaveBeenCalled(); expect(deps.flow.gerar).not.toHaveBeenCalled(); expect(deps.flow.limparCompositor).not.toHaveBeenCalled();
    expect(lerRemessa("R61").anuncios[0].artes[0]).toMatchObject({ status: "na_fila", versaoAtual: 2 });
    // liberado: o ingrediente novo do ajuste sobe antes da geração
    enfileirar({ tipo: "desbloquear" }); await ciclo(deps, { chrome: async () => true });
    expect(lerBloqueio()).toBeNull();
    expect((deps.flow.subir as any).mock.calls.map((c: any[]) => c[1])).toEqual(["marca-teste-novo.png"]);
    expect(deps.flow.gerar).toHaveBeenCalledTimes(1);
  });
  it("bloqueio no upload (saída 403) aciona a parada global", async () => {
    remessaImportada("R61"); const deps = await depsFalsas();
    (deps.flow.subir as any).mockRejectedValueOnce(new ErroBloqueioFlow("upload: 403"));
    await interpretarRemessa("R61", deps); confirmar("R61"); await escreverPrompts("R61", deps); await enviarReferencias("R61", deps);
    expect(lerRemessa("R61")).toMatchObject({ etapa: "erro", erro: { tipo: "flow_bloqueio" } });
    expect(lerBloqueio()?.remessa).toBe("R61");
  });
  it("retomar a remessa bloqueada limpa o bloqueio; retomar outra não", async () => {
    remessaImportada("R61"); remessaImportada("R62");
    const deps = await depsFalsas([{ status: "custo", msg: "CUSTO>0" }]);
    await ateGerando(deps, "R61"); await ateGerando(deps, "R62");
    await processarProximaArte(deps);
    expect(lerBloqueio()?.tipo).toBe("flow_custo");
    await aplicarControle({ id: "1", ts: "", tipo: "retomar", remessa: "R62" });
    expect(lerBloqueio()).not.toBeNull();
    await aplicarControle({ id: "2", ts: "", tipo: "retomar", remessa: "R61" });
    expect(lerBloqueio()).toBeNull(); expect(lerRemessa("R61").etapa).toBe("gerando");
  });
});

describe("I1: comandos aplicados depois da pausa de 45–60 s", () => {
  it("pausar enfileirado durante a espera impede o envio", async () => {
    remessaImportada("R61"); const deps = await depsFalsas();
    await ateGerando(deps);
    let t = 1_000_000;
    deps.ritmo = new Ritmo({ dormir: async (ms) => { t += ms; enfileirar({ tipo: "pausar", remessa: "R61" }); }, agora: () => t, aleatorio: () => 0, minS: 45, maxS: 60, ultimoFimInicial: t - 5_000 });
    deps.aplicarPendentes = () => processarComandos(deps);
    expect(await processarProximaArte(deps)).toBeNull();
    expect(deps.flow.gerar).not.toHaveBeenCalled(); expect(lerRemessa("R61").etapa).toBe("pausada");
  });
});

describe("I2: um só worker e pausa persistida", () => {
  it("Ritmo semeado com o último fim espera só o restante", async () => {
    let t = 100_000; const esperas: number[] = [];
    const r = new Ritmo({ dormir: async (ms) => { esperas.push(ms); t += ms; }, agora: () => t, aleatorio: () => 0, minS: 45, maxS: 60, ultimoFimInicial: t - 20_000 });
    expect(await r.antesDeEnviar()).toBe(25_000);
  });
  it("o fim da geração é gravado em status.json", async () => {
    remessaImportada("R61"); const deps = await depsFalsas();
    const fins: number[] = []; deps.ritmo = new Ritmo({ dormir: async () => {}, agora: () => 42, aleatorio: () => 0, minS: 0, maxS: 0, aoRegistrarFim: (ms) => fins.push(ms) });
    await ateGerando(deps); await processarProximaArte(deps);
    expect(fins).toEqual([42]); expect(typeof lerStatus().ultimoEnvio).toBe("number");
  });
  it("a pausa conta mesmo quando o driver lança", async () => {
    remessaImportada("R61"); const deps = await depsFalsas(); const fim = vi.spyOn(deps.ritmo, "registrarFim");
    (deps.flow.gerar as any).mockRejectedValueOnce(new Error("driver morreu"));
    await ateGerando(deps); await processarProximaArte(deps);
    expect(fim).toHaveBeenCalledTimes(1);
  });
  it("outroWorkerVivo", () => {
    const agora = Date.parse("2026-10-08T12:00:10Z"); const vivo = () => true;
    expect(outroWorkerVivo({ pid: 999, ts: "2026-10-08T12:00:00Z" }, agora, 1, vivo)).toBe(999);
    expect(outroWorkerVivo({ pid: 999, ts: "2026-10-08T12:00:00Z" }, agora, 1, () => false)).toBeNull(); // pid morto
    expect(outroWorkerVivo({ pid: 999, ts: "2026-10-08T11:59:00Z" }, agora, 1, vivo)).toBeNull(); // batimento velho
    expect(outroWorkerVivo({ pid: 1, ts: "2026-10-08T12:00:00Z" }, agora, 1, vivo)).toBeNull(); // eu mesmo
    expect(outroWorkerVivo({}, agora, 1, vivo)).toBeNull();
  });
});

describe("I3: respostas acumuladas entre rodadas", () => {
  it("2 rodadas: a 2ª envia todas as respostas e nada respondido volta", async () => {
    remessaImportada("R61"); const deps = await depsFalsas();
    const an = { id: "AD01", ref: "ref-01.jpg", copy: "c", instrucoes: "", apoio: [], temPessoas: false };
    (deps.cerebro.interpretar as any)
      .mockResolvedValueOnce({ anuncios: [an], duvidas: [{ pergunta: "Qual tom de verde?" }] })
      .mockResolvedValueOnce({ anuncios: [an], duvidas: [{ pergunta: "Qual tom de verde?" }, { pergunta: "Usar foto 2?" }] })
      .mockResolvedValueOnce({ anuncios: [an], duvidas: [{ pergunta: "Qual tom de verde?" }, { pergunta: "Usar foto 2?" }] });
    await interpretarRemessa("R61", deps);
    let r = lerRemessa("R61"); const verde = r.duvidas.find((d) => d.pergunta === "Qual tom de verde?")!;
    expect(r.duvidas.map((d) => d.id)).toContain("id-divergente");
    await interpretarRemessa("R61", deps, { "id-divergente": "R61", [verde.id]: "Verde-musgo" });
    r = lerRemessa("R61");
    expect(r.duvidas.map((d) => d.pergunta)).toEqual(["Usar foto 2?"]); // só a nova
    await interpretarRemessa("R61", deps, { [r.duvidas[0].id]: "Sim" });
    r = lerRemessa("R61");
    expect(r.duvidas).toEqual([]); expect(r.respostas).toHaveLength(3);
    const texto = (deps.cerebro.interpretar as any).mock.calls[2][0].texto as string;
    expect(texto).toContain("Qual tom de verde? → Verde-musgo"); expect(texto).toContain("→ R61"); expect(texto).toContain("Usar foto 2? → Sim");
  });
});

describe("I4: ajuste preserva a entrega", () => {
  async function prontaComAjuste(deps: any) {
    await ateGerando(deps); await processarProximaArte(deps); await processarProximaArte(deps);
    await aplicarAjuste(ajuste("mais contraste"), deps);
  }
  it("ajuste que falha 3x volta a pronta com a versão anterior e o erro explicado", async () => {
    remessaImportada("R61"); const deps = await depsFalsas([{ status: "ok" }, { status: "ok" }, { status: "falha_leve", msg: "UI: Failed" }]);
    await prontaComAjuste(deps);
    const entrega = arqEntrega("R61", "AD01", "nano-banana-2-1", "STORY"); const antes = fs.readFileSync(entrega);
    for (let i = 0; i < 3; i++) await processarProximaArte(deps);
    const a = lerRemessa("R61").anuncios[0].artes[0];
    expect(a).toMatchObject({ status: "pronta", versaoAtual: 1, arquivo: entrega }); expect(a.ajustePendente).toBeUndefined();
    expect(a.erro).toMatch(/mais contraste.*não foi concluído.*versão anterior foi mantida/);
    expect(fs.readFileSync(entrega).equals(antes)).toBe(true);
    expect(lerRemessa("R61").etapa).toBe("concluida");
  });
  it("cancelar durante o ajuste mantém a versão anterior como pronta", async () => {
    remessaImportada("R61"); const deps = await depsFalsas();
    await prontaComAjuste(deps);
    await aplicarControle({ id: "x", ts: "", tipo: "cancelar", remessa: "R61" });
    const a = lerRemessa("R61").anuncios[0].artes[0];
    expect(a).toMatchObject({ status: "pronta", versaoAtual: 1 }); expect(a.erro).toMatch(/cancelada/);
    expect(fs.existsSync(arqEntrega("R61", "AD01", "nano-banana-2-1", "STORY"))).toBe(true);
  });
  it("arte sem prompt (migrada) não é ajustada e ganha erro visível", async () => {
    remessaImportada("R61"); const deps = await depsFalsas();
    await ateGerando(deps); await processarProximaArte(deps); await processarProximaArte(deps);
    fs.rmSync(path.join(raizDados(), "remessas/R61/.interno/prompts"), { recursive: true });
    await aplicarAjuste(ajuste(), deps);
    const a = lerRemessa("R61").anuncios[0].artes[0];
    expect(a).toMatchObject({ status: "pronta", versaoAtual: 1 }); expect(a.erro).toMatch(/produção anterior ao sistema/);
    expect(deps.cerebro.ajustar).not.toHaveBeenCalled();
  });
});

describe("I7: gerar de novo", () => {
  it("arte falhou volta para a fila zerada e a remessa concluída volta a gerar", async () => {
    remessaImportada("R61"); const deps = await depsFalsas([{ status: "falha_leve" }, { status: "falha_leve" }, { status: "falha_leve" }, { status: "falha_leve" }, { status: "falha_leve" }, { status: "falha_leve" }, { status: "ok" }]);
    await ateGerando(deps);
    for (let i = 0; i < 6; i++) await processarProximaArte(deps);
    expect(lerRemessa("R61").etapa).toBe("concluida");
    enfileirar({ tipo: "tentar_de_novo", remessa: "R61", anuncio: "AD01", formato: "STORY", modelo: "nano-banana-2-1" });
    await processarComandos(deps);
    const r = lerRemessa("R61"); expect(r.etapa).toBe("gerando");
    expect(r.anuncios[0].artes[0]).toMatchObject({ status: "na_fila", tentativas: 0 }); expect(r.anuncios[0].artes[0].erro).toBeUndefined();
    await processarProximaArte(deps);
    expect(lerRemessa("R61").anuncios[0].artes[0].status).toBe("pronta");
  });
  it("ignora arte que não está com falha", async () => {
    remessaImportada("R61"); const deps = await depsFalsas();
    await ateGerando(deps); await processarProximaArte(deps);
    await aplicarControle({ id: "t", ts: "", tipo: "tentar_de_novo", remessa: "R61", anuncio: "AD01", formato: "STORY", modelo: "nano-banana-2-1" });
    expect(lerRemessa("R61").anuncios[0].artes[0]).toMatchObject({ status: "pronta", tentativas: 1 });
  });
});

describe("I9, M1, M2", () => {
  it("I9: responder com a remessa em produção é ignorado e registrado", async () => {
    remessaImportada("R61"); const deps = await depsFalsas();
    await ateGerando(deps); await processarProximaArte(deps);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    enfileirar({ tipo: "responder", remessa: "R61", respostas: { x: "y" } });
    await processarComandos(deps);
    const r = lerRemessa("R61");
    expect(r.etapa).toBe("gerando"); expect(r.anuncios[0].artes[0].status).toBe("pronta");
    expect(r.log.at(-1)?.msg).toMatch(/respostas ignoradas/);
    expect(deps.cerebro.interpretar).toHaveBeenCalledTimes(1);
  });
  it("M1: arte em voo na 3ª tentativa não ganha 4ª; antes disso a tentativa interrompida conta", async () => {
    remessaImportada("R61"); const deps = await depsFalsas();
    await ateGerando(deps);
    const r = lerRemessa("R61"); Object.assign(r.anuncios[0].artes[0], { status: "gerando", tentativas: 3 }); Object.assign(r.anuncios[0].artes[1], { status: "gerando", tentativas: 1 }); salvarRemessa(r);
    recuperarAoIniciar(3);
    const [s, f] = lerRemessa("R61").anuncios[0].artes;
    expect(s).toMatchObject({ status: "falhou", tentativas: 3 }); expect(s.erro).toMatch(/reiniciou/);
    expect(f).toMatchObject({ status: "na_fila", tentativas: 1 });
  });
  it("M2: envio de referências espera o Chrome", async () => {
    remessaImportada("R61"); const deps = await depsFalsas();
    await interpretarRemessa("R61", deps); confirmar("R61"); await escreverPrompts("R61", deps);
    for (let i = 0; i < 3; i++) await ciclo(deps, { chrome: async () => false });
    expect(deps.flow.subir).not.toHaveBeenCalled(); expect(lerRemessa("R61").etapa).toBe("enviando_referencias");
    await ciclo(deps, { chrome: async () => true });
    expect(deps.flow.subir).toHaveBeenCalled(); expect(lerRemessa("R61").etapa).toBe("gerando");
  });
});
