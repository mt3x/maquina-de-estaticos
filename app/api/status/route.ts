import fs from "node:fs";
import { proximaArte } from "@/worker/fila-flow";
import { lerJson, listarRemessas } from "@/lib/estado";
import { origemPermitida } from "@/lib/validar";
import { flowConfigurado, portaFlow } from "@/lib/configuracao";
import { releProjetoFlow } from "@/lib/env-local";
import { arqStatus, arqWorker, raizDados } from "@/lib/caminhos";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const bloqueio = origemPermitida(req); if (bloqueio) return bloqueio;
  releProjetoFlow();
  const w = lerJson<{ pid?: number; ts?: string; ocupado?: string | null }>(arqWorker(), {});
  const s = lerJson<Record<string, unknown>>(arqStatus(), {});
  let chrome = false;
  try { chrome = (await fetch(`http://127.0.0.1:${portaFlow()}/json/version`, { signal: AbortSignal.timeout(1500) })).ok; } catch { /* fora do ar */ }
  const fila = listarRemessas().filter((r) => r.etapa === "gerando").reduce((n, r) => n + r.anuncios.reduce((m, a) => m + a.artes.filter((x) => x.status === "na_fila").length, 0), 0);
  let discoLivreGb: number | undefined;
  try { fs.mkdirSync(raizDados(), { recursive: true }); const st = fs.statfsSync(raizDados()); discoLivreGb = Math.round((st.bavail * st.bsize) / 1e9 * 10) / 10; } catch { /* sem statfs */ }
  return Response.json({ chrome, worker: { vivo: !!w.ts && Date.now() - Date.parse(w.ts) < 15_000, ocupado: w.ocupado ?? null, pid: w.pid },
    saldo: s.saldo, saldoEm: s.saldoEm, bloqueio: s.bloqueio ?? null, ultima: s.ultima, proxima: s.bloqueio ? null : proximaArte(listarRemessas()), fila, discoLivreGb, configurado: flowConfigurado(), porta: portaFlow() });
}
