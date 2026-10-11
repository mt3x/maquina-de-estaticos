const { chromium } = require('playwright-core');
const PROJECT = process.env.FLOW_PROJETO || '';
const PORTA = process.env.FLOW_PORTA || '9231';
async function conn() {
  if (!PROJECT) throw new Error('FLOW_PROJETO não configurado: rode npm run configurar -- <link do projeto do Flow>');
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${PORTA}`);
  const ctx = browser.contexts()[0];
  let page = ctx.pages().find(p => p.url().includes(`/project/${PROJECT}`));
  if (!page) { page = ctx.pages().find(p => p.url().startsWith('https://flow.google.com')) || await ctx.newPage(); await page.goto(`https://flow.google.com/project/${PROJECT}`, { waitUntil: 'networkidle', timeout: 60000 }).catch(()=>{}); }
  if (page.url() !== `https://flow.google.com/project/${PROJECT}`) { await page.goto(`https://flow.google.com/project/${PROJECT}`, { waitUntil: 'networkidle', timeout: 60000 }).catch(()=>{}); await page.waitForTimeout(2000); }
  await page.bringToFront();
  return { browser, ctx, page };
}
// --- seletor de assets (picker). Aceita a UI antiga (placeholder "Search assets", botão "Add to prompt", texto "Upload media")
// e a nova (painel/dialog "Add assets to the project", input placeholder "Search" + aria-label "Search assets", ícone "Upload media").
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function pickerSearch(page) {
  return page.locator('input[placeholder="Search assets"], input[aria-label="Search assets"], [role="dialog"] input[placeholder="Search"]').first();
}
async function pickerOpen(page) { return pickerSearch(page).isVisible().catch(() => false); }
async function closePicker(page) {
  for (let k = 0; k < 3 && await pickerOpen(page); k++) {
    const dlg = page.locator('[role="dialog"]').filter({ has: pickerSearch(page) }).first();
    const x = dlg.getByRole('button', { name: /^close$/i }).first();
    if (await x.isVisible().catch(() => false)) await x.click().catch(() => {}); else await page.keyboard.press('Escape');
    await page.waitForTimeout(600);
  }
  return !(await pickerOpen(page));
}
async function openPicker(page) {
  if (!(await pickerOpen(page))) await page.getByRole('button', { name: 'Add ingredients to the prompt box' }).click();
  const s = pickerSearch(page); await s.waitFor({ state: 'visible', timeout: 15000 }); return s;
}
// opção do picker cujo nome contém exatamente o nome do arquivo
function pickerOption(page, nome) { return page.getByRole('option', { name: new RegExp(esc(nome), 'i') }).first(); }
async function pickerUploadButton(page) {
  const cands = [page.getByRole('button', { name: /^Upload media$/i }), page.getByLabel(/^Upload media$/i), page.getByText('Upload media', { exact: false })];
  for (const c of cands) { const f = c.first(); if (await f.isVisible().catch(() => false)) return f; }
  throw new Error('botão Upload media não encontrado no picker');
}
// fecha menus/overlays do Flow que ficaram abertos (o backdrop transparente intercepta os cliques)
async function fecharOverlays(page) {
  const fundo = page.locator('.cdk-overlay-backdrop-showing').first();
  for (let k = 0; k < 4 && await fundo.isVisible().catch(() => false); k++) {
    if (k < 2) await page.keyboard.press('Escape'); else await fundo.click({ force: true, position: { x: 2, y: 2 } }).catch(() => {});
    await page.waitForTimeout(500);
  }
  return !(await fundo.isVisible().catch(() => false));
}
module.exports = { fecharOverlays, conn, PROJECT, esc, pickerSearch, pickerOpen, openPicker, closePicker, pickerOption, pickerUploadButton };
