export const MODELOS = { "nano-banana-pro": "Nano Banana Pro", "nano-banana-2-1": "Nano Banana 2.1" } as const;
export type ModeloId = keyof typeof MODELOS;
export const ORDEM_MODELOS: ModeloId[] = ["nano-banana-pro", "nano-banana-2-1"];
export type Formato = "STORY" | "FEED";
export const FORMATOS: Formato[] = ["STORY", "FEED"];
export const RATIO: Record<Formato, "9:16" | "1:1"> = { STORY: "9:16", FEED: "1:1" };
export const TAMANHO: Record<Formato, { w: number; h: number }> = { STORY: { w: 1080, h: 1920 }, FEED: { w: 1080, h: 1080 } };

export type EtapaRemessa = "importada" | "interpretando" | "aguardando_confirmacao" | "escrevendo_prompts"
  | "enviando_referencias" | "gerando" | "concluida" | "pausada" | "erro";
export type StatusArte = "pendente" | "na_fila" | "gerando" | "pos" | "revisando" | "pronta" | "defeito" | "falhou";

export type Duvida = { id: string; anuncio?: string; pergunta: string; opcoes?: string[]; sugestao?: string; resposta?: string };
export type Arte = {
  formato: Formato; modelo: ModeloId; status: StatusArte;
  tentativas: number; versaoAtual: number; prioridade: number;
  arquivo?: string; miniatura?: string;
  revisao?: { ok: boolean; problemas: string[]; gravidade: "nenhuma" | "leve" | "grave" };
  ajustePendente?: string; creditos?: number; segundos?: number; mediaId?: string; enviadaEm?: string; erro?: string;
  /** Versão/tentativa do arquivo que está hoje em entrega/ (ajuste só o substitui quando a nova versão termina o pós). */
  versaoEntregue?: number; tentativaEntregue?: number;
};
export type Anuncio = {
  id: string; ref: string; copy: string; instrucoes: string; apoio: string[]; temPessoas: boolean;
  artes: Arte[]; preferida?: Partial<Record<Formato, ModeloId>>;
};
export type ErroRemessa = { tipo: "flow_bloqueio" | "flow_custo" | "cerebro" | "flow_ui" | "outro"; msg: string };
export type Remessa = {
  id: string; marca: string; modelos: ModeloId[];
  criadaEm: string; atualizadaEm: string; etapa: EtapaRemessa; etapaAntesDaPausa?: EtapaRemessa; etapaAntesDoErro?: EtapaRemessa;
  duvidas: Duvida[]; anuncios: Anuncio[];
  /** Respostas do usuário acumuladas em todas as rodadas de reinterpretação. */
  respostas?: { id: string; pergunta: string; resposta: string }[];
  log: { ts: string; etapa: string; msg: string; ms?: number }[];
  erro?: ErroRemessa;
};

export type Escopo = "arte" | "formato" | "anuncio";
export type Comando = { id: string; ts: string } & (
  | { tipo: "interpretar"; remessa: string }
  | { tipo: "responder"; remessa: string; respostas: Record<string, string> }
  | { tipo: "confirmar"; remessa: string; anuncios: Pick<Anuncio, "id" | "copy" | "instrucoes" | "temPessoas" | "apoio">[]; modelos: ModeloId[] }
  | { tipo: "pausar" | "retomar" | "cancelar"; remessa: string }
  | { tipo: "ajuste"; remessa: string; anuncio: string; formato: Formato; modelo: ModeloId; escopo: Escopo; texto: string }
  | { tipo: "preferida"; remessa: string; anuncio: string; formato: Formato; modelo: ModeloId }
  | { tipo: "apoio"; remessa: string; anuncio: string; arquivo: string; nomeOriginal?: string }
  | { tipo: "tentar_de_novo"; remessa: string; anuncio: string; formato: Formato; modelo: ModeloId }
  | { tipo: "extrair_marca"; marca: string }
  | { tipo: "desbloquear" }
);
export type ComandoSemId = Comando extends infer C ? (C extends Comando ? Omit<C, "id" | "ts"> : never) : never;

export function criarArtes(modelos: ModeloId[]): Arte[] {
  const ms = ORDEM_MODELOS.filter((m) => modelos.includes(m));
  return ms.flatMap((modelo) => FORMATOS.map((formato) => ({
    formato, modelo, status: "na_fila" as StatusArte, tentativas: 0, versaoAtual: 1, prioridade: 0,
  })));
}

/** Bloqueio global do Flow (status.json). Enquanto existir, nada sobe nem gera. */
export type BloqueioFlow = { tipo: "flow_bloqueio" | "flow_custo"; msg: string; em: string; remessa?: string };

/** `responder`/`interpretar` só antes de existir produção — senão apagariam anúncios e artes. */
export function podeReinterpretar(r: Pick<Remessa, "etapa" | "erro" | "anuncios">, tipo: "responder" | "interpretar" = "responder"): boolean {
  if (r.etapa === "aguardando_confirmacao") return true;
  if (tipo === "interpretar" && r.etapa === "importada") return true;
  return r.etapa === "erro" && r.erro?.tipo === "cerebro" && r.anuncios.every((a) => a.artes.length === 0);
}
