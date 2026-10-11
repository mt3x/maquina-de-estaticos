import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { Confirmacao } from "@/components/maquina/confirmacao";
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
if (!("PointerEvent" in window)) (window as any).PointerEvent = MouseEvent;
const an = { id: "AD1", ref: "r.png", refUrl: "/r.png", copy: "copy", instrucoes: "", apoio: [], temPessoas: false, artes: [] };
const rem = (extra: any = {}) => ({ id: "R1", marca: "Marca Teste", modelos: [], etapa: "aguardando_confirmacao", duvidas: [], anuncios: [an], log: [], progresso: { prontas: 0, total: 0 }, ...extra }) as any;
describe("Confirmacao", () => {
  it("usa o caminho devolvido pela rota de apoio ao gerar", async () => {
    const fetchMock = vi.fn(async (url: string, _init?: unknown) => url.endsWith("/apoio") ? new Response(JSON.stringify({ ok: true, arquivo: "apoio/foto-1.png" })) : new Response("{}"));
    vi.stubGlobal("fetch", fetchMock);
    const { container } = render(<Confirmacao r={rem()} />);
    const input = container.querySelector("input[type=file]") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(["x"], "Foto 1.png", { type: "image/png" })] } });
    await waitFor(() => expect(screen.getByText(/apoio\/foto-1\.png/)).toBeTruthy());
    fireEvent.click(screen.getByRole("button", { name: /gerar anúncios/i }));
    await waitFor(() => expect(fetchMock.mock.calls.some((c) => String(c[0]).endsWith("/acao"))).toBe(true));
    const corpo = JSON.parse((fetchMock.mock.calls.find((c) => String(c[0]).endsWith("/acao"))![1] as any).body);
    expect(corpo.anuncios[0].apoio).toEqual(["apoio/foto-1.png"]);
  });
  it("mantém edições e respostas quando a dúvida some, e trava o envio até mudar", async () => {
    const fetchMock = vi.fn(async () => new Response("{}")); vi.stubGlobal("fetch", fetchMock);
    const duvida = { id: "d1", pergunta: "Qual?", opcoes: ["A", "B"] };
    const { rerender } = render(<Confirmacao r={rem({ duvidas: [duvida] })} />);
    fireEvent.change(screen.getByLabelText("Copy do AD1"), { target: { value: "minha copy" } });
    fireEvent.click(screen.getByRole("button", { name: "A" }));
    fireEvent.click(screen.getByRole("button", { name: /enviar respostas/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect((screen.getByRole("button", { name: /enviar respostas/i }) as HTMLButtonElement).disabled).toBe(true));
    rerender(<Confirmacao r={rem({ duvidas: [] })} />);
    expect((screen.getByLabelText("Copy do AD1") as HTMLTextAreaElement).value).toBe("minha copy");
  });
});
