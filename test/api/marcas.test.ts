import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs"; import os from "node:os"; import path from "node:path";
import { GET as listar } from "@/app/api/marcas/route";
import { GET as obter, POST as salvar } from "@/app/api/marcas/[id]/route";
import { GET as listar2, POST as criar } from "@/app/api/marcas/route";
import { GET as statusGet } from "@/app/api/status/route";
import { POST as abrirChrome } from "@/app/api/status/abrir-chrome/route";

const U = "http://127.0.0.1:3200";
let dados: string;
beforeEach(() => { dados = fs.mkdtempSync(path.join(os.tmpdir(), "mar-")); process.env.MAQUINA_DADOS = dados;
  fs.mkdirSync(path.join(dados, "marcas/marca-teste/logo"), { recursive: true });
  fs.writeFileSync(path.join(dados, "marcas/marca-teste/identidade.json"), JSON.stringify({ nome: "Marca Teste", cores: { oficial: { verde: "#2F5D50" } } })); });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
describe("api marcas", () => {
  it("lista com nome e cores", async () => { const l = await (await listar(new Request(`${U}/api/marcas`))).json(); expect(l[0]).toMatchObject({ id: "marca-teste", nome: "Marca Teste", cores: { verde: "#2F5D50" } }); });
  it("salva identidade e guia aprovados", async () => {
    const r = await salvar(new Request(`${U}/api/marcas/marca-teste`, { method: "POST", body: JSON.stringify({ identidade: { nome: "Marca Teste 2" }, guiaMarkdown: "# g" }) }), ctx("marca-teste"));
    expect(r.status).toBe(200);
    expect(JSON.parse(fs.readFileSync(path.join(dados, "marcas/marca-teste/identidade.json"), "utf8")).nome).toBe("Marca Teste 2");
    expect((await (await obter(new Request(`${U}/api/marcas/marca-teste`), ctx("marca-teste"))).json()).guia).toBe("# g");
  });
  it("bloqueia host e origem estranhos", async () => {
    expect((await listar(new Request("http://evil.com/api/marcas"))).status).toBe(403);
    const r = await salvar(new Request(`${U}/api/marcas/marca-teste`, { method: "POST", headers: { origin: "http://evil.com" }, body: "{}" }), ctx("marca-teste"));
    expect(r.status).toBe(403);
    expect((await abrirChrome(new Request(`${U}/api/status/abrir-chrome`, { method: "POST", headers: { origin: "http://evil.com" } }))).status).toBe(403);
  });
  it("rejeita id que escapa da pasta de marcas", async () => {
    expect((await obter(new Request(`${U}/api/marcas/x`), ctx("../remessas"))).status).toBe(400);
    expect((await salvar(new Request(`${U}/api/marcas/x`, { method: "POST", body: "{}" }), ctx("A/b"))).status).toBe(400);
  });
  it("lista pula identidade corrompida", async () => {
    fs.mkdirSync(path.join(dados, "marcas/ruim"), { recursive: true }); fs.writeFileSync(path.join(dados, "marcas/ruim/identidade.json"), "{nope");
    const l = await (await listar2(new Request(`${U}/api/marcas`))).json(); expect(l.map((m: any) => m.id)).toEqual(["marca-teste"]);
  });
  it("GET da marca devolve fontes e logoUrl", async () => {
    fs.mkdirSync(path.join(dados, "marcas/marca-teste/fontes"), { recursive: true }); fs.writeFileSync(path.join(dados, "marcas/marca-teste/fontes/A.ttf"), "x"); fs.writeFileSync(path.join(dados, "marcas/marca-teste/fontes/b.txt"), "x");
    fs.writeFileSync(path.join(dados, "marcas/marca-teste/logo/logo-cor.png"), "x");
    const j = await (await obter(new Request(`${U}/api/marcas/marca-teste`), ctx("marca-teste"))).json(); expect(j.fontes).toEqual(["A.ttf"]); expect(j.logoUrl).toBeTruthy();
  });
  it("POST cria marca com whitelist, enfileira; 400 nome inválido; 409 se existe", async () => {
    const fd = new FormData(); fd.append("nome", "Nova Marca"); fd.append("aviso", "AV");
    fd.append("base", new File(["x"], "a.png")); fd.append("base", new File(["x"], "mal.exe")); fd.append("fontes", new File(["x"], "F.otf")); fd.append("fontes", new File(["x"], "f.php"));
    const r = await criar(new Request(`${U}/api/marcas`, { method: "POST", body: fd })); expect(r.status).toBe(200); expect((await r.json()).id).toBe("nova-marca");
    const d = path.join(dados, "marcas/nova-marca");
    expect(fs.readdirSync(path.join(d, "base"))).toEqual(["a.png"]); expect(fs.readdirSync(path.join(d, "fontes"))).toEqual(["f.otf"]);
    expect(JSON.parse(fs.readFileSync(path.join(d, "entrada.json"), "utf8"))).toMatchObject({ aviso: "AV", selo: "" });
    const fila = path.join(dados, "fila/comandos"); expect(fs.readdirSync(fila).map((n) => JSON.parse(fs.readFileSync(path.join(fila, n), "utf8")))).toMatchObject([{ tipo: "extrair_marca", marca: "nova-marca" }]);
    const ruim = new FormData(); ruim.append("nome", "!"); expect((await criar(new Request(`${U}/api/marcas`, { method: "POST", body: ruim }))).status).toBe(400);
    const dup = new FormData(); dup.append("nome", "Marca Teste"); expect((await criar(new Request(`${U}/api/marcas`, { method: "POST", body: dup }))).status).toBe(409);
  });
  it("POST grava o selo opcional em entrada.json", async () => {
    const fd = new FormData(); fd.append("nome", "Com Selo"); fd.append("selo", "  *Imagens ilustrativas geradas por IA  ");
    expect((await criar(new Request(`${U}/api/marcas`, { method: "POST", body: fd }))).status).toBe(200);
    expect(JSON.parse(fs.readFileSync(path.join(dados, "marcas/com-selo/entrada.json"), "utf8")).selo).toBe("*Imagens ilustrativas geradas por IA");
  });
  it("status devolve proxima (null sem fila)", async () => {
    const cwd = process.cwd(); process.chdir(dados); // o status relê o .env.local do cwd: nunca o da raiz do repositório
    let j: any; try { j = await (await statusGet(new Request(`${U}/api/status`))).json(); } finally { process.chdir(cwd); }
    expect(j.proxima).toBeNull();
  });
});
