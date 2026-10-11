"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Layers, Plus, Palette, Activity, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { AlternarTema } from "./tema";
import { FaixaBloqueio } from "./faixa-bloqueio";
import { FaixaConfiguracao } from "./faixa-configuracao";
import { usePolling } from "@/lib/api-cliente";
import type { BloqueioFlow } from "@/lib/tipos";

const NAV = [
  { href: "/remessas", rotulo: "Remessas", icone: Layers },
  { href: "/nova", rotulo: "Nova remessa", icone: Plus },
  { href: "/marcas", rotulo: "Marcas", icone: Palette },
  { href: "/status", rotulo: "Status", icone: Activity },
  { href: "/configuracao", rotulo: "Configuração", icone: Settings },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const atual = usePathname();
  const { dados: status } = usePolling<{ bloqueio?: BloqueioFlow | null }>("/api/status", 5000);
  return (
    <div className="flex min-h-screen text-foreground">
      <aside className="vidro sticky top-3 m-3 flex h-[calc(100vh-1.5rem)] w-60 shrink-0 flex-col rounded-2xl border px-3 py-5 max-md:w-16">
        <Link href="/remessas" className="mb-8 flex items-center gap-2 px-2">
          <span className="grid size-8 place-items-center rounded-[10px] bg-foreground text-[15px] font-bold text-background shadow-sm">m</span>
          <span className="text-[15px] font-semibold tracking-tight max-md:hidden">Máquina de Estáticos</span>
        </Link>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map(({ href, rotulo, icone: Icone }) => {
            const ativo = atual === href || atual.startsWith(href + "/");
            return (
              <Link key={href} href={href}
                className={cn("flex items-center gap-3 rounded-[10px] px-3 py-2 text-[14px] text-[var(--ink-1)] transition-all duration-200 hover:bg-[var(--bg-2)] hover:text-foreground",
                  ativo && "bg-[var(--bg-2)] text-foreground font-medium shadow-[0_1px_3px_rgba(0,0,0,0.06)]")}>
                <Icone className="size-4" /><span className="max-md:hidden">{rotulo}</span>
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center justify-between px-1">
          <span className="font-mono text-[11px] text-[var(--ink-2)] max-md:hidden">v1 · local</span>
          <AlternarTema />
        </div>
      </aside>
      <main className="min-w-0 flex-1"><div className="mx-auto w-full max-w-[1400px] px-8 py-9 max-md:px-4"><FaixaConfiguracao /><FaixaBloqueio bloqueio={status?.bloqueio} />{children}</div></main>
    </div>
  );
}

export function CabecalhoPagina({ titulo, subtitulo, acoes }: { titulo: string; subtitulo?: string; acoes?: React.ReactNode }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="break-words font-heading text-[34px] font-bold leading-tight">{titulo}</h1>
        {subtitulo && <p className="mt-1 text-[15px] text-[var(--ink-1)]">{subtitulo}</p>}
      </div>
      {acoes && <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">{acoes}</div>}
    </header>
  );
}
