---
name: maquina-ads
description: Use quando o usuário pedir para produzir uma remessa de anúncios estáticos (ex.: "roda a remessa 12", "gera os anúncios da pasta X", "status da máquina de ads"). Opera a Máquina de Estáticos deste projeto pela API em http://127.0.0.1:3200 — nunca gera imagens por fora dela.
---
# Máquina de Estáticos
Todos os caminhos abaixo são relativos à raiz deste projeto (a pasta do `CLAUDE.md`).

1. Garanta que está no ar seguindo "Iniciar o sistema" do `CLAUDE.md` deste projeto (Chrome do Flow → `/api/status` → `npm start` em background → esperar `worker.vivo`, `chrome` e `configurado` true e `bloqueio` null). Se `chrome:false`, rode `npm run chrome` (ou peça para a pessoa usar o botão da tela **Status**). Se `configurado:false`, faça os passos do projeto do Flow descritos na instalação.
2. A marca precisa existir em **Marcas** (`GET /api/marcas`). Se não existir, oriente a cadastrar em http://127.0.0.1:3200/marcas/nova.
3. Nova remessa a partir de uma pasta: o jeito mais simples é orientar a pessoa a arrastar a pasta em http://127.0.0.1:3200/nova. Pela API, faça POST multipart em `/api/remessas` com `marca` (id da marca), `caminhos` (JSON com `<pasta>/<arquivo>` de cada arquivo, na mesma ordem) e `arquivos`. Exemplo em Node (Mac e Windows), rodado na pasta-pai da remessa:
   ```
   node -e "const fs=require('fs'),p=require('path');(async()=>{const pasta=process.argv[1],marca=process.argv[2];const rels=[];const andar=d=>{for(const n of fs.readdirSync(d)){const a=p.join(d,n);if(fs.statSync(a).isDirectory())andar(a);else if(!n.startsWith('.'))rels.push(p.relative('.',a).split(p.sep).join('/'))}};andar(pasta);const fd=new FormData();fd.append('marca',marca);fd.append('caminhos',JSON.stringify(rels));for(const r of rels)fd.append('arquivos',await fs.openAsBlob(r),p.basename(r));const res=await fetch('http://127.0.0.1:3200/api/remessas',{method:'POST',body:fd});console.log(res.status,await res.text())})()" "<pasta>" "<id-da-marca>"
   ```
   A resposta traz o `id` da remessa.
4. Acompanhe com `GET /api/remessas/<ID>`. Em `aguardando_confirmacao`, mostre as dúvidas à pessoa e envie as respostas com `POST /api/remessas/<ID>/acao {"tipo":"responder","respostas":{...}}`; para gerar, `{"tipo":"confirmar","anuncios":[...],"modelos":[...]}` (pergunte quais modelos).
5. Entregue o link da tela da remessa (http://127.0.0.1:3200/remessas/<ID>) e a pasta `dados/remessas/<ID>/entrega/`.

Regras: uma geração por vez, pausa de 45–60 s e parada no primeiro bloqueio são garantidas pela máquina e nunca devem ser contornadas; nunca chame o Flow diretamente; ajustes sempre por `{"tipo":"ajuste",...}`; o selo de imagem ilustrativa só sai em marcas com `selo_imagem_ilustrativa` configurado na identidade (e fonte em `fontes/`); responda em português do Brasil.
