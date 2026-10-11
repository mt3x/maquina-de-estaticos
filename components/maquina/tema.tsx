"use client";
import { ThemeProvider, useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function ProvedorTema({ children }: { children: React.ReactNode }) {
  return <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>{children}</ThemeProvider>;
}

const OPCOES = [
  { valor: "light", rotulo: "Claro", Icone: Sun },
  { valor: "dark", rotulo: "Escuro", Icone: Moon },
  { valor: "system", rotulo: "Automático (segue o sistema)", Icone: Monitor },
] as const;

/** Seletor segmentado claro · escuro · automático; na barra recolhida vira um botão que alterna entre os três. */
export function AlternarTema() {
  const { theme, setTheme } = useTheme();
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);
  const atual = montado ? theme ?? "system" : "system";
  const idx = Math.max(0, OPCOES.findIndex((o) => o.valor === atual));
  const Proximo = OPCOES[idx].Icone;
  return (<>
    <div role="radiogroup" aria-label="Tema" className="flex gap-0.5 rounded-full border border-[var(--rule)] bg-[var(--bg-1)] p-0.5 max-md:hidden">
      {OPCOES.map(({ valor, rotulo, Icone }) => (
        <button key={valor} type="button" role="radio" aria-checked={atual === valor} aria-label={rotulo} title={rotulo} onClick={() => setTheme(valor)}
          className={cn("grid size-7 place-items-center rounded-full text-[var(--ink-2)] transition-all duration-200 hover:text-foreground",
            atual === valor && "bg-[var(--bg-2)] text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.12)]")}>
          <Icone className="size-3.5" /></button>))}
    </div>
    <button type="button" aria-label={`Tema: ${OPCOES[idx].rotulo}. Trocar`} onClick={() => setTheme(OPCOES[(idx + 1) % OPCOES.length].valor)}
      className="hidden size-8 place-items-center rounded-full text-[var(--ink-1)] hover:bg-[var(--bg-2)] max-md:grid"><Proximo className="size-4" /></button>
  </>);
}
