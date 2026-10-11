import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
import Nova from "@/app/nova/page";
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const soltar = () => {
  const f = new File(["x"], "ref-1.jpg"); Object.defineProperty(f, "webkitRelativePath", { value: "ads-marca-teste-remessa-61/ref-1.jpg" });
  fireEvent.change(screen.getByTestId("input-pasta"), { target: { files: [f] } });
};
describe("Nova remessa", () => {
  it("sem marcas cadastradas: avisa, leva ao cadastro e não deixa enviar", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("[]")));
    render(<Nova />); soltar();
    await waitFor(() => expect(screen.getByText("Nenhuma marca cadastrada ainda.")).toBeTruthy());
    expect(screen.getByRole("link", { name: /cadastrar marca/i }).getAttribute("href")).toBe("/marcas/nova");
    expect(screen.queryByRole("combobox")).toBeNull();
    expect((screen.getByRole("button", { name: /enviar remessa/i }) as HTMLButtonElement).disabled).toBe(true);
  });
  it("com marcas: mostra o seletor com a primeira escolhida", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify([{ id: "marca-teste", nome: "Marca Teste" }]))));
    render(<Nova />); soltar();
    await waitFor(() => expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe("marca-teste"));
    expect((screen.getByRole("button", { name: /enviar remessa/i }) as HTMLButtonElement).disabled).toBe(false);
  });
});
