import { execFile, execFileSync } from "node:child_process"; import fs from "node:fs"; import path from "node:path"; import { promisify } from "node:util";
const execFileP = promisify(execFile);

/** Python a usar: PYTHON_BIN > .venv do projeto > python3 (Mac/Linux) / python (Windows). */
export function pythonBin(o: { plataforma?: NodeJS.Platform; raiz?: string; env?: Record<string, string | undefined>; existe?: (p: string) => boolean } = {}): string {
  const env = o.env ?? process.env; const plat = o.plataforma ?? process.platform;
  const raiz = o.raiz ?? /*turbopackIgnore: true*/ process.cwd(); const existe = o.existe ?? fs.existsSync;
  if (env.PYTHON_BIN) return env.PYTHON_BIN;
  const venv = plat === "win32" ? path.join(/*turbopackIgnore: true*/ raiz, ".venv", "Scripts", "python.exe") : path.join(/*turbopackIgnore: true*/ raiz, ".venv", "bin", "python");
  if (existe(venv)) return venv;
  return plat === "win32" ? "python" : "python3";
}

const aspas = (a: string) => (/[\s"&|<>^%()]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a);
/** No Windows, `npm`/`claude` são .cmd e só rodam via shell; argumentos com espaço, aspas ou & | < > ^ % ( ) vão entre aspas. */
export function comandoSpawn(bin: string, args: string[], plataforma: NodeJS.Platform = process.platform) {
  if (plataforma !== "win32" || /\.exe$/i.test(bin)) return { cmd: bin, args, shell: false };
  return { cmd: bin, args: args.map(aspas), shell: true };
}

const script = (rel: string) => path.join(/*turbopackIgnore: true*/ process.cwd(), rel);
export function rodarPython(rel: string, args: string[], o: { env?: NodeJS.ProcessEnv; timeout?: number } = {}) {
  return execFileP(pythonBin(), [script(rel), ...args], { env: o.env ?? process.env, timeout: o.timeout ?? 60_000 });
}
export function rodarPythonSync(rel: string, args: string[], o: { timeout?: number } = {}) {
  execFileSync(pythonBin(), [script(rel), ...args], { timeout: o.timeout ?? 30_000 });
}
