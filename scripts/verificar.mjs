// npm run verificar [-- --ci]: confere os pré-requisitos e termina com uma linha RESULTADO {"ok":…,"faltando":[…]}.
import { rodarVerificacoes } from "./verificacoes-base.mjs";
const ci = process.argv.includes("--ci");
const r = await rodarVerificacoes({ ci, incluirClaude: !ci });
for (const c of r) console.log(`${c.ok ? "✅" : "❌"} ${c.detalhe}${!c.ok && c.comoResolver ? `\n   → ${c.comoResolver}` : ""}`);
// No modo --ci o Chrome é só informativo: os runners não têm Chrome garantido.
const faltando = r.filter((c) => !c.ok && !(ci && c.id === "chrome")).map((c) => c.id);
console.log(`RESULTADO ${JSON.stringify({ ok: faltando.length === 0, faltando })}`);
process.exit(faltando.length ? 1 : 0);
