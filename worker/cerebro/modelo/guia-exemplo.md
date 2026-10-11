# Guia de identidade visual — Grão Norte (anúncios estáticos)

> **Marca inventada, usada como molde.** A Grão Norte não existe: este guia mostra o formato que a máquina espera de uma marca cadastrada (seções 1–12). Ao cadastrar uma marca real, cada seção é preenchida a partir dos anúncios dela.
> **Este guia é de identidade, não de copy.** Nenhum texto de anúncio é padrão: headline, oferta, preço, benefícios e CTA vêm sempre do pedido. A única exceção é o **aviso legal** (§6), obrigatório e fixo.
> Versão legível por máquina: `identidade.json`. Em conflito, este guia manda.

---

## 1. Essência

- **Mercado:** cafeteria de especialidade com lojas próprias e venda de café em grãos e moído para levar.
- **Universo visual do produto:** pacote stand-up kraft fosco com faixa verde-pinho e janela mostrando os grãos; coadjuvantes recorrentes: xícara de cerâmica creme, coador de pano, grãos torrados espalhados, croissant no prato.
- **Sensação:** acolhedora, artesanal e confiável — papel, madeira clara e luz da manhã; nada de luxo frio.

## 2. Cores

### Paleta oficial

| Cor | Hex | Papel |
|---|---|---|
| **Verde-pinho** | `#2F5D50` | Cor de marca e de UI: CTA, destaques de headline, checks, abas, fundos chapados |
| **Creme** | `#F4EDE1` | Fundo claro padrão e texto sobre verde/escuro |
| **Grafite** | `#1B1B1B` | Texto principal sobre claro, fundos noturnos |
| **Âmbar** | `#E3A33B` | Acento: preço, selo de desconto, sublinhados — usar com parcimônia |

### Tons de apoio (derivados da paleta)

| Papel | Hex | Observação |
|---|---|---|
| Degradê do fundo verde | `#2F5D50` → `#21443A` | Profundidade nos fundos chapados |
| Papel de fundo | `#EAE1D2` | Neutro texturizado dos cartões de oferta |
| Café torrado | ≈ `#5A3A26` | **Só no produto** (vem da foto), nunca em texto/UI |
| Logo — grafite / grão | `#1B1B1B` / `#E3A33B` | Cores do arquivo oficial do logo; usar sempre o arquivo |

**Regras**
- Verde-pinho é a cor de UI; âmbar só como acento pontual; marrom só no produto.
- Fundo verde → texto creme, CTA **âmbar** com texto grafite.
- Fundo creme/papel → headline verde-pinho ou grafite, CTA **verde-pinho** com texto creme.
- Foto escura → texto creme, CTA creme com texto grafite.

## 3. Tipografia

**Títulos: Fraunces** (serifada de contraste suave). **Texto: Inter.** Ambas são livres (Google Fonts).

| Nível | Estilo |
|---|---|
| Headline | Fraunces SemiBold, **Sentence case**, entrelinha 1.0–1.1 |
| Supra-título | Inter Medium CAIXA ALTA, **espaçado** (tracking ~+200) |
| Subtítulo/corpo | Inter Regular, sentence case; destaques em SemiBold ou verde-pinho |
| Numeral de preço | Fraunces SemiBold grande; moeda e centavos pequenos ao lado |
| CTA | Inter SemiBold CAIXA ALTA |
| Aviso legal | Inter Regular, corpo mínimo, tracking levemente aberto |
| Manuscrita (só estilo quadro de giz) | Caneta de giz (alternativa livre: Caveat / Kalam) |

## 4. Logo

Arquivos oficiais em `marcas/grao-norte/logo/`:

| Arquivo | Uso |
|---|---|
| `logo-cor.png` | Palavra "Grão Norte" grafite + grão âmbar, transparente → **fundos claros** |
| `logo-creme.png` | Todo creme → **fundo verde-pinho, grafite, fotos escuras** |
| `logo-grafite.png` | Todo grafite → fundo âmbar ou claro quando o grão âmbar não contrastar |
| `simbolo-grao.png` | Símbolo (grão âmbar) isolado — selos, avatar, detalhes |

- **Sempre o arquivo**, nunca redesenhar/gerar o logo por IA nem reescrever o nome em fonte.
- Tamanho: discreto, ≈ 12–16% da largura da arte (≈ 130–170 px em 1080).
- Posição: **story** → topo centralizado (y ≈ 8%) ou rodapé centralizado; **feed** → canto (§8).
- Área de respiro: no mínimo a altura do grão em volta.

## 5. Peças visuais recorrentes (estrutura, sem copy fixa)

Os textos dentro das peças vêm do pedido. O que é da marca é a **forma**:

1. **CTA** — retângulo com cantos de 12 px, texto Inter SemiBold caixa alta. Variantes: verde-pinho + creme (padrão) · âmbar + grafite (sobre verde) · creme + grafite (sobre foto). ≈ 40–60% da largura.
2. **Bloco de preço** — "a partir de" em Inter caixa alta espaçado → moeda pequena alinhada ao topo → numeral grande em Fraunces → centavos e complemento pequenos ao lado. Verde-pinho ou grafite em fundo claro, creme em fundo escuro.
3. **Lista com check** — círculo verde-pinho com ✓ creme + texto Inter Regular.
4. **Fileira de ícones line-art** — 3–4 ícones de traço médio (xícara, grão, coador, sacola) com legenda curta caixa alta.
5. **Selo de desconto** — círculo âmbar de borda serrilhada, rotacionado ~-10°.
6. **Cartão com abas** — cartão creme de cantos arredondados com duas abas tipo pasta no topo, verde-pinho com texto creme.
7. **Caixa translúcida escura** — retângulo arredondado grafite ~45% de opacidade atrás do headline sobre foto.
8. **Carimbo circular** — texto curvo em volta de um grão, uma cor só, como carimbo de saco de café.
9. **Mockup do app de pedidos** — celular com a tela creme do app.
10. **Estrelas** ★★★★★ âmbar.

## 6. Aviso legal (OBRIGATÓRIO em 100% das artes)

### Texto oficial

> Imagens meramente ilustrativas. Ofertas válidas enquanto durarem os estoques, nas unidades participantes. Consulte condições em graonorte.exemplo.

- Vai **completo e literal** em toda arte, 1:1 e 9:16. Nunca resumir, cortar ou parafrasear.

### Como aplicar (discreto, sem atrapalhar a arte)

- **Fonte:** Inter Regular, tracking levemente aberto.
- **Opção A — horizontal (padrão):** parágrafo centralizado no rodapé, margens ≈ 40 px, abaixo do CTA; corpo ≈ 12–15 px (story) / 9–11 px (feed).
- **Opção B — vertical:** na margem direita, rotacionado 90° lendo de baixo para cima, 1–2 linhas. Usar quando o rodapé estiver ocupado por foto.
- **Cor:** baixa ênfase, mas legível — creme ~60–70% sobre verde/escuro; cinza quente ≈ `#7D766C` sobre claro.
- Nunca sobre produto, rosto ou preço; nunca cortado; no story, fora das faixas cobertas pela interface (§7).

### Selo de imagem gerada por IA

- Obrigatório em **toda arte com imagem de pessoas**.
- Texto exato: `*Imagens ilustrativas geradas por inteligência artificial.`
- Mesma fonte, corpo e ênfase do aviso legal, sobre a foto, longe de rosto, produto e preço; nunca na barra de baixo junto ao aviso.
- Aplicado por código no pós-processamento, nunca pela IA.

## 7. Grid e zonas seguras

- **Story 9:16 (1080×1920):** conteúdo relevante entre **y ≈ 250 e y ≈ 1650**. Topo (~250 px) e base (~270 px) ficam só com fundo/foto. Margens laterais do texto ≈ 80 px.
- **Feed 1:1 (1080×1080):** usa o quadro inteiro, sem faixas vazias. Margens ≈ 50 px.
- Hierarquia: logo · supra-título · headline · subtítulo · visual · preço + lista · CTA · aviso legal.

## 8. Como adaptar 9:16 → 1:1

1. **Empilhado vira duas colunas:** a pilha vertical do story (headline → visual → preço → CTA) vira **texto à esquerda + visual à direita** no feed.
2. **Ou a pilha é comprimida:** mantém a coluna central, reduz o visual (~60%) e põe preço e lista **lado a lado**.
3. **Faixas com foto viram meia-altura:** a foto do topo ocupa ~40% da altura no feed.
4. **Logo vai para um canto:** superior esquerdo (padrão) ou inferior direito em fotos.
5. **Headline encolhe** ~15–25% e pode quebrar em mais linhas.
6. **Foto de pessoas é recortada mais fechada**, nas mãos + xícara ou no rosto.
7. **Aviso legal continua** — mesma opção da versão story, com corpo menor.
8. Mesmo conteúdo, mesmas peças e mesma paleta: o feed **não** ganha nem perde elementos de texto.

## 9. Estilos visuais (famílias de layout)

| # | Família | Descrição |
|---|---|---|
| E1 | Foto de balcão + caixa escura | Foto de manhã no balcão, pessoa com a xícara; headline em caixa translúcida; CTA creme; aviso no rodapé |
| E2 | Verde-pinho chapado + embalagem | Degradê verde, pacote de estúdio no centro, headline creme, CTA âmbar |
| E3 | Papel creme + cartão de oferta | Cartão com abas, embalagem inclinada, preço grande |
| E4 | Caixinha de pergunta nativa | Foto de celular com o adesivo de pergunta do Instagram e resposta em texto nativo |
| E5 | Quadro de giz | Quadro preto de cafeteria com texto manuscrito e desenhos de giz |
| E6 | Editorial serifado | Fundo papel, Fraunces grande, xícara em close, divisores finos |
| E7 | Fundo claro com círculo e preço | Círculo suave, bloco de preço à esquerda, cartão branco com lista e botão escuro |

## 10. Direção de fotografia / imagem gerada

- **Embalagem:** kraft fosco, faixa verde-pinho, janela com grãos médios-escuros brilhando pouco.
- **Bebida:** crema avelã uniforme, xícara de cerâmica creme sem marca de terceiros.
- **Luz:** natural lateral de manhã · contraluz quente de fim de tarde · estúdio claro com fundo de papel.
- **Pessoas:** brasileiros 22–50 anos, roupas do dia a dia, momento de pausa e conversa.
- **Proibido:** copos descartáveis de outras marcas, logos de terceiros, café derramado ou mesa suja.

## 11. Copy

- O sistema **não guarda nem inventa copy**. Todo texto da arte vem do pedido, aplicado palavra por palavra.
- O guia só define **como** o texto é diagramado: caixa, peso, cor, hierarquia, peças (§3, §5).
- Se o pedido não traz texto para uma peça que a referência tem, a peça sai sem texto ou é removida, conforme a instrução. Nada é inventado.

## 12. Checklist de aprovação

- [ ] Logo oficial (arquivo), variante certa para o fundo, discreto e na posição do formato
- [ ] Verde-pinho como cor de UI; âmbar só como acento; marrom só no produto
- [ ] Fraunces nos títulos, Inter no texto, hierarquia do guia
- [ ] Copy **exatamente** a do pedido, sem palavra inventada
- [ ] **Aviso legal oficial completo e literal**, legível e discreto
- [ ] Story: conteúdo entre y 250 e 1650 · Feed: margens ≈ 50 px
- [ ] Nada da lista proibida (§10)
- [ ] Entregue em **1:1 e 9:16**, com a adaptação seguindo o §8
