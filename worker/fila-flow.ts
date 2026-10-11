import { FORMATOS, ORDEM_MODELOS, type Formato, type ModeloId, type Remessa } from "@/lib/tipos";
import type { ResultadoGeracao } from "./flow-driver";

export type Alvo = { remessa: string; anuncio: string; formato: Formato; modelo: ModeloId };

export function proximaArte(remessas: Remessa[]): Alvo | null {
  const ativas = remessas.filter((r) => r.etapa === "gerando").sort((a, b) => a.criadaEm.localeCompare(b.criadaEm));
  const cmp = (x: number[], y: number[]) => { for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] - y[i]; return 0; };
  let melhor: { chave: number[]; alvo: Alvo } | null = null;
  ativas.forEach((r, ri) => r.anuncios.forEach((an, ai) => an.artes.forEach((arte) => {
    if (arte.status !== "na_fila") return;
    const chave = [-arte.prioridade, ri, ai, ORDEM_MODELOS.indexOf(arte.modelo), FORMATOS.indexOf(arte.formato)];
    if (!melhor || cmp(chave, melhor.chave) < 0) melhor = { chave, alvo: { remessa: r.id, anuncio: an.id, formato: arte.formato, modelo: arte.modelo } };
  })));
  return melhor ? (melhor as { chave: number[]; alvo: Alvo }).alvo : null;
}

export class Ritmo {
  private ultimoFim: number | null;
  /** `ultimoFimInicial` (ms) vem do status.json: a pausa vale mesmo depois de reiniciar o worker. `aoRegistrarFim` persiste cada fim. */
  constructor(private o: { dormir: (ms: number) => Promise<void>; agora: () => number; aleatorio: () => number; minS: number; maxS: number;
    ultimoFimInicial?: number | null; aoRegistrarFim?: (ms: number) => void }) { this.ultimoFim = o.ultimoFimInicial ?? null; }
  /** Marca o fim de uma geração; a pausa sorteada conta a partir daqui. */
  registrarFim(): void { this.ultimoFim = this.o.agora(); this.o.aoRegistrarFim?.(this.ultimoFim); }
  async antesDeEnviar(): Promise<number> {
    if (this.ultimoFim === null) return 0;
    const alvo = (this.o.minS + this.o.aleatorio() * (this.o.maxS - this.o.minS)) * 1000;
    const espera = Math.max(0, Math.round(alvo - (this.o.agora() - this.ultimoFim)));
    if (espera) await this.o.dormir(espera);
    return espera;
  }
}

export type Decisao = "pos" | "repetir" | "repetir_ui" | "falhou" | "parar_bloqueio" | "parar_custo";
export function decidir(r: Pick<ResultadoGeracao, "status">, tentativasFeitas: number, max: number): Decisao {
  switch (r.status) {
    case "ok": return "pos";
    case "bloqueio": return "parar_bloqueio";
    case "custo": return "parar_custo";
    case "ui": return tentativasFeitas < max ? "repetir_ui" : "falhou";
    default: return tentativasFeitas < max ? "repetir" : "falhou";
  }
}
