import { spawn } from "node:child_process"; import fs from "node:fs"; import os from "node:os"; import path from "node:path";
import { MODELOS, RATIO, type Formato, type ModeloId } from "@/lib/tipos";

export type ResultadoGeracao = { status: "ok" | "falha_leve" | "bloqueio" | "custo" | "ui" | "suspeito" | "erro";
  arquivo?: string; mediaId?: string; segundos?: number; creditos?: number; saldo?: number; largura?: number; altura?: number; msg?: string };

const dirDriver = () => process.env.FLOW_DRIVER_DIR || path.join(process.cwd(), "motor-flow");

function rodar(script: string, args: string[], timeoutMs: number): Promise<{ code: number; out: string }> {
  return new Promise((resolve) => {
    const p = spawn(process.execPath, [path.join(dirDriver(), script), ...args], {
      env: { ...process.env, NODE_PATH: path.join(process.cwd(), "node_modules") }, stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    const t = setTimeout(() => p.kill("SIGKILL"), timeoutMs);
    p.stdout.setEncoding("utf8"); p.stderr.setEncoding("utf8");
    p.stdout.on("data", (d) => (out += d)); p.stderr.on("data", (d) => (out += d));
    p.on("close", (code) => { clearTimeout(t); resolve({ code: code ?? 1, out }); });
  });
}

/** Sinais de que o Flow está barrando a conta: qualquer um para TUDO (geração e upload). */
export const REGEX_BLOQUEIO = /(?<!\d)(?:403|429)(?!\d)|UNUSUAL_ACTIVITY|unusual activity|PUBLIC_ERROR|RESOURCE_EXHAUSTED|PERMISSION_DENIED|polic/i;
/** Lançado por `subir` quando a saída do upload casa com REGEX_BLOQUEIO. */
export class ErroBloqueioFlow extends Error { constructor(msg: string) { super(msg); this.name = "ErroBloqueioFlow"; } }

export const numeroSaldo = (v?: string | number) => v === undefined || v === null ? undefined : Number(String(v).replace(/[^\d]/g, "")) || undefined;

/** `nomes`: nomes de arquivo da geração, tirados do erro antes de procurar 403/429 (uma remessa "R403" não é bloqueio). */
export function classificar(code: number, rec: any, formato: Formato, destino: string, nomes: string[] = []): ResultadoGeracao {
  const base = { mediaId: rec?.media_id, segundos: rec?.seconds, creditos: rec?.cost_n ?? undefined,
    saldo: numeroSaldo(rec?.credits_after?.value), largura: rec?.width, altura: rec?.height, msg: rec?.error ?? undefined };
  const err = String(rec?.error ?? "");
  // custo > 0 nunca pode passar, nem se o driver sair 0 por engano (defesa extra).
  if (code === 3 || (typeof rec?.cost_n === "number" && rec.cost_n > 0)) return { ...base, status: "custo", msg: base.msg ?? `custo ${rec?.cost_n} na UI do Flow` };
  if (REGEX_BLOQUEIO.test([...nomes, destino].filter(Boolean).reduce((t, n) => t.split(n).join(""), err))) return { ...base, status: "bloqueio" };
  if (/^UI: Failed/.test(err)) return { ...base, status: "falha_leve" };
  if (/Timeout \d+ms exceeded|locator\./.test(err)) return { ...base, status: "ui" };
  if (code !== 0 || err || !fs.existsSync(destino)) return { ...base, status: "erro", msg: err || `driver saiu ${code}` };
  const okDim = formato === "STORY" ? rec.height > rec.width : rec.height === rec.width;
  if (!okDim) { fs.renameSync(destino, destino + ".suspeito"); return { ...base, status: "suspeito", msg: `dimensões ${rec.width}x${rec.height} não batem com ${formato}` }; }
  return { ...base, status: "ok", arquivo: destino };
}

export async function gerar(o: { modelo: ModeloId; formato: Formato; promptArq: string; destino: string; ingredientes: string[]; dry?: boolean }): Promise<ResultadoGeracao> {
  fs.mkdirSync(path.dirname(o.destino), { recursive: true });
  const args = [MODELOS[o.modelo], RATIO[o.formato], o.promptArq, o.destino, o.ingredientes.join(","), ...(o.dry ? ["--dry"] : [])];
  const { code, out } = await rodar("gen.js", args, 12 * 60_000);
  const linha = out.split("\n").reverse().find((l) => l.startsWith("RESULT "));
  let rec: any = {}; try { rec = linha ? JSON.parse(linha.slice(7)) : { error: `sem RESULT: ${out.slice(-300)}` }; } catch { rec = { error: "RESULT ilegível" }; }
  return classificar(code, rec, o.formato, o.destino, [...o.ingredientes, path.basename(o.destino)]);
}

export async function subir(arquivoAbs: string, nomeFlow: string) {
  const dir = path.join(os.tmpdir(), "maq-upload"); fs.mkdirSync(dir, { recursive: true });
  const tmp = path.join(dir, nomeFlow); fs.copyFileSync(arquivoAbs, tmp);
  const { code, out } = await rodar("upload.js", [tmp], 3 * 60_000);
  const c = classificarUpload(code, out, nomeFlow, [tmp, dir]);
  if (c === "bloqueio") throw new ErroBloqueioFlow(`upload de ${nomeFlow}: o Flow sinalizou bloqueio — ${out.slice(-300)}`);
  if (c === "erro") throw new Error(`upload de ${nomeFlow} falhou: ${out.slice(-300)}`);
}
/** "já existe no projeto" (o arquivo já estava no Flow) também é sucesso. O nome do arquivo é tirado antes de procurar sinais de bloqueio. */
export function classificarUpload(code: number, out: string, nomeFlow: string, caminhos: string[] = []): "ok" | "bloqueio" | "erro" {
  const semNomes = [...caminhos, nomeFlow].reduce((t, n) => t.split(n).join(""), out);
  if (REGEX_BLOQUEIO.test(semNomes)) return "bloqueio";
  if (code === 0 && /listado no picker|já existe no projeto/.test(out)) return "ok";
  return "erro";
}
export async function limparCompositor() { await rodar("clear.js", [], 60_000); }
export async function chromeVivo(): Promise<boolean> {
  try { const r = await fetch(`http://127.0.0.1:${process.env.FLOW_PORTA || 9231}/json/version`, { signal: AbortSignal.timeout(2000) }); return r.ok; }
  catch { return false; }
}
