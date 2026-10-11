import fs from "node:fs"; import path from "node:path";
import { dirMarca } from "@/lib/caminhos";
import { rodarPython } from "@/lib/plataforma";
import { renomear } from "@/lib/estado";

/** Texto do selo da identidade da marca, quebrado em duas linhas antes de " por " (se houver). */
export function textoSelo(texto: string): string { return texto.replace(/ por /, "\n por ").replace("\n ", "\n"); }

/** Aplica o selo "imagem ilustrativa" da marca da remessa. Sem selo configurado ou sem fonte na marca: pula (false). */
export async function aplicarSelo(arq: string, marca: string): Promise<boolean> {
  const d = dirMarca(marca);
  let texto: string | undefined;
  try { texto = JSON.parse(fs.readFileSync(path.join(d, "identidade.json"), "utf8")).selo_imagem_ilustrativa?.texto; } catch { return false; }
  const fontes = path.join(d, "fontes");
  const fonte = fs.existsSync(fontes) ? fs.readdirSync(fontes).find((f) => /\.(ttf|otf)$/i.test(f)) : undefined;
  if (!texto || !fonte) return false;
  const tmp = `${arq}.selo.png`;
  await rodarPython("motor-flow/selo_ilustrativa.py", [arq, tmp, "--auto", "--igual-aviso", "--sombra", "--texto", textoSelo(texto)],
    { env: { ...process.env, MAQUINA_FONTE_SELO: path.join(fontes, fonte) }, timeout: 60_000 });
  renomear(tmp, arq); return true;
}
