import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs"; import os from "node:os"; import path from "node:path";
import sharp from "sharp";
import { finalizar, miniatura } from "@/worker/pos/finalizar";
import { aplicarSelo } from "@/worker/pos/selo";
import { aplicarAviso } from "@/worker/pos/aviso";
import { raizDados } from "@/lib/caminhos";

let d: string;
beforeEach(() => { d = fs.mkdtempSync(path.join(os.tmpdir(), "pos-")); process.env.MAQUINA_DADOS = path.join(d, "dados"); });
afterEach(() => { delete process.env.MAQUINA_DADOS; });
const FONTES_SISTEMA = ["/System/Library/Fonts/Supplemental/Arial.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "C:\\Windows\\Fonts\\arial.ttf"];
const fonteSistema = FONTES_SISTEMA.find((f) => fs.existsSync(f));

/** Arte falsa: fundo escuro com 5 "linhas de aviso legal" claras no rodapé. */
async function arteFalsa(w: number, h: number, arq: string) {
  const linhas = Array.from({ length: 5 }, (_, i) => `<rect x="${w * 0.05}" y="${h * 0.9 + i * h * 0.012}" width="${w * 0.9}" height="${Math.max(2, h * 0.004)}" fill="#ddd"/>`).join("");
  const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#222"/>${linhas}</svg>`;
  await sharp(Buffer.from(svg)).removeAlpha().png().toFile(arq);
}

describe("pós-processamento", () => {
  it("STORY 768x1376 vira 1080x1920 cortando o topo", async () => {
    const b = path.join(d, "b.png"); await arteFalsa(768, 1376, b);
    const dest = path.join(d, "out/s.png");
    expect(await finalizar(b, dest, "STORY")).toEqual({ w: 1080, h: 1920 });
    const m = await sharp(dest).metadata(); expect([m.width, m.height]).toEqual([1080, 1920]);
  });
  it("FEED 1024 vira 1080x1080", async () => {
    const b = path.join(d, "f.png"); await arteFalsa(1024, 1024, b);
    expect(await finalizar(b, path.join(d, "f2.png"), "FEED")).toEqual({ w: 1080, h: 1080 });
  });
  it.skipIf(!fonteSistema)("selo escreve acima do bloco do aviso, à direita", async () => {
    const dm = path.join(raizDados(), "marcas", "marca-teste"); fs.mkdirSync(path.join(dm, "fontes"), { recursive: true });
    fs.writeFileSync(path.join(dm, "identidade.json"), JSON.stringify({ selo_imagem_ilustrativa: { texto: "*Imagens ilustrativas geradas por inteligência artificial." } }));
    fs.copyFileSync(fonteSistema!, path.join(dm, "fontes", "Teste.ttf"));
    const b = path.join(d, "b.png"); await arteFalsa(1080, 1920, b);
    const antes = await sharp(b).raw().toBuffer();
    expect(await aplicarSelo(b, "marca-teste")).toBe(true);
    const depois = await sharp(b).raw().toBuffer();
    // região: metade direita, entre 80% e 90% da altura → mudou; metade esquerda superior → igual
    const W = 1080, C = 3; let mudouDireita = 0, mudouTopo = 0;
    for (let y = Math.round(1920 * 0.8); y < Math.round(1920 * 0.9); y++) for (let x = 540; x < W; x++) { const i = (y * W + x) * C; if (antes[i] !== depois[i]) mudouDireita++; }
    for (let y = 0; y < 900; y++) for (let x = 0; x < 540; x++) { const i = (y * W + x) * C; if (antes[i] !== depois[i]) mudouTopo++; }
    expect(mudouDireita).toBeGreaterThan(50); expect(mudouTopo).toBe(0);
  });
  it("aviso por código: sem parágrafo de letra pequena, devolve false e não mexe na arte", async () => {
    const b = path.join(d, "liso.png");
    await sharp({ create: { width: 1080, height: 1080, channels: 3, background: "#f4f4f4" } }).png().toFile(b);
    const antes = fs.readFileSync(b);
    expect(await aplicarAviso(b, "marca-teste")).toBe(false);
    expect(fs.readFileSync(b).equals(antes)).toBe(true);
    expect(fs.existsSync(`${b}.aviso.png`)).toBe(false);
  });
  it("miniatura webp 480", async () => {
    const b = path.join(d, "b.png"); await arteFalsa(1080, 1920, b);
    const t = path.join(d, "t/x.webp"); await miniatura(b, t);
    const m = await sharp(t).metadata(); expect(m.format).toBe("webp"); expect(m.width).toBe(480);
  });
});

describe("aplicarSelo por marca", () => {
  it("pula sem erro quando a marca não tem selo configurado", async () => {
    const m = path.join(raizDados(), "marcas", "marca-teste"); fs.mkdirSync(path.join(m, "fontes"), { recursive: true });
    fs.writeFileSync(path.join(m, "identidade.json"), JSON.stringify({ nome: "Marca Teste" }));
    const arte = path.join(raizDados(), "arte.png"); await sharp({ create: { width: 100, height: 100, channels: 3, background: "#fff" } }).png().toFile(arte);
    const antes = fs.readFileSync(arte);
    expect(await aplicarSelo(arte, "marca-teste")).toBe(false);
    expect(fs.readFileSync(arte).equals(antes)).toBe(true);
  });
  it("pula sem erro quando há selo mas nenhuma fonte na marca", async () => {
    const m = path.join(raizDados(), "marcas", "marca-teste"); fs.mkdirSync(m, { recursive: true });
    fs.writeFileSync(path.join(m, "identidade.json"), JSON.stringify({ selo_imagem_ilustrativa: { texto: "*Imagem ilustrativa." } }));
    const arte = path.join(raizDados(), "arte.png"); await sharp({ create: { width: 100, height: 100, channels: 3, background: "#fff" } }).png().toFile(arte);
    expect(await aplicarSelo(arte, "marca-teste")).toBe(false);
  });
});
