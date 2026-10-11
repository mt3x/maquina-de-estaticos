import fs from "node:fs"; import path from "node:path";
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
export function extrairProjetoFlow(texto: string): string | null {
  const t = texto.trim(); const m = t.match(new RegExp(`(?:/project/)(${UUID.source})`, "i")) ?? (new RegExp(`^${UUID.source}$`, "i").test(t) ? [t, t] : null);
  return m ? m[1].toLowerCase() : null;
}
export function definirVariavel(conteudo: string, chave: string, valor: string): string {
  const eol = conteudo.includes("\r\n") ? "\r\n" : "\n";
  const linhas = conteudo.split(/\r?\n/); const i = linhas.findIndex((l) => l.startsWith(`${chave}=`));
  if (i >= 0) { linhas[i] = `${chave}=${valor}`; return linhas.join(eol); }
  const base = conteudo === "" || conteudo.endsWith(eol) ? conteudo : conteudo + eol;
  return `${base}${chave}=${valor}${eol}`;
}
export function gravarEnvLocal(raiz: string, chave: string, valor: string) {
  const arq = path.join(raiz, ".env.local");
  if (!fs.existsSync(arq)) fs.copyFileSync(path.join(raiz, ".env.local.example"), arq);
  fs.writeFileSync(arq, definirVariavel(fs.readFileSync(arq, "utf8"), chave, valor));
}
/** Valor de `CHAVE=` no .env.local da raiz; undefined se o arquivo ou a linha não existir. */
export function lerVariavel(raiz: string, chave: string): string | undefined {
  let txt: string; try { txt = fs.readFileSync(path.join(raiz, ".env.local"), "utf8"); } catch { return undefined; }
  const l = txt.split(/\r?\n/).find((x) => x.startsWith(`${chave}=`));
  return l === undefined ? undefined : l.slice(chave.length + 1).trim();
}
/** `npm run configurar` grava o .env.local com o sistema no ar; o processo web relê aqui (só sobrescreve se a linha existir). */
export function releProjetoFlow(raiz = /*turbopackIgnore: true*/ process.cwd()) {
  const v = lerVariavel(raiz, "FLOW_PROJETO"); if (v !== undefined) process.env.FLOW_PROJETO = v;
}
