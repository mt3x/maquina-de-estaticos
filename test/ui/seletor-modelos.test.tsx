import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { SeletorModelos } from "@/components/maquina/seletor-modelos";
afterEach(cleanup);
// jsdom não tem PointerEvent; o Checkbox do base-ui o usa ao clicar.
if (!("PointerEvent" in window)) (window as any).PointerEvent = MouseEvent;
describe("SeletorModelos", () => {
  it("não deixa desmarcar o último modelo e estima tempo", () => {
    const fn = vi.fn();
    render(<SeletorModelos valor={["nano-banana-2-1"]} onChange={fn} numAnuncios={5} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Nano Banana 2.1" })); expect(fn).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("checkbox", { name: "Nano Banana Pro" })); expect(fn).toHaveBeenCalledWith(["nano-banana-pro", "nano-banana-2-1"]);
    expect(screen.getByText(/10 artes/)).toBeTruthy(); expect(screen.getByText(/~15 min/)).toBeTruthy();
  });
});
