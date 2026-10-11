// Monta uma pasta de dados de DEMONSTRAÇÃO (marca inventada Grão Norte + remessa R01 concluída) para os prints do README.
// Tudo é desenhado por código (SVG → PNG com sharp); nada aqui vai ao Flow. A pasta gerada NÃO é versionada.
// Uso: node scripts/imagens-readme/demo.mjs <pasta-de-dados>
import fs from "node:fs"; import os from "node:os"; import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const C = { verde: "#2F5D50", verdeEsc: "#21443A", creme: "#F4EDE1", grafite: "#1B1B1B", ambar: "#E3A33B", papel: "#EAE1D2", cafe: "#5A3A26", cinza: "#7D766C" };
const SERIF = "Georgia, 'Times New Roman', serif"; const SANS = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const AVISO = "Imagens meramente ilustrativas. Ofertas válidas enquanto durarem os estoques, nas unidades participantes. Consulte condições em graonorte.exemplo.";

const png = (svg, arq) => { fs.mkdirSync(path.dirname(arq), { recursive: true }); return sharp(Buffer.from(svg)).png().toFile(arq); };
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
/** Quebra simples por número de caracteres (o SVG não quebra linha sozinho). */
const linhas = (t, max) => t.split(" ").reduce((ls, p) => { const u = ls[ls.length - 1]; if (u && (u + " " + p).length <= max) ls[ls.length - 1] = u + " " + p; else ls.push(p); return ls; }, []);
const texto = (t, x, y, { tam, cor, fam = SANS, peso = 400, anc = "middle", max = 99, entre = 1.2, extra = "" }) =>
  linhas(t, max).map((l, i) => `<text x="${x}" y="${y + i * tam * entre}" font-family="${fam}" font-size="${tam}" font-weight="${peso}" fill="${cor}" text-anchor="${anc}" ${extra}>${esc(l)}</text>`).join("");

// Grão de café estilizado (logo e decoração).
const grao = (x, y, r, cor, giro = -30) => `<g transform="translate(${x} ${y}) rotate(${giro})"><ellipse rx="${r * 0.7}" ry="${r}" fill="${cor}"/><path d="M0 ${-r * 0.85} C ${r * 0.35} ${-r * 0.3}, ${-r * 0.35} ${r * 0.3}, 0 ${r * 0.85}" stroke="rgba(0,0,0,0.35)" stroke-width="${r * 0.12}" fill="none"/></g>`;
const logo = (corTexto, w = 600, h = 160) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 600 160">
  ${grao(70, 80, 46, C.ambar)}<text x="140" y="104" font-family="${SERIF}" font-size="74" font-weight="700" fill="${corTexto}" letter-spacing="-1">grão norte</text></svg>`;

// Pacote kraft com faixa verde e janela de grãos.
const pacote = (x, y, w) => { const h = w * 1.35; return `<g transform="translate(${x} ${y})">
  <path d="M ${w * 0.06} 0 H ${w * 0.94} L ${w} ${h} H 0 Z" fill="#B88A5A"/><rect x="0" y="${h * 0.02}" width="${w}" height="${h * 0.06}" fill="#A07446"/>
  <rect x="${w * 0.02}" y="${h * 0.3}" width="${w * 0.96}" height="${h * 0.2}" fill="${C.verde}"/>
  <text x="${w / 2}" y="${h * 0.43}" font-family="${SERIF}" font-size="${w * 0.12}" font-weight="700" fill="${C.creme}" text-anchor="middle">grão norte</text>
  <rect x="${w * 0.25}" y="${h * 0.58}" width="${w * 0.5}" height="${h * 0.26}" rx="${w * 0.06}" fill="#3B2416"/>
  ${[[0.35, 0.65], [0.5, 0.68], [0.64, 0.66], [0.4, 0.76], [0.56, 0.78], [0.47, 0.72], [0.62, 0.77], [0.33, 0.8]].map(([a, b], i) => grao(w * a, h * b, w * 0.045, i % 2 ? "#6B4630" : "#7E5338", i * 40)).join("")}
  <text x="${w / 2}" y="${h * 0.94}" font-family="${SANS}" font-size="${w * 0.06}" fill="${C.creme}" text-anchor="middle" letter-spacing="3">250 G · MOÍDO</text></g>`; };
// Xícara vista de lado, com vapor.
const xicara = (x, y, w) => `<g transform="translate(${x} ${y})">
  <ellipse cx="${w / 2}" cy="${w * 0.78}" rx="${w * 0.62}" ry="${w * 0.12}" fill="#E7DCCB"/>
  <path d="M ${w * 0.05} ${w * 0.2} H ${w * 0.95} C ${w * 0.95} ${w * 0.62}, ${w * 0.75} ${w * 0.78}, ${w / 2} ${w * 0.78} C ${w * 0.25} ${w * 0.78}, ${w * 0.05} ${w * 0.62}, ${w * 0.05} ${w * 0.2} Z" fill="${C.creme}" stroke="#D8CBB6" stroke-width="4"/>
  <path d="M ${w * 0.93} ${w * 0.3} C ${w * 1.18} ${w * 0.3}, ${w * 1.15} ${w * 0.58}, ${w * 0.86} ${w * 0.55}" stroke="${C.creme}" stroke-width="${w * 0.06}" fill="none"/>
  <ellipse cx="${w / 2}" cy="${w * 0.2}" rx="${w * 0.45}" ry="${w * 0.07}" fill="${C.cafe}"/>
  ${[0.35, 0.5, 0.65].map((a) => `<path d="M ${w * a} ${w * 0.08} c ${w * 0.06} ${-w * 0.08}, ${-w * 0.06} ${-w * 0.14}, 0 ${-w * 0.24}" stroke="rgba(255,255,255,0.55)" stroke-width="${w * 0.025}" fill="none" stroke-linecap="round"/>`).join("")}</g>`;
const svg = (w, h, corpo) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${corpo}</svg>`;
const logoEmbutido = (x, y, largura, cor) => `<g transform="translate(${x} ${y}) scale(${largura / 600})">${grao(70, 80, 46, C.ambar)}<text x="140" y="104" font-family="${SERIF}" font-size="74" font-weight="700" fill="${cor}">grão norte</text></g>`;
const fundoMesa = (w, h) => `<defs><linearGradient id="luz" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#C9A27A"/><stop offset="0.55" stop-color="#8A5F3E"/><stop offset="1" stop-color="#4A2F1F"/></linearGradient>
  <radialGradient id="sol" cx="0.2" cy="0.15" r="0.7"><stop offset="0" stop-color="rgba(255,236,200,0.55)"/><stop offset="1" stop-color="rgba(255,236,200,0)"/></radialGradient></defs>
  <rect width="${w}" height="${h}" fill="url(#luz)"/><rect width="${w}" height="${h}" fill="url(#sol)"/>
  ${Array.from({ length: 9 }, (_, i) => `<rect x="0" y="${h * 0.62 + i * h * 0.045}" width="${w}" height="2" fill="rgba(0,0,0,0.08)"/>`).join("")}`;

// AD-01 — caixinha de pergunta nativa sobre "foto" de balcão.
function ad01(f) {
  const story = f === "STORY"; const w = 1080, h = story ? 1920 : 1080;
  const cx = w / 2, by = story ? 360 : 110, bw = story ? 860 : 820;
  return svg(w, h, `${fundoMesa(w, h)}
    ${xicara(story ? 330 : 560, story ? 1090 : 600, story ? 420 : 300)}${grao(story ? 200 : 140, story ? 1660 : 960, 26, "#3B2416", 20)}${grao(story ? 880 : 1000, story ? 1600 : 900, 22, "#3B2416", -50)}${grao(story ? 830 : 330, story ? 1560 : 880, 18, "#3B2416", 70)}
    <rect x="${cx - bw / 2}" y="${by}" width="${bw}" height="${story ? 250 : 210}" rx="34" fill="#fff"/>
    <rect x="${cx - bw / 2}" y="${by}" width="${bw}" height="${story ? 110 : 92}" rx="34" fill="${C.grafite}"/><rect x="${cx - bw / 2}" y="${by + (story ? 76 : 60)}" width="${bw}" height="34" fill="${C.grafite}"/>
    ${texto("Qual é o seu café de todo dia?", cx, by + (story ? 72 : 60), { tam: story ? 46 : 40, cor: "#fff", peso: 600 })}
    ${texto("Sem dúvida o coado da Grão Norte.", cx, by + (story ? 190 : 162), { tam: story ? 42 : 40, cor: C.grafite, fam: SERIF, peso: 700 })}
    <rect x="${story ? 80 : 60}" y="${story ? 720 : 360}" width="${story ? 600 : 440}" height="${story ? 330 : 210}" rx="26" fill="rgba(27,27,27,0.55)"/>
    ${texto("Peço o pacote de 250 g moído na hora e dura a semana inteira. Tem gosto de caramelo e não amarga nem frio.", story ? 120 : 92, story ? 790 : 410, { tam: story ? 38 : 27, cor: C.creme, anc: "start", max: story ? 28 : 30, entre: 1.35 })}
    ${texto("Quem gosta de café precisa provar", cx, story ? 1700 : 1020, { tam: story ? 44 : 34, cor: C.creme, fam: SERIF, peso: 700, extra: 'style="paint-order:stroke" stroke="rgba(0,0,0,0.35)" stroke-width="6"' })}
    ${texto(AVISO, cx, story ? 1810 : 1062, { tam: story ? 17 : 13, cor: "rgba(244,237,225,0.75)", max: story ? 95 : 140, entre: 1.35 })}`);
}
// AD-02 — verde-pinho chapado com o pacote e preço âmbar.
function ad02(f) {
  const story = f === "STORY"; const w = 1080, h = story ? 1920 : 1080;
  const fundo = `<defs><linearGradient id="v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.verde}"/><stop offset="1" stop-color="${C.verdeEsc}"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#v)"/>`;
  const preco = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})"><text x="0" y="0" font-family="${SANS}" font-size="26" letter-spacing="6" fill="${C.creme}">A PARTIR DE</text>
    <text x="0" y="118" font-family="${SERIF}" font-size="40" font-weight="700" fill="${C.ambar}">R$</text><text x="62" y="150" font-family="${SERIF}" font-size="150" font-weight="700" fill="${C.ambar}">29</text>
    <text x="250" y="100" font-family="${SERIF}" font-size="60" font-weight="700" fill="${C.ambar}">,90</text></g>`;
  const cta = (x, y, bw) => `<rect x="${x}" y="${y}" width="${bw}" height="96" rx="14" fill="${C.ambar}"/>${texto("PEÇA NO BALCÃO", x + bw / 2, y + 60, { tam: 34, cor: C.grafite, peso: 700, extra: 'letter-spacing="3"' })}`;
  if (story) return svg(w, h, `${fundo}${logoEmbutido(390, 150, 300, C.creme)}
    ${texto("COADO DA SEMANA", 540, 420, { tam: 30, cor: C.ambar, peso: 600, extra: 'letter-spacing="8"' })}
    ${texto("Moído na hora, do jeito que você coa em casa", 540, 520, { tam: 74, cor: C.creme, fam: SERIF, peso: 700, max: 22, entre: 1.08 })}
    ${pacote(330, 830, 420)}${grao(250, 1350, 30, "#3B2416")}${grao(840, 1300, 26, "#3B2416", 40)}
    ${preco(330, 1500, 1)}${cta(240, 1690, 600)}
    ${texto(AVISO, 540, 1850, { tam: 17, cor: "rgba(244,237,225,0.65)", max: 95, entre: 1.35 })}`);
  return svg(w, h, `${fundo}${logoEmbutido(60, 50, 230, C.creme)}
    ${texto("COADO DA SEMANA", 60, 250, { tam: 26, cor: C.ambar, peso: 600, anc: "start", extra: 'letter-spacing="7"' })}
    ${texto("Moído na hora, do jeito que você coa em casa", 60, 330, { tam: 62, cor: C.creme, fam: SERIF, peso: 700, anc: "start", max: 16, entre: 1.08 })}
    ${preco(60, 640, 0.9)}${cta(60, 850, 470)}${pacote(640, 300, 360)}${grao(600, 860, 24, "#3B2416")}${grao(1010, 820, 22, "#3B2416", 50)}
    ${texto(AVISO, 540, 1040, { tam: 13, cor: "rgba(244,237,225,0.65)", max: 150 })}`);
}
// Referências: anúncios "de outra marca" em tons neutros (só o layout importa).
const ref = (n) => svg(1080, 1920, `<rect width="1080" height="1920" fill="${n === 1 ? "#D9DEE5" : "#3E4A5C"}"/>
  ${n === 1 ? `<rect x="110" y="380" width="860" height="230" rx="34" fill="#fff"/><rect x="110" y="380" width="860" height="100" rx="34" fill="#333"/><rect x="80" y="760" width="600" height="300" rx="26" fill="rgba(0,0,0,0.25)"/><circle cx="540" cy="1380" r="230" fill="#B9C1CC"/>`
    : `<rect x="390" y="150" width="300" height="70" rx="8" fill="#C9D1DC"/><rect x="140" y="480" width="800" height="200" rx="10" fill="#6B7A90"/><rect x="330" y="820" width="420" height="560" rx="16" fill="#8E9BB0"/><rect x="240" y="1690" width="600" height="96" rx="14" fill="#E8B04A"/>`}
  ${texto("referência", 540, 1860, { tam: 34, cor: n === 1 ? "#667" : "#C9D1DC" })}`);

/** true se `dest` fica DENTRO do diretório temporário do sistema (o montarDemo apaga a pasta e a vizinha "remessa-02 grao norte"). */
export function destinoNoTemp(dest, tmp = os.tmpdir()) {
  const real = (p) => { try { return fs.realpathSync(p); } catch { return path.resolve(p); } };
  const d = path.resolve(dest);
  return [path.resolve(tmp), real(tmp)].some((t) => { const rel = path.relative(t, d); return !!rel && !rel.startsWith("..") && !path.isAbsolute(rel); });
}

export async function montarDemo(dados) {
  if (!destinoNoTemp(dados)) throw new Error(`a demonstração só pode ser montada dentro da pasta temporária do sistema (${os.tmpdir()}); recebido: ${dados}`);
  fs.rmSync(dados, { recursive: true, force: true });
  // Marca
  const dm = path.join(dados, "marcas", "grao-norte");
  fs.mkdirSync(dm, { recursive: true });
  fs.copyFileSync(path.join(RAIZ, "worker/cerebro/modelo/identidade-exemplo.json"), path.join(dm, "identidade.json"));
  fs.copyFileSync(path.join(RAIZ, "worker/cerebro/modelo/guia-exemplo.md"), path.join(dm, "guia-marca.md"));
  await png(logo(C.grafite), path.join(dm, "logo", "logo-cor.png"));
  await png(logo(C.creme), path.join(dm, "logo", "logo-creme.png"));
  // Remessa R01 concluída
  const id = "R01"; const dr = path.join(dados, "remessas", id);
  const agora = Date.now(); const iso = (min) => new Date(agora - min * 60_000).toISOString();
  const anuncios = [];
  for (const [ad, desenho, copy, n] of [["AD-01", ad01, "Qual é o seu café de todo dia?\nSem dúvida o coado da Grão Norte.", 1], ["AD-02", ad02, "Coado da semana: moído na hora, do jeito que você coa em casa.\nA partir de R$ 29,90", 2]]) {
    await png(ref(n), path.join(dr, "entrada", `ref-0${n}.png`));
    const artes = [];
    for (const formato of ["STORY", "FEED"]) {
      const arquivo = path.join(dr, "entrega", `${id} - ${ad}`, "nano-banana-pro", `${id} - ${ad} - ${formato}.png`);
      const miniatura = path.join(dr, ".interno", "mini", `${ad}-nano-banana-pro-${formato}.png`);
      await png(desenho(formato), arquivo);
      fs.mkdirSync(path.dirname(miniatura), { recursive: true }); await sharp(arquivo).resize({ width: 540 }).png().toFile(miniatura);
      artes.push({ formato, modelo: "nano-banana-pro", status: "pronta", tentativas: 1, versaoAtual: 1, prioridade: 0, arquivo, miniatura,
        revisao: { ok: true, problemas: [], gravidade: "nenhuma" }, creditos: 0, segundos: 41, versaoEntregue: 1, tentativaEntregue: 1 });
    }
    anuncios.push({ id: ad, ref: `ref-0${n}.png`, copy, instrucoes: "", apoio: [], temPessoas: false, artes, preferida: { STORY: "nano-banana-pro", FEED: "nano-banana-pro" } });
  }
  const estado = { id, marca: "grao-norte", modelos: ["nano-banana-pro"], criadaEm: iso(40), atualizadaEm: iso(2), etapa: "concluida", duvidas: [], anuncios,
    log: [{ ts: iso(40), etapa: "importada", msg: "5 arquivos recebidos" }, { ts: iso(38), etapa: "interpretando", msg: "2 anúncios encontrados no pedido" },
      { ts: iso(30), etapa: "gerando", msg: "AD-01 STORY pronta" }, { ts: iso(12), etapa: "gerando", msg: "AD-02 FEED pronta" }, { ts: iso(2), etapa: "concluida", msg: "4 artes prontas na pasta de entrega" }] };
  fs.writeFileSync(path.join(dr, "estado.json"), JSON.stringify(estado, null, 2));
  // Status do worker (saldo e última geração) — o batimento (worker.json) é escrito pelo capturar.mjs.
  fs.writeFileSync(path.join(dados, "status.json"), JSON.stringify({ saldo: 12500, saldoEm: iso(3), bloqueio: null, ultima: { alvo: { anuncio: "AD-02", formato: "FEED" }, status: "pronta", em: iso(12) } }, null, 2));
  // Pasta de exemplo para o print de "Nova remessa" (fica fora dos dados).
  const pasta = path.join(path.dirname(dados), "remessa-02 grao norte");
  fs.rmSync(pasta, { recursive: true, force: true }); fs.mkdirSync(path.join(pasta, "apoio"), { recursive: true });
  fs.copyFileSync(path.join(RAIZ, "test/fixtures/exemplo.docx"), path.join(pasta, "pedido.docx"));
  await png(ref(1), path.join(pasta, "ref-01.png")); await png(ref(2), path.join(pasta, "ref-02.png"));
  await png(ad01("FEED"), path.join(pasta, "apoio", "foto-balcao.png"));
  return { pastaRemessa: pasta, logo: path.join(dm, "logo", "logo-cor.png") };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const destino = process.argv[2]; if (!destino) { console.error("uso: node scripts/imagens-readme/demo.mjs <pasta-de-dados>"); process.exit(1); }
  console.log(await montarDemo(path.resolve(destino)));
}
