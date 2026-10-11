import { describe, it, expect, beforeEach } from "vitest";
import path from "node:path";
import { ambiente } from "./helpers";
import { resolverIngrediente } from "@/worker/ingredientes";
import { dirEntrada, dirMarca } from "@/lib/caminhos";

beforeEach(() => { ambiente(); });

describe("resolverIngrediente", () => {
  it("resolve entrada e marca com nomes do Flow", () => {
    expect(resolverIngrediente("entrada:sub/ref-01.jpg", "R61", "marca-teste")).toEqual({ abs: path.join(dirEntrada("R61"), "sub/ref-01.jpg"), nomeFlow: "r61-sub-ref-01.jpg" });
    expect(resolverIngrediente("entrada:sub\\ref-01.jpg", "R61", "marca-teste").nomeFlow).toBe("r61-sub-ref-01.jpg");
    expect(resolverIngrediente("marca:logo/logo-cor.png", "R61", "marca-teste")).toEqual({ abs: path.join(dirMarca("marca-teste"), "logo/logo-cor.png"), nomeFlow: "marca-teste-logo-cor.png" });
  });
  it("rejeita caminhos que escapam da pasta base", () => {
    expect(() => resolverIngrediente("entrada:../../etc/passwd", "R61", "marca-teste")).toThrow(/fora da pasta/);
    expect(() => resolverIngrediente("marca:../outra/x.png", "R61", "marca-teste")).toThrow(/fora da pasta/);
    expect(() => resolverIngrediente("entrada:/etc/passwd", "R61", "marca-teste")).toThrow(/fora da pasta/);
    expect(() => resolverIngrediente("outro:x", "R61", "marca-teste")).toThrow(/inválido/);
  });
});
