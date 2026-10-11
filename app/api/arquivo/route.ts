import fs from "node:fs"; import path from "node:path";
import { origemPermitida } from "@/lib/validar";
import { raizDados, dentroDe } from "@/lib/caminhos";
const TIPOS: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" };
export async function GET(req: Request) {
  const bloqueio = origemPermitida(req); if (bloqueio) return bloqueio;
  const p = new URL(req.url).searchParams.get("p") || "";
  const tipo = TIPOS[path.extname(p).toLowerCase()];
  if (!p || !tipo || !dentroDe(raizDados(), p)) return new Response("caminho inválido", { status: 400 });
  const abs = path.resolve(raizDados(), p);
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) return new Response("não encontrado", { status: 404 });
  return new Response(fs.readFileSync(abs), { headers: { "content-type": tipo, "cache-control": "private, max-age=31536000, immutable" } });
}
