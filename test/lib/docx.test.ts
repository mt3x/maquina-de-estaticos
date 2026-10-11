import { describe, it, expect } from "vitest";
import { textoDocx } from "@/lib/docx";

describe("docx", () => {
  it("extrai texto da remessa de exemplo", async () => {
    const t = await textoDocx("test/fixtures/exemplo.docx");
    expect(t).toContain("R01 - AD-01");
    expect(t).toContain("Qual é o seu café de todo dia?");
    expect(t).toContain("REF: ref-01");
  });
});
