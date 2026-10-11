// Imita motor-flow/upload.js. FAKE_JA_EXISTE = nomes separados por vírgula que "já estão no projeto";
// FAKE_UPLOAD_SAIDA = texto a imprimir no lugar do sucesso (sai com FAKE_UPLOAD_CODE, padrão 1).
const fs = require('fs'); const path = require('path');
const nome = path.basename(process.argv[2]);
fs.appendFileSync(process.env.FAKE_UPLOADS, nome + '\n');
if (process.env.FAKE_UPLOAD_SAIDA) { console.error(process.env.FAKE_UPLOAD_SAIDA); process.exitCode = Number(process.env.FAKE_UPLOAD_CODE ?? 1); }
else if ((process.env.FAKE_JA_EXISTE || '').split(',').includes(nome)) console.log('já existe no projeto: ' + nome);
else console.log('✓ listado no picker: ' + nome);
