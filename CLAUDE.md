# Máquina de Estáticos — instruções para o Claude

> **Se você acabou de clonar este projeto a pedido da pessoa: siga "Instalar o sistema" abaixo, do passo 2 em diante.**

Quem usa este projeto normalmente não é programador. A pessoa pede em linguagem simples ("instale o projeto <link> no meu computador", "inicia o sistema", "roda a remessa 12") e espera que o Claude faça o trabalho técnico, explicando cada passo em uma frase curta e sem jargão. Responda sempre em português do Brasil.

Regras gerais de conduta:
- Antes de instalar qualquer programa no computador da pessoa (Node, Python, Git, Chrome, Homebrew), mostre o comando, diga em uma frase o que ele faz e **peça permissão**. Só siga depois do "pode".
- Nunca digite senhas nem entre em contas pela pessoa. Login no Google/Flow é sempre ela quem faz.
- **Comandos que pedem senha ou janela de permissão o seu terminal não consegue responder.** São eles: o instalador do Homebrew, `brew install --cask …`, e todo `winget install …` no Windows (abre a janela "Deseja permitir…?"). Para esses, mostre o comando exato e peça para a **pessoa** rodá-lo:
  - Mac (instalador do Homebrew e `brew install --cask …`): sempre numa janela do Terminal **dela**, fora do Claude Code (⌘ + Espaço, digite `Terminal`, Enter; cole o comando e Enter). Não use `!` aqui no Claude Code para eles: sem uma janela de verdade a senha do computador não é pedida e a instalação falha.
  - Windows (`winget install …`): na janela dela do PowerShell, ou aqui no Claude Code começando a linha com `!` (exemplo: `! winget install -e --id Git.Git --accept-source-agreements --accept-package-agreements`). A janela "Deseja permitir…?" abre à parte e ela clica em **Sim**.
  Espere ela dizer que terminou e só então continue. `brew install node` e `brew install python` você mesmo pode rodar (não pedem senha).
- **Depois de instalar um programa, o seu terminal ainda não o enxerga** (o PATH antigo continua valendo):
  - Mac: se o Homebrew acabou de ser instalado, comece cada comando seguinte com `eval "$(/opt/homebrew/bin/brew shellenv)" && …` (Mac com chip Apple) ou `eval "$(/usr/local/bin/brew shellenv)" && …` (Mac Intel; descubra com `uname -m`: `arm64` = chip Apple). Isso também resolve `node`, `npm` e `python3` instalados pelo brew. Não precisa reabrir nada.
  - Windows: depois de qualquer `winget install`, o PowerShell aberto continua com o PATH antigo, e o Claude Code de uma janela nova não lembra desta conversa. Faça assim:
    1. Mostre o caminho exato da pasta do projeto (rode `powershell.exe -NoProfile -Command "(Get-Location).Path"` na pasta do projeto e mostre o resultado inteiro, que termina em `\maquina-de-estaticos`).
    2. Diga à pessoa, em palavras simples: "Feche esta janela inteira do PowerShell (não só o Claude Code). Abra uma **nova** janela do PowerShell (tecla Windows, digite `PowerShell`, Enter) e digite, uma linha de cada vez: `cd "<caminho que eu mostrei>"`, depois `claude`. Quando o Claude abrir, escreva **continue a instalação**."
    3. Se o projeto ainda não foi baixado (por exemplo, você instalou o Git antes de clonar), não há pasta para mostrar: diga para ela fechar a janela inteira do PowerShell, abrir uma nova, digitar `claude` e colar de novo a frase de instalação do README ("instale o projeto … e siga o CLAUDE.md dele").
    Quando ela disser **continue a instalação**, recomece do passo 2 de "Instalar o sistema" (o `npm run verificar` mostra o que ainda falta).
- Os comandos do projeto rodam na pasta do projeto (onde está este arquivo). No Windows, se o terminal for o PowerShell, use `curl.exe` no lugar de `curl`.

## Instalar o sistema ("instale o projeto <link>", "instala o sistema")
1. **Cópia do projeto.** Se ainda não estiver dentro de uma cópia do projeto, guarde na pasta pessoal da pessoa (a pasta com o nome dela), numa pasta chamada `maquina-de-estaticos`: no Mac, `~/maquina-de-estaticos`; no Windows, `%USERPROFILE%\maquina-de-estaticos` (no PowerShell, `$HOME\maquina-de-estaticos`). Não use Documentos, Desktop nem pastas do OneDrive/iCloud: elas sincronizam milhares de arquivos de instalação e causam erros. Na pasta pessoal rode `git clone <link> maquina-de-estaticos` e entre nela (Mac: `cd ~/maquina-de-estaticos`; Windows/PowerShell: `cd "$HOME\maquina-de-estaticos"`). Diga à pessoa o caminho completo de onde ficou.
   Sem `git`: no Mac, rodar `git --version` abre a janela da Apple das "ferramentas de linha de comando" — a pessoa clica em **Instalar**, espera terminar e avisa; então rode de novo. No Windows, peça para a pessoa rodar `winget install -e --id Git.Git --accept-source-agreements --accept-package-agreements` e siga a regra do Windows acima (janela nova do PowerShell; como o projeto ainda não foi baixado, ela repete a frase de instalação).
2. **Node primeiro.** Rode `node --version`. Se não existir ou for menor que 20.12, instale o Node antes de qualquer `npm`:
   - Mac: `brew install node`. Se não houver Homebrew (`brew --version` falha), explique que é o instalador de programas mais usado no Mac e que ele pede a senha do computador, e peça para a pessoa abrir o Terminal **dela** (⌘ + Espaço, `Terminal`, Enter), colar o comando oficial de https://brew.sh (`/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`), apertar Enter, digitar a senha do computador quando pedir (ela não aparece enquanto digita) e avisar quando terminar. Depois use o `eval "$(… brew shellenv)" && brew install node`.
   - Windows: peça para a pessoa rodar `winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements` e siga a regra do Windows acima (janela nova do PowerShell na pasta do projeto).
3. **Pré-requisitos.** Rode `npm run verificar`. Ele lista cada item com ✅ ou ❌ e termina com uma linha `RESULTADO {"ok":…,"faltando":[…]}`. Para cada ❌, mostre à pessoa o comando indicado logo abaixo (→), que usa Homebrew no Mac e winget no Windows, e **peça permissão**; siga as regras acima sobre quem roda o comando e sobre o PATH. Repita `npm run verificar` até tudo ficar ✅.
   - Claude Code sem login: peça à pessoa para rodar `claude` uma vez no terminal dela e entrar na conta.
   - Disco: o sistema precisa de pelo menos 3 GB livres.
4. **Instalação.** Avise: "Agora vou baixar os pacotes do sistema e montar tudo; leva alguns minutos." Rode `npm run instalar` (baixa as dependências do Node e do Python, cria o ambiente Python `.venv`, compila a interface e cria `.env.local` e a pasta `dados/`). Ele demora vários minutos: rode com o tempo limite máximo do terminal (10 minutos) ou em background com a saída num arquivo de log e acompanhe o log até aparecer `Próximo passo`. Não interrompa no meio. Se der erro, rode `npm run instalar` de novo: ele retoma de onde parou.
5. **Chrome do Flow.** Rode `npm run chrome` em background e diga: "Abri uma janela do Chrome. Entre com a sua conta Google no Flow — você digita a senha, eu nunca digito." Espere a pessoa confirmar que entrou.
6. **Projeto do Flow.** Peça: "No Flow, clique em **New project**, depois copie o endereço da barra do navegador e cole aqui." Com o link, rode `npm run configurar -- "<link>"`.
7. Siga **Iniciar o sistema** abaixo. Ao final diga: "Pronto! Abra http://127.0.0.1:3200 e cadastre sua marca em **Marcas → Nova**."

## Iniciar o sistema ("inicia o sistema", "liga a máquina")
1. **Chrome do Flow** (porta `FLOW_PORTA` do `.env.local`, padrão 9231): `curl -s http://127.0.0.1:9231/json/version`. Se a resposta for um JSON com `"Browser"`, está aberto.
   Se não responder, rode `npm run chrome` em background. Se o Flow pedir login, avise a pessoa para entrar ela mesma (nunca digite senha).
2. **Já está no ar?** `curl -s http://127.0.0.1:3200/api/status`. Se responder, não suba outro.
3. **Se não estiver:** veja se sobrou processo da máquina:
   - Porta 3200 — Mac: `lsof -nP -iTCP:3200 -sTCP:LISTEN` e `ps -p <PID> -o command=`; Windows: `netstat -ano | findstr :3200` e `powershell.exe -NoProfile -Command "(Get-CimInstance Win32_Process -Filter 'ProcessId=<PID>').CommandLine"`.
   - Worker perdido (sem a interface) — Mac: `pgrep -fl "worker/index.ts"` (e `ps -p <PID> -o command=` / `lsof -p <PID> | grep cwd` para ver a pasta); Windows: `powershell.exe -NoProfile -Command 'Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like "*worker*index.ts*" } | Select-Object ProcessId, CommandLine | Format-List'` (pega `worker/index.ts` e `worker\index.ts`). Um worker antigo rodando junto com o novo faria duas gerações ao mesmo tempo.
   Só encerre se a linha de comando (ou a pasta) mostrar que é desta máquina (`next start -p 3200` ou `worker/index.ts` vindos desta pasta) e avise a pessoa antes. Se for outro programa, não mexa: conte à pessoa que a porta 3200 está ocupada por ele.
   Se o código mudou desde o último build (por exemplo, depois de `git pull`), rode antes `npm run build`. Depois rode `npm start` em background, com o log num arquivo temporário.
4. **Aguarde** `/api/status` mostrar `worker.vivo: true`, `chrome: true`, `configurado: true` e `bloqueio: null`. Informe http://127.0.0.1:3200 e o espaço livre em disco (`discoLivreGb`); abaixo de 3 GB, avise.
   - `configurado: false`: o projeto do Flow ainda não foi informado — faça os passos 5 e 6 de **Instalar o sistema** (a tela http://127.0.0.1:3200/configuracao também aceita o link).
   - `bloqueio` preenchido: a conta do Flow foi protegida por um erro (403, atividade incomum, custo…). Explique à pessoa, peça para ela conferir a conta no Flow e só então liberar pelo botão **Desbloquear** na tela **Status**. Nunca libere por conta própria.

Para desligar: encerre o processo `npm start` (ele derruba a interface e o worker juntos).

## Operar
- Antes da primeira remessa, a marca precisa estar cadastrada em **Marcas → Nova**.
- Remessas entram pela tela **Nova remessa** (arrastar a pasta) ou pela API (veja a skill `/maquina-ads`). Use sempre a API do sistema e nunca chame o Flow por fora enquanto o worker roda.
- Arquivo colocado na pasta de origem depois da importação NÃO entra sozinho. Pause a remessa, copie para `entrada/apoio/` da remessa e refaça os prompts afetados.
- Uma geração por vez, pausa de 45–60 s, parada global no primeiro 403/429/atividade incomum/política/custo > 0, no máximo 3 tentativas por arte. Isso é garantido pelo worker e nunca deve ser contornado nem afrouxado.
- Ajustes sempre geram de novo (ação `ajuste`). Não remende pixels da arte. Exceções feitas por código: aviso legal, logo e selo.
- Aviso legal: o pipeline reescreve o parágrafo por código (`motor-flow/aviso_oficial.py`) com o texto de `aviso_legal.texto` da identidade da marca e a fonte da pasta `fontes/` da marca. A revisão automática pode deixar passar aviso errado: confira ampliando o rodapé antes de entregar.
- Selo de imagem ilustrativa: é por marca. O sistema aplica sozinho, sobre a foto e no mesmo corpo do aviso, só quando a `identidade.json` da marca tem `selo_imagem_ilustrativa.texto` e há uma fonte (.ttf/.otf) em `fontes/` da marca. Marca sem selo configurado sai sem selo. É opcional: a pessoa informa o texto no campo **Selo de imagem ilustrativa (opcional)** ao cadastrar a marca em **Marcas → Nova**. Para ativar numa marca já cadastrada, peça o texto à pessoa e complete a identidade da marca — não aplique selo à mão.
- Entrega: `dados/remessas/<ID>/entrega/`. Se a pessoa pedir, copie a pasta para onde ela indicar (por exemplo, Downloads).
- Responda em português do Brasil.
