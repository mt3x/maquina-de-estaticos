import { origemPermitida } from "@/lib/validar";
import { extrairProjetoFlow, gravarEnvLocal, releProjetoFlow } from "@/lib/env-local";
import { flowConfigurado } from "@/lib/configuracao";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const bloqueio = origemPermitida(req); if (bloqueio) return bloqueio;
  // import dinâmico: verificacoes-base.mjs carrega o motor (createRequire) e não deve ser empacotado
  const { rodarVerificacoes } = await import("@/lib/verificacoes");
  releProjetoFlow();
  const checagens = await rodarVerificacoes({ ci: false, incluirClaude: new URL(req.url).searchParams.get("claude") === "1" });
  return Response.json({ checagens, configurado: flowConfigurado(), projeto: process.env.FLOW_PROJETO || null });
}

export async function POST(req: Request) {
  const bloqueio = origemPermitida(req); if (bloqueio) return bloqueio;
  const corpo = await req.json().catch(() => null) as { link?: unknown } | null;
  const projeto = typeof corpo?.link === "string" ? extrairProjetoFlow(corpo.link) : null;
  if (!projeto) return Response.json({ erro: "Não achei o projeto nesse link. Abra o seu projeto no Flow e copie o endereço inteiro da barra do navegador." }, { status: 400 });
  gravarEnvLocal(/*turbopackIgnore: true*/ process.cwd(), "FLOW_PROJETO", projeto);
  process.env.FLOW_PROJETO = projeto;
  return Response.json({ ok: true, projeto });
}
