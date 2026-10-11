import { describe, it, expect } from "vitest";
import { proximaArte, Ritmo, decidir } from "@/worker/fila-flow";
import { criarArtes, type Remessa } from "@/lib/tipos";

const rem = (id: string, criadaEm: string, etapa: Remessa["etapa"] = "gerando"): Remessa => ({
  id, marca: "marca-teste", modelos: ["nano-banana-pro", "nano-banana-2-1"], criadaEm, atualizadaEm: criadaEm, etapa, duvidas: [], log: [],
  anuncios: ["AD01", "AD02"].map((a) => ({ id: a, ref: "", copy: "c", instrucoes: "", apoio: [], temPessoas: false, artes: criarArtes(["nano-banana-pro", "nano-banana-2-1"]) })),
});

describe("proximaArte", () => {
  it("segue a ordem anúncio → Pro STORY, Pro FEED, 2.1 STORY, 2.1 FEED", () => {
    const r = rem("R1", "2026-10-08T01:00:00Z");
    const seq: string[] = [];
    for (let i = 0; i < 8; i++) { const a = proximaArte([r])!; seq.push(`${a.anuncio}/${a.modelo}/${a.formato}`);
      r.anuncios.find((x) => x.id === a.anuncio)!.artes.find((x) => x.modelo === a.modelo && x.formato === a.formato)!.status = "pronta"; }
    expect(seq.slice(0, 4)).toEqual(["AD01/nano-banana-pro/STORY", "AD01/nano-banana-pro/FEED", "AD01/nano-banana-2-1/STORY", "AD01/nano-banana-2-1/FEED"]);
    expect(proximaArte([r])).toBeNull();
  });
  it("ajuste (prioridade 1) passa na frente; nova tentativa (-1) vai pro fim; ignora remessas não gerando", () => {
    const a = rem("R1", "2026-10-08T01:00:00Z"), b = rem("R2", "2026-10-08T02:00:00Z"), c = rem("R0", "2026-10-08T00:00:00Z", "pausada");
    a.anuncios[0].artes[0].prioridade = -1;
    expect(proximaArte([b, a, c])).toMatchObject({ remessa: "R1", anuncio: "AD01", modelo: "nano-banana-pro", formato: "FEED" });
    b.anuncios[1].artes[3].prioridade = 1;
    expect(proximaArte([b, a, c])).toMatchObject({ remessa: "R2", anuncio: "AD02", modelo: "nano-banana-2-1", formato: "FEED" });
  });
});

describe("Ritmo", () => {
  it("primeiro envio imediato; depois completa 45–60 s a partir do FIM da geração anterior", async () => {
    let t = 0; const esperas: number[] = [];
    const r = new Ritmo({ dormir: async (ms) => { esperas.push(ms); t += ms; }, agora: () => t, aleatorio: () => 0.5, minS: 45, maxS: 60 });
    expect(await r.antesDeEnviar()).toBe(0);
    t += 36_000; // geração levou 36 s
    r.registrarFim();
    t += 10_000; // 10 s depois do fim
    expect(await r.antesDeEnviar()).toBe(52_500 - 10_000);
    t += 36_000; r.registrarFim();
    t += 100_000;
    expect(await r.antesDeEnviar()).toBe(0);
  });
});

describe("decidir", () => {
  it("cobre todos os status", () => {
    expect(decidir({ status: "ok" }, 1, 3)).toBe("pos");
    expect(decidir({ status: "bloqueio" }, 1, 3)).toBe("parar_bloqueio");
    expect(decidir({ status: "custo" }, 1, 3)).toBe("parar_custo");
    expect(decidir({ status: "falha_leve" }, 2, 3)).toBe("repetir");
    expect(decidir({ status: "falha_leve" }, 3, 3)).toBe("falhou");
    expect(decidir({ status: "ui" }, 1, 3)).toBe("repetir_ui");
    expect(decidir({ status: "suspeito" }, 3, 3)).toBe("falhou");
  });
});
