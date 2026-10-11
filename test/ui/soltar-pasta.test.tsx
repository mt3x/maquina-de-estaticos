import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { SoltarPasta } from "@/components/maquina/soltar-pasta";
afterEach(cleanup);
describe("SoltarPasta", () => {
  it("entrega arquivos com caminho relativo vindos do input de pasta", () => {
    const fn = vi.fn(); render(<SoltarPasta onArquivos={fn} />);
    const input = screen.getByTestId("input-pasta") as HTMLInputElement;
    const f = new File(["x"], "ref-1.jpg"); Object.defineProperty(f, "webkitRelativePath", { value: "ads-marca-teste-remessa-61/ref-1.jpg" });
    fireEvent.change(input, { target: { files: [f] } });
    expect(fn).toHaveBeenCalledWith([{ arquivo: f, caminho: "ads-marca-teste-remessa-61/ref-1.jpg" }]);
  });
  it("mostra o texto padrão de remessa ou o texto passado pela tela", () => {
    const { unmount } = render(<SoltarPasta onArquivos={() => {}} />);
    expect(screen.getByText("Arraste a pasta da remessa")).toBeTruthy(); unmount();
    render(<SoltarPasta onArquivos={() => {}} titulo="Arraste uma pasta com anúncios da marca" dica="ou clique para escolher · imagens PNG, JPG ou WEBP" />);
    expect(screen.getByText("Arraste uma pasta com anúncios da marca")).toBeTruthy();
    expect(screen.getByText("ou clique para escolher · imagens PNG, JPG ou WEBP")).toBeTruthy();
    expect(screen.queryByText("Arraste a pasta da remessa")).toBeNull();
  });
});
