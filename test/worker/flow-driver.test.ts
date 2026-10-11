import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs"; import os from "node:os"; import path from "node:path";
import { gerar, subir, limparCompositor, classificar, numeroSaldo, classificarUpload, ErroBloqueioFlow } from "@/worker/flow-driver";

let d: string;
const saidas = (l: unknown[]) => fs.writeFileSync(process.env.FAKE_GEN!, JSON.stringify(l));
beforeEach(() => {
  d = fs.mkdtempSync(path.join(os.tmpdir(), "drv-"));
  process.env.FLOW_DRIVER_DIR = path.resolve("test/fakes/driver");
  process.env.FAKE_GEN = path.join(d, "gen.json"); process.env.FAKE_UPLOADS = path.join(d, "up.txt");
  fs.writeFileSync(path.join(d, "p.txt"), "prompt");
  delete process.env.FAKE_JA_EXISTE; delete process.env.FAKE_UPLOAD_SAIDA; delete process.env.FAKE_UPLOAD_CODE;
});
const g = (formato: "STORY" | "FEED" = "STORY") => gerar({ modelo: "nano-banana-2-1", formato, promptArq: path.join(d, "p.txt"), destino: path.join(d, "o.png"), ingredientes: ["r61-ref-01.jpg", "marca-teste-logo-cor.png"] });

describe("flow-driver", () => {
  it("ok com saldo e argumentos certos", async () => {
    saidas([{ code: 0, rec: { cost_n: 0, seconds: 36.1, media_id: "m1", credits_after: { value: "7,255" } }, png: { w: 768, h: 1376 } }]);
    const r = await g();
    expect(r).toMatchObject({ status: "ok", segundos: 36.1, creditos: 0, saldo: 7255, mediaId: "m1", largura: 768, altura: 1376 });
    const c = JSON.parse(fs.readFileSync(process.env.FAKE_GEN + ".chamadas", "utf8").trim());
    expect(c.MODEL).toBe("Nano Banana 2.1"); expect(c.RATIO).toBe("9:16"); expect(c.ING).toBe("r61-ref-01.jpg,marca-teste-logo-cor.png");
  });
  it("classifica custo, bloqueio, falha leve, ui e suspeito", async () => {
    expect(classificar(3, { error: "CUSTO>0" }, "STORY", "/x").status).toBe("custo");
    expect(classificar(1, { error: "HTTP 403 PUBLIC_ERROR_UNUSUAL_ACTIVITY" }, "STORY", "/x").status).toBe("bloqueio");
    expect(classificar(1, { error: "UI: Failed" }, "STORY", "/x").status).toBe("falha_leve");
    expect(classificar(1, { error: "locator.click: Timeout 30000ms exceeded." }, "STORY", "/x").status).toBe("ui");
    saidas([{ code: 0, rec: { cost_n: 0 }, png: { w: 1024, h: 1024 } }]);
    const r = await g("STORY");
    expect(r.status).toBe("suspeito"); expect(fs.existsSync(path.join(d, "o.png.suspeito"))).toBe(true);
  });
  it("subir usa o nome do Flow e limpar chama clear.js", async () => {
    const arq = path.join(d, "ref 1 (2).jpg"); fs.writeFileSync(arq, "x");
    await subir(arq, "r61-ref-01.jpg"); await limparCompositor();
    expect(fs.readFileSync(process.env.FAKE_UPLOADS!, "utf8").trim().split("\n")).toEqual(["r61-ref-01.jpg", "CLEAR"]);
  });
  it("C1: arquivo que já existe no projeto do Flow conta como enviado", async () => {
    const arq = path.join(d, "logo.png"); fs.writeFileSync(arq, "x");
    process.env.FAKE_JA_EXISTE = "marca-teste-logo-cor.png";
    await expect(subir(arq, "marca-teste-logo-cor.png")).resolves.toBeUndefined();
    await expect(subir(arq, "r61-ref-01.jpg")).resolves.toBeUndefined();
  });
  it("C2/I8: saída do upload com sinais de bloqueio lança ErroBloqueioFlow; outro erro lança Error comum", async () => {
    const arq = path.join(d, "a.png"); fs.writeFileSync(arq, "x");
    for (const saida of ["ERRO HTTP 403 Forbidden", "ERRO 429 Too Many Requests", "RESOURCE_EXHAUSTED", "PERMISSION_DENIED", "We noticed unusual activity", "violates our policy"]) {
      process.env.FAKE_UPLOAD_SAIDA = saida;
      await expect(subir(arq, "r61-ref-01.jpg")).rejects.toBeInstanceOf(ErroBloqueioFlow);
    }
    process.env.FAKE_UPLOAD_SAIDA = "ERRO locator.click: Timeout 15000ms exceeded";
    const e = await subir(arq, "r61-ref-01.jpg").catch((x) => x);
    expect(e).toBeInstanceOf(Error); expect(e).not.toBeInstanceOf(ErroBloqueioFlow);
  });
  it("classificarUpload ignora números do nome do arquivo e exige saída 0", () => {
    expect(classificarUpload(0, "✓ listado no picker: r61-ref-403.jpg", "r61-ref-403.jpg")).toBe("ok");
    expect(classificarUpload(0, "já existe no projeto: politica.png", "politica.png")).toBe("ok");
    expect(classificarUpload(1, "já existe no projeto: a.png", "a.png")).toBe("erro");
    expect(classificarUpload(0, "add visível: true", "a.png")).toBe("erro");
    expect(classificarUpload(0, "✓ listado no picker: a.png\nHTTP 403", "a.png")).toBe("bloqueio");
  });
  it("I8: 429/RESOURCE_EXHAUSTED/PERMISSION_DENIED na geração são bloqueio (não repetem)", () => {
    for (const error of ["HTTP 429", "RESOURCE_EXHAUSTED: quota", "PERMISSION_DENIED"]) expect(classificar(1, { error }, "STORY", "/x").status).toBe("bloqueio");
    expect(classificar(1, { error: "locator.click: Timeout 140300ms exceeded." }, "STORY", "/x").status).toBe("ui"); // 403 dentro de outro número não é bloqueio
  });
  it("D1: saída 0 com cost_n > 0 é custo", () => {
    expect(classificar(0, { cost_n: 20 }, "STORY", "/x")).toMatchObject({ status: "custo", creditos: 20 });
    expect(classificar(3, { error: "custo não lido na UI: …" }, "STORY", "/x").status).toBe("custo");
  });
  it("numeroSaldo", () => { expect(numeroSaldo("6,935")).toBe(6935); expect(numeroSaldo(undefined)).toBeUndefined(); });
});

describe("classificar: nomes de arquivo não disparam bloqueio", () => {
  it("R403 no nome do ingrediente não é bloqueio; 403 de verdade é", () => {
    const destino = path.join(os.tmpdir(), "nao-existe.png");
    expect(classificar(1, { error: "ingrediente r403-ref-01.jpg não encontrado no picker" }, "STORY", destino, ["r403-ref-01.jpg"]).status).not.toBe("bloqueio");
    expect(classificar(1, { error: "HTTP 403 em r403-ref-01.jpg" }, "STORY", destino, ["r403-ref-01.jpg"]).status).toBe("bloqueio");
  });
});
