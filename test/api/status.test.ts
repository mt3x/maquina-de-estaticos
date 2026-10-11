import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs"; import os from "node:os"; import path from "node:path";
import { GET as status } from "@/app/api/status/route";
import { GET as configuracao } from "@/app/api/configuracao/route";

vi.mock("@/lib/verificacoes", () => ({ rodarVerificacoes: vi.fn(async () => []) }));

// `npm run configurar` grava o .env.local com o sistema no ar: o processo web precisa enxergar sem reiniciar.
const UUID = "a1b2c3d4-0000-4000-8000-123456789abc";
let cwd: string, tmp: string, antes: Record<string, string | undefined>;
beforeEach(() => {
  cwd = process.cwd(); antes = { FLOW_PROJETO: process.env.FLOW_PROJETO, MAQUINA_DADOS: process.env.MAQUINA_DADOS, FLOW_PORTA: process.env.FLOW_PORTA };
  delete process.env.FLOW_PROJETO; process.env.FLOW_PORTA = "1"; // Chrome “fora do ar” sem rede
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "status-")); process.env.MAQUINA_DADOS = path.join(tmp, "dados");
  fs.writeFileSync(path.join(tmp, ".env.local"), "FLOW_PROJETO=\nOUTRA=1\n"); process.chdir(tmp);
});
afterEach(() => { process.chdir(cwd); for (const [k, v] of Object.entries(antes)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; } });

const get = (rota: string) => new Request(`http://127.0.0.1:3200${rota}`);
describe("projeto do Flow gravado com o sistema no ar", () => {
  it("GET /api/status relê o .env.local e passa a configurado:true", async () => {
    expect((await (await status(get("/api/status"))).json()).configurado).toBe(false);
    fs.writeFileSync(path.join(tmp, ".env.local"), `FLOW_PROJETO=${UUID}\nOUTRA=1\n`);
    expect((await (await status(get("/api/status"))).json()).configurado).toBe(true);
  });
  it("GET /api/configuracao relê o .env.local", async () => {
    fs.writeFileSync(path.join(tmp, ".env.local"), `FLOW_PROJETO=${UUID}\n`);
    const j = await (await configuracao(get("/api/configuracao"))).json();
    expect(j.configurado).toBe(true); expect(j.projeto).toBe(UUID);
  });
  it("sem a linha no .env.local mantém o valor do processo", async () => {
    fs.writeFileSync(path.join(tmp, ".env.local"), "OUTRA=1\n"); process.env.FLOW_PROJETO = UUID;
    expect((await (await status(get("/api/status"))).json()).configurado).toBe(true);
  });
  it("GET /api/status informa a porta do Chrome do Flow (FLOW_PORTA, padrão 9231)", async () => {
    expect((await (await status(get("/api/status"))).json()).porta).toBe(1);
  });
});
