import fs from "node:fs"; import path from "node:path";
import { dirMarca } from "@/lib/caminhos";
import { lerJson, salvarJson } from "@/lib/estado";
import { urlArquivo } from "@/lib/apresentar";
import { origemPermitida } from "@/lib/validar";
export const dynamic = "force-dynamic";
const idMarcaValido = (id: string) => /^[a-z0-9-]{2,40}$/.test(id);
const idInvalido = () => Response.json({ erro: "id de marca inválido" }, { status: 400 });
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const bloqueio = origemPermitida(req); if (bloqueio) return bloqueio;
  const { id } = await ctx.params; if (!idMarcaValido(id)) return idInvalido();
  const d = dirMarca(id);
  const guia = path.join(d, "guia-marca.md");
  const logo = path.join(d, "logo/logo-cor.png"); const fd = path.join(d, "fontes");
  const fontes = fs.existsSync(fd) ? fs.readdirSync(fd).filter((n) => /\.(otf|ttf)$/i.test(n)).sort() : [];
  return Response.json({ logoUrl: fs.existsSync(logo) ? urlArquivo(logo) : undefined, fontes,
    identidade: lerJson(path.join(d, "identidade.json"), null), guia: fs.existsSync(guia) ? fs.readFileSync(guia, "utf8") : null,
    rascunho: lerJson(path.join(d, ".rascunho.json"), null) });
}
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const bloqueio = origemPermitida(req); if (bloqueio) return bloqueio;
  const { id } = await ctx.params; if (!idMarcaValido(id)) return idInvalido();
  const d = dirMarca(id); const b = await req.json().catch(() => ({}));
  if (!b || typeof b.identidade !== "object" || !b.identidade || typeof b.guiaMarkdown !== "string") return Response.json({ erro: "identidade e guia são obrigatórios" }, { status: 400 });
  fs.mkdirSync(d, { recursive: true });
  salvarJson(path.join(d, "identidade.json"), b.identidade); fs.writeFileSync(path.join(d, "guia-marca.md"), b.guiaMarkdown);
  fs.rmSync(path.join(d, ".rascunho.json"), { force: true });
  return Response.json({ ok: true });
}
