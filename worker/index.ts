import { flowConfigurado } from "@/lib/configuracao";
import { lerVariavel } from "@/lib/env-local";
import path from "node:path"; import { fileURLToPath } from "node:url";
import { consumirComandos } from "@/lib/comandos";
import { listarRemessas, lerJson, salvarJson, lerRemessa, registrar, salvarRemessa } from "@/lib/estado";
import { arqWorker } from "@/lib/caminhos";
import { podeReinterpretar } from "@/lib/tipos";
import * as tarefas from "./cerebro/tarefas";
import * as driver from "./flow-driver";
import { finalizar, miniatura } from "./pos/finalizar";
import { aplicarSelo } from "./pos/selo";
import { aplicarAviso } from "./pos/aviso";
import { extrairMarcaCmd } from "./marca";
import { Ritmo, proximaArte } from "./fila-flow";
import { atualizarStatus, lerBloqueio, lerStatus, desbloquear } from "./status";
import { interpretarRemessa, confirmarRemessa, escreverPrompts, enviarReferencias, processarProximaArte, aplicarAjuste, aplicarControle, recuperarAoIniciar, type Deps } from "./remessa";

const dormir = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function criarDeps(): Deps {
  const s = lerStatus();
  const ultimoFimInicial = Math.max(s.ultimoFim ?? 0, s.ultimoEnvio ?? 0) || null;
  const deps: Deps = {
    cerebro: tarefas, flow: driver, pos: { finalizar, miniatura, aplicarSelo, aplicarAviso },
    ritmo: new Ritmo({ dormir, agora: () => Date.now(), aleatorio: Math.random, minS: Number(process.env.PAUSA_MIN_S || 45), maxS: Number(process.env.PAUSA_MAX_S || 60),
      ultimoFimInicial, aoRegistrarFim: (ms) => atualizarStatus({ ultimoFim: ms }) }),
    dormir, maxTentativas: Number(process.env.MAX_TENTATIVAS || 3),
  };
  deps.aplicarPendentes = () => processarComandos(deps);
  return deps;
}
let ocupado: string | null = null;
function gravarBatimento() { salvarJson(arqWorker(), { pid: process.pid, ts: new Date().toISOString(), ocupado }); }
/** Atualiza o que o worker está fazendo e grava na hora; o intervalo de main() mantém o ts fresco durante passos longos. */
export function batimento(o: string | null) { ocupado = o; gravarBatimento(); }

/** Pid de outro worker com batimento fresco (< 15 s) e processo vivo; null se não houver. */
export function outroWorkerVivo(w: { pid?: number; ts?: string } = lerJson(arqWorker(), {}), agora = Date.now(), meuPid = process.pid,
  vivo: (pid: number) => boolean = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return (e as NodeJS.ErrnoException).code === "EPERM"; } }): number | null {
  if (!w.pid || w.pid === meuPid || !w.ts) return null;
  const idade = agora - Date.parse(w.ts);
  if (!(idade >= 0 && idade < 15_000)) return null;
  return vivo(w.pid) ? w.pid : null;
}

/** Consome e aplica todos os comandos da fila, na ordem. Usado pelo ciclo e logo antes de cada envio ao Flow. */
export async function processarComandos(deps: Deps): Promise<boolean> {
  let trabalhou = false;
  for (const cmd of consumirComandos()) {
    trabalhou = true;
    try {
      if (cmd.tipo === "responder" || cmd.tipo === "interpretar") {
        const r = lerRemessa(cmd.remessa);
        if (!podeReinterpretar(r, cmd.tipo)) {
          console.warn(`[worker] ${cmd.tipo} ignorado: ${r.id} está em ${r.etapa}`);
          registrar(r, "aviso", `${cmd.tipo === "responder" ? "respostas ignoradas" : "reinterpretação ignorada"}: a remessa já está em ${r.etapa}`); salvarRemessa(r);
          continue;
        }
        await interpretarRemessa(cmd.remessa, deps, cmd.tipo === "responder" ? cmd.respostas : undefined);
      }
      else if (cmd.tipo === "confirmar") confirmarRemessa(cmd);
      else if (cmd.tipo === "ajuste") await aplicarAjuste(cmd, deps);
      else if (cmd.tipo === "extrair_marca") await extrairMarcaCmd(cmd);
      else if (cmd.tipo === "desbloquear") { desbloquear(); console.log("[worker] bloqueio do Flow liberado pelo usuário"); }
      else await aplicarControle(cmd);
    } catch (e) {
      console.error("[worker] comando falhou", cmd.tipo, e);
      if ("remessa" in cmd) { try { const r = lerRemessa(cmd.remessa); registrar(r, "erro", `comando ${cmd.tipo} falhou: ${e instanceof Error ? e.message : e}`); salvarRemessa(r); } catch { /* remessa inexistente */ } }
    }
  }
  return trabalhou;
}

export async function ciclo(deps: Deps, opts: { chrome?: () => Promise<boolean>; raizEnv?: string } = {}): Promise<boolean> {
  let trabalhou = await processarComandos(deps);
  let vivo: boolean | undefined;
  const chromeOk = async () => {
    if (vivo === undefined) { vivo = await (opts.chrome ?? driver.chromeVivo)(); if (lerStatus().chrome !== vivo) atualizarStatus({ chrome: vivo }); }
    return vivo;
  };
  // O .env.local só era lido na partida: reler aqui deixa `npm run configurar` valer com o sistema no ar (os scripts do motor herdam este env).
  const projeto = opts.raizEnv === undefined ? undefined : lerVariavel(opts.raizEnv, "FLOW_PROJETO"); if (projeto !== undefined) process.env.FLOW_PROJETO = projeto;
  for (const r of listarRemessas()) {
    if (r.etapa === "importada") { batimento(r.id); await interpretarRemessa(r.id, deps); return true; }
    if (r.etapa === "escrevendo_prompts") { batimento(r.id); await escreverPrompts(r.id, deps); return true; }
    // Envio de referências toca no Flow: só com Chrome no ar e sem bloqueio global (senão a remessa espera).
    if (r.etapa === "enviando_referencias" && flowConfigurado() && !lerBloqueio() && (await chromeOk())) {
      batimento(r.id); if (await enviarReferencias(r.id, deps)) return true;
    }
  }
  if (!flowConfigurado()) return trabalhou; // sem projeto do Flow ligado, nunca toca no Flow
  if (lerBloqueio()) return trabalhou;
  if (!listarRemessas().some((r) => r.etapa === "gerando")) return trabalhou;
  if (!proximaArte(listarRemessas())) return trabalhou;
  if (!(await chromeOk())) return trabalhou;
  batimento("flow");
  const feito = await processarProximaArte(deps);
  if (feito) atualizarStatus({ ...(feito.resultado.saldo !== undefined ? { saldo: feito.resultado.saldo, saldoEm: new Date().toISOString() } : {}),
    ultima: { alvo: feito.alvo, status: feito.resultado.status, segundos: feito.resultado.segundos, em: new Date().toISOString() } });
  trabalhou = trabalhou || !!feito;
  return trabalhou;
}

export async function main() {
  try { process.loadEnvFile(".env.local"); } catch { /* opcional */ }
  const outro = outroWorkerVivo();
  if (outro) { console.error(`[worker] outro worker já está rodando (pid ${outro}) — saindo para nunca haver duas gerações ao mesmo tempo.`); process.exit(1); }
  const deps = criarDeps(); recuperarAoIniciar(deps.maxTentativas);
  setInterval(gravarBatimento, 5000).unref(); console.log("[worker] no ar", process.pid);
  for (;;) {
    batimento(null);
    let fez = false;
    try { fez = await ciclo(deps, { raizEnv: process.cwd() }); } catch (e) { console.error("[worker] ciclo falhou", e); }
    if (!fez) await dormir(1000);
  }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) void main();
