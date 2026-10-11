import { spawn } from "node:child_process"; import path from "node:path";
import { origemPermitida } from "@/lib/validar";
export async function POST(req: Request) {
  const bloqueio = origemPermitida(req); if (bloqueio) return bloqueio;
  try { if ((await fetch(`http://127.0.0.1:${process.env.FLOW_PORTA || 9231}/json/version`, { signal: AbortSignal.timeout(1500) })).ok) return Response.json({ ok: true, jaAberto: true }); } catch { /* fora do ar: abre */ }
  const p = spawn(process.execPath, [path.join(/*turbopackIgnore: true*/ process.cwd(), "motor-flow", "chrome.js")], { detached: true, stdio: "ignore", cwd: process.cwd() });
  p.on("error", () => { /* sem node/arquivo: a página de Status segue mostrando "Fora do ar" */ }); p.unref();
  return Response.json({ ok: true });
}
