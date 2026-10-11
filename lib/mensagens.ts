import type { ErroRemessa } from "./tipos";

const MSG_ERRO: Record<ErroRemessa["tipo"], string> = {
  flow_bloqueio: "O Flow bloqueou um envio (403/atividade incomum/limite). A fila parou para proteger a conta.",
  flow_custo: "O Flow mostrou custo acima de 0 créditos. Nada foi enviado.",
  cerebro: "O Claude CLI não respondeu como esperado.", flow_ui: "A interface do Flow não respondeu.", outro: "Erro inesperado.",
};
/** Título do alerta de erro da remessa. "Custo não lido" é diferente de custo > 0. */
export function tituloErro(e: Pick<ErroRemessa, "tipo" | "msg">): string {
  if (e.tipo === "flow_custo" && /custo não lido/i.test(e.msg)) return "Não consegui ler o custo na tela do Flow — nada foi enviado.";
  return MSG_ERRO[e.tipo] ?? MSG_ERRO.outro;
}
