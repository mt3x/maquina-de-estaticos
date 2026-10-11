import { idValido, respostaIdInvalido, origemPermitida } from "@/lib/validar";
import fs from "node:fs";
import { lerRemessa } from "@/lib/estado";
import { arqEstado } from "@/lib/caminhos";
import { apresentarRemessa } from "@/lib/apresentar";
export const dynamic = "force-dynamic";
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const bloqueio = origemPermitida(req); if (bloqueio) return bloqueio;
  const { id } = await ctx.params;
  if (!idValido(id)) return respostaIdInvalido();
  if (!fs.existsSync(arqEstado(id))) return Response.json({ erro: "remessa não encontrada" }, { status: 404 });
  return Response.json(apresentarRemessa(lerRemessa(id)));
}
