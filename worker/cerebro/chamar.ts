import { spawn, spawnSync, type ChildProcess } from "node:child_process"; import fs from "node:fs"; import os from "node:os"; import path from "node:path";
import type { z } from "zod"; import { comandoSpawn } from "@/lib/plataforma";

export class ErroCerebro extends Error {}

export function extrairJson(texto: string): unknown {
  const blocos = [...texto.matchAll(/```(?:json)?\s*([\s\S]*?)```/g)].map((m) => m[1]);
  for (const b of blocos.reverse()) { try { return JSON.parse(b); } catch { /* tenta o próximo */ } }
  const i = texto.indexOf("{"), j = texto.lastIndexOf("}");
  if (i >= 0 && j > i) return JSON.parse(texto.slice(i, j + 1));
  throw new Error("nenhum JSON na resposta");
}

/** Script .js/.mjs (o fake dos testes) roda pelo próprio Node: no Windows o shell não executa .mjs. Senão, comandoSpawn. */
export function comandoCerebro(bin: string, args: string[], plataforma: NodeJS.Platform = process.platform) {
  if (/\.m?js$/i.test(bin)) return { cmd: process.execPath, args: [bin, ...args], shell: false };
  return comandoSpawn(bin, args, plataforma);
}

/** No Windows o claude roda dentro do cmd.exe: matar só o cmd deixaria o claude vivo. */
function matarArvore(p: ChildProcess) {
  if (process.platform === "win32" && p.pid) spawnSync("taskkill", ["/pid", String(p.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
  else p.kill("SIGKILL");
}

function executar(args: string[], stdin: string, timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const c = comandoCerebro(process.env.CEREBRO_BIN || "claude", args); // cwd neutro: rodando na pasta do projeto o claude carregaria o CLAUDE.md de instalação (os caminhos do pedido são absolutos).
    const p = spawn(c.cmd, c.args, { stdio: ["pipe", "pipe", "pipe"], shell: c.shell, cwd: os.tmpdir(), windowsHide: true });
    let out = "", err = "", settled = false;
    const t = setTimeout(() => { if (settled) return; settled = true; matarArvore(p); reject(new ErroCerebro(`claude excedeu ${timeoutMs / 1000}s`)); }, timeoutMs);
    p.stdout.setEncoding("utf8"); p.stderr.setEncoding("utf8"); // acentos partidos entre pedaços não viram �
    p.stdout.on("data", (d) => (out += d)); p.stderr.on("data", (d) => (err += d));
    p.on("error", (e) => { if (settled) return; settled = true; clearTimeout(t); reject(new ErroCerebro(`claude não executou: ${e.message}`)); });
    p.on("close", (code) => {
      if (settled) return; settled = true; clearTimeout(t);
      if (code !== 0) {
        let causa = err.slice(-300);
        try { const j = JSON.parse(out); const c = j.result ?? j.subtype; if (c) causa = String(c).slice(0, 300); } catch { /* usa stderr */ }
        return reject(new ErroCerebro(`claude saiu ${code}: ${causa}`));
      }
      try { const j = JSON.parse(out); if (j.is_error) return reject(new ErroCerebro(String(j.result ?? j.subtype ?? "erro desconhecido").slice(0, 300))); resolve(String(j.result ?? "")); }
      catch { reject(new ErroCerebro(`saída do claude não é JSON: ${out.slice(0, 200)}`)); }
    });
    p.stdin.on("error", () => { /* claude saiu antes de ler tudo: o close acima rejeita */ });
    p.stdin.end(stdin);
  });
}

export async function chamarCerebro<T>(o: { tarefa: string; sistema: string; pedido: string; dirs: string[]; schema: z.ZodType<T, z.ZodTypeDef, unknown>; logDir?: string; timeoutMs?: number }): Promise<T> {
  const args = ["-p", "--output-format", "json", "--append-system-prompt-file", o.sistema, "--allowedTools", "Read",
    ...o.dirs.flatMap((d) => ["--add-dir", d]), ...(process.env.CEREBRO_MODELO ? ["--model", process.env.CEREBRO_MODELO] : [])];
  let pedido = o.pedido; let ultimoErro = "";
  for (let tentativa = 1; tentativa <= 2; tentativa++) {
    const t0 = Date.now();
    const texto = await executar(args, pedido, o.timeoutMs ?? 5 * 60_000);
    if (o.logDir) {
      fs.mkdirSync(o.logDir, { recursive: true });
      fs.writeFileSync(path.join(o.logDir, `${Date.now()}-${o.tarefa}-t${tentativa}.json`), JSON.stringify({ pedido, texto, ms: Date.now() - t0 }, null, 2));
    }
    try { return o.schema.parse(extrairJson(texto)); }
    catch (e) {
      ultimoErro = e instanceof Error ? e.message : String(e);
      pedido = `${o.pedido}\n\nSua resposta anterior foi inválida (${ultimoErro.slice(0, 500)}). Responda APENAS com o JSON no formato pedido.`;
    }
  }
  throw new ErroCerebro(`resposta inválida do cérebro em "${o.tarefa}": ${ultimoErro.slice(0, 300)}`);
}
