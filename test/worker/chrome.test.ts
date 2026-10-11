import { describe, it, expect } from "vitest"; import path from "node:path"; import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { resolveChromePath, perfilPadrao } = require("../../motor-flow/chrome.js");

describe("chrome.js", () => {
  it("perfil padrão fica dentro da pasta de dados", () => {
    expect(perfilPadrao({}, "/proj")).toBe(path.resolve("/proj", "dados", "chrome-flow"));
    expect(perfilPadrao({ MAQUINA_DADOS: "/d" }, "/proj")).toBe(path.resolve("/d", "chrome-flow"));
    expect(perfilPadrao({ FLOW_CHROME_PROFILE: "/meu/perfil" }, "/proj")).toBe(path.resolve("/meu/perfil"));
  });
  it("acha o Chrome no Mac e no Windows", () => {
    const mac = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
    expect(resolveChromePath("darwin", (p: string) => p === mac, {})).toBe(mac);
    const win = path.win32.join("C:\\Program Files", "Google", "Chrome", "Application", "chrome.exe");
    expect(resolveChromePath("win32", (p: string) => p === win, { PROGRAMFILES: "C:\\Program Files" })).toBe(win);
  });
  it("acha o Chrome em ~/Applications e respeita FLOW_CHROME_PATH", () => {
    const user = "/casa/ana/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
    expect(resolveChromePath("darwin", (p: string) => p === user, { HOME: "/casa/ana" })).toBe(user);
    expect(resolveChromePath("win32", (p: string) => p === "D:\\Chrome\\chrome.exe", { FLOW_CHROME_PATH: "D:\\Chrome\\chrome.exe" })).toBe("D:\\Chrome\\chrome.exe");
    expect(resolveChromePath("win32", () => false, { FLOW_CHROME_PATH: "D:\\nao\\existe.exe" })).toBeNull();
  });
  it("devolve null sem Chrome", () => { expect(resolveChromePath("darwin", () => false, {})).toBeNull(); });
});
