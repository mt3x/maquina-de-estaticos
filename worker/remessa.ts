import fs from "node:fs"; import path from "node:path"; import crypto from "node:crypto";
import { lerRemessa, salvarRemessa, registrar, listarRemessas, lerJson, salvarJson, renomear } from "@/lib/estado";
import { dirEntrada, dirInterno, arqEntrega, arqUploads, raizDados, arqPrompt, paraPosix } from "@/lib/caminhos";
import { criarArtes, FORMATOS, type Arte, type Comando, type Formato, type ModeloId, type Remessa } from "@/lib/tipos";
import { textoDocx } from "@/lib/docx";
import { acharDocx, acharRefs } from "@/lib/nomes";
import { ErroCerebro } from "./cerebro/chamar";
import type * as Tarefas from "./cerebro/tarefas";
import type * as Driver from "./flow-driver";
import { ErroBloqueioFlow } from "./flow-driver";
import { proximaArte, decidir, type Alvo, type Ritmo } from "./fila-flow";
import { resolverIngrediente } from "./ingredientes";
import { bloquear, desbloquear, lerBloqueio, atualizarStatus } from "./status";

export { arqPrompt };

export type Deps = {
  cerebro: Pick<typeof Tarefas, "interpretar" | "escreverPrompt" | "revisar" | "ajustar">;
  flow: Pick<typeof Driver, "gerar" | "subir" | "limparCompositor">;
  pos: { finalizar: (b: string, d: string, f: Formato) => Promise<unknown>; miniatura: (a: string, d: string) => Promise<void>; aplicarSelo: (a: string, marca: string) => Promise<boolean | void>; aplicarAviso?: (a: string, marca: string) => Promise<boolean> };
  ritmo: Ritmo; dormir: (ms: number) => Promise<void>; maxTentativas: number;
  /** Consome e aplica os comandos pendentes (pausar/cancelar…) logo antes de enviar ao Flow — o index injeta a rotina do ciclo. */
  aplicarPendentes?: () => Promise<unknown>;
};

const ATIVAS: Arte["status"][] = ["na_fila", "gerando", "pos", "revisando"];
const arqPreferencias = () => path.join(raizDados(), "preferencias.json");
export const MSG_SEM_PROMPT = "Esta arte veio de uma produção anterior ao sistema — ajustes não disponíveis.";
const txtDe = (json: string) => json.replace(/\.json$/, ".txt");
function gravarPrompt(arq: string, p: { prompt: string; ingredientes: string[] }) { salvarJson(arq, p); fs.writeFileSync(txtDe(arq), p.prompt); }
function listarArquivos(base: string, rel = ""): string[] {
  if (!fs.existsSync(path.join(base, rel))) return [];
  return fs.readdirSync(path.join(base, rel), { withFileTypes: true }).flatMap((e) => e.isDirectory() ? listarArquivos(base, paraPosix(path.join(rel, e.name))) : [paraPosix(path.join(rel, e.name))]);
}
const arteDe = (r: Remessa, a: { anuncio: string; formato: Formato; modelo: ModeloId }) =>
  r.anuncios.find((x) => x.id === a.anuncio)!.artes.find((x) => x.formato === a.formato && x.modelo === a.modelo)!;
function erroRemessa(r: Remessa, tipo: NonNullable<Remessa["erro"]>["tipo"], msg: string) {
  if (r.etapa !== "erro") r.etapaAntesDoErro = r.etapa;
  r.etapa = "erro"; r.erro = { tipo, msg }; registrar(r, "erro", msg);
}
/** Bloqueio/custo valem para o Flow inteiro: grava o bloqueio global (status.json) e todas as remessas em `gerando` param. */
function pararTudo(atual: Remessa, tipo: "flow_bloqueio" | "flow_custo", msg: string) {
  bloquear({ tipo, msg, em: new Date().toISOString(), remessa: atual.id });
  erroRemessa(atual, tipo, msg); salvarRemessa(atual);
  for (const o of listarRemessas()) {
    if (o.id === atual.id || o.etapa !== "gerando") continue;
    erroRemessa(o, tipo, `parada global: ${tipo} na remessa ${atual.id}`); salvarRemessa(o);
  }
}
function talvezConcluir(r: Remessa) {
  if (r.etapa === "gerando" && r.anuncios.every((a) => a.artes.every((x) => !ATIVAS.includes(x.status)))) { r.etapa = "concluida"; registrar(r, "concluida", "remessa concluída"); }
}
/** Arte com um ajuste em andamento cuja versão anterior segue em entrega/. */
const temVersaoAnterior = (a: Arte) => a.versaoEntregue !== undefined && a.versaoEntregue < a.versaoAtual && !!a.arquivo && fs.existsSync(a.arquivo);
/** Desiste da arte. Se era um ajuste, a versão anterior continua entregue e a arte volta a `pronta` explicando o que houve. */
function falhar(a: Arte, msg: string) {
  if (temVersaoAnterior(a)) {
    const pedido = a.ajustePendente;
    Object.assign(a, { status: "pronta", versaoAtual: a.versaoEntregue!, tentativas: a.tentativaEntregue ?? a.tentativas, prioridade: 0, ajustePendente: undefined,
      erro: `O ajuste${pedido ? ` “${pedido}”` : ""} não foi concluído (${msg}). A versão anterior foi mantida.` });
  } else { a.status = "falhou"; a.erro = msg; }
}
const idDaPergunta = (p: string) => crypto.createHash("sha1").update(p.trim().toLowerCase()).digest("hex").slice(0, 8);

export async function interpretarRemessa(id: string, deps: Deps, respostas?: Record<string, string>) {
  const r = lerRemessa(id);
  // Acumula as respostas de todas as rodadas (por id e com a pergunta), para nada ser perguntado de novo.
  const acumuladas = [...(r.respostas ?? [])];
  for (const [k, v] of Object.entries(respostas ?? {})) {
    if (!String(v).trim()) continue;
    const pergunta = r.duvidas.find((d) => d.id === k)?.pergunta ?? acumuladas.find((x) => x.id === k)?.pergunta ?? k;
    const i = acumuladas.findIndex((x) => x.id === k);
    if (i >= 0) acumuladas[i] = { id: k, pergunta, resposta: v }; else acumuladas.push({ id: k, pergunta, resposta: v });
  }
  r.respostas = acumuladas;
  r.etapa = "interpretando"; registrar(r, "interpretando", respostas ? "reinterpretando com as respostas" : "lendo a pasta"); salvarRemessa(r);
  const base = dirEntrada(id); const rels = listarArquivos(base);
  const docx = acharDocx(rels, (rel) => fs.statSync(path.join(base, rel)).size);
  if (!docx) { r.etapa = "aguardando_confirmacao"; r.duvidas = [{ id: "sem-docx", pergunta: "Não encontrei o .docx da remessa na pasta. Envie a pasta novamente com o documento." }]; salvarRemessa(r); return; }
  let texto: string;
  try { texto = await textoDocx(path.join(base, docx)); }
  catch (e) { erroRemessa(r, "cerebro", `não consegui ler o .docx: ${e instanceof Error ? e.message : String(e)}`); salvarRemessa(r); return; }
  if (acumuladas.length) {
    texto += `\n\nRESPOSTAS DO USUÁRIO ÀS DÚVIDAS (aplique-as; não pergunte de novo):\n${acumuladas.map((x) => `- ${x.pergunta} → ${x.resposta}`).join("\n")}`;
  }
  const refs = acharRefs(rels); const refsAbs = Object.fromEntries(Object.entries(refs).map(([n, rel]) => [n, path.join(base, rel)]));
  try {
    const t0 = Date.now();
    const s = await deps.cerebro.interpretar({ remessa: id, marca: r.marca, texto, arquivos: rels, refsAbs, logDir: path.join(dirInterno(id), "cerebro") });
    const respondidaId = new Set(acumuladas.map((x) => x.id));
    const respondidaPergunta = new Set(acumuladas.map((x) => idDaPergunta(x.pergunta)));
    const jaRespondida = (idD: string, pergunta?: string) => respondidaId.has(idD) || (!!pergunta && respondidaPergunta.has(idDaPergunta(pergunta)));
    // id estável (hash da pergunta): se o cérebro repetir uma dúvida já respondida, ela não volta.
    const duvidas = s.duvidas.map((d) => ({ ...d, id: idDaPergunta(d.pergunta) })).filter((d) => !jaRespondida(d.id, d.pergunta));
    const numDoc = texto.match(/\bR(\d+)\s*-\s*AD/i)?.[1];
    if (numDoc && `R${Number(numDoc)}` !== id && !jaRespondida("id-divergente")) duvidas.push({ id: "id-divergente", pergunta: `O documento chama os anúncios de "R${numDoc}", mas a remessa é ${id}. Qual nome uso nos arquivos?`, opcoes: [id, `R${numDoc}`] } as any);
    for (const a of s.anuncios) {
      if (!rels.includes(a.ref) && !jaRespondida(`ref-${a.id}`)) duvidas.push({ id: `ref-${a.id}`, anuncio: a.id, pergunta: `Não encontrei a referência ${a.ref} do ${a.id} na pasta.` } as any);
      for (const ap of a.apoio) if (!ap.startsWith("marca:") && !rels.includes(ap) && !jaRespondida(`apoio-${a.id}-${ap}`)) duvidas.push({ id: `apoio-${a.id}-${ap}`, anuncio: a.id, pergunta: `O ${a.id} cita o arquivo ${ap}, que não está na pasta. Você vai enviar?`, opcoes: ["Vou enviar", "Gerar sem ele"] } as any);
    }
    r.anuncios = s.anuncios.map((a) => ({ ...a, artes: [] })); r.duvidas = duvidas;
    r.modelos = lerJson<{ ultimosModelos?: ModeloId[] }>(arqPreferencias(), {}).ultimosModelos ?? ["nano-banana-pro", "nano-banana-2-1"];
    r.etapa = "aguardando_confirmacao"; registrar(r, "interpretando", `${s.anuncios.length} anúncios, ${duvidas.length} dúvidas`, Date.now() - t0);
  } catch (e) { erroRemessa(r, "cerebro", e instanceof ErroCerebro ? e.message : String(e)); }
  salvarRemessa(r);
}

export function confirmarRemessa(cmd: Extract<Comando, { tipo: "confirmar" }>) {
  const r = lerRemessa(cmd.remessa);
  if (r.etapa !== "aguardando_confirmacao") throw new Error("a remessa não está aguardando confirmação");
  if (!cmd.modelos.length) throw new Error("escolha ao menos um modelo");
  for (const ed of cmd.anuncios) { const a = r.anuncios.find((x) => x.id === ed.id); if (a) Object.assign(a, ed); }
  r.modelos = cmd.modelos; salvarJson(arqPreferencias(), { ultimosModelos: cmd.modelos });
  for (const a of r.anuncios) a.artes = criarArtes(cmd.modelos);
  r.duvidas = []; r.etapa = "escrevendo_prompts"; registrar(r, "confirmada", `modelos: ${cmd.modelos.join(", ")}`); salvarRemessa(r);
}

/** Ingredientes que não existem no disco (ou fora da pasta permitida): subi-los quebraria a remessa em loop. */
export function ingredientesFaltando(tokens: string[], r: Pick<Remessa, "id" | "marca">): string[] {
  return tokens.filter((t) => { try { return !fs.statSync(resolverIngrediente(t, r.id, r.marca).abs).isFile(); } catch { return true; } });
}

export async function escreverPrompts(id: string, deps: Deps) {
  const r = lerRemessa(id);
  try {
    for (const a of r.anuncios) for (const f of FORMATOS) {
      const modelos = a.artes.filter((x) => x.formato === f).map((x) => x.modelo);
      if (modelos.every((m) => fs.existsSync(arqPrompt(id, a.id, f, m, 1)))) continue;
      const t0 = Date.now();
      const pedir = (aviso?: string) => deps.cerebro.escreverPrompt({ anuncio: a, formato: f, marca: r.marca, entradaDir: dirEntrada(id), logDir: path.join(dirInterno(id), "cerebro"), aviso });
      let p = await pedir(); let faltam = ingredientesFaltando(p.ingredientes, r);
      if (faltam.length) { p = await pedir(`estes ingredientes não existem: ${faltam.join(", ")}. Use só arquivos que existem.`); faltam = ingredientesFaltando(p.ingredientes, r); }
      if (faltam.length) throw new Error(`o prompt de ${a.id} ${f} pede arquivos que não existem: ${faltam.join(", ")}`);
      for (const m of modelos) gravarPrompt(arqPrompt(id, a.id, f, m, 1), p);
      registrar(r, "escrevendo_prompts", `${a.id} ${f}`, Date.now() - t0); salvarRemessa(r);
    }
    r.etapa = "enviando_referencias";
  } catch (e) { erroRemessa(r, "cerebro", e instanceof Error ? e.message : String(e)); }
  salvarRemessa(r);
}

export const chaveUpload = (nomeFlow: string, projeto = process.env.FLOW_PROJETO ?? "") => `${projeto}/${nomeFlow}`;
/** Sobe ao Flow os ingredientes ainda não enviados. Devolve false (sem tocar no Flow) se houver bloqueio global. */
async function subirFaltantes(r: Remessa, tokens: Iterable<string>, deps: Deps): Promise<boolean> {
  const enviados = lerJson<Record<string, string>>(arqUploads(), {});
  for (const t of tokens) {
    const { abs, nomeFlow } = resolverIngrediente(t, r.id, r.marca);
    const chave = chaveUpload(nomeFlow); // por projeto: trocar de projeto no Flow sobe tudo de novo
    if (enviados[chave]) continue;
    if (lerBloqueio()) return false;
    await deps.flow.subir(abs, nomeFlow); enviados[chave] = new Date().toISOString(); salvarJson(arqUploads(), enviados);
    registrar(r, "enviando_referencias", `enviado ${nomeFlow}`);
  }
  return true;
}

/** Envia as referências da remessa. Com bloqueio global não toca no Flow: a remessa segue esperando nesta etapa. */
export async function enviarReferencias(id: string, deps: Deps, mudarEtapa = true): Promise<boolean> {
  if (lerBloqueio()) return false;
  const r = lerRemessa(id);
  const tokens = new Set<string>();
  for (const a of r.anuncios) for (const x of a.artes) { const arq = arqPrompt(id, a.id, x.formato, x.modelo, x.versaoAtual); if (fs.existsSync(arq)) lerJson<{ ingredientes: string[] }>(arq).ingredientes.forEach((t) => tokens.add(t)); }
  try {
    if (!(await subirFaltantes(r, tokens, deps))) { salvarRemessa(r); return false; }
    if (mudarEtapa) r.etapa = "gerando";
  } catch (e) {
    if (e instanceof ErroBloqueioFlow) { pararTudo(r, "flow_bloqueio", e.message); return true; }
    erroRemessa(r, "flow_ui", e instanceof Error ? e.message : String(e));
  }
  salvarRemessa(r);
  return true;
}

export async function processarProximaArte(deps: Deps): Promise<null | { alvo: Alvo; resultado: Driver.ResultadoGeracao }> {
  if (lerBloqueio() || !proximaArte(listarRemessas())) return null;
  await deps.ritmo.antesDeEnviar();
  // Pausar/cancelar clicados durante a pausa de 45–60 s valem antes deste envio.
  if (deps.aplicarPendentes) await deps.aplicarPendentes();
  if (lerBloqueio()) return null;
  const alvo = proximaArte(listarRemessas()); if (!alvo) return null; // o estado pode ter mudado durante a espera
  // Ingredientes de um ajuste sobem aqui (Chrome no ar, sem bloqueio), antes de contar a tentativa.
  try {
    const r = lerRemessa(alvo.remessa); const arte = arteDe(r, alvo);
    const pj = arqPrompt(r.id, alvo.anuncio, arte.formato, arte.modelo, arte.versaoAtual);
    if (!(await subirFaltantes(r, lerJson<{ ingredientes: string[] }>(pj).ingredientes, deps))) { salvarRemessa(r); return null; }
    salvarRemessa(r);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e); const r = lerRemessa(alvo.remessa);
    if (e instanceof ErroBloqueioFlow) { pararTudo(r, "flow_bloqueio", msg); return { alvo, resultado: { status: "bloqueio", msg } }; }
    erroRemessa(r, "flow_ui", msg); salvarRemessa(r);
    return { alvo, resultado: { status: "erro", msg } };
  }
  try { return await gerarArte(alvo, deps); }
  catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const r = lerRemessa(alvo.remessa); const arte = arteDe(r, alvo);
    if (ATIVAS.includes(arte.status) && arte.status !== "na_fila") {
      if (arte.tentativas < deps.maxTentativas) { arte.status = "na_fila"; arte.prioridade = -1; }
      else falhar(arte, msg);
    }
    erroRemessa(r, "outro", msg); salvarRemessa(r);
    return { alvo, resultado: { status: "erro", msg } as Driver.ResultadoGeracao };
  }
}

/** Nome do arquivo entregue que vai para `.interno/versoes/` quando a nova versão fica pronta. */
function nomeArquivado(a: Arte, dir: string) {
  const v = a.versaoEntregue ?? a.versaoAtual;
  const base = v < a.versaoAtual ? `v${v}` : `v${v}-t${a.tentativaEntregue ?? a.tentativas - 1}`;
  let nome = `${base}.png`; for (let i = 2; fs.existsSync(path.join(dir, nome)); i++) nome = `${base}-${i}.png`;
  return path.join(dir, nome);
}

async function gerarArte(alvo: Alvo, deps: Deps): Promise<{ alvo: Alvo; resultado: Driver.ResultadoGeracao }> {
  let r = lerRemessa(alvo.remessa); let arte = arteDe(r, alvo); const an = r.anuncios.find((x) => x.id === alvo.anuncio)!;
  arte.status = "gerando"; arte.tentativas += 1; arte.enviadaEm = new Date().toISOString(); salvarRemessa(r);
  const pj = arqPrompt(r.id, an.id, arte.formato, arte.modelo, arte.versaoAtual);
  const { ingredientes } = lerJson<{ ingredientes: string[] }>(pj);
  const bruto = path.join(dirInterno(r.id), "brutos", an.id, arte.modelo, `${arte.formato}-v${arte.versaoAtual}-t${arte.tentativas}.png`);
  atualizarStatus({ ultimoEnvio: Date.now() });
  let res: Driver.ResultadoGeracao;
  try {
    res = await deps.flow.gerar({ modelo: arte.modelo, formato: arte.formato, promptArq: txtDe(pj), destino: bruto,
      ingredientes: ingredientes.map((t) => resolverIngrediente(t, r.id, r.marca).nomeFlow) });
  } finally { deps.ritmo.registrarFim(); } // a pausa conta mesmo se o driver quebrar
  r = lerRemessa(alvo.remessa); arte = arteDe(r, alvo);
  Object.assign(arte, { mediaId: res.mediaId ?? arte.mediaId, segundos: res.segundos, creditos: res.creditos });
  registrar(r, "gerando", `${an.id} ${arte.modelo} ${arte.formato}: ${res.status}${res.msg ? ` (${res.msg})` : ""}`, res.segundos ? res.segundos * 1000 : undefined);
  const dec = decidir(res, arte.tentativas, deps.maxTentativas);
  if (dec === "parar_bloqueio" || dec === "parar_custo") {
    arte.status = "na_fila"; arte.tentativas -= 1;
    pararTudo(r, dec === "parar_bloqueio" ? "flow_bloqueio" : "flow_custo", res.msg || res.status); return { alvo, resultado: res };
  }
  if (dec === "repetir_ui") { if (!lerBloqueio()) await deps.flow.limparCompositor(); await deps.dormir(30_000); }
  if (dec === "repetir" || dec === "repetir_ui") { arte.status = "na_fila"; arte.prioridade = -1; salvarRemessa(r); return { alvo, resultado: res }; }
  if (dec === "falhou") { falhar(arte, res.msg || res.status); talvezConcluir(r); salvarRemessa(r); return { alvo, resultado: res }; }
  // pós: a nova imagem é montada fora de entrega/; a anterior só sai de lá quando a nova estiver pronta (S1/ajuste).
  arte.status = "pos"; salvarRemessa(r);
  const destino = arqEntrega(r.id, an.id, arte.modelo, arte.formato);
  const novo = path.join(dirInterno(r.id), "pos", `${an.id}-${arte.modelo}-${arte.formato}.png`);
  let avisoPorCodigo = false; let mini = ""; let arquivada: string | null = null;
  // Erro aqui é do computador (Python, disco), não do Flow: gerar de novo só gastaria tentativas. A arte falha
  // (a imagem do Flow fica em .interno/brutos) e a remessa para com erro para a pessoa ver o motivo.
  try {
    await deps.pos.finalizar(bruto, novo, arte.formato);
    avisoPorCodigo = deps.pos.aplicarAviso ? await deps.pos.aplicarAviso(novo, r.marca) : false;
    await deps.pos.aplicarSelo(novo, r.marca); // pula se a marca não tem selo configurado
    r = lerRemessa(alvo.remessa); arte = arteDe(r, alvo);
    if (fs.existsSync(destino)) {
      const dir = path.join(dirInterno(r.id), "versoes", `${an.id}-${arte.modelo}-${arte.formato}`);
      fs.mkdirSync(dir, { recursive: true }); arquivada = nomeArquivado(arte, dir); renomear(destino, arquivada);
    }
    fs.mkdirSync(path.dirname(destino), { recursive: true }); renomear(novo, destino);
    Object.assign(arte, { arquivo: destino, versaoEntregue: arte.versaoAtual, tentativaEntregue: arte.tentativas }); salvarRemessa(r);
  } catch (e) {
    const msg = `acabamento da imagem falhou (a imagem gerada ficou em ${bruto}): ${e instanceof Error ? e.message : String(e)}`;
    // a versão anterior já tinha saído de entrega/ e a nova não entrou: devolve a anterior
    if (arquivada && !fs.existsSync(destino)) { try { renomear(arquivada, destino); } catch { /* fica em versoes/ */ } }
    r = lerRemessa(alvo.remessa); arte = arteDe(r, alvo);
    falhar(arte, msg); erroRemessa(r, "outro", msg); salvarRemessa(r);
    return { alvo, resultado: res };
  }
  // A imagem já está em entrega/: falha na miniatura não pode jogar fora uma arte boa.
  mini = path.join(dirInterno(r.id), "miniaturas", `${an.id}-${arte.modelo}-${arte.formato}-v${arte.versaoAtual}-t${arte.tentativas}.webp`);
  try { await deps.pos.miniatura(destino, mini); } catch { mini = ""; }
  r = lerRemessa(alvo.remessa); arte = arteDe(r, alvo); Object.assign(arte, { status: "revisando", miniatura: mini || undefined }); salvarRemessa(r);
  let rev: Arte["revisao"];
  try { rev = await deps.cerebro.revisar({ arteAbs: destino, anuncio: an, formato: arte.formato, marca: r.marca, refAbs: path.join(dirEntrada(r.id), an.ref), avisoPorCodigo, logDir: path.join(dirInterno(r.id), "cerebro") }); }
  catch { rev = { ok: true, gravidade: "leve", problemas: ["revisão automática indisponível"] }; }
  r = lerRemessa(alvo.remessa); arte = arteDe(r, alvo);
  Object.assign(arte, { revisao: rev, arquivo: destino, miniatura: mini || undefined });
  if (rev!.gravidade === "grave") {
    if (arte.tentativas < deps.maxTentativas) { arte.status = "na_fila"; arte.prioridade = -1; }
    else arte.status = "defeito";
  } else { arte.status = "pronta"; arte.prioridade = 0; arte.ajustePendente = undefined; arte.erro = undefined; }
  talvezConcluir(r); salvarRemessa(r);
  return { alvo, resultado: res };
}

/** Ajuste: reescreve o prompt e põe a arte na fila de novo. Não toca no Flow nem na imagem entregue (ela só é trocada quando a nova versão terminar). */
export async function aplicarAjuste(cmd: Extract<Comando, { tipo: "ajuste" }>, deps: Deps) {
  const r = lerRemessa(cmd.remessa); const an = r.anuncios.find((x) => x.id === cmd.anuncio); if (!an) return;
  const escolhidas = an.artes.filter((x) => cmd.escopo === "anuncio" || (cmd.escopo === "formato" ? x.formato === cmd.formato : x.formato === cmd.formato && x.modelo === cmd.modelo));
  const alvos = escolhidas.filter((x) => fs.existsSync(arqPrompt(r.id, an.id, x.formato, x.modelo, x.versaoAtual)));
  for (const x of escolhidas) if (!alvos.includes(x)) x.erro = MSG_SEM_PROMPT;
  if (!alvos.length) { registrar(r, "ajuste", `${an.id}: ${MSG_SEM_PROMPT}`); salvarRemessa(r); return; }
  const novos: { arte: Arte; prompt: { prompt: string; ingredientes: string[] } }[] = [];
  try {
    for (const arte of alvos) {
      const atual = lerJson<{ prompt: string; ingredientes: string[] }>(arqPrompt(r.id, an.id, arte.formato, arte.modelo, arte.versaoAtual));
      const novo: { prompt: string; ingredientes: string[] } = await deps.cerebro.ajustar({ promptAtual: atual.prompt, ingredientes: atual.ingredientes, pedido: cmd.texto, arteAbs: arqEntrega(r.id, an.id, arte.modelo, arte.formato), marca: r.marca, entradaDir: dirEntrada(r.id), logDir: path.join(dirInterno(r.id), "cerebro") });
      const faltam = ingredientesFaltando(novo.ingredientes, r);
      if (faltam.length) throw new Error(`o novo prompt pede arquivos que não existem: ${faltam.join(", ")}`);
      novos.push({ arte, prompt: novo });
    }
  } catch (e) {
    const msg = `ajuste falhou: ${e instanceof Error ? e.message : String(e)}`;
    for (const arte of alvos) arte.erro = msg;
    registrar(r, "ajuste", msg); salvarRemessa(r); return;
  }
  for (const { arte, prompt } of novos) {
    // Lembra qual versão está em entrega/ (remessas antigas não tinham o campo) para poder voltar a ela se o ajuste não sair.
    if (arte.arquivo && fs.existsSync(arte.arquivo)) { arte.versaoEntregue ??= arte.versaoAtual; arte.tentativaEntregue ??= arte.tentativas; }
    arte.versaoAtual += 1; gravarPrompt(arqPrompt(r.id, an.id, arte.formato, arte.modelo, arte.versaoAtual), prompt);
    Object.assign(arte, { status: "na_fila", prioridade: 1, tentativas: 0, ajustePendente: cmd.texto, erro: undefined });
    registrar(r, "ajuste", `${an.id} ${arte.modelo} ${arte.formato} v${arte.versaoAtual}: ${cmd.texto}`);
  }
  if (r.etapa === "concluida") r.etapa = "gerando";
  salvarRemessa(r);
}

export async function aplicarControle(cmd: Comando) {
  if (cmd.tipo === "extrair_marca") return;
  if (cmd.tipo === "desbloquear") { desbloquear(); return; }
  const r = lerRemessa(cmd.remessa);
  switch (cmd.tipo) {
    case "pausar": if (r.etapa !== "pausada") { r.etapaAntesDaPausa = r.etapa; r.etapa = "pausada"; registrar(r, "pausada", "pausada pelo usuário"); } break;
    case "retomar": {
      const b = lerBloqueio();
      // Retomar a remessa que causou o bloqueio é a ação explícita que libera o Flow.
      if (b && r.etapa === "erro" && (r.erro?.tipo === "flow_bloqueio" || r.erro?.tipo === "flow_custo") && (!b.remessa || b.remessa === r.id)) {
        desbloquear(); registrar(r, "retomada", "bloqueio do Flow liberado pelo usuário");
      }
      if (r.etapa === "pausada") r.etapa = r.etapaAntesDaPausa ?? "gerando";
      else if (r.etapa === "erro") {
        const antes = r.etapaAntesDoErro;
        r.etapa = antes && antes !== "interpretando" && antes !== "erro" ? antes : r.anuncios.some((a) => a.artes.length) ? "gerando" : "importada";
        r.etapaAntesDoErro = undefined;
      }
      r.erro = undefined; registrar(r, "retomada", `retomada em ${r.etapa}`); break;
    }
    case "cancelar":
      for (const a of r.anuncios) for (const x of a.artes) if (ATIVAS.includes(x.status) || x.status === "pendente") falhar(x, "cancelada");
      r.etapa = "concluida"; registrar(r, "cancelada", "cancelada pelo usuário"); break;
    case "preferida": { const a = r.anuncios.find((x) => x.id === cmd.anuncio); if (a) a.preferida = { ...a.preferida, [cmd.formato]: cmd.modelo }; break; }
    case "apoio": { const a = r.anuncios.find((x) => x.id === cmd.anuncio); if (a && !a.apoio.includes(cmd.arquivo)) a.apoio.push(cmd.arquivo);
      const nomes = [path.basename(cmd.arquivo), cmd.nomeOriginal].filter((n): n is string => !!n);
      r.duvidas = r.duvidas.filter((d) => !nomes.some((n) => d.pergunta.includes(n))); registrar(r, "apoio", `recebido ${cmd.arquivo}`); break; }
    case "tentar_de_novo": {
      const an = r.anuncios.find((x) => x.id === cmd.anuncio); const x = an?.artes.find((a) => a.formato === cmd.formato && a.modelo === cmd.modelo);
      if (!an || !x || !["falhou", "defeito"].includes(x.status)) { registrar(r, "aviso", `gerar de novo ignorado: ${cmd.anuncio} ${cmd.modelo} ${cmd.formato} não está com falha`); break; }
      const temPrompt = fs.existsSync(arqPrompt(r.id, an.id, x.formato, x.modelo, x.versaoAtual));
      if (!temPrompt && x.versaoAtual !== 1) { x.erro = MSG_SEM_PROMPT; break; }
      Object.assign(x, { status: "na_fila", tentativas: 0, erro: undefined, prioridade: 0 });
      // sem prompt (cancelada antes de prepará-lo): passa de novo por prompts → referências → geração
      if (r.etapa === "concluida") r.etapa = temPrompt ? "gerando" : "escrevendo_prompts";
      registrar(r, "tentar_de_novo", `${an.id} ${x.modelo} ${x.formato}: gerar de novo`); break;
    }
    default: return;
  }
  salvarRemessa(r);
}

/**
 * Ao iniciar: o que estava em voo volta para a fila e a remessa fica pausada até o usuário retomar.
 * A geração interrompida CONTA como tentativa (pode ter sido enviada ao Flow); se era a última, a arte vira `falhou`
 * — nunca há uma 4ª geração. O usuário pode pedir "Gerar de novo" explicitamente.
 */
export function recuperarAoIniciar(maxTentativas = 3) {
  for (const r of listarRemessas()) {
    let mudou = false;
    for (const a of r.anuncios) for (const x of a.artes) if (["gerando", "pos", "revisando"].includes(x.status)) {
      if (x.tentativas >= maxTentativas) falhar(x, "o worker reiniciou durante a última tentativa permitida");
      else x.status = "na_fila";
      mudou = true;
    }
    if (r.etapa === "interpretando") { r.etapa = "importada"; mudou = true; }
    if (mudou && r.etapa === "gerando") { r.etapaAntesDaPausa = "gerando"; r.etapa = "pausada"; registrar(r, "pausada", "worker reiniciou no meio da produção — clique em retomar"); }
    if (mudou) salvarRemessa(r);
  }
}
