import { ACOES, idValido, respostaIdInvalido, origemPermitida } from "@/lib/validar";
import fs from "node:fs";
import { podeReinterpretar, type ComandoSemId } from "@/lib/tipos";
import { lerRemessa } from "@/lib/estado";
import { enfileirar } from "@/lib/comandos";
import { arqEstado } from "@/lib/caminhos";
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const bloqueio = origemPermitida(req); if (bloqueio) return bloqueio;
  const { id } = await ctx.params;
  if (!idValido(id)) return respostaIdInvalido();
  if (!fs.existsSync(arqEstado(id))) return Response.json({ erro: "remessa não encontrada" }, { status: 404 });
  const b: unknown = await req.json().catch(() => null);
  const tipo = b && typeof b === "object" && !Array.isArray(b) ? (b as { tipo?: unknown }).tipo : undefined;
  if (typeof tipo !== "string" || !Object.hasOwn(ACOES, tipo)) return Response.json({ erro: "ação inválida" }, { status: 400 });
  const { tipo: _t, ...campos } = b as Record<string, unknown>;
  const ok = ACOES[tipo as keyof typeof ACOES].safeParse(campos);
  if (!ok.success) {
    const msg = tipo === "confirmar" ? "escolha ao menos um modelo e envie os anúncios corretamente" : tipo === "ajuste" ? "descreva o ajuste" : "dados da ação inválidos";
    return Response.json({ erro: msg }, { status: 400 });
  }
  if (tipo === "responder" && !podeReinterpretar(lerRemessa(id)))
    return Response.json({ erro: "a remessa já está em produção — as respostas não podem mais mudar os anúncios" }, { status: 409 });
  enfileirar({ tipo, ...ok.data, remessa: id } as ComandoSemId);
  return Response.json({ ok: true });
}
