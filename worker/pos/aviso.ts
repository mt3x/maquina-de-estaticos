import fs from "node:fs"; import path from "node:path";
import { dirMarca } from "@/lib/caminhos"; import { rodarPython } from "@/lib/plataforma";

/**
 * Reescreve o aviso legal oficial da marca por código, no lugar do parágrafo que a IA escreveu (a IA erra letras).
 * true = reescrito; false = parágrafo não localizado com segurança (a arte fica como a IA fez e a revisão decide).
 */
export async function aplicarAviso(arq: string, marca: string): Promise<boolean> {
  const ident = path.join(dirMarca(marca), "identidade.json");
  const fontes = path.join(dirMarca(marca), "fontes");
  const fonte = fs.existsSync(fontes) ? fs.readdirSync(fontes).find((f) => /\.(ttf|otf)$/i.test(f)) : undefined;
  if (!fs.existsSync(ident) || !fonte) return false;
  const tmp = `${arq}.aviso.png`;
  try {
    await rodarPython("motor-flow/aviso_oficial.py", [arq, tmp, "--texto-arq", ident, "--fonte", path.join(fontes, fonte)], { timeout: 60_000 });
    fs.renameSync(tmp, arq); return true;
  } catch {
    fs.rmSync(tmp, { force: true }); return false; // exit 2 = sem aviso localizado; qualquer erro mantém a arte intacta
  }
}
