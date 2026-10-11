"use client";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import type { BloqueioFlow } from "@/lib/tipos";

/** Faixa de alerta do bloqueio global do Flow (aparece em todas as telas). */
export function FaixaBloqueio({ bloqueio }: { bloqueio?: BloqueioFlow | null }) {
  if (!bloqueio) return null;
  const titulo = bloqueio.tipo === "flow_custo" ? "O Flow mostrou custo — nenhuma geração será enviada" : "O Flow sinalizou bloqueio — tudo parado para proteger a conta";
  return (
    <div role="alert" className="vidro mb-6 flex flex-wrap items-start gap-3 rounded-2xl border !border-destructive/40 !bg-[color-mix(in_oklch,var(--kill)_10%,transparent)] px-4 py-3 text-[14px]">
      <ShieldAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-destructive">{titulo}</p>
        <p className="mt-0.5 break-words font-mono text-[12px] text-[var(--ink-1)]">
          {bloqueio.remessa ? `${bloqueio.remessa} · ` : ""}{new Date(bloqueio.em).toLocaleString("pt-BR")} · {bloqueio.msg}</p>
      </div>
      <Link href="/status" className="shrink-0 text-[13px] text-foreground underline underline-offset-4">Ver em Status</Link>
    </div>
  );
}
