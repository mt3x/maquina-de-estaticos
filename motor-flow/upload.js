// uso: node upload.js <arquivo>  — sobe 1 arquivo para os assets do projeto pelo picker e confirma que aparece listado.
const path = require('path'); const fs = require('fs'); const L = require('./lib');
const file = path.resolve(process.argv[2]); const nome = path.basename(file);
if (!fs.existsSync(file)) { console.error('ERRO arquivo não existe', file); process.exit(1); }
(async () => { const { browser, page } = await L.conn();
  try {
    await L.closePicker(page); // começa de estado limpo
    console.log('add visível:', await page.getByRole('button', { name: 'Add ingredients to the prompt box' }).isVisible().catch(()=>false));
    const search = await L.openPicker(page);
    console.log('picker placeholder:', await search.getAttribute('placeholder'));
    const opt = L.pickerOption(page, nome);
    await search.fill(nome.replace(/\.[^.]+$/, '')); await page.waitForTimeout(1800);
    if (await opt.isVisible().catch(()=>false)) { console.log('já existe no projeto:', nome); }
    else {
      await search.fill(''); await page.waitForTimeout(500);
      const up = await L.pickerUploadButton(page);
      const [chooser] = await Promise.all([ page.waitForEvent('filechooser', { timeout: 15000 }), up.click() ]);
      await chooser.setFiles(file); console.log('enviado', nome);
      await page.waitForTimeout(3000);
      // confirma: reabre o picker se ele fechou, busca pelo nome e espera a opção
      const t0 = Date.now(); let ok = false;
      while (Date.now() - t0 < 120000) {
        const s = await L.openPicker(page); await s.fill(nome.replace(/\.[^.]+$/, '')); await page.waitForTimeout(2000);
        if (await opt.isVisible().catch(()=>false)) { ok = true; break; }
        await page.waitForTimeout(3000);
      }
      if (!ok) throw new Error('não apareceu no picker após upload: ' + nome);
      console.log('✓ listado no picker:', nome);
    }
    await L.closePicker(page); await page.waitForTimeout(500);
    const clear = page.getByRole('button', { name: 'Clear prompt' }); if (await clear.isVisible().catch(()=>false)) await clear.click();
  } catch (e) { await page.screenshot({ path: path.join(__dirname, `erro-upload-${Date.now()}.png`) }).catch(()=>{}); throw e; }
  finally { await browser.close(); }
})().catch(e => { console.error('ERRO', e.message); process.exit(1); });
