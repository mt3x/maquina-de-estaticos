// Checagem de pré-requisitos (Node, Python, Chrome, Claude Code, disco). JS puro, só módulos node:,
// porque roda antes do `npm install` (npm run verificar / npm run instalar).
import { execFileSync } from "node:child_process"; import fs from "node:fs"; import path from "node:path"; import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { resolveChromePath } = require("../motor-flow/chrome.js");

export const NODE_MIN = [20, 12]; export const PYTHON_MIN = [3, 10]; export const DISCO_MIN_GB = 3;
const mac = (p) => p !== "win32";

/** true se a primeira versão "X.Y" do texto for >= minimo. */
export function avaliarVersao(texto, minimo) {
  const m = /(\d+)\.(\d+)/.exec(String(texto ?? "")); if (!m) return false;
  const [maj, min] = [Number(m[1]), Number(m[2])];
  return maj > minimo[0] || (maj === minimo[0] && min >= minimo[1]);
}

// winget sem perguntas no terminal (o Claude não consegue responder "Y").
const winget = (id) => `winget install -e --id ${id} --accept-source-agreements --accept-package-agreements`;
export function checarNode(versao = process.versions.node, plataforma = process.platform) {
  const ok = avaliarVersao(versao, NODE_MIN);
  return { id: "node", ok, detalhe: ok ? `Node ${versao}` : `Node ${versao} é antigo (precisa de ${NODE_MIN.join(".")} ou mais novo)`,
    ...(ok ? {} : { comoResolver: mac(plataforma) ? "brew install node" : winget("OpenJS.NodeJS.LTS") }) };
}

/** Procura um Python >= 3.10 e devolve o comando + args para rodá-lo: python3/python no Mac e Linux;
 *  python/python3 e o lançador `py -3` no Windows (o `python` pode ser o atalho da Microsoft Store, que sai sem imprimir nada). */
export function descobrirPython(rodar, plataforma = process.platform) {
  let achado = null;
  const opcoes = plataforma === "win32" ? [["python"], ["python3"], ["py", "-3"]] : [["python3"], ["python"]];
  for (const [cmd, ...args] of opcoes) {
    const saida = rodar(cmd, [...args, "--version"]); if (!saida) continue;
    const versao = String(saida).trim();
    if (avaliarVersao(versao, PYTHON_MIN)) return { cmd, args, versao, ok: true };
    achado ??= { cmd, args, versao, ok: false };
  }
  return achado;
}

export function checarPython(rodar, plataforma = process.platform) {
  const p = descobrirPython(rodar, plataforma);
  if (p?.ok) return { id: "python", ok: true, detalhe: `${p.versao} (${[p.cmd, ...p.args].join(" ")})` };
  return { id: "python", ok: false, detalhe: p ? `${p.versao} é antigo (precisa de Python 3.10 ou mais novo)` : "Python não encontrado",
    comoResolver: mac(plataforma) ? "brew install python" : winget("Python.Python.3.12") };
}

export function checarChrome(resolver = resolveChromePath, plataforma = process.platform) {
  const caminho = resolver();
  if (caminho) return { id: "chrome", ok: true, detalhe: `Google Chrome em ${caminho}` };
  return { id: "chrome", ok: false, detalhe: "Google Chrome não encontrado (se ele já está instalado em outro lugar, ponha o caminho do programa em FLOW_CHROME_PATH no .env.local)",
    comoResolver: mac(plataforma) ? "brew install --cask google-chrome" : winget("Google.Chrome") };
}

export function checarDisco(livreGb) {
  const ok = livreGb >= DISCO_MIN_GB; const gb = livreGb.toFixed(1).replace(".", ",");
  return { id: "disco", ok, detalhe: ok ? `${gb} GB livres em disco` : `Só ${gb} GB livres em disco`,
    ...(ok ? {} : { comoResolver: "Libere espaço: o sistema precisa de pelo menos 3 GB livres." }) };
}

const COMO_CLAUDE = "Instale o Claude Code: https://claude.com/claude-code e depois rode `claude` uma vez para fazer login.";
/** `rodar` devolve a saída JSON de `claude -p ... --output-format json`, ou null se o claude não rodou. */
export function checarClaude(rodar) {
  const saida = rodar("claude", ["-p", "responda apenas ok", "--output-format", "json"]);
  if (!saida) return { id: "claude", ok: false, detalhe: "Claude Code não encontrado", comoResolver: COMO_CLAUDE };
  let r; try { r = JSON.parse(String(saida)); } catch { return { id: "claude", ok: false, detalhe: "Claude Code respondeu algo inesperado", comoResolver: COMO_CLAUDE }; }
  if (r && r.is_error === false) return { id: "claude", ok: true, detalhe: "Claude Code instalado e logado" };
  const msg = String(r?.result ?? "").slice(0, 200);
  return { id: "claude", ok: false, detalhe: /login|api key|auth/i.test(msg) ? `Claude Code sem login (${msg})` : `Claude Code com erro: ${msg || "sem detalhe"}`, comoResolver: COMO_CLAUDE };
}

// Cópia mínima de lib/plataforma.ts (aqui não dá para importar TS).
const aspas = (a) => (/[\s"&|<>^%()]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a);
export function comandoSpawn(bin, args, plataforma = process.platform) {
  if (plataforma !== "win32" || /\.exe$/i.test(bin)) return { cmd: bin, args, shell: false };
  return { cmd: [bin, ...args.map(aspas)].join(" "), args: [], shell: true }; // linha única: o Node 24 avisa (DEP0190) se args vierem com shell
}
// turbopackIgnore: o app importa este arquivo (e o chrome.js); sem a marca o Turbopack segue o .venv e quebra o build.
export function pythonBin(o = {}) {
  const env = o.env ?? process.env; const plat = o.plataforma ?? process.platform; const raiz = o.raiz ?? /*turbopackIgnore: true*/ process.cwd(); const existe = o.existe ?? fs.existsSync;
  if (env.PYTHON_BIN) return env.PYTHON_BIN;
  const venv = plat === "win32" ? path.join(/*turbopackIgnore: true*/ raiz, ".venv", "Scripts", "python.exe") : path.join(/*turbopackIgnore: true*/ raiz, ".venv", "bin", "python");
  if (existe(venv)) return venv;
  return plat === "win32" ? "python" : "python3";
}

/** .venv pronto = existe o Python dele (uma pasta .venv meio criada não conta). */
export function venvPronto(o = {}) {
  const plat = o.plataforma ?? process.platform; const raiz = o.raiz ?? /*turbopackIgnore: true*/ process.cwd(); const existe = o.existe ?? fs.existsSync;
  return existe(plat === "win32" ? path.join(/*turbopackIgnore: true*/ raiz, ".venv", "Scripts", "python.exe") : path.join(/*turbopackIgnore: true*/ raiz, ".venv", "bin", "python"));
}

/** Roda um comando e devolve o stdout (ou null se não rodou). Com saída mesmo em erro (ex.: claude sem login), devolve a saída. */
export function rodarComando(bin, args, timeout = 10_000) {
  const c = comandoSpawn(bin, args);
  try { return execFileSync(c.cmd, c.args, { shell: c.shell, timeout, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], windowsHide: true }) || null; }
  catch (e) { const out = e?.stdout ? String(e.stdout).trim() : ""; return out || null; }
}

/** GB decimais (1 GB = 1e9 bytes), a mesma unidade do /api/status. */
export function discoLivreGb(dir = /*turbopackIgnore: true*/ process.cwd(), statfs = fs.statfsSync) {
  try { const s = statfs(dir); return (Number(s.bavail) * Number(s.bsize)) / 1e9; } catch { return 0; }
}

export async function rodarVerificacoes(o = {}) {
  const r = [checarNode(), checarPython((b, a) => rodarComando(b, a)), checarChrome(), checarDisco(discoLivreGb())];
  if (!o.ci && o.incluirClaude !== false) r.push(checarClaude((b, a) => rodarComando(b, a, 90_000)));
  return r;
}
