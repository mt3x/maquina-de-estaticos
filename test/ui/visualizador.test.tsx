import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { Visualizador, zoomEm, type ItemVisualizador } from "@/components/maquina/visualizador";
const item = (n: number): ItemVisualizador => ({ chave: `AD0${n}|nano-banana-2-1|STORY`, titulo: `R61 · AD0${n}`, subtitulo: "Nano Banana 2.1 · STORY · v1", url: `/a${n}.png`, download: `/a${n}.png`,
  versoes: [], preferida: false, anuncio: `AD0${n}`, modelo: "nano-banana-2-1", formato: "STORY", modelosDisponiveis: ["nano-banana-2-1"] });
afterEach(cleanup);
describe("Visualizador", () => {
  it("navega com setas, zoom 100% com '2', fecha com Esc", () => {
    const fechar = vi.fn();
    render(<Visualizador itens={[item(1), item(2)]} inicial={item(1).chave} aoFechar={fechar} aoPreferida={() => {}} aoAjuste={() => {}} />);
    expect(screen.getByText("R61 · AD01")).toBeTruthy();
    fireEvent.keyDown(window, { key: "ArrowRight" }); expect(screen.getByText("R61 · AD02")).toBeTruthy();
    fireEvent.keyDown(window, { key: "2" }); expect(screen.getByTestId("zoom").textContent).toBe("100%");
    fireEvent.keyDown(window, { key: "Escape" }); expect(fechar).toHaveBeenCalled();
  });
  it("envia ajuste com escopo", () => {
    const ajuste = vi.fn();
    render(<Visualizador itens={[item(1)]} inicial={item(1).chave} aoFechar={() => {}} aoPreferida={() => {}} aoAjuste={ajuste} />);
    fireEvent.change(screen.getByPlaceholderText(/o que mudar/i), { target: { value: "remover a frase X" } });
    fireEvent.click(screen.getByLabelText("Este formato nos modelos da remessa"));
    fireEvent.click(screen.getByRole("button", { name: "Gerar de novo com ajuste" }));
    expect(ajuste).toHaveBeenCalledWith(expect.objectContaining({ anuncio: "AD01" }), "remover a frase X", "formato");
  });
});
describe("Visualizador - rodada final", () => {
  const props = { aoFechar: () => {}, aoPreferida: () => {}, aoAjuste: () => {} };
  it("I6: lista muda de ordem/tamanho e a arte exibida continua a mesma", () => {
    const { rerender } = render(<Visualizador itens={[item(1), item(2), item(3)]} inicial={item(2).chave} {...props} />);
    expect(screen.getByText("R61 · AD02")).toBeTruthy();
    rerender(<Visualizador itens={[item(3), item(4), item(1), item(2)]} inicial={item(2).chave} {...props} />);
    expect(screen.getByText("R61 · AD02")).toBeTruthy(); expect(screen.getByText(/4\/4/)).toBeTruthy();
    rerender(<Visualizador itens={[item(2)]} inicial={item(2).chave} {...props} />);
    expect(screen.getByText("R61 · AD02")).toBeTruthy();
  });
  it("I6: arte que sai da lista continua visível com aviso; texto do ajuste não some com a reordenação", () => {
    const { rerender } = render(<Visualizador itens={[item(1), item(2)]} inicial={item(2).chave} {...props} />);
    fireEvent.change(screen.getByPlaceholderText(/o que mudar/i), { target: { value: "mais luz" } });
    rerender(<Visualizador itens={[item(2), item(1)]} inicial={item(2).chave} {...props} />);
    expect((screen.getByPlaceholderText(/o que mudar/i) as HTMLTextAreaElement).value).toBe("mais luz");
    rerender(<Visualizador itens={[item(1), item(3)]} inicial={item(2).chave} {...props} />);
    expect(screen.getByText("R61 · AD02")).toBeTruthy(); expect(screen.getByRole("status").textContent).toMatch(/saiu da lista/);
    fireEvent.keyDown(window, { key: "ArrowRight" }); expect(screen.getByText("R61 · AD01")).toBeTruthy();
  });
  it("I5: sem prompt esconde o pedido de ajuste e mostra o aviso; erro aparece no painel", () => {
    render(<Visualizador itens={[{ ...item(1), ajustavel: false, erro: "O ajuste não foi concluído." }]} inicial={item(1).chave} {...props} />);
    expect(screen.queryByPlaceholderText(/o que mudar/i)).toBeNull();
    expect(screen.getByText(/produção anterior ao sistema — ajustes não disponíveis/)).toBeTruthy();
    expect(screen.getByRole("note").textContent).toBe("O ajuste não foi concluído.");
  });
  it("V1: botões do painel escuro usam texto claro e borda translúcida", () => {
    render(<Visualizador itens={[{ ...item(1), versoes: [{ rotulo: "v1", url: "/v1.png" }] }]} inicial={item(1).chave} {...props} />);
    for (const b of [screen.getByRole("button", { name: /marcar preferida/i }), screen.getByRole("link", { name: "Baixar" }), screen.getByRole("button", { name: "v1" })])
      { expect(b.className).toContain("border-white/15"); expect(b.className).toContain("text-[#f2eee6]"); expect(b.className).not.toMatch(/(^| )bg-background( |$)/); }
  });
});
describe("zoomEm", () => {
  it("mantém fixo o ponto sob o cursor", () => {
    const v = { escala: 0.5, x: 30, y: -20 }; const cx = 120, cy = 80;
    const n = zoomEm(v, 2, cx, cy);
    expect(n.escala).toBe(1);
    // ponto da imagem sob o cursor: (c - pos) / escala deve ser igual antes e depois
    expect((cx - n.x) / n.escala).toBeCloseTo((cx - v.x) / v.escala);
    expect((cy - n.y) / n.escala).toBeCloseTo((cy - v.y) / v.escala);
  });
  it("respeita os limites 0.05 e 8", () => {
    expect(zoomEm({ escala: 7, x: 0, y: 0 }, 10, 5, 5).escala).toBe(8);
    expect(zoomEm({ escala: 0.06, x: 0, y: 0 }, 0.1, 5, 5).escala).toBe(0.05);
  });
});
describe("Visualizador - interação", () => {
  const montar = () => render(<Visualizador itens={[item(1), item(2)]} inicial={item(1).chave} aoFechar={() => {}} aoPreferida={() => {}} aoAjuste={() => {}} />);
  it("+ e - mudam o zoom", () => {
    montar(); const z = () => screen.getByTestId("zoom").textContent;
    expect(z()).toBe("40%");
    fireEvent.keyDown(window, { key: "+" }); expect(z()).toBe("50%");
    fireEvent.keyDown(window, { key: "-" }); fireEvent.keyDown(window, { key: "-" }); expect(z()).toBe("32%");
  });
  it("duplo clique alterna 100% e ajustar", () => {
    montar(); const z = () => screen.getByTestId("zoom").textContent;
    fireEvent.doubleClick(screen.getByAltText("R61 · AD01")); expect(z()).toBe("100%");
    fireEvent.doubleClick(screen.getByAltText("R61 · AD01")); expect(z()).toBe("40%");
  });
  it("tecla em textarea ou ← com rádio focado não navega; ctrl+1 é ignorado", () => {
    montar();
    fireEvent.keyDown(screen.getByPlaceholderText(/o que mudar/i), { key: "ArrowRight" });
    expect(screen.getByText("R61 · AD01")).toBeTruthy();
    fireEvent.keyDown(screen.getByLabelText("Só esta arte"), { key: "ArrowLeft" });
    expect(screen.getByText("R61 · AD01")).toBeTruthy();
    fireEvent.keyDown(window, { key: "2" }); fireEvent.keyDown(window, { key: "1", ctrlKey: true });
    expect(screen.getByTestId("zoom").textContent).toBe("100%");
  });
  it("lista vazia não quebra", () => {
    const { container } = render(<Visualizador itens={[]} inicial="x" aoFechar={() => {}} aoPreferida={() => {}} aoAjuste={() => {}} />);
    expect(container.innerHTML).toBe("");
  });
});
