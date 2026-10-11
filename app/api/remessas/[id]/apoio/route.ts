import fs from "node:fs"; import path from "node:path";
import { enfileirar } from "@/lib/comandos";
import { dirEntrada, arqEstado } from "@/lib/caminhos";
import { lerRemessa } from "@/lib/estado";
import { normalizarSegmento } from "@/lib/nomes";
import { idValido, respostaIdInvalido, origemPermitida } from "@/lib/validar";
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const bloqueio = origemPermitida(req); if (bloqueio) return bloqueio;
  const { id } = await ctx.params;
  if (!idValido(id)) return respostaIdInvalido();
  if (!fs.existsSync(arqEstado(id))) return Response.json({ erro: "remessa não encontrada" }, { status: 404 });
  const fd = await req.formData().catch(() => null);
  const f = fd?.get("arquivo"); const anuncio = String(fd?.get("anuncio") || "");
  if (!(f instanceof File) || !anuncio) return Response.json({ erro: "arquivo e anúncio são obrigatórios" }, { status: 400 });
  if (!lerRemessa(id).anuncios.some((a) => a.id === anuncio)) return Response.json({ erro: "anúncio não encontrado" }, { status: 400 });
  const rel = path.join("apoio", normalizarSegmento(f.name)); const abs = path.join(dirEntrada(id), rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true }); fs.writeFileSync(abs, Buffer.from(await f.arrayBuffer()));
  enfileirar({ tipo: "apoio", remessa: id, anuncio, arquivo: rel });
  return Response.json({ ok: true, arquivo: rel });
}
