import { z } from "zod";

export const idValido = (id: string) => /^[A-Z0-9-]{2,30}$/.test(id);
export const respostaIdInvalido = () => Response.json({ erro: "id de remessa inválido" }, { status: 400 });

/** Bloqueia CSRF e DNS-rebinding: só aceita Host/Origin locais. Devolve a resposta 403 ou null. */
export function origemPermitida(req: Request): Response | null {
  const porta = process.env.PORT || "3200";
  const hosts = [`127.0.0.1:${porta}`, `localhost:${porta}`];
  const host = req.headers.get("host") ?? new URL(req.url).host;
  const origin = req.headers.get("origin");
  const negado = !hosts.includes(host) || (req.method !== "GET" && req.method !== "HEAD" && origin !== null && !hosts.some((h) => origin === `http://${h}`));
  return negado ? Response.json({ erro: "origem não permitida" }, { status: 403 }) : null;
}

const modelo = z.enum(["nano-banana-pro", "nano-banana-2-1"]);
const formato = z.enum(["STORY", "FEED"]);
const txt = z.string().min(1);
export const ACOES = {
  responder: z.object({ respostas: z.record(z.string()) }),
  confirmar: z.object({ modelos: z.array(modelo).min(1),
    anuncios: z.array(z.object({ id: txt, copy: z.string(), instrucoes: z.string(), temPessoas: z.boolean(), apoio: z.array(z.string()) })) }),
  pausar: z.object({}), retomar: z.object({}), cancelar: z.object({}),
  ajuste: z.object({ anuncio: txt, formato, modelo, escopo: z.enum(["arte", "formato", "anuncio"]), texto: z.string().trim().min(1) }),
  preferida: z.object({ anuncio: txt, formato, modelo }),
  tentar_de_novo: z.object({ anuncio: txt, formato, modelo }),
} as const;
