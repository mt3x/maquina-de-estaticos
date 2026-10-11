"use client";
import Link from "next/link";
import { Settings } from "lucide-react";
import { usePolling } from "@/lib/api-cliente";

/** Faixa âmbar enquanto o projeto do Flow não está ligado (aparece em todas as telas). */
export function FaixaConfiguracao() {
  const { dados } = usePolling<{ configurado?: boolean }>("/api/status", 5000);
  if (dados?.configurado !== false) return null;
  return (
    <div role="alert" className="vidro mb-6 flex flex-wrap items-center gap-3 rounded-2xl border !border-amber-500/40 !bg-amber-500/10 px-4 py-3 text-[14px]">
      <Settings className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <p className="min-w-0 flex-1 font-medium text-amber-700 dark:text-amber-300">Termine a configuração: falta ligar o projeto do Flow.</p>
      <Link href="/configuracao" className="shrink-0 text-[13px] text-foreground underline underline-offset-4">Configurar</Link>
    </div>
  );
}
