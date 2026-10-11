import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs"; import os from "node:os"; import path from "node:path";

vi.mock("@/lib/verificacoes", () => ({ rodarVerificacoes: vi.fn(async (o: any) => [{ id: "node", ok: true, detalhe: "v22" }, ...(o.incluirClaude ? [{ id: "claude", ok: false, detalhe: "não achei", comoResolver: "instale" }] : [])]) }));
import { GET, POST } from "@/app/api/configuracao/route";
import { rodarVerificacoes } from "@/lib/verificacoes";

const UUID = "a1b2c3d4-0000-4000-8000-123456789abc";
const origem = { origin: "http://127.0.0.1:3200", host: "127.0.0.1:3200" };
const post = (corpo: unknown, headers: Record<string, string> = origem) => new Request("http://127.0.0.1:3200/api/configuracao", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(corpo) });
let cwd: string, tmp: string, antes: string | undefined;
beforeEach(() => {
  cwd = process.cwd(); antes = process.env.FLOW_PROJETO; delete process.env.FLOW_PROJETO;
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cfg-")); fs.writeFileSync(path.join(tmp, ".env.local.example"), "FLOW_PROJETO=\nOUTRA=1\n"); process.chdir(tmp);
});
afterEach(() => { process.chdir(cwd); if (antes === undefined) delete process.env.FLOW_PROJETO; else process.env.FLOW_PROJETO = antes; });

describe("api/configuracao", () => {
  it("POST com link válido grava o .env.local e atualiza o processo", async () => {
    const r = await POST(post({ link: `https://labs.google/fx/tools/flow/project/${UUID.toUpperCase()}` }));
    expect(r.status).toBe(200); expect(await r.json()).toEqual({ ok: true, projeto: UUID });
    expect(fs.readFileSync(path.join(tmp, ".env.local"), "utf8")).toContain(`FLOW_PROJETO=${UUID}`);
    expect(process.env.FLOW_PROJETO).toBe(UUID);
  });
  it("POST com lixo devolve 400 em português e não cria .env.local", async () => {
    const r = await POST(post({ link: "lixo" }));
    expect(r.status).toBe(400); expect((await r.json()).erro).toMatch(/link/i);
    expect(fs.existsSync(path.join(tmp, ".env.local"))).toBe(false); expect(process.env.FLOW_PROJETO).toBeUndefined();
  });
  it("POST com corpo inválido devolve 400", async () => {
    const r = await POST(new Request("http://127.0.0.1:3200/api/configuracao", { method: "POST", headers: origem, body: "não é json" }));
    expect(r.status).toBe(400);
  });
  it("POST sem origem permitida é bloqueado", async () => {
    const r = await POST(post({ link: UUID }, { origin: "http://evil.example", host: "127.0.0.1:3200" }));
    expect(r.status).toBeGreaterThanOrEqual(400); expect(fs.existsSync(path.join(tmp, ".env.local"))).toBe(false);
  });
  it("GET devolve checagens, configurado e projeto", async () => {
    let r = await GET(new Request("http://127.0.0.1:3200/api/configuracao"));
    expect(await r.json()).toEqual({ checagens: [{ id: "node", ok: true, detalhe: "v22" }], configurado: false, projeto: null });
    expect(rodarVerificacoes).toHaveBeenLastCalledWith({ ci: false, incluirClaude: false });
    process.env.FLOW_PROJETO = UUID;
    r = await GET(new Request("http://127.0.0.1:3200/api/configuracao?claude=1"));
    const j = await r.json(); expect(j.configurado).toBe(true); expect(j.projeto).toBe(UUID); expect(j.checagens).toHaveLength(2);
    expect(rodarVerificacoes).toHaveBeenLastCalledWith({ ci: false, incluirClaude: true });
  });
});
