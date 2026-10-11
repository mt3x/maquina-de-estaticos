"use client";
import { useRef, useState } from "react";
import { FolderUp } from "lucide-react";
import { cn } from "@/lib/utils";

export type ArquivoComCaminho = { arquivo: File; caminho: string };

/* eslint-disable @typescript-eslint/no-explicit-any */
async function lerEntrada(e: any, prefixo = ""): Promise<ArquivoComCaminho[]> {
  if (e.isFile) return new Promise((res) => e.file((f: File) => res([{ arquivo: f, caminho: prefixo + f.name }])));
  const leitor = e.createReader(); const todas: any[] = [];
  for (;;) { const lote: any[] = await new Promise((res) => leitor.readEntries(res)); if (!lote.length) break; todas.push(...lote); }
  return (await Promise.all(todas.map((x) => lerEntrada(x, `${prefixo}${e.name}/`)))).flat();
}

const TITULO = "Arraste a pasta da remessa"; const DICA = "ou clique para escolher · .docx, referências (ref-1, ref-2…) e material de apoio";
export function SoltarPasta({ onArquivos, titulo = TITULO, dica = DICA }: { onArquivos: (l: ArquivoComCaminho[]) => void; titulo?: string; dica?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [sobre, setSobre] = useState(false);
  return (
    <div role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); ref.current?.click(); } }}
      onDragOver={(e) => { e.preventDefault(); setSobre(true); }} onDragLeave={() => setSobre(false)}
      onDrop={async (e) => {
        e.preventDefault(); setSobre(false);
        const entradas = [...e.dataTransfer.items].map((i) => i.webkitGetAsEntry()).filter(Boolean);
        onArquivos((await Promise.all(entradas.map((x) => lerEntrada(x)))).flat());
      }}
      onClick={() => ref.current?.click()}
      className={cn("vidro flex cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed !border-[var(--rule)] px-8 py-20 text-center outline-none transition-all duration-300 ease-[var(--ease-organic)] hover:bg-[var(--bg-2)] focus-visible:ring-3 focus-visible:ring-ring/50",
        sobre && "scale-[1.01] !border-[var(--progresso)] bg-[var(--bg-2)] motion-safe:animate-pulse")}>
      <span className="grid size-14 place-items-center rounded-2xl bg-[var(--bg-2)] shadow-sm"><FolderUp className="size-7 text-[var(--ink-1)]" strokeWidth={1.5} /></span>
      <p className="font-heading text-xl font-semibold">{titulo}</p>
      <p className="text-[14px] text-[var(--ink-1)]">{dica}</p>
      <input ref={ref} data-testid="input-pasta" type="file" className="hidden" multiple
        {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => onArquivos([...(e.target.files ?? [])].map((f) => ({ arquivo: f, caminho: (f as any).webkitRelativePath || f.name })))} />
    </div>
  );
}
