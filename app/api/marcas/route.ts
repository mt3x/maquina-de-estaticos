import fs from "node:fs"; import path from "node:path";
import { rodarPythonSync } from "@/lib/plataforma";
import { raizDados, dirMarca } from "@/lib/caminhos";
import { lerJson, salvarJson } from "@/lib/estado";
import { enfileirar } from "@/lib/comandos";
import { normalizarSegmento } from "@/lib/nomes";
import { urlArquivo } from "@/lib/apresentar";
import { origemPermitida } from "@/lib/validar";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const bloqueio = origemPermitida(req); if (bloqueio) return bloqueio;
  const d = path.join(raizDados(), "marcas"); if (!fs.existsSync(d)) return Response.json([]);
  const lista = [];
  for (const m of fs.readdirSync(d)) {
    if (!fs.existsSync(path.join(d, m, "identidade.json"))) continue;
    try {
      const id = lerJson<any>(path.join(d, m, "identidade.json")); const logo = path.join(d, m, "logo/logo-cor.png");
      lista.push({ id: m, nome: id.nome ?? m, cores: id.cores?.oficial ?? {}, logoUrl: fs.existsSync(logo) ? urlArquivo(logo) : undefined });
    } catch { /* identidade corrompida: pula a marca */ }
  }
  return Response.json(lista);
}
export async function POST(req: Request) {
  const bloqueio = origemPermitida(req); if (bloqueio) return bloqueio;
  const fd = await req.formData(); const nome = String(fd.get("nome") || "").trim();
  if (!nome) return Response.json({ erro: "informe o nome da marca" }, { status: 400 });
  const id = normalizarSegmento(nome).toLowerCase();
  if (!/^[a-z0-9-]{2,40}$/.test(id)) return Response.json({ erro: "nome da marca inválido: use letras e números (2 a 40 caracteres)" }, { status: 400 });
  const d = dirMarca(id);
  if (fs.existsSync(path.join(d, "identidade.json"))) return Response.json({ erro: "marca já existe" }, { status: 409 });
  const gravar = async (f: FormDataEntryValue, sub: string, nomeArq?: string) => { if (!(f instanceof File)) return;
    const a = path.join(d, sub, nomeArq ?? normalizarSegmento(f.name)); fs.mkdirSync(path.dirname(a), { recursive: true }); fs.writeFileSync(a, Buffer.from(await f.arrayBuffer())); };
  const tipo = (f: FormDataEntryValue, re: RegExp) => f instanceof File && re.test(f.name);
  for (const f of fd.getAll("base")) if (tipo(f, /\.(png|jpe?g|webp)$/i)) await gravar(f, "base");
  for (const f of fd.getAll("fontes")) if (tipo(f, /\.(otf|ttf)$/i)) await gravar(f, "fontes");
  const logo = fd.get("logo"); const logoOk = !!logo && tipo(logo, /\.png$/i);
  if (logo && logoOk) await gravar(logo, "logo", "logo-oficial.png");
  if (logoOk) { try { rodarPythonSync("motor-flow/logo_variantes.py", [path.join(d, "logo", "logo-oficial.png"), path.join(d, "logo")], { timeout: 30000 }); } catch { /* segue sem variantes */ } }
  salvarJson(path.join(d, "entrada.json"), { nome, aviso: String(fd.get("aviso") || ""), paleta: String(fd.get("paleta") || ""), selo: String(fd.get("selo") || "").trim() });
  enfileirar({ tipo: "extrair_marca", marca: id });
  return Response.json({ id });
}
