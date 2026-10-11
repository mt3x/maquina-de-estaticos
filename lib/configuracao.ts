export const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Porta do Chrome de debug do Flow (FLOW_PORTA; padrão 9231). */
export const portaFlow = (env: Record<string, string | undefined> = process.env) => { const n = Number(env.FLOW_PORTA); return Number.isInteger(n) && n > 0 && n < 65536 ? n : 9231; };
/** Projeto do Flow ligado? Sem UUID válido em FLOW_PROJETO o sistema não toca no Flow. */
export const flowConfigurado = (env: Record<string, string | undefined> = process.env) => RE_UUID.test(env.FLOW_PROJETO ?? "");
