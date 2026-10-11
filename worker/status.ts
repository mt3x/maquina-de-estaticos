import { lerJson, salvarJson } from "@/lib/estado";
import { arqStatus } from "@/lib/caminhos";
import type { BloqueioFlow } from "@/lib/tipos";

/** status.json: escrito só pelo worker; a API apenas lê. */
export type StatusWorker = {
  chrome?: boolean; saldo?: number; saldoEm?: string; ultima?: unknown;
  bloqueio?: BloqueioFlow | null;
  /** Fim da última geração no Flow (ms) — semeia a pausa de 45–60 s ao reiniciar. */
  ultimoFim?: number;
  /** Momento do último envio ao Flow (ms): se o worker cair no meio da geração, a pausa conta a partir daqui. */
  ultimoEnvio?: number;
};
export const lerStatus = () => lerJson<StatusWorker>(arqStatus(), {});
export function atualizarStatus(p: Partial<StatusWorker>) { salvarJson(arqStatus(), { ...lerStatus(), ...p }); }

export const lerBloqueio = (): BloqueioFlow | null => lerStatus().bloqueio ?? null;
export function bloquear(b: BloqueioFlow) { if (!lerBloqueio()) atualizarStatus({ bloqueio: b }); }
export function desbloquear() { atualizarStatus({ bloqueio: null }); }
