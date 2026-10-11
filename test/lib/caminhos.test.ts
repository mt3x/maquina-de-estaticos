import path from "node:path";
import { describe, it, expect } from "vitest";
import { paraPosix } from "@/lib/caminhos";
describe("caminhos", () => {
  it("paraPosix troca \\ por / (caminho relativo montado com path.win32)", () => {
    expect(paraPosix(path.win32.join("apoio", "foto.png"))).toBe("apoio/foto.png");
    expect(paraPosix(path.win32.join("sub", "apoio", "foto.png"))).toBe("sub/apoio/foto.png");
    expect(paraPosix("apoio/foto.png")).toBe("apoio/foto.png");
  });
});
