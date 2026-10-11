// Print real do GitHub (deslogado) para o passo 1 do README: abre o repositório, clica em "Code" e destaca Code, HTTPS e copiar.
// Chromium do Playwright em modo headless, sem login e sem tocar no Chrome da pessoa. Precisa de internet.
// Uso: node scripts/imagens-readme/github-print.mjs   (também é chamado por capturar.mjs --so-github)
import fs from "node:fs"; import os from "node:os"; import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import sharp from "sharp";

const AQUI = path.dirname(fileURLToPath(import.meta.url)); const RAIZ = path.resolve(AQUI, "..", "..");
const REPO = "https://github.com/mt3x/maquina-de-estaticos";

function acharChromium() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  const h = os.homedir(); const caches = [path.join(h, "Library", "Caches", "ms-playwright"), path.join(h, ".cache", "ms-playwright"), path.join(process.env.LOCALAPPDATA ?? h, "ms-playwright")];
  const rel = [["chrome-mac-arm64", "Google Chrome for Testing.app", "Contents", "MacOS", "Google Chrome for Testing"], ["chrome-mac", "Chromium.app", "Contents", "MacOS", "Chromium"],
    ["chrome-mac-x64", "Google Chrome for Testing.app", "Contents", "MacOS", "Google Chrome for Testing"], ["chrome-linux", "chrome"], ["chrome-linux64", "chrome"], ["chrome-win", "chrome.exe"], ["chrome-win64", "chrome.exe"]];
  for (const c of caches) { if (!fs.existsSync(c)) continue;
    for (const d of fs.readdirSync(c).filter((n) => /^chromium-\d+$/.test(n)).sort().reverse())
      for (const r of rel) { const a = path.join(c, d, ...r); if (fs.existsSync(a)) return a; } }
  return undefined;
}

export async function printGithub(saida = path.join(RAIZ, "docs", "imagens", "github-code.png")) {
  const nav = await chromium.launch({ headless: true, executablePath: acharChromium() });
  try {
    const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, colorScheme: "light", locale: "en-US" });
    const pg = await ctx.newPage(); await pg.goto(REPO, { waitUntil: "domcontentloaded" });
    const code = pg.getByRole("button", { name: /^Code$/ }).first(); await code.waitFor(); await code.click();
    const painel = pg.locator('[class*="AnchoredOverlay"]').filter({ hasText: "Clone" }).last(); await painel.waitFor(); await pg.waitForTimeout(1200);
    const https = painel.getByText("HTTPS", { exact: true }).first();
    const copiar = painel.getByRole("button", { name: /copy/i }).first();
    const caixa = async (l) => { const b = await l.boundingBox(); if (!b) throw new Error("elemento não achado para destacar"); return b; };
    const bCode = await caixa(code), bHttps = await caixa(https), bCopiar = await caixa(copiar), bPainel = await caixa(painel);
    // Círculos numerados e contornos laranja (mesmo estilo das outras ilustrações), injetados por cima da página.
    await pg.evaluate((alvos) => {
      for (const [i, a] of alvos.entries()) {
        const o = document.createElement("div"); o.style.cssText = `position:fixed;z-index:99999;pointer-events:none;left:${a.x - 4}px;top:${a.y - 4}px;width:${a.w + 8}px;height:${a.h + 8}px;outline:4px solid #ff6a13;border-radius:8px;`;
        const n = document.createElement("div"); n.textContent = String(i + 1);
        n.style.cssText = `position:fixed;z-index:99999;pointer-events:none;width:34px;height:34px;border-radius:50%;background:#ff6a13;color:#fff;font:700 19px/34px -apple-system,Segoe UI,Arial,sans-serif;text-align:center;box-shadow:0 3px 10px rgba(255,106,19,.45);left:${a.nx}px;top:${a.ny}px;`;
        document.body.append(o, n);
      }
    }, [
      { x: bCode.x, y: bCode.y, w: bCode.width, h: bCode.height, nx: bCode.x - 46, ny: bCode.y + bCode.height / 2 - 17 },
      { x: bHttps.x, y: bHttps.y, w: bHttps.width, h: bHttps.height, nx: bHttps.x - 46, ny: bHttps.y + bHttps.height / 2 - 17 },
      { x: bCopiar.x, y: bCopiar.y, w: bCopiar.width, h: bCopiar.height, nx: bCopiar.x - 46, ny: bCopiar.y + bCopiar.height / 2 - 17 },
    ]);
    const x0 = Math.max(0, bPainel.x - 80), x1 = Math.max(bCode.x + bCode.width, bPainel.x + bPainel.width) + 40;
    const y0 = Math.max(0, bCode.y - 40), y1 = bPainel.y + bPainel.height + 30;
    const buf = await pg.screenshot({ clip: { x: x0, y: y0, width: x1 - x0, height: y1 - y0 } });
    fs.mkdirSync(path.dirname(saida), { recursive: true });
    await sharp(buf).resize({ width: 1200 }).png({ compressionLevel: 9, palette: true, quality: 90 }).toFile(saida);
    console.log(`✔ ${path.relative(RAIZ, saida)}`);
  } finally { await nav.close(); }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await printGithub();
