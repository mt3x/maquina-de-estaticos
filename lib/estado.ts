import fs from "node:fs"; import path from "node:path";
import { arqEstado, raizDados } from "./caminhos";
import type { Remessa } from "./tipos";

export function lerJson<T>(arq: string, padrao?: T): T {
  try { return JSON.parse(fs.readFileSync(arq, "utf8")) as T; }
  catch (e) { if (padrao !== undefined) return padrao; throw e; }
}
/** renameSync que tenta de novo por até ~2 s em EPERM/EACCES/EBUSY (no Windows o antivírus segura arquivos novos por instantes). */
export function renomear(de: string, para: string) {
  for (let i = 0; ; i++) {
    try { fs.renameSync(de, para); return; }
    catch (e) {
      const c = (e as NodeJS.ErrnoException).code;
      if (i >= 20 || !(c === "EPERM" || c === "EACCES" || c === "EBUSY")) throw e;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
    }
  }
}
/** Grava em .tmp e renomeia: leitores nunca veem arquivo pela metade. */
export function salvarJson(arq: string, obj: unknown) {
  fs.mkdirSync(path.dirname(arq), { recursive: true });
  const tmp = `${arq}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2));
  renomear(tmp, arq);
}
export const lerRemessa = (id: string) => lerJson<Remessa>(arqEstado(id));
export function salvarRemessa(r: Remessa) { r.atualizadaEm = new Date().toISOString(); salvarJson(arqEstado(r.id), r); }
export function listarRemessas(): Remessa[] {
  const d = path.join(raizDados(), "remessas");
  if (!fs.existsSync(d)) return [];
  return fs.readdirSync(d).filter((n) => fs.existsSync(arqEstado(n))).map((n) => {
    try { return lerRemessa(n); }
    catch (e) { console.error(`Erro ao ler remessa ${n}:`, e); return null; }
  }).filter((r): r is Remessa => r !== null)
    .sort((a, b) => a.criadaEm.localeCompare(b.criadaEm));
}
export function registrar(r: Remessa, etapa: string, msg: string, ms?: number) {
  r.log.push({ ts: new Date().toISOString(), etapa, msg, ...(ms !== undefined ? { ms } : {}) });
  if (r.log.length > 500) r.log.splice(0, r.log.length - 500);
}
