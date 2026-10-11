// Imita motor-flow/gen.js. FAKE_GEN = arquivo JSON com lista de saídas [{code, rec:{...}, png:{w,h}}], uma por chamada.
const fs = require('fs'); const path = require('path');
const [MODEL, RATIO, PFILE, DEST, ING] = process.argv.slice(2);
const lista = JSON.parse(fs.readFileSync(process.env.FAKE_GEN, 'utf8'));
const cont = process.env.FAKE_GEN + '.n'; const n = fs.existsSync(cont) ? Number(fs.readFileSync(cont, 'utf8')) : 0;
fs.writeFileSync(cont, String(n + 1));
fs.appendFileSync(process.env.FAKE_GEN + '.chamadas', JSON.stringify({ MODEL, RATIO, PFILE, DEST, ING }) + '\n');
const s = lista[Math.min(n, lista.length - 1)];
(async () => {
  if (s.png) { const sharp = require('sharp'); fs.mkdirSync(path.dirname(DEST), { recursive: true });
    await sharp({ create: { width: s.png.w, height: s.png.h, channels: 3, background: '#335' } }).png().toFile(DEST); }
  console.log('RESULT ' + JSON.stringify({ model: MODEL, ratio: RATIO, error: null, ...s.rec, width: s.png?.w, height: s.png?.h }));
  process.exitCode = s.code || 0;
})();
