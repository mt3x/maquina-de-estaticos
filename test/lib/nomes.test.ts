import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { normalizarSegmento, normalizarCaminho, idDaPasta, gravarEntrada, acharRefs, acharDocx } from "@/lib/nomes";

beforeEach(() => {
  process.env.MAQUINA_DADOS = fs.mkdtempSync(path.join(os.tmpdir(), "maq-"));
});

describe("nomes", () => {
  it("normaliza segmentos sujos", () => {
    expect(normalizarSegmento("ref-2 (2).jpg")).toBe("ref-02.jpg");
    expect(normalizarSegmento("ref-1.jpg")).toBe("ref-01.jpg");
    expect(normalizarSegmento("REF_05.PNG")).toBe("ref-05.png");
    expect(normalizarSegmento("óleo.jpeg")).toBe("oleo.jpeg");
    expect(normalizarSegmento("Remessa 58.docx")).toBe("remessa-58.docx");
    expect(normalizarSegmento("referências 2")).toBe("referencias-2");
  });
  it("normaliza caminho com subpastas", () => {
    expect(normalizarCaminho("ads-marca-teste-remessa-59/referências 2/ref-01.jpg")).toBe("referencias-2/ref-01.jpg");
    expect(normalizarCaminho("ads-marca-teste-remessa-58/material-de-apoio-ad-01/foto-1.jpeg")).toBe("material-de-apoio-ad-01/foto-1.jpeg");
    expect(normalizarCaminho("marca-teste-59/ref-1.jpg")).toBe("ref-01.jpg");
  });
  it("id da pasta", () => {
    expect(idDaPasta("ads-marca-teste-remessa-60")).toBe("R60");
    expect(idDaPasta("Remessa 7")).toBe("R7");
    expect(idDaPasta("qualquer")).toBeNull();
  });
  it("grava entrada e acha refs e docx", () => {
    const rels = gravarEntrada("R59", [
      { rel: "ads-marca-teste-remessa-59/Remessa 59.docx", dados: Buffer.from("x") },
      { rel: "ads-marca-teste-remessa-59/referências 2/ref-04.jpg", dados: Buffer.from("y") },
      { rel: "ads-marca-teste-remessa-59/ref-2 (2).jpg", dados: Buffer.from("z") },
      { rel: "ads-marca-teste-remessa-59/.DS_Store", dados: Buffer.from("") },
    ]);
    expect(rels.sort()).toEqual(["ref-02.jpg", "referencias-2/ref-04.jpg", "remessa-59.docx"]);
    expect(acharRefs(rels)).toEqual({ 2: "ref-02.jpg", 4: "referencias-2/ref-04.jpg" });
    expect(acharDocx(rels)).toBe("remessa-59.docx");
    expect(fs.existsSync(path.join(process.env.MAQUINA_DADOS!, "remessas/R59/entrada/referencias-2/ref-04.jpg"))).toBe(true);
  });
  it("I10: trava do Word (~$…docx) é ignorada e o maior .docx vence", () => {
    const rels = gravarEntrada("R61", [
      { rel: "ads-marca-teste-remessa-61/Remessa 61.docx", dados: Buffer.from("documento de verdade, bem maior") },
      { rel: "ads-marca-teste-remessa-61/~$Remessa 61.docx", dados: Buffer.from("trava") },
    ]);
    expect(rels).toEqual(["remessa-61.docx"]);
    expect(fs.readFileSync(path.join(process.env.MAQUINA_DADOS!, "remessas/R61/entrada/remessa-61.docx"), "utf8")).toBe("documento de verdade, bem maior");
    const tam: Record<string, number> = { "a.docx": 10, "b/briefing.docx": 900, "~$x.docx": 5000 };
    expect(acharDocx(Object.keys(tam), (r) => tam[r])).toBe("b/briefing.docx");
    expect(acharDocx(["~$x.docx"])).toBeNull();
  });
  it("grava entrada com duplicatas normaliza para rels únicos", () => {
    const rels = gravarEntrada("R60", [
      { rel: "ads-marca-teste-remessa-60/ref-2.jpg", dados: Buffer.from("first") },
      { rel: "ads-marca-teste-remessa-60/ref-2 (2).jpg", dados: Buffer.from("second") },
    ]);
    // Both normalize to "ref-02.jpg", but return unique rels (last-written wins)
    expect(rels).toEqual(["ref-02.jpg"]);
  });
});
