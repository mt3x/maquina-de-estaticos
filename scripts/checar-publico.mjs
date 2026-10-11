// Falha se algum arquivo versionado (conteúdo ou nome) contiver dado privado/de cliente.
// Termos guardados em base64 para não aparecerem em claro. Só módulos `node:`.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const B64 = [
  ["Ymxpcw==", true], // palavra inteira: "publish" não conta
  ["YTY0MjRjZWU=", false],
  ["eWFubWF0aWFz", false],
  ["L3VzZXJzLw==", false],
  ["XHVzZXJzXA==", false],
  ["eWFubWF0aWFzYWxtQA==", false],
  ["YXV0by1yZWVs", false],
  ["fi9kZXZlbG9wZXI=", false],
];
const dec = (b) => Buffer.from(b, "base64").toString("utf8");
export const ENTRADAS = B64.map(([b, palavra]) => ({ termo: dec(b), palavra }));
export const TERMOS = ENTRADAS.map((e) => e.termo);

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// `\` vira `/` no texto e no termo: caminho do Windows (C:\Pasta\…) casa com o termo de caminho do Mac e vice-versa.
const barra = (s) => s.replace(/\\/g, "/");
const casa = (texto, { termo, palavra }) => {
  const t = barra(termo.toLowerCase());
  if (palavra) return new RegExp(`\\b${esc(t)}\\b`, "i").test(barra(texto));
  return barra(texto).toLowerCase().includes(t);
};

/** termos: string[] (substring) ou { termo, palavra? }[] (palavra: casa só palavra inteira). */
export function acharProibidos(arquivos, termos) {
  const ents = termos.map((t) => (typeof t === "string" ? { termo: t, palavra: false } : t));
  const achados = [];
  for (const { caminho, conteudo } of arquivos) {
    const nome = caminho.replace(/\\/g, "/");
    const linhas = conteudo.split(/\r?\n/);
    for (const e of ents) {
      if (casa(nome, e)) { achados.push({ caminho, termo: e.termo, linha: 0 }); continue; }
      const i = linhas.findIndex((l) => casa(l, e));
      if (i >= 0) achados.push({ caminho, termo: e.termo, linha: i + 1 });
    }
  }
  return achados;
}

const ehBinario = (buf) => buf.subarray(0, 8192).includes(0);

function main() {
  const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const lista = execFileSync("git", ["ls-files", "-z"], { cwd: raiz, maxBuffer: 1 << 28 }).toString("utf8").split("\0").filter(Boolean);
  const arquivos = lista.map((caminho) => {
    let conteudo = "";
    try {
      const buf = readFileSync(path.join(raiz, caminho));
      if (!ehBinario(buf)) conteudo = buf.toString("utf8");
    } catch { /* removido do disco mas ainda no índice: só o nome */ }
    return { caminho, conteudo };
  });
  const achados = acharProibidos(arquivos, ENTRADAS);
  if (!achados.length) { console.log("✅ Nenhum dado privado nos arquivos versionados."); return; }
  for (const a of achados) console.error(`❌ ${a.caminho}:${a.linha} contém termo proibido`);
  process.exit(1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
