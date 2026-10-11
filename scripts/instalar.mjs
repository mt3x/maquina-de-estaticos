// npm run instalar: instalação idempotente (pode rodar quantas vezes quiser). JS puro: roda antes do npm install.
import { spawnSync } from "node:child_process"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { comandoSpawn, descobrirPython, pythonBin, rodarComando, venvPronto } from "./verificacoes-base.mjs";
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."); process.chdir(raiz);
const em = (...p) => path.join(raiz, ...p);

function rodar(etapa, bin, args) {
  const c = comandoSpawn(bin, args);
  const r = spawnSync(c.cmd, c.args, { stdio: "inherit", shell: c.shell, cwd: raiz });
  if (r.status !== 0) { console.error(`❌ ${etapa} falhou${r.error ? ` (${r.error.message})` : ""}`); process.exit(1); }
}

// 1. Ambiente Python (.venv) + dependências. Pronto = existe o Python do .venv; .venv meio criado é apagado e refeito.
if (venvPronto({ raiz })) console.log("✅ Ambiente Python (.venv) (já estava pronto)");
else {
  const py = descobrirPython((b, a) => rodarComando(b, a));
  if (!py?.ok) { console.error("❌ Ambiente Python (.venv) falhou: Python 3.10 ou mais novo não encontrado (rode npm run verificar)"); process.exit(1); }
  if (fs.existsSync(em(".venv"))) { console.log("… Ambiente Python (.venv) incompleto: refazendo"); fs.rmSync(em(".venv"), { recursive: true, force: true }); }
  rodar("Ambiente Python (.venv)", py.cmd, [...py.args, "-m", "venv", ".venv"]); console.log("✅ Ambiente Python (.venv) feito");
}
rodar("Dependências do Python", pythonBin({ raiz }), ["-m", "pip", "install", "-r", "requirements.txt"]); console.log("✅ Dependências do Python feito");

// 2. npm install (só se faltar node_modules ou o package-lock.json mudou)
const mtime = (p) => { try { return fs.statSync(p).mtimeMs; } catch { return 0; } };
const lock = mtime(em("package-lock.json")); const instalado = mtime(em("node_modules", ".package-lock.json"));
if (fs.existsSync(em("node_modules")) && instalado && lock <= instalado) console.log("✅ Dependências do Node (já estava pronto)");
else { rodar("Dependências do Node (npm install)", "npm", ["install"]); console.log("✅ Dependências do Node feito"); }

// 3. build
rodar("Build (npm run build)", "npm", ["run", "build"]); console.log("✅ Build feito");

// 4. .env.local (nunca sobrescreve)
if (fs.existsSync(em(".env.local"))) console.log("✅ Configuração .env.local (já estava pronto)");
else { fs.copyFileSync(em(".env.local.example"), em(".env.local")); console.log("✅ Configuração .env.local feito"); }

// 5. pasta de dados
fs.mkdirSync(em("dados", "marcas"), { recursive: true }); console.log("✅ Pasta dados/marcas feito");

console.log("\nPróximo passo: npm run chrome (login no Flow) e npm run configurar -- <link do projeto>");
