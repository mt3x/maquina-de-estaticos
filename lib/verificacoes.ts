// A lógica mora em scripts/verificacoes-base.mjs (JS puro, roda antes do npm install); aqui só reexporta para o app e os testes.
export { avaliarVersao, checarNode, checarPython, checarChrome, checarDisco, checarClaude, descobrirPython, discoLivreGb, rodarVerificacoes } from "../scripts/verificacoes-base.mjs";
export type { Checagem } from "../scripts/verificacoes-base.mjs";
