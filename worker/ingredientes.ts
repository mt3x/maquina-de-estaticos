import path from "node:path";
import { dirEntrada, dirMarca } from "@/lib/caminhos";

function confinar(base: string, rel: string, token: string): string {
  const raiz = path.resolve(base);
  const abs = path.resolve(raiz, rel);
  if (abs !== raiz && !abs.startsWith(raiz + path.sep)) throw new Error(`ingrediente fora da pasta permitida: ${token}`);
  return abs;
}

export function resolverIngrediente(token: string, remessa: string, marca: string) {
  const [tipo, ...resto] = token.split(":"); const rel = resto.join(":");
  if (tipo === "entrada") return { abs: confinar(dirEntrada(remessa), rel, token), nomeFlow: `${remessa.toLowerCase()}-${rel.replace(/[\\/]/g, "-")}` };
  if (tipo === "marca") return { abs: confinar(dirMarca(marca), rel, token), nomeFlow: `${marca}-${path.basename(rel)}` };
  throw new Error(`ingrediente inválido: ${token}`);
}
