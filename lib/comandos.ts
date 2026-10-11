import fs from "node:fs"; import path from "node:path"; import crypto from "node:crypto";
import { dirComandos } from "./caminhos";
import type { Comando, ComandoSemId } from "./tipos";

let seq = 0;

export function enfileirar(cmd: ComandoSemId): string {
  const d = dirComandos(); fs.mkdirSync(d, { recursive: true });
  const id = crypto.randomUUID(); const ts = new Date().toISOString();
  const nome = `${Date.now().toString().padStart(15, "0")}-${String(seq++).padStart(6, "0")}-${id}.json`;
  const tmp = path.join(d, `.${nome}.tmp`);
  fs.writeFileSync(tmp, JSON.stringify({ ...cmd, id, ts })); fs.renameSync(tmp, path.join(d, nome));
  return id;
}
export function consumirComandos(): Comando[] {
  const d = dirComandos(); if (!fs.existsSync(d)) return [];
  const out: Comando[] = [];
  for (const n of fs.readdirSync(d).filter((n) => n.endsWith(".json") && !n.startsWith(".")).sort()) {
    const arq = path.join(d, n);
    try {
      const cmd = JSON.parse(fs.readFileSync(arq, "utf8"));
      if (typeof cmd === "object" && cmd !== null && typeof cmd.tipo === "string") {
        out.push(cmd);
      }
    } catch { /* corrompido: descarta */ }
    fs.rmSync(arq, { force: true });
  }
  return out;
}
