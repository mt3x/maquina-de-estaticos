import fs from "node:fs"; import os from "node:os"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { chamarCerebro } from "./chamar";
import { schemaInterpretar, schemaPrompt, schemaRevisar, schemaMarca, type SaidaInterpretar, type SaidaPrompt, type SaidaRevisar, type SaidaMarca } from "./schemas";
import { dirMarca } from "@/lib/caminhos";
import type { Anuncio, Formato } from "@/lib/tipos";

const SIS = path.join(path.dirname(fileURLToPath(import.meta.url)), "sistemas");
const EX = path.join(path.dirname(fileURLToPath(import.meta.url)), "exemplos");
const MODELO = path.join(path.dirname(fileURLToPath(import.meta.url)), "modelo");
const tmpSistema = (tarefa: string) => {
  // regras comuns + sistema da tarefa num único arquivo (o CLI aceita um --append-system-prompt-file)
  const arq = path.join(os.tmpdir(), `maq-sistema-${tarefa}.md`);
  fs.writeFileSync(arq, fs.readFileSync(path.join(SIS, "regras.md"), "utf8") + "\n\n" + fs.readFileSync(path.join(SIS, `${tarefa}.md`), "utf8"));
  return arq;
};
const identidade = (marca: string) => fs.readFileSync(path.join(dirMarca(marca), "identidade.json"), "utf8");
const exemplos = () => fs.readdirSync(EX).map((n) => `--- EXEMPLO ${n} ---\n${fs.readFileSync(path.join(EX, n), "utf8")}`).join("\n\n");

export function interpretar(o: { remessa: string; marca: string; texto: string; arquivos: string[]; refsAbs: Record<number, string>; logDir: string }): Promise<SaidaInterpretar> {
  const pedido = `REMESSA: ${o.remessa}\n\nIDENTIDADE DA MARCA (identidade.json):\n${identidade(o.marca)}\n\nTEXTO DO DOCX:\n${o.texto}\n\nARQUIVOS DA PASTA (caminhos relativos):\n${o.arquivos.join("\n")}\n\nIMAGENS DAS REFERÊNCIAS (leia com Read):\n${Object.entries(o.refsAbs).map(([n, a]) => `ref-${n}: ${a}`).join("\n")}`;
  return chamarCerebro({ tarefa: "interpretar", sistema: tmpSistema("interpretar"), pedido, schema: schemaInterpretar, logDir: o.logDir,
    dirs: [...new Set(Object.values(o.refsAbs).map((a) => path.dirname(a)))] });
}

export function escreverPrompt(o: { anuncio: Anuncio; formato: Formato; marca: string; entradaDir: string; logDir: string }): Promise<SaidaPrompt> {
  const a = o.anuncio;
  const pedido = `MARCA: ${o.marca} (arquivos da marca em ${dirMarca(o.marca)}; produtos em produtos/)\nIDENTIDADE:\n${identidade(o.marca)}\n\nANÚNCIO ${a.id} — FORMATO ${o.formato}\nREFERÊNCIA (Read): ${path.join(o.entradaDir, a.ref)}\nAPOIO (Read): ${a.apoio.map((r) => path.join(o.entradaDir, r)).join(", ") || "nenhum"}\nTEM PESSOAS: ${a.temPessoas}\n\nCOPY (literal):\n${a.copy}\n\nINSTRUÇÕES:\n${a.instrucoes || "(nenhuma)"}\n\nEXEMPLOS DE PROMPTS APROVADOS:\n${exemplos()}`;
  return chamarCerebro({ tarefa: "prompts", sistema: tmpSistema("prompts"), pedido, schema: schemaPrompt, logDir: o.logDir, dirs: [o.entradaDir, dirMarca(o.marca)] });
}

export function revisar(o: { arteAbs: string; anuncio: Anuncio; formato: Formato; marca: string; refAbs: string; avisoPorCodigo?: boolean; logDir: string }): Promise<SaidaRevisar> {
  const id = JSON.parse(identidade(o.marca));
  const pedido = `ARTE GERADA (Read): ${o.arteAbs}\nREFERÊNCIA (Read): ${o.refAbs}\nFORMATO: ${o.formato}\n\nCOPY PEDIDA (literal):\n${o.anuncio.copy}\n\nINSTRUÇÕES:\n${o.anuncio.instrucoes}\n\nAVISO LEGAL OFICIAL:\n${id.aviso_legal?.texto ?? ""}${o.avisoPorCodigo ? "\n\nO AVISO LEGAL DESTA ARTE FOI REESCRITO POR CÓDIGO com o texto oficial exato: NÃO aponte erro de palavra nele (a letra pequena pode parecer borrada); só aponte se estiver ausente, cortado, sobreposto a outro elemento ou ilegível." : ""}`;
  return chamarCerebro({ tarefa: "revisar", sistema: tmpSistema("revisar"), pedido, schema: schemaRevisar, logDir: o.logDir, dirs: [path.dirname(o.arteAbs), path.dirname(o.refAbs)] });
}

export function ajustar(o: { promptAtual: string; ingredientes: string[]; pedido: string; arteAbs: string; marca: string; entradaDir: string; logDir: string }): Promise<SaidaPrompt> {
  const pedido = `PEDIDO DE AJUSTE DO USUÁRIO:\n${o.pedido}\n\nARTE ATUAL (Read): ${o.arteAbs}\nINGREDIENTES ATUAIS: ${JSON.stringify(o.ingredientes)}\n\nPROMPT ATUAL:\n${o.promptAtual}`;
  return chamarCerebro({ tarefa: "ajustar", sistema: tmpSistema("ajustar"), pedido, schema: schemaPrompt, logDir: o.logDir, dirs: [path.dirname(o.arteAbs), o.entradaDir, dirMarca(o.marca)] });
}

export function extrairMarca(o: { folhasAbs: string[]; logoAbs?: string; aviso: string; paleta?: string; selo?: string; nome: string; logDir: string }): Promise<SaidaMarca> {
  const pedido = `MARCA: ${o.nome}\nFOLHAS DE CONTATO (Read): \n${o.folhasAbs.join("\n")}\nLOGO (Read): ${o.logoAbs ?? "não enviado"}\nPALETA INFORMADA: ${o.paleta || "(extrair)"}\nAVISO LEGAL INFORMADO:\n${o.aviso}\nSELO INFORMADO: ${o.selo?.trim() || "(nenhum)"}\n\nEXEMPLO identidade.json:\n${fs.readFileSync(path.join(MODELO, "identidade-exemplo.json"), "utf8")}\n\nEXEMPLO guia (início):\n${fs.readFileSync(path.join(MODELO, "guia-exemplo.md"), "utf8").slice(0, 6000)}`;
  return chamarCerebro({ tarefa: "extrair-marca", sistema: tmpSistema("extrair-marca"), pedido, schema: schemaMarca, logDir: o.logDir, timeoutMs: 10 * 60_000,
    dirs: [...new Set([...o.folhasAbs, ...(o.logoAbs ? [o.logoAbs] : [])].map((a) => path.dirname(a)))] });
}
