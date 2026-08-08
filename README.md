# BASE

> *toda decisão começa na base.*

**BASE** é um painel de gestão financeira para **empresas de serviços**. O mesmo
sistema atende uma clínica, um escritório de advocacia, uma consultoria, um salão,
uma escola ou um profissional autônomo: o **segmento** escolhido nas configurações
troca o vocabulário da interface e os presets de catálogo, categorias e centros de
custo — a lógica financeira é a mesma para todos.

## A marca

Três colunas crescendo em gradiente do azul ao ciano, apoiadas sobre um arco que
sobe à direita — o gráfico e a fundação na mesma forma. A assinatura é caixa
alta, peso leve, entreletras aberto, com o "A" desenhado como chevron.

Tudo é vetorial e temático (`src/components/BaseLogo.tsx`): o símbolo, o selo e a
assinatura acompanham o tema claro/escuro e qualquer tamanho, sem imagem
rasterizada. A paleta sai do próprio logotipo:

| Token | Papel | Claro | Escuro |
|---|---|---|---|
| `--marca-de` → `--marca-ate` | gradiente das colunas | `#1479e8` → `#16e0d0` | `#2b8bf0` → `#2ceadb` |
| `--marca-arco-de` → `--marca-arco-ate` | gradiente do arco | `#0a7ae8` → `#2ab7f5` | `#1f8cf0` → `#45c6fa` |
| `--marca-tipo` | assinatura | `#123a63` | `#dbeaf7` |
| `--brand` | ação, links, navegação | `#0a6fc4` | `#4fb4f5` |

O azul de ação é um degrau mais fundo que o do logotipo de propósito: assim
links e o botão primário passam em contraste (5,1:1 contra o branco), enquanto o
símbolo mantém o tom vivo original.

## Segmentos disponíveis

| Segmento | Chama o cliente de | Chama o faturamento de |
|---|---|---|
| Clínica & Saúde | Paciente | Atendimento |
| Advocacia & Jurídico | Cliente | Honorário |
| Consultoria & Agência | Cliente | Faturamento |
| Estética & Bem-estar | Cliente | Sessão |
| Educação & Cursos | Aluno | Matrícula |
| Serviços em geral | Cliente | Serviço prestado |

Cada segmento traz um catálogo de serviços com preço e custo direto, categorias de
despesa, centros de custo, papéis da equipe, alíquota de impostos e metas
coerentes com a área. Trocar de segmento **não apaga** nada — só muda os rótulos e
as sugestões.

## Telas

- **Entrar** — e-mail e senha, **Google**, recuperação de senha e acesso de
  convidado. Todas as telas internas exigem sessão.
- **Boas-vindas** — configuração inicial do workspace logo após criar a conta:
  tipo de negócio, nome e se quer começar com dados de exemplo ou vazio.
- **Dashboard** — alertas acionáveis, 8 indicadores com variação contra o período
  anterior, medidor de meta com ponto de equilíbrio, receita × despesa × resultado,
  composição das despesas, aging de recebíveis e concentração de clientes.
- **Faturamento** (nome varia por segmento) — registro de tudo que foi prestado,
  com competência, vencimento, desconto, forma de pagamento, recorrência e baixa
  em um clique. Filtros por status, cliente, profissional e busca livre.
- **Clientes** — carteira com faturamento no período, ticket médio, valores em
  aberto, atraso, origem e último atendimento.
- **Contas a pagar e receber** — compromissos com vencimento, custo fixo × variável,
  centro de custo, recorrência e baixa. Contas vencidas continuam visíveis mesmo
  fora do período filtrado.
- **Fluxo de caixa projetado** — saldo dia a dia em 30/60/90 dias a partir dos
  vencimentos em aberto e dos lançamentos recorrentes, com alerta de cruzamento da
  reserva mínima e resumo semanal.
- **Relatórios** — DRE gerencial, margem por serviço, comissões da equipe e
  recebimentos por forma de pagamento. Todos exportáveis em CSV.
- **Configurações** — segmento, dados da empresa, parâmetros financeiros, catálogo
  de serviços, equipe e gestão da base.

## Agenda

Cada lançamento pode ter **hora** (opcional) e vai para a agenda em três níveis,
do mais universal ao mais integrado:

| Como | Precisa de quê | Onde fica |
|---|---|---|
| **Link do Google Agenda** | nada | ícone de calendário em cada lançamento |
| **Arquivo `.ics`** | nada | "Exportar agenda" na tela de lançamentos e "Baixar .ics" em Configurações |
| **Envio direto pela API** | login e permissão do Google | Configurações › Google Agenda |

O `.ics` segue a RFC 5545 (CRLF, escape de caracteres, dobra de linha em 75
colunas) e importa em Google, Apple e Outlook. Lançamento sem hora vira evento de
dia inteiro; com hora, usa a duração do serviço do catálogo — inclusive quando
atravessa a meia-noite. Só entra na agenda o que ainda vai acontecer: despejar
meses de histórico só polui.

A conexão direta pede a permissão **apenas de criar eventos** (não lê sua
agenda), e à parte do login — ninguém precisa liberar a agenda só para entrar no
sistema. O token vive **só em memória** e vale cerca de uma hora: sem servidor
não há como renová-lo em segundo plano, então a sincronização é uma ação
explícita, e a tela diz isso em vez de fingir que é automática.

```bash
npm run test:agenda
```

Verifica a geração contra a especificação: moldura do calendário, CRLF, escape,
dobra de linha, intervalo com e sem hora, virada de meia-noite e o formato do
link do Google.

## O que o sistema calcula

Competência e caixa são tratados separadamente — é a distinção que costuma faltar
em planilhas caseiras:

- **Faturamento** (competência) × **recebido** (caixa) e o percentual de conversão.
- **Margem de contribuição**: quanto sobra de cada real depois de impostos, custos
  diretos do serviço e despesas variáveis.
- **Ponto de equilíbrio**: faturamento mínimo que paga a estrutura fixa.
- **Resultado líquido** e margem, com DRE gerencial detalhada por categoria.
- **Inadimplência** e **aging de recebíveis** por faixa de atraso.
- **Saldo de caixa** e **runway** (meses de folga no ritmo atual de queima).
- **Receita recorrente mensal** e **ticket médio**.
- **Comissões** por profissional, com a base "sobre recebido" — a segura para pagar.

Os indicadores comparam sempre com o período imediatamente anterior de mesma
duração. Saldos em aberto são medidos na data de corte do período, não hoje, para
que a comparação entre períodos faça sentido.

## Acessibilidade e apresentação

- Paleta de séries validada para daltonismo, faixa de luminosidade e contraste nas
  duas superfícies (clara e escura).
- Todo gráfico tem uma **visão de tabela** equivalente — nenhum dado depende de
  distinguir cores.
- Status nunca é só cor: ícone + texto em todos os selos.
- Tema claro/escuro por tokens CSS, com a preferência do sistema como padrão.

## Rodando localmente

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000` e crie uma conta. Na tela de boas-vindas você
escolhe o tipo de negócio, dá um nome a ele e decide se quer começar com **12
meses de operação fictícia** (gerada de forma determinística — os gráficos não
mudam a cada recarregamento) ou com o workspace vazio.

Um workspace novo nunca é preenchido sem você pedir: encher a conta de alguém
com dados fictícios por conta própria não é aceitável num produto de verdade. Em
**Configurações › Dados** dá para recarregar o exemplo (útil ao trocar de
segmento) ou apagar tudo a qualquer momento.

## Contas e isolamento de dados

BASE é multi-inquilino: **cada conta tem o próprio workspace**, invisível para
todas as outras. O login usa **Firebase Authentication** — e-mail/senha (com
recuperação por e-mail), **Google** e **convidado** (sessão anônima, com
workspace próprio e descartável).

O botão do Google só aparece quando o Firebase está configurado: oferecer um
login que não tem como funcionar é pior do que não oferecer. Quando ele não
aparece, **um aviso ocupa o lugar dele** dizendo o que falta — um botão que
some sem explicação parece defeito, e a causa quase sempre é a mesma: as
chaves `NEXT_PUBLIC_FIREBASE_*` não entraram no build.

```
usuarios/{uid}                    perfil + configurações do workspace
usuarios/{uid}/clientes/…
usuarios/{uid}/servicos/…
usuarios/{uid}/profissionais/…
usuarios/{uid}/atendimentos/…
usuarios/{uid}/transacoes/…
```

O isolamento é garantido pelas **regras do Firestore**, não pelo cliente: a regra
casa o `uid` do caminho com o da sessão, então nem um app adulterado nem uma
chamada direta à API alcançam dados de outra conta. Qualquer caminho fora desse
modelo é negado por padrão.

Isso é testável — e testado:

```bash
npm run test:rules
```

Sobe o emulador do Firestore e verifica 14 cenários: o dono lê e escreve o que é
dele, outra conta não lê/lista/escreve/apaga nada alheio, sessão anônima não
acessa nada, e caminhos fora do modelo são negados.

### Modo demonstração (sem Firebase)

Sem as variáveis de ambiente, a sessão fica no navegador e cada conta local tem
as próprias chaves no `localStorage` (`base:{conta}:atendimentos`, …) — duas
contas no mesmo navegador não se enxergam. A tela de login avisa, com todas as
letras, que ali não há proteção real: um cadeado que não tranca é pior do que
nenhum. Serve para avaliar o produto inteiro sem infraestrutura.

### Configurando o Firebase

1. Crie um projeto em [console.firebase.google.com](https://console.firebase.google.com).
2. Ative o **Firestore Database** (modo produção).
3. Em **Build › Authentication › Sign-in method**, ative **E-mail/senha**,
   **Google** e **Anônimo** (este último para o botão "Entrar como convidado").
   Em **Authentication › Settings › Authorized domains**, inclua o domínio onde
   o app é publicado — sem isso o login com Google é recusado.
4. Em **Configurações do projeto › Geral › Seus apps**, crie um app Web e copie as
   chaves do `firebaseConfig`.
5. Copie `.env.local.example` para `.env.local` e preencha com essas chaves:

   ```bash
   cp .env.local.example .env.local
   ```

6. Publique as regras de `firestore.rules` (aba **Regras** do Firestore, ou
   `firebase deploy --only firestore:rules`). Elas liberam leitura e escrita apenas
   para sessões autenticadas, coleção por coleção.
7. Reinicie o `npm run dev`. Ao criar a conta, a tela de boas-vindas monta o
   workspace em `usuarios/{uid}` com o segmento escolhido.

Se as variáveis não forem definidas, o app continua no modo local sem erros.

## Deploy

O app é um **export estático** (`output: "export"` no `next.config.ts`): não há
rotas de API, server actions nem imagens otimizadas, então `npm run build` gera a
pasta `out/` com HTML, CSS e JS prontos para qualquer CDN.

### Cloudflare Workers

O `wrangler.jsonc` do repositório configura um Worker **só de assets**, apontando
para `out/`:

```bash
npm run preview   # build + wrangler dev (pré-visualização local)
npm run deploy    # build + wrangler deploy
```

Se você publicar pelo painel do Cloudflare (Workers Builds), use:

| Campo | Valor |
|---|---|
| Comando de build | `npm run build` |
| Diretório de saída | `out` |

> **As variáveis do Firebase são embutidas no build, não lidas em runtime.**
> Por serem `NEXT_PUBLIC_*`, o Next as substitui no bundle durante `next build`.
> No Cloudflare elas precisam estar como **variáveis de build**, não como
> secrets do Worker — configuradas só em runtime, o app sobe em modo local e
> nada é gravado no Firestore.

Sem um servidor, um Worker configurado para executar código Next não tem o que
rodar e responde `Internal Server Error` — é para isso que serve a configuração
de assets acima.

## Estrutura

```
src/
  app/
    entrar/             tela de acesso (superfície da marca, fora do chrome do app)
    …                   uma rota por tela (App Router, componentes de cliente)
  components/
    BaseLogo.tsx        marca: selo, símbolo e assinatura
    Onboarding.tsx      configuração inicial do workspace
    …                   primitivos de UI, indicadores e chrome dos gráficos
  lib/
    auth-context.tsx    sessão: Firebase Auth ou perfil local
    types.ts            modelo de domínio (genérico entre segmentos)
    segments.ts         presets de negócio: rótulos, catálogos, categorias
    finance.ts          motor financeiro: resumo, DRE, aging, projeção, comissões
    periodo.ts          presets de período e comparação com o anterior
    demo-data.ts        gerador determinístico da base de demonstração
    data-context.tsx    camada de dados por conta (localStorage ou Firestore)
tests/
  firestore-rules.test.mjs   isolamento entre contas, contra o emulador
```
