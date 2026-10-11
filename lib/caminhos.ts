import path from "node:path";
import type { Formato, ModeloId } from "./tipos";

export const raizDados = () => path.resolve(/*turbopackIgnore: true*/ process.env.MAQUINA_DADOS || path.join(/*turbopackIgnore: true*/ process.cwd(), "dados"));
export const dirRemessa = (id: string) => path.join(raizDados(), "remessas", id);
export const arqEstado = (id: string) => path.join(dirRemessa(id), "estado.json");
export const dirEntrada = (id: string) => path.join(dirRemessa(id), "entrada");
export const dirInterno = (id: string) => path.join(dirRemessa(id), ".interno");
export const dirEntrega = (id: string) => path.join(dirRemessa(id), "entrega");
export const arqEntrega = (id: string, ad: string, modelo: ModeloId, formato: Formato) =>
  path.join(dirEntrega(id), `${id} - ${ad}`, modelo, `${id} - ${ad} - ${formato}.png`);
export const dirMarca = (m: string) => path.join(raizDados(), "marcas", m);
export const dirComandos = () => path.join(raizDados(), "fila", "comandos");
export const arqStatus = () => path.join(raizDados(), "status.json");
export const arqWorker = () => path.join(raizDados(), "worker.json");
export const arqUploads = () => path.join(raizDados(), "flow-uploads.json");
export const dirInternoPrompts = (id: string) => path.join(dirInterno(id), "prompts");
/** JSON `{prompt, ingredientes}` da versão `v` de uma arte (o .txt irmão é o que vai ao Flow). */
export const arqPrompt = (id: string, ad: string, f: Formato, m: ModeloId, v: number) => path.join(dirInternoPrompts(id), `${ad}-${f}-${m}-v${v}.json`);

/** true se `alvo` (resolvido) está dentro de `base` — guarda contra path traversal. */
export function dentroDe(base: string, alvo: string): boolean {
  const b = path.resolve(base) + path.sep;
  const a = path.resolve(base, alvo);
  return a.startsWith(b);
}
