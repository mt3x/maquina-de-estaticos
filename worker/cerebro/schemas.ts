import { z } from "zod";
const token = z.string().regex(/^(entrada|marca):[^\s]+$/, "ingrediente deve ser entrada:<rel> ou marca:<rel>");
export const schemaInterpretar = z.object({
  anuncios: z.array(z.object({
    id: z.string().regex(/^AD\d{2}[A-Z]?$/), ref: z.string(), copy: z.string().min(1), instrucoes: z.string().default(""),
    apoio: z.array(z.string()).default([]), temPessoas: z.boolean(),
  })).min(1),
  duvidas: z.array(z.object({ anuncio: z.string().optional(), pergunta: z.string(), opcoes: z.array(z.string()).optional(), sugestao: z.string().optional() })).default([]),
});
export const schemaPrompt = z.object({ prompt: z.string().min(200), ingredientes: z.array(token).min(1) });
export const schemaRevisar = z.object({ ok: z.boolean(), gravidade: z.enum(["nenhuma", "leve", "grave"]), problemas: z.array(z.string()).default([]) });
export const schemaMarca = z.object({ identidade: z.record(z.unknown()), guiaMarkdown: z.string().min(200) });
export type SaidaInterpretar = z.infer<typeof schemaInterpretar>;
export type SaidaPrompt = z.infer<typeof schemaPrompt>;
export type SaidaRevisar = z.infer<typeof schemaRevisar>;
export type SaidaMarca = z.infer<typeof schemaMarca>;
