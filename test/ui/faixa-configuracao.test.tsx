import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { FaixaConfiguracao } from "@/components/maquina/faixa-configuracao";
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const simular = (corpo: object) => { const f = vi.fn(async () => ({ ok: true, status: 200, json: async () => corpo })); vi.stubGlobal("fetch", f); return f; };
describe("FaixaConfiguracao", () => {
  it("mostra o link para /configuracao quando não configurado", async () => {
    simular({ configurado: false }); render(<FaixaConfiguracao />);
    const link = await screen.findByRole("link", { name: /configurar/i });
    expect(link.getAttribute("href")).toBe("/configuracao");
    expect(screen.getByRole("alert").textContent).toMatch(/Termine a configuração: falta ligar o projeto do Flow\./);
  });
  it("não renderiza nada quando configurado", async () => {
    const f = simular({ configurado: true }); const { container } = render(<FaixaConfiguracao />);
    await waitFor(() => expect(f).toHaveBeenCalled()); await new Promise((r) => setTimeout(r, 20));
    expect(container.innerHTML).toBe("");
  });
});
