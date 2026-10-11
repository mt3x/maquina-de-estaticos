import { origemPermitida } from "@/lib/validar";
import { enfileirar } from "@/lib/comandos";
/** Libera o bloqueio global do Flow. Só enfileira: quem grava o status.json é o worker. */
export async function POST(req: Request) {
  const bloqueio = origemPermitida(req); if (bloqueio) return bloqueio;
  enfileirar({ tipo: "desbloquear" });
  return Response.json({ ok: true });
}
