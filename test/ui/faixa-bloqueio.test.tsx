import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { FaixaBloqueio } from "@/components/maquina/faixa-bloqueio";
afterEach(cleanup);
describe("FaixaBloqueio (C2)", () => {
  it("mostra o bloqueio e some sem ele", () => {
    const { rerender, container } = render(<FaixaBloqueio bloqueio={{ tipo: "flow_bloqueio", msg: "HTTP 403", em: "2026-10-08T12:00:00Z", remessa: "R61" }} />);
    expect(screen.getByRole("alert").textContent).toMatch(/bloqueio.*R61.*HTTP 403/s);
    expect(screen.getByRole("link", { name: /status/i }).getAttribute("href")).toBe("/status");
    rerender(<FaixaBloqueio bloqueio={null} />); expect(container.innerHTML).toBe("");
  });
});
