import fs from "node:fs";
import { listarRemessas, salvarRemessa } from "@/lib/estado";
import { arqEstado, dirMarca } from "@/lib/caminhos";
import path from "node:path";
import { gravarEntrada, idDaPasta } from "@/lib/nomes";
import { resumoRemessa } from "@/lib/apresentar";
import { origemPermitida } from "@/lib/validar";
export const runtime = "nodejs";

export async function GET(req: Request) { return origemPermitida(req) ??  Response.json(listarRemessas().reverse().map(resumoRemessa)); }

export async function POST(req: Request) {
  const bloqueio = origemPermitida(req); if (bloqueio) return bloqueio;
  const fd = await req.formData();
  const marca = String(fd.get("marca") || ""); if (!marca) return Response.json({ erro: "escolha a marca" }, { status: 400 });
  if (!/^[a-z0-9-]{2,40}$/.test(marca) || !fs.existsSync(path.join(dirMarca(marca), "identidade.json"))) return Response.json({ erro: `a marca "${marca}" não existe — cadastre-a em Marcas` }, { status: 400 });
  const arquivos = fd.getAll("arquivos").filter((f): f is File => f instanceof File);
  let caminhos: unknown; try { caminhos = JSON.parse(String(fd.get("caminhos") || "[]")); } catch { caminhos = null; }
  if (!Array.isArray(caminhos) || !caminhos.every((c) => typeof c === "string" && c) || !arquivos.length || caminhos.length !== arquivos.length) return Response.json({ erro: "envie a pasta da remessa" }, { status: 400 });
  const pasta = (caminhos as string[])[0].split("/")[0];
  const id = String(fd.get("id") || "").trim().toUpperCase() || idDaPasta(pasta) || `R${Date.now()}`;
  if (!/^[A-Z0-9-]{2,30}$/.test(id)) return Response.json({ erro: "id inválido" }, { status: 400 });
  if (fs.existsSync(arqEstado(id))) return Response.json({ erro: `a remessa ${id} já existe` }, { status: 409 });
  gravarEntrada(id, await Promise.all(arquivos.map(async (f, i) => ({ rel: (caminhos as string[])[i], dados: Buffer.from(await f.arrayBuffer()) }))));
  const agora = new Date().toISOString();
  salvarRemessa({ id, marca, modelos: [], criadaEm: agora, atualizadaEm: agora, etapa: "importada", duvidas: [], anuncios: [],
    log: [{ ts: agora, etapa: "importada", msg: `${arquivos.length} arquivos recebidos` }] });
  return Response.json({ id });
}
