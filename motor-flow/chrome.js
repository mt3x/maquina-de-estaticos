// Launcher do Chrome de debug do Flow (Mac/Windows/Linux). Idempotente: se a porta responde, não abre outro.
const http = require("http"); const path = require("path"); const fs = require("fs"); const { spawn } = require("child_process");
try { process.loadEnvFile(path.join(/*turbopackIgnore: true*/ __dirname, "..", ".env.local")); } catch {}
const DEBUG_PORT = Number(process.env.FLOW_PORTA || 9231);
const FLOW_URL = "https://labs.google/fx/tools/flow";

function perfilPadrao(env = process.env, cwd = /*turbopackIgnore: true*/ process.cwd()) {
  if (env.FLOW_CHROME_PROFILE) return path.resolve(/*turbopackIgnore: true*/ env.FLOW_CHROME_PROFILE);
  return path.resolve(/*turbopackIgnore: true*/ env.MAQUINA_DADOS ? path.resolve(/*turbopackIgnore: true*/ cwd, env.MAQUINA_DADOS) : path.join(/*turbopackIgnore: true*/ cwd, "dados"), "chrome-flow");
}

function resolveChromePath(plataforma = process.platform, existe = fs.existsSync, env = process.env) {
  if (env.FLOW_CHROME_PATH) return existe(env.FLOW_CHROME_PATH) ? env.FLOW_CHROME_PATH : null;
  if (plataforma === "win32") {
    const rel = ["Google", "Chrome", "Application", "chrome.exe"];
    const cands = [env.PROGRAMFILES, env["PROGRAMFILES(X86)"], env.LOCALAPPDATA].filter(Boolean).map(b => path.win32.join(b, ...rel));
    return cands.find(p => existe(p)) || null;
  }
  if (plataforma === "darwin") {
    const rel = path.posix.join("Google Chrome.app", "Contents", "MacOS", "Google Chrome");
    return ["/Applications", env.HOME && path.posix.join(env.HOME, "Applications")].filter(Boolean).map(b => path.posix.join(b, rel)).find(p => existe(p)) || null;
  }
  return ["/usr/bin/google-chrome", "/usr/bin/google-chrome-stable"].find(p => existe(p)) || null;
}

// Sonda /json/version. Nunca rejeita: { aberto, porta, browser? }.
function chromeStatus(porta = DEBUG_PORT) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${porta}/json/version`, (res) => {
      const chunks = []; res.on("data", c => chunks.push(c));
      res.on("end", () => { try { resolve({ aberto: true, porta, browser: JSON.parse(Buffer.concat(chunks).toString("utf-8")).Browser || null }); } catch { resolve({ aberto: true, porta, browser: null }); } });
    });
    req.on("error", () => resolve({ aberto: false, porta }));
    req.setTimeout(2500, () => { req.destroy(); resolve({ aberto: false, porta }); });
  });
}

async function abrirChrome() {
  const porta = DEBUG_PORT;
  const status = await chromeStatus(porta);
  if (status.aberto) return { jaAberto: true, ...status };
  const chrome = resolveChromePath();
  if (!chrome) { const err = new Error("Chrome não encontrado nos caminhos padrão do sistema"); err.code = "CHROME_NOT_FOUND"; throw err; }
  const perfil = perfilPadrao(); fs.mkdirSync(perfil, { recursive: true });
  const child = spawn(/*turbopackIgnore: true*/ chrome, [`--remote-debugging-port=${porta}`, `--user-data-dir=${perfil}`, "--no-first-run", "--no-default-browser-check", FLOW_URL], { detached: true, stdio: "ignore" });
  child.on("error", () => {}); child.unref();
  for (let i = 0; i < 30; i++) { await new Promise(r => setTimeout(r, 500)); if ((await chromeStatus(porta)).aberto) return { jaAberto: false, lancado: true, porta }; }
  throw new Error(`o Chrome abriu, mas a porta ${porta} não respondeu em 15 s`);
}

module.exports = { abrirChrome, chromeStatus, resolveChromePath, perfilPadrao, DEBUG_PORT };

if (require.main === module) {
  abrirChrome().then((r) => {
    if (r.jaAberto) console.log(`[chrome] já estava aberto na porta ${r.porta}${r.browser ? ` (${r.browser})` : ""}.`);
    else console.log(`[chrome] aberto na porta ${r.porta}. Entre no Flow na janela que abriu e deixe-a aberta (pode minimizar).`);
  }).catch((err) => {
    if (err.code === "CHROME_NOT_FOUND") { console.error("[chrome] Google Chrome não encontrado nos caminhos padrão do sistema."); console.error("         Instale o Chrome regular (não Chromium, não Chrome for Testing)."); }
    else console.error(`[chrome] falha ao abrir: ${err.message}`);
    process.exit(1);
  });
}
