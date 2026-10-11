import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { Miniatura } from "@/components/maquina/miniatura";
afterEach(cleanup);
const base = { formato: "STORY", modelo: "nano-banana-2-1", tentativas: 1, versaoAtual: 1, prioridade: 0, versoes: [] } as any;
describe("Miniatura", () => {
  it("mostra status e abre quando pronta", () => {
    const abrir = vi.fn();
    render(<Miniatura arte={{ ...base, status: "pronta", miniUrl: "/x.webp" }} preferida={false} onAbrir={abrir} onPreferida={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /abrir/i })); expect(abrir).toHaveBeenCalled();
  });
  it("gerando mostra rótulo e não abre", () => {
    render(<Miniatura arte={{ ...base, status: "gerando" }} preferida={false} onAbrir={() => {}} onPreferida={() => {}} />);
    expect(screen.getByText("Gerando")).toBeTruthy(); expect(screen.queryByRole("button", { name: /abrir/i })).toBeNull();
  });
  it("I7: falhou/defeito mostram “Gerar de novo”; pronta não", () => {
    const deNovo = vi.fn();
    const { rerender } = render(<Miniatura arte={{ ...base, status: "falhou", erro: "UI: Failed" }} preferida={false} onAbrir={() => {}} onPreferida={() => {}} onTentarDeNovo={deNovo} />);
    fireEvent.click(screen.getByRole("button", { name: /gerar de novo/i })); expect(deNovo).toHaveBeenCalledTimes(1);
    rerender(<Miniatura arte={{ ...base, status: "defeito", miniUrl: "/x.webp" }} preferida={false} onAbrir={() => {}} onPreferida={() => {}} onTentarDeNovo={deNovo} />);
    fireEvent.click(screen.getByRole("button", { name: /gerar de novo/i })); expect(deNovo).toHaveBeenCalledTimes(2);
    rerender(<Miniatura arte={{ ...base, status: "pronta", miniUrl: "/x.webp" }} preferida={false} onAbrir={() => {}} onPreferida={() => {}} onTentarDeNovo={deNovo} />);
    expect(screen.queryByRole("button", { name: /gerar de novo/i })).toBeNull();
  });
  it("I5: arte.erro aparece como ícone com title na miniatura pronta", () => {
    render(<Miniatura arte={{ ...base, status: "pronta", miniUrl: "/x.webp", erro: "ajustes não disponíveis" }} preferida={false} onAbrir={() => {}} onPreferida={() => {}} />);
    expect(screen.getByRole("img", { name: /ajustes não disponíveis/ }).getAttribute("title")).toBe("ajustes não disponíveis");
  });
});
