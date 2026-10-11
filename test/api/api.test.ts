import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs"; import os from "node:os"; import path from "node:path";
import sharp from "sharp";
import { GET as getArquivo } from "@/app/api/arquivo/route";
import { GET as listar, POST as criar } from "@/app/api/remessas/route";
import { GET as obter } from "@/app/api/remessas/[id]/route";
import { POST as apoio } from "@/app/api/remessas/[id]/apoio/route";
import { POST as acao } from "@/app/api/remessas/[id]/acao/route";
import { GET as zip } from "@/app/api/remessas/[id]/zip/route";
import { POST as desbloquear } from "@/app/api/status/desbloquear/route";
import { GET as status } from "@/app/api/status/route";
import { consumirComandos } from "@/lib/comandos";
import { salvarRemessa, lerRemessa } from "@/lib/estado";
import { arqEntrega } from "@/lib/caminhos";
import { criarArtes } from "@/lib/tipos";

let dados: string;
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
beforeEach(() => {
  dados = fs.mkdtempSync(path.join(os.tmpdir(), "api-")); process.env.MAQUINA_DADOS = dados;
  fs.mkdirSync(path.join(dados, "marcas/marca-teste"), { recursive: true }); fs.writeFileSync(path.join(dados, "marcas/marca-teste/identidade.json"), "{}");
});

async function remessaPronta(modelos: ("nano-banana-pro" | "nano-banana-2-1")[]) {
  const r = { id: "R61", marca: "marca-teste", modelos, criadaEm: "2026-10-08T00:00:00Z", atualizadaEm: "", etapa: "concluida" as const, duvidas: [], log: [],
    anuncios: [{ id: "AD01", ref: "ref-01.jpg", copy: "c", instrucoes: "", apoio: [], temPessoas: false, artes: criarArtes(modelos) }] };
  for (const a of r.anuncios[0].artes) {
    const f = arqEntrega("R61", "AD01", a.modelo, a.formato); fs.mkdirSync(path.dirname(f), { recursive: true });
    await sharp({ create: { width: 10, height: 10, channels: 3, background: "#000" } }).png().toFile(f);
    Object.assign(a, { status: "pronta", arquivo: f });
  }
  fs.writeFileSync(path.join(path.dirname(arqEntrega("R61", "AD01", modelos[0], "STORY")), "nota.txt"), "não deve ir");
  salvarRemessa(r as any);
}

describe("api", () => {
  it("arquivo bloqueia traversal e não serve não-imagem", async () => {
    expect((await getArquivo(new Request("http://127.0.0.1:3200/api/arquivo?p=../../etc/passwd"))).status).toBe(400);
    fs.mkdirSync(path.join(dados, "remessas/R1/.interno/prompts"), { recursive: true });
    fs.writeFileSync(path.join(dados, "remessas/R1/.interno/prompts/a.txt"), "segredo");
    expect((await getArquivo(new Request("http://127.0.0.1:3200/api/arquivo?p=remessas/R1/.interno/prompts/a.txt"))).status).toBe(400);
  });
  it("arquivo serve png dentro de dados", async () => {
    await remessaPronta(["nano-banana-2-1"]);
    const rel = path.relative(dados, arqEntrega("R61", "AD01", "nano-banana-2-1", "STORY"));
    const r = await getArquivo(new Request(`http://127.0.0.1:3200/api/arquivo?p=${encodeURIComponent(rel)}`));
    expect(r.status).toBe(200); expect(r.headers.get("content-type")).toBe("image/png");
  });
  it("cria remessa a partir do upload e lista", async () => {
    const fd = new FormData(); fd.append("marca", "marca-teste");
    fd.append("caminhos", JSON.stringify(["ads-marca-teste-remessa-61/Remessa 61.docx", "ads-marca-teste-remessa-61/ref-1.jpg"]));
    fd.append("arquivos", new File(["d"], "Remessa 61.docx")); fd.append("arquivos", new File(["i"], "ref-1.jpg"));
    const res = await criar(new Request("http://127.0.0.1:3200/api/remessas", { method: "POST", body: fd }));
    expect(res.status).toBe(200); expect((await res.json()).id).toBe("R61");
    expect(lerRemessa("R61").etapa).toBe("importada");
    expect(fs.existsSync(path.join(dados, "remessas/R61/entrada/ref-01.jpg"))).toBe(true);
    const l = await (await listar(new Request("http://127.0.0.1:3200/api/remessas"))).json(); expect(l[0].id).toBe("R61");
    expect((await criar(new Request("http://127.0.0.1:3200/api/remessas", { method: "POST", body: fd }))).status).toBe(409);
  });
  it("ação enfileira comando e valida modelos", async () => {
    await remessaPronta(["nano-banana-2-1"]);
    const post = (b: unknown) => acao(new Request("http://127.0.0.1:3200", { method: "POST", body: JSON.stringify(b) }), ctx("R61"));
    expect((await post({ tipo: "pausar" })).status).toBe(200);
    expect((await post({ tipo: "confirmar", modelos: [], anuncios: [] })).status).toBe(400);
    expect((await post({ tipo: "apagar_tudo" })).status).toBe(400);
    expect(consumirComandos().map((c) => c.tipo)).toEqual(["pausar"]);
  });
  it("estado traz urls e progresso", async () => {
    await remessaPronta(["nano-banana-2-1"]);
    const v = await (await obter(new Request("http://127.0.0.1:3200"), ctx("R61"))).json();
    expect(v.progresso).toEqual({ prontas: 2, total: 2 });
    expect(v.anuncios[0].artes[0].url).toMatch(/^\/api\/arquivo\?p=remessas/);
    expect((await obter(new Request("http://127.0.0.1:3200"), ctx("NAO"))).status).toBe(404);
  });
  it("zip só com imagens das artes existentes", async () => {
    await remessaPronta(["nano-banana-2-1"]);
    const res = await zip(new Request("http://127.0.0.1:3200/api/remessas/R61/zip"), ctx("R61"));
    expect(res.headers.get("content-type")).toBe("application/zip");
    const buf = Buffer.from(await res.arrayBuffer()); const txt = buf.toString("latin1");
    expect(txt).toContain("R61 - AD01 - STORY.png"); expect(txt).toContain("R61 - AD01 - FEED.png");
    expect(txt).not.toContain("nota.txt"); expect(txt).not.toContain("nano-banana-pro");
  });
  it("zip não inclui arte que não está pronta, mesmo com arquivo existente", async () => {
    await remessaPronta(["nano-banana-2-1"]);
    const r = lerRemessa("R61"); r.anuncios[0].artes.find((a) => a.formato === "FEED")!.status = "defeito"; salvarRemessa(r);
    const res = await zip(new Request("http://127.0.0.1:3200/api/remessas/R61/zip"), ctx("R61"));
    const txt = Buffer.from(await res.arrayBuffer()).toString("latin1");
    expect(txt).toContain("R61 - AD01 - STORY.png"); expect(txt).not.toContain("R61 - AD01 - FEED.png");
  });
  it("id com traversal é 400 em todas as rotas [id]", async () => {
    await remessaPronta(["nano-banana-2-1"]);
    const U = "http://127.0.0.1:3200/x"; const ruim = ctx("../../../zzfora");
    const fd = new FormData(); fd.append("arquivo", new File(["a"], "a.pdf")); fd.append("anuncio", "AD01");
    expect((await apoio(new Request(U, { method: "POST", body: fd }), ruim)).status).toBe(400);
    expect((await obter(new Request(U), ruim)).status).toBe(400);
    expect((await acao(new Request(U, { method: "POST", body: JSON.stringify({ tipo: "pausar" }) }), ruim)).status).toBe(400);
    expect((await zip(new Request(U), ruim)).status).toBe(400);
    expect(fs.existsSync(path.join(dados, "..", "zzfora"))).toBe(false);
  });
  it("apoio feliz grava em entrada/apoio e valida anúncio/remessa", async () => {
    await remessaPronta(["nano-banana-2-1"]);
    const mk = (ad: string) => { const fd = new FormData(); fd.append("arquivo", new File(["a"], "doc.pdf")); fd.append("anuncio", ad); return new Request("http://127.0.0.1:3200/x", { method: "POST", body: fd }); };
    const ok = await apoio(mk("AD01"), ctx("R61")); expect(ok.status).toBe(200);
    expect(fs.existsSync(path.join(dados, "remessas/R61/entrada/apoio", (await ok.json()).arquivo.split("/").pop()))).toBe(true);
    expect((await apoio(mk("ZZ"), ctx("R61"))).status).toBe(400);
    expect((await apoio(mk("AD01"), ctx("R99"))).status).toBe(404);
    expect(fs.existsSync(path.join(dados, "remessas/R99"))).toBe(false);
  });
  it("rejeita Origin e Host estranhos", async () => {
    await remessaPronta(["nano-banana-2-1"]);
    const r = await acao(new Request("http://127.0.0.1:3200/x", { method: "POST", headers: { origin: "http://evil.com" }, body: JSON.stringify({ tipo: "pausar" }) }), ctx("R61"));
    expect(r.status).toBe(403);
    expect((await getArquivo(new Request("http://evil.com:3200/api/arquivo?p=a.png"))).status).toBe(403);
    expect((await getArquivo(new Request("http://127.0.0.1:3200/api/arquivo?p=a.png", { headers: { host: "evil.com" } }))).status).toBe(403);
    const ok = await acao(new Request("http://127.0.0.1:3200/x", { method: "POST", headers: { origin: "http://localhost:3200" }, body: JSON.stringify({ tipo: "retomar" }) }), ctx("R61"));
    expect(ok.status).toBe(200);
  });
  it("payload de ação é validado e filtrado", async () => {
    await remessaPronta(["nano-banana-2-1"]);
    const post = (b: unknown) => acao(new Request("http://127.0.0.1:3200/x", { method: "POST", body: JSON.stringify(b) }), ctx("R61"));
    for (const b of [null, [], "x", { tipo: "ajuste", anuncio: "AD01", formato: "STORY", modelo: "xx", escopo: "arte", texto: "t" },
      { tipo: "preferida", anuncio: "AD01", formato: "BIG", modelo: "nano-banana-pro" }, { tipo: "responder", respostas: { a: 1 } }])
      expect((await post(b)).status).toBe(400);
    expect((await post({ tipo: "cancelar", extra: "lixo", remessa: "OUTRA" })).status).toBe(200);
    const [c] = consumirComandos() as any[]; expect(c.extra).toBeUndefined(); expect(c.remessa).toBe("R61");
  });
  it("H4: marca inexistente dá 400 e não cria a remessa", async () => {
    const fd = new FormData(); fd.append("marca", "naoexiste");
    fd.append("caminhos", JSON.stringify(["ads-marca-teste-remessa-61/a.docx"])); fd.append("arquivos", new File(["d"], "a.docx"));
    const res = await criar(new Request("http://127.0.0.1:3200/api/remessas", { method: "POST", body: fd }));
    expect(res.status).toBe(400); expect((await res.json()).erro).toMatch(/não existe/);
    expect(fs.existsSync(path.join(dados, "remessas/R61"))).toBe(false);
  });
  it("I7: tentar_de_novo é validado e enfileirado", async () => {
    await remessaPronta(["nano-banana-2-1"]);
    const post = (b: unknown) => acao(new Request("http://127.0.0.1:3200/x", { method: "POST", body: JSON.stringify(b) }), ctx("R61"));
    expect((await post({ tipo: "tentar_de_novo", anuncio: "AD01", formato: "STORY" })).status).toBe(400);
    expect((await post({ tipo: "tentar_de_novo", anuncio: "AD01", formato: "STORY", modelo: "nano-banana-2-1" })).status).toBe(200);
    expect(consumirComandos()).toMatchObject([{ tipo: "tentar_de_novo", remessa: "R61", anuncio: "AD01", formato: "STORY", modelo: "nano-banana-2-1" }]);
  });
  it("I9: responder só antes da produção (409 depois)", async () => {
    await remessaPronta(["nano-banana-2-1"]);
    const post = () => acao(new Request("http://127.0.0.1:3200/x", { method: "POST", body: JSON.stringify({ tipo: "responder", respostas: { a: "b" } }) }), ctx("R61"));
    expect((await post()).status).toBe(409);
    const r = lerRemessa("R61"); r.etapa = "aguardando_confirmacao"; r.anuncios[0].artes = []; salvarRemessa(r);
    expect((await post()).status).toBe(200);
    expect(consumirComandos().map((c) => c.tipo)).toEqual(["responder"]);
  });
  it("C2: desbloquear enfileira o comando (com checagem de origem) e o status expõe o bloqueio", async () => {
    expect((await desbloquear(new Request("http://127.0.0.1:3200/api/status/desbloquear", { method: "POST", headers: { origin: "http://evil.com" } }))).status).toBe(403);
    expect((await desbloquear(new Request("http://127.0.0.1:3200/api/status/desbloquear", { method: "POST" }))).status).toBe(200);
    expect(consumirComandos().map((c) => c.tipo)).toEqual(["desbloquear"]);
    fs.writeFileSync(path.join(dados, "status.json"), JSON.stringify({ bloqueio: { tipo: "flow_bloqueio", msg: "403", em: "x", remessa: "R61" } }));
    process.env.FLOW_PORTA = "1"; // Chrome “fora do ar” sem rede
    const cwd = process.cwd(); process.chdir(dados); // o status relê o .env.local do cwd: nunca o da raiz do repositório
    let s: any; try { s = await (await status(new Request("http://127.0.0.1:3200/api/status"))).json(); } finally { process.chdir(cwd); }
    expect(s.bloqueio).toMatchObject({ tipo: "flow_bloqueio", remessa: "R61" }); delete process.env.FLOW_PORTA;
  });
  it("caminhos inválidos no upload dão 400", async () => {
    const fd = new FormData(); fd.append("marca", "marca-teste"); fd.append("caminhos", "{ruim"); fd.append("arquivos", new File(["d"], "a.docx"));
    expect((await criar(new Request("http://127.0.0.1:3200/api/remessas", { method: "POST", body: fd }))).status).toBe(400);
  });
});
