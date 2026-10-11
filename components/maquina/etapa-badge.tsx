import { Badge } from "@/components/ui/badge";
import { ROTULO_ETAPA } from "@/lib/api-cliente";
import { cn } from "@/lib/utils";

export const ETAPAS_ATIVAS = ["interpretando", "escrevendo_prompts", "enviando_referencias", "gerando"];

// verde = pronta · azul pulsando = trabalhando · âmbar = espera você · vermelho = erro
const COR: Record<string, string> = {
  concluida: "bg-[color-mix(in_oklch,var(--win)_14%,transparent)] text-[var(--win)]",
  aguardando_confirmacao: "bg-[color-mix(in_oklch,var(--warn-color)_16%,transparent)] text-[var(--warn-color)] font-semibold",
  pausada: "bg-[color-mix(in_oklch,var(--warn-color)_14%,transparent)] text-[var(--warn-color)]",
  erro: "bg-[color-mix(in_oklch,var(--kill)_14%,transparent)] text-[var(--kill)] font-semibold",
};

export function EtapaBadge({ etapa }: { etapa: string }) {
  const rotulo = ROTULO_ETAPA[etapa] ?? etapa;
  const ativa = ETAPAS_ATIVAS.includes(etapa);
  return (
    <Badge variant="outline" className={cn("gap-1.5 border-transparent px-2.5 font-medium",
      ativa ? "bg-[color-mix(in_oklch,var(--neutral-state)_14%,transparent)] text-[var(--neutral-state)]" : COR[etapa] ?? "bg-muted text-[var(--ink-1)]")}>
      {ativa && <span aria-hidden className="size-1.5 rounded-full bg-current motion-safe:animate-pulse" />}
      {rotulo}
    </Badge>
  );
}
