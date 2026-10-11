// uso: node gen.js "<Model name>" <9:16|1:1> <promptfile> <dest.png> <ing1,ing2,...> [--dry] [--no-credits]
// imprime no fim uma linha "RESULT {json}". Exit 0 ok, 1 erro, 3 custo>0 (não submetido).
const fs = require('fs'); const path = require('path'); const L = require('./lib'); const { conn, PROJECT } = L;
const [MODEL, RATIO, PFILE, DEST, INGARG, ...FLAGS] = process.argv.slice(2); const DRY = FLAGS.includes('--dry'); const NOCRED = FLAGS.includes('--no-credits');
const PROMPT = fs.readFileSync(PFILE, 'utf8').trim();
const INGS = (INGARG || '').split(',').map(s => s.trim()).filter(Boolean);
const SHOTDIR = __dirname;
const log = m => console.log(`[${new Date().toLocaleTimeString('pt-BR')}] ${m}`);
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const rec = { model: MODEL, ratio: RATIO, prompt_file: path.basename(PFILE), dest: DEST, ingredients: INGS, error: null };
async function rpc(page, id, payload) {
  return page.evaluate(async ({ id, payload }) => {
    const w = window.WIZ_global_data;
    const fr = encodeURIComponent(JSON.stringify([[[id, JSON.stringify(payload), null, 'generic']]]));
    const url = '/_/AiSandboxAngularFrontend/data/batchexecute?rpcids=' + id + '&source-path=' + encodeURIComponent(location.pathname) + '&bl=' + encodeURIComponent(w.cfb2h) + '&f.sid=' + encodeURIComponent(w.FdrFJe) + '&hl=en&_reqid=' + Math.floor(Math.random() * 900000 + 100000) + '&rt=c';
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8', 'X-Same-Domain': '1' }, body: 'f.req=' + fr + '&at=' + encodeURIComponent(w.SNlM0e) + '&', credentials: 'include' });
    const body = (await r.text()).replace(/^\)\]\}'\s*/, ''); let found = null;
    for (const line of body.split('\n')) { if (!line.startsWith('[')) continue; try { for (const it of JSON.parse(line)) if (it[0] === 'wrb.fr' && it[1] === id && it[2]) found = JSON.parse(it[2]); } catch (e) {} }
    return found;
  }, { id, payload });
}
const findUrls = (o, re, acc = []) => { if (typeof o === 'string') { if (re.test(o)) acc.push(o); } else if (Array.isArray(o)) o.forEach(x => findUrls(x, re, acc)); else if (o && typeof o === 'object') Object.values(o).forEach(x => findUrls(x, re, acc)); return acc; };
const gridUuids = page => page.evaluate(() => { const s = new Set(); for (const e of document.querySelectorAll('img[src], video[src], source[src], [style*="flow-content"]')) { const v = (e.getAttribute('src') || e.getAttribute('style') || ''); for (const m of v.matchAll(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/gi)) s.add(m[1].toLowerCase()); } for (const e of document.querySelectorAll('[data-media-id]')) s.add(e.getAttribute('data-media-id').toLowerCase()); return [...s]; });
async function credits(page) { // abre o menu da conta só para ler o saldo
  try { await page.getByRole('button', { name: 'Account details' }).click(); await page.waitForTimeout(1200);
    const t = await page.locator('.cdk-overlay-container').innerText().catch(() => '');
    const cl = page.locator('.cdk-overlay-container').getByRole('button', { name: /close/i }).first();
    if (await cl.isVisible().catch(() => false)) await cl.click(); else await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    const m = t.replace(/\s+/g, ' ').match(/([\d.,]+)\s*(Google Flow |AI )?credits/i) || t.replace(/\s+/g, ' ').match(/credits?[^\d]{0,30}([\d.,]+)/i);
    return { raw: t.replace(/\s+/g, ' ').slice(0, 300), value: m ? m[1] : null };
  } catch (e) { return { raw: 'erro ' + e.message, value: null }; }
}
(async () => {
  const { browser, ctx, page } = await conn();
  const netErrors = [];
  page.on('response', async r => { if (!/batchexecute/.test(r.url()) || !/MZZa6b|rpcids=[^&]*/.test(r.url())) return; if (r.status() >= 400) netErrors.push(`${r.status()} ${r.url().slice(0, 120)}`); try { const t = await r.text(); if (/UNUSUAL_ACTIVITY|PERMISSION_DENIED|RESOURCE_EXHAUSTED|PUBLIC_ERROR[A-Z_]*/.test(t)) netErrors.push(t.match(/PUBLIC_ERROR[A-Z_]*|UNUSUAL_ACTIVITY|PERMISSION_DENIED|RESOURCE_EXHAUSTED/)[0]); } catch (e) {} });
  try {
    const gs = page.getByRole('button', { name: 'Get started' }); if (await gs.isVisible().catch(() => false)) { await gs.click(); await page.waitForTimeout(600); }
    rec.credits_before = NOCRED ? null : await credits(page); log(`saldo antes: ${JSON.stringify(rec.credits_before)}`);
    const clear = page.getByRole('button', { name: 'Clear prompt' });
    if (await clear.isVisible().catch(() => false)) { await clear.click(); await page.waitForTimeout(500); }
    // 1) painel: Image, ratio, modelo, x1
    await L.fecharOverlays(page);
    for (let k = 0; k < 3; k++) { if (await page.getByRole('radio', { name: /x1/ }).first().isVisible().catch(() => false)) break; await page.getByRole('button', { name: 'Settings trigger' }).click(); await page.waitForTimeout(1200); }
    await page.getByRole('radio', { name: /(^|\s)Image$/ }).first().click(); await page.waitForTimeout(700);
    await page.getByRole('radio', { name: new RegExp('(^|\\s)' + esc(RATIO) + '$') }).first().click(); await page.waitForTimeout(300);
    const fam = page.getByRole('button', { name: 'Select model family' });
    if (!(await fam.innerText()).includes(MODEL)) { await fam.click(); await page.waitForTimeout(700); await page.getByRole('menuitem', { name: new RegExp(esc(MODEL) + '\\s*$') }).first().click(); await page.waitForTimeout(700); }
    await page.getByRole('radio', { name: /(^|\s)x1$/ }).first().click(); await page.waitForTimeout(400);
    const famTxt = (await fam.innerText()).replace('arrow_drop_down', '').replace(/\s+/g, ' ').trim();
    const st = {}; for (const n of ['Image', RATIO, 'x1']) st[n] = await page.getByRole('radio', { name: new RegExp('(^|\\s)' + esc(n) + '$') }).first().getAttribute('aria-checked');
    log(`painel: modelo="${famTxt}" ${JSON.stringify(st)}`);
    if (!famTxt.endsWith(MODEL) || Object.values(st).some(v => v !== 'true')) throw new Error('painel não ficou como esperado');
    rec.model_ui = famTxt.replace(/^\S+\s/, '');
    await page.keyboard.press('Escape'); await page.waitForTimeout(500);
    // 2) ingredientes
    await L.closePicker(page);
    for (const ing of INGS) {
      const search = await L.openPicker(page); // aceita placeholder "Search assets" (antigo) ou "Search" (novo painel)
      await search.fill(ing.replace(/\.[^.]+$/, '')); await page.waitForTimeout(1500);
      const opt = L.pickerOption(page, ing);
      if (!(await opt.isVisible().catch(() => false))) throw new Error('ingrediente não encontrado no picker: ' + ing);
      const optTxt = (await opt.innerText()).replace(/\s+/g, ' ').trim();
      if (!new RegExp('(^|\\s)' + esc(ing) + '(\\s|$)', 'i').test(optTxt)) throw new Error(`opção do picker não bate: "${optTxt}" vs ${ing}`);
      const chips0 = await page.evaluate(() => [...document.querySelectorAll('img[alt="Ingredient image"]')].filter(i => i.offsetParent).length);
      await opt.click(); await page.waitForTimeout(1000);
      const addBtn = page.getByRole('button', { name: 'Add to prompt' }); if (await addBtn.isVisible().catch(() => false)) { await addBtn.click(); await page.waitForTimeout(800); }
      if (await L.pickerOpen(page)) await L.closePicker(page);
      const chips1 = await page.evaluate(() => [...document.querySelectorAll('img[alt="Ingredient image"]')].filter(i => i.offsetParent).length);
      log(`ingrediente: ${ing} (miniaturas ${chips0}->${chips1})`);
      if (chips1 !== chips0 + 1) throw new Error(`ingrediente não anexou: ${ing} (miniaturas ${chips0}->${chips1})`);
    }
    // 3) prompt
    const box = page.locator('[contenteditable="true"]').last(); await box.click(); await page.keyboard.insertText(PROMPT); await page.waitForTimeout(600);
    if (!(await box.innerText()).includes(PROMPT.slice(0, 40))) throw new Error('prompt não entrou');
    // 4) custo e resumo
    await L.fecharOverlays(page);
    for (let k = 0; k < 3; k++) { await page.getByRole('button', { name: 'Settings trigger' }).click(); await page.waitForTimeout(1200); if (await page.getByRole('radio', { name: /x1/ }).first().isVisible().catch(() => false)) break; }
    const ovt = (await page.locator('.cdk-overlay-container').innerText().catch(() => '')).replace(/\s+/g, ' ');
    rec.cost_ui = (ovt.match(/Generating will use[^.]*?credits?/i) || [ovt.slice(-200)])[0];
    await page.keyboard.press('Escape'); await page.waitForTimeout(400);
    rec.summary_ui = (await page.getByRole('button', { name: 'Settings trigger' }).innerText()).replace(/\s+/g, ' ');
    const chips = await page.evaluate(() => [...document.querySelectorAll('img[alt="Ingredient image"]')].filter(i => i.offsetParent).length);
    log(`custo: ${rec.cost_ui} | resumo: ${rec.summary_ui} | miniaturas no compositor: ${chips}`);
    rec.chips = chips;
    if (chips !== INGS.length) throw new Error(`ingredientes no compositor: ${chips} (esperado ${INGS.length})`);
    const cm = (rec.cost_ui || '').match(/Generating will use\s*([\d.,]+)\s*credits?/i);
    rec.cost_n = cm ? Number(cm[1].replace(/[.,]/g, '')) : null;
    if (rec.cost_n === null) { rec.error = 'custo não lido na UI: ' + rec.cost_ui; process.exitCode = 3; await clear.click().catch(() => {}); return; }
    if (rec.cost_n > 0) { rec.error = 'CUSTO>0 na UI (' + rec.cost_ui + ') — não submetido'; process.exitCode = 3; await clear.click().catch(() => {}); return; }
    if (DRY) { log('DRY: não gera'); if (!FLAGS.includes('--keep')) await clear.click().catch(() => {}); return; }
    // 5) gerar
    const before = new Set(await gridUuids(page));
    const t0 = Date.now(); rec.started_at = new Date().toISOString();
    await page.getByRole('button', { name: 'Start generation' }).click(); log('geração iniciada');
    let mediaId = null, url = null; const sig = PROMPT.slice(-120); const t0s = Math.floor(t0 / 1000) - 10; const no = new Set();
    while (Date.now() - t0 < 8 * 60000) {
      await page.waitForTimeout(5000);
      if (netErrors.length) throw new Error('erro de rede: ' + netErrors.join(' | '));
      const toast = await page.getByText(/unusual activity|violate|policy|couldn.t generate|failed|went wrong/i).first().innerText().catch(() => null);
      if (toast) throw new Error('UI: ' + toast.replace(/\s+/g, ' ').slice(0, 200));
      for (const id of (await gridUuids(page)).filter(u => u !== PROJECT && !before.has(u) && !no.has(u))) {
        const r = await rpc(page, 'as29s', [id]).catch(() => null); if (!r) continue;
        const js = JSON.stringify(r); const tsm = js.match(/\[\[(1[7-9]\d{8}),\d+\]/); const ts = tsm ? Number(tsm[1]) : 0;
        if (!js.includes(JSON.stringify(sig).slice(1, -1)) || ts < t0s) { no.add(id); continue; }
        rec.created_ts = ts;
        const urls = findUrls(r, /^https:\/\/flow-content\.google\//); const img = urls.find(u => /\/image\//.test(u)) || urls[0];
        if (img) { mediaId = id; url = img; rec.all_urls = urls.map(u => u.split('?')[0]); break; }
      }
      if (mediaId) break;
      log(`aguardando ${Math.round((Date.now() - t0) / 1000)}s`);
    }
    if (!mediaId) throw new Error('timeout');
    rec.seconds = Math.round((Date.now() - t0) / 100) / 10; rec.media_id = mediaId;
    log(`pronto em ${rec.seconds}s: ${mediaId}`);
    const r = await ctx.request.get(url, { timeout: 120000 }); if (!r.ok()) throw new Error('download HTTP ' + r.status());
    rec.content_type = r.headers()['content-type'];
    fs.mkdirSync(path.dirname(DEST), { recursive: true });
    const tmp = DEST.replace(/\.png$/i, '') + '.tmp-dl'; fs.writeFileSync(tmp, await r.body());
    // sharp (Mac e Windows) converte para PNG e mede; resolvido a partir da raiz do projeto
    const sharp = require(require.resolve('sharp', { paths: [path.join(__dirname, '..')] })); sharp.cache(false); // sem cache: o Windows não trava o .tmp-dl
    const info = await sharp(tmp).png().toFile(DEST); fs.unlinkSync(tmp); rec.width = info.width; rec.height = info.height;
    log(`salvo ${DEST} (${rec.width}x${rec.height})`);
    await page.waitForTimeout(2000);
    rec.credits_after = NOCRED ? null : await credits(page); log(`saldo depois: ${JSON.stringify(rec.credits_after)}`);
  } catch (e) { rec.error = e.message; await page.screenshot({ path: path.join(SHOTDIR, `erro-${Date.now()}.png`) }).catch(() => {}); console.error('ERRO', e.message); process.exitCode = 1; }
  finally { console.log('RESULT ' + JSON.stringify(rec)); await browser.close(); }
})();
