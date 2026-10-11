// Gera as imagens do README em docs/imagens/ (PNG ~1200 px, otimizado).
//  1. ilustrações: HTML desta pasta renderizado pelo Chromium do Playwright (headless);
//  2. prints do app: dados de demonstração (demo.mjs) numa pasta temporária + só o servidor web (`next start`).
// SEGURANÇA: nunca roda o worker nem toca no Flow. O "Chrome no ar" é um servidor falso que só responde /json/version
// e o "worker vivo" é um worker.json reescrito a cada 3 s. Nunca abre o Chrome da pessoa.
// Pré-requisito: `npm run build`. Uso: node scripts/imagens-readme/capturar.mjs [--so-ilustracoes | --so-app] [pasta-temporaria]
import fs from "node:fs"; import os from "node:os"; import path from "node:path"; import http from "node:http";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright-core";
import sharp from "sharp";
import { montarDemo } from "./demo.mjs";

const AQUI = path.dirname(fileURLToPath(import.meta.url)); const RAIZ = path.resolve(AQUI, "..", "..");
const SAIDA = path.join(RAIZ, "docs", "imagens");
const args = process.argv.slice(2); const so = args.find((a) => a.startsWith("--")); const TMP = path.resolve(args.find((a) => !a.startsWith("--")) ?? path.join(os.tmpdir(), "maquina-demo"));
const PORTA_WEB = 3200, PORTA_CHROME = 9333, PROJETO = "0f1e2d3c-4b5a-6978-8a9b-0c1d2e3f4a5b";
const LARGURA = 1200;

const ILUSTRACOES = ["github-code", "claude-frase", "claude-permissao", "login-google", "flow-novo-projeto", "flow-link", "claude-inicia"];

async function salvar(buf, nome) {
  fs.mkdirSync(SAIDA, { recursive: true });
  const meta = await sharp(buf).metadata();
  const img = meta.width > LARGURA ? sharp(buf).resize({ width: LARGURA }) : sharp(buf);
  await img.png({ compressionLevel: 9, palette: true, quality: 90 }).toFile(path.join(SAIDA, `${nome}.png`));
  console.log(`✔ docs/imagens/${nome}.png`);
}

async function ilustracoes(nav) {
  const pg = await nav.newPage({ viewport: { width: 900, height: 700 }, deviceScaleFactor: LARGURA / 900 });
  for (const n of ILUSTRACOES) {
    await pg.goto(pathToFileURL(path.join(AQUI, `${n}.html`)).href); await pg.waitForSelector("body[data-pronto]");
    await salvar(await pg.locator(".quadro").screenshot(), `ilustracao-${n}`);
  }
  await pg.close();
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
async function noAr(url, tentativas = 120) {
  for (let i = 0; i < tentativas; i++) { try { if ((await fetch(url)).ok) return; } catch { /* subindo */ } await esperar(500); }
  throw new Error(`não subiu: ${url}`);
}

async function prints(nav) {
  const dados = path.join(TMP, "demo-dados");
  const { pastaRemessa } = await montarDemo(dados);
  // Chrome do Flow falso (só /json/version) e batimento do worker.
  const chromeFalso = http.createServer((q, r) => { r.setHeader("content-type", "application/json"); r.end(q.url === "/json/version" ? JSON.stringify({ Browser: "Chrome/130" }) : "{}"); });
  await new Promise((ok) => chromeFalso.listen(PORTA_CHROME, "127.0.0.1", ok));
  const bater = () => fs.writeFileSync(path.join(dados, "worker.json"), JSON.stringify({ pid: 4321, ts: new Date().toISOString(), ocupado: null }));
  bater(); const batimento = setInterval(bater, 3000);
  const next = spawn(process.execPath, [path.join(RAIZ, "node_modules", "next", "dist", "bin", "next"), "start", "-p", String(PORTA_WEB), "-H", "127.0.0.1"],
    { cwd: RAIZ, env: { ...process.env, MAQUINA_DADOS: dados, FLOW_PROJETO: PROJETO, FLOW_PORTA: String(PORTA_CHROME) }, stdio: "ignore" });
  try {
    await noAr(`http://127.0.0.1:${PORTA_WEB}/api/status`);
    const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, colorScheme: "light", locale: "pt-BR", reducedMotion: "reduce" });
    await ctx.addInitScript(() => localStorage.setItem("theme", "light"));
    const pg = await ctx.newPage(); const url = (p) => `http://127.0.0.1:${PORTA_WEB}${p}`;
    const abrir = async (p, pronto) => { await pg.goto(url(p)); if (pronto) await pg.getByText(pronto, { exact: false }).first().waitFor(); await esperar(1800); };
    // Caminhos da máquina que tirou o print não entram na imagem (o grupo (?:…) é só para o checar-publico não acusar o próprio regex); a porta do Chrome falso aparece como a padrão (9231),
    // que é a que a pessoa vai ver (o falso não usa a 9231 para não esbarrar num Chrome do Flow de verdade).
    const limpar = () => pg.evaluate((p) => { const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let n; (n = w.nextNode());) n.nodeValue = n.nodeValue.replace(/\/(Users|home)\/[^/\s)]+/g, "~").replace(/[A-Z]:\\(?:Users)\\[^\\\s)]+/g, "~").replace(`porta ${p}`, "porta 9231"); }, PORTA_CHROME);
    const tela = async (nome, opts = {}) => { await limpar(); await salvar(await pg.screenshot(opts), nome); };

    // Destaque laranja no botão que a pessoa deve clicar.
    const destacar = (loc) => loc.evaluate((el) => { el.style.transition = "none"; el.style.outline = "4px solid #ff6a13"; el.style.outlineOffset = "4px"; el.style.boxShadow = "0 0 0 10px rgba(255,106,19,0.18)"; });
    const recorte = (altura) => ({ clip: { x: 0, y: 0, width: 1440, height: altura } });
    /** Página inteira sem cortar o fundo: aumenta a janela até a altura do conteúdo. */
    const inteira = async () => { const h = await pg.evaluate(() => document.documentElement.scrollHeight); await pg.setViewportSize({ width: 1440, height: Math.max(900, h) }); await esperar(700); };

    await abrir("/status", "Liberado"); await tela("app-status", recorte(480));
    await abrir("/configuracao", "Programas necessários"); await pg.getByText("Configurado", { exact: true }).waitFor(); await esperar(800); await tela("app-configuracao", recorte(450));
    await abrir("/marcas", "Grão Norte"); await destacar(pg.getByRole("link", { name: "Nova marca" })); await tela("app-marcas", recorte(380));
    await abrir("/marcas/nova", "Extrair identidade");
    await pg.getByPlaceholder("Ex.: Grão Norte").fill("Grão Norte");
    await pg.getByTestId("input-pasta").setInputFiles(path.join(dados, "remessas", "R01", "entrega"));
    await pg.locator("textarea").fill("Imagens meramente ilustrativas. Ofertas válidas enquanto durarem os estoques, nas unidades participantes. Consulte condições em graonorte.exemplo.");
    await destacar(pg.getByRole("button", { name: "Extrair identidade" })); await inteira(); await tela("app-marca-nova");
    await pg.setViewportSize({ width: 1440, height: 900 });
    await abrir("/nova", "Arraste a pasta");
    await pg.getByTestId("input-pasta").setInputFiles(pastaRemessa); await pg.getByText("Enviar remessa").waitFor(); await esperar(800);
    await destacar(pg.getByRole("button", { name: "Enviar remessa" })); await tela("app-nova-remessa", recorte(690));
    await abrir("/remessas/R01", "Concluída"); await pg.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth > 0)); await esperar(600);
    await inteira(); await tela("app-remessa-pronta"); await pg.setViewportSize({ width: 1440, height: 900 });
    // Faixa vermelha de bloqueio (para a seção "Deu problema?") — o status.json volta ao normal logo depois.
    const st = path.join(dados, "status.json"); const original = fs.readFileSync(st, "utf8");
    fs.writeFileSync(st, JSON.stringify({ ...JSON.parse(original), bloqueio: { tipo: "flow_bloqueio", msg: "O Flow respondeu 403 (atividade incomum). Confira a conta no navegador antes de liberar.", em: new Date().toISOString(), remessa: "R01" } }));
    await abrir("/status", "Bloqueado"); await destacar(pg.getByRole("button", { name: "Desbloquear" })); await tela("app-bloqueio", recorte(520));
    fs.writeFileSync(st, original);
    await ctx.close();
  } finally {
    clearInterval(batimento); next.kill(); chromeFalso.close();
  }
}

/** Chromium baixado pelo Playwright (cache padrão de cada sistema); CHROMIUM_PATH força outro. Nunca o Chrome da pessoa. */
function acharChromium() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  const h = os.homedir(); const caches = [path.join(h, "Library", "Caches", "ms-playwright"), path.join(h, ".cache", "ms-playwright"), path.join(process.env.LOCALAPPDATA ?? h, "ms-playwright")];
  const rel = [["chrome-mac-arm64", "Google Chrome for Testing.app", "Contents", "MacOS", "Google Chrome for Testing"], ["chrome-mac", "Chromium.app", "Contents", "MacOS", "Chromium"],
    ["chrome-mac-x64", "Google Chrome for Testing.app", "Contents", "MacOS", "Google Chrome for Testing"], ["chrome-linux", "chrome"], ["chrome-linux64", "chrome"], ["chrome-win", "chrome.exe"], ["chrome-win64", "chrome.exe"]];
  for (const c of caches) { if (!fs.existsSync(c)) continue;
    for (const d of fs.readdirSync(c).filter((n) => /^chromium-\d+$/.test(n)).sort().reverse())
      for (const r of rel) { const a = path.join(c, d, ...r); if (fs.existsSync(a)) return a; } }
  return undefined; // deixa o Playwright procurar sozinho
}
const nav = await chromium.launch({ headless: true, executablePath: acharChromium() });
try {
  if (so !== "--so-app") await ilustracoes(nav);
  if (so !== "--so-ilustracoes") await prints(nav);
} finally { await nav.close(); }
