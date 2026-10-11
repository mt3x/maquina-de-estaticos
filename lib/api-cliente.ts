"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export function usePolling<T>(url: string, ms = 2000) {
  const [dados, setDados] = useState<T>();
  const [erro, setErro] = useState<string>();
  const vivo = useRef(true);
  const recarregar = useCallback(async () => {
    try {
      const r = await fetch(url, { cache: "no-store" });
      const j = await r.json();
      if (!vivo.current) return;
      if (!r.ok) setErro(j.erro || `erro ${r.status}`);
      else { setDados(j); setErro(undefined); }
    } catch (e) {
      if (vivo.current) setErro(String(e));
    }
  }, [url]);
  useEffect(() => {
    vivo.current = true;
    void recarregar();
    const t = setInterval(recarregar, ms);
    return () => { vivo.current = false; clearInterval(t); };
  }, [recarregar, ms]);
  return { dados, erro, recarregar };
}

export async function postAcao(id: string, corpo: object) {
  const r = await fetch(`/api/remessas/${id}/acao`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(corpo) });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).erro || `erro ${r.status}`);
}

export const ROTULO_ETAPA: Record<string, string> = {
  importada: "Recebida", interpretando: "Lendo a pasta", aguardando_confirmacao: "Aguardando você", escrevendo_prompts: "Preparando",
  enviando_referencias: "Enviando referências", gerando: "Gerando", concluida: "Concluída", pausada: "Pausada", erro: "Precisa de atenção",
};
