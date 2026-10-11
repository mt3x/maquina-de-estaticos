#!/usr/bin/env node
// Imita `claude -p --output-format json`: devolve respostas de CEREBRO_RESPOSTAS (array JSON de strings), uma por chamada.
import fs from "node:fs";
const arq = process.env.CEREBRO_RESPOSTAS; const cont = arq + ".n";
const n = fs.existsSync(cont) ? Number(fs.readFileSync(cont, "utf8")) : 0;
fs.writeFileSync(cont, String(n + 1));
let stdin = ""; process.stdin.on("data", (d) => (stdin += d));
process.stdin.on("end", () => {
  fs.appendFileSync(arq + ".pedidos", JSON.stringify({ args: process.argv.slice(2), stdin }) + "\n");
  const respostas = JSON.parse(fs.readFileSync(arq, "utf8"));
  const r = respostas[Math.min(n, respostas.length - 1)];
  if (r === "__SAIR_1__") { process.stderr.write("falhou"); process.exit(1); }
  if (r === "__ERRO_JSON__") { process.stdout.write(JSON.stringify({ type: "result", subtype: "error_max_turns", is_error: true })); process.exit(1); }
  process.stdout.write(JSON.stringify({ type: "result", subtype: "success", is_error: false, result: r }));
});
