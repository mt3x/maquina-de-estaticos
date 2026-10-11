import { idValido, respostaIdInvalido, origemPermitida } from "@/lib/validar";
import fs from "node:fs"; import path from "node:path"; import { PassThrough, Readable } from "node:stream";
import archiver from "archiver";
import { lerRemessa } from "@/lib/estado";
import { arqEstado, dirEntrega } from "@/lib/caminhos";
export const runtime = "nodejs";
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const bloqueio = origemPermitida(req); if (bloqueio) return bloqueio;
  const { id } = await ctx.params;
  if (!idValido(id)) return new Response("id inválido", { status: 400 });
  if (!fs.existsSync(arqEstado(id))) return new Response("não encontrada", { status: 404 });
  const soPreferidas = new URL(req.url).searchParams.get("so") === "preferidas";
  const r = lerRemessa(id);
  const arquivos = r.anuncios.flatMap((an) => an.artes.filter((a) => a.status === "pronta" && a.arquivo && fs.existsSync(a.arquivo) && a.arquivo.endsWith(".png")
    && (!soPreferidas || !an.preferida?.[a.formato] || an.preferida[a.formato] === a.modelo)).map((a) => a.arquivo!));
  const zip = archiver("zip", { zlib: { level: 6 } }); const saida = new PassThrough(); zip.pipe(saida);
  zip.on("error", (e) => saida.destroy(e));
  for (const a of arquivos) zip.file(a, { name: path.relative(dirEntrega(id), a) });
  void zip.finalize();
  return new Response(Readable.toWeb(saida) as ReadableStream, { headers: { "content-type": "application/zip",
    "content-disposition": `attachment; filename="${id}${soPreferidas ? "-preferidas" : ""}.zip"` } });
}
