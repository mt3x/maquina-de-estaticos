const { conn } = require('./lib');
(async () => { const { browser, page } = await conn(); const c = page.getByRole('button', { name: 'Clear prompt' }); if (await c.isVisible().catch(()=>false)) { await c.click(); console.log('limpo'); } await browser.close(); })();
