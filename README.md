# Dashboard Financeiro

Painel de gestão financeira para **empresas de serviços**. O mesmo sistema atende
uma clínica, um escritório de advocacia, uma consultoria, um salão, uma escola ou
um profissional autônomo: o **segmento** escolhido nas configurações troca o
vocabulário da interface e os presets de catálogo, categorias e centros de custo —
a lógica financeira é a mesma para todos.

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

Acesse `http://localhost:3000`. Na primeira execução o app gera **12 meses de
operação fictícia** para o segmento escolhido, de forma determinística — os
gráficos não mudam a cada recarregamento. Em **Configurações › Dados** você
recarrega o exemplo (útil ao trocar de segmento) ou começa do zero.

## Persistência

Sem configuração, tudo é salvo no `localStorage` do navegador — dá para avaliar o
sistema inteiro sem criar conta em lugar nenhum. Com o Firebase configurado, os
dados vão para o Firestore e sincronizam entre dispositivos.

### Configurando o Firebase

1. Crie um projeto em [console.firebase.google.com](https://console.firebase.google.com).
2. Ative o **Firestore Database** (modo produção).
3. Em **Build › Authentication › Sign-in method**, ative o provedor **Anônimo**.
   Não existe tela de login: o app se autentica sozinho em segundo plano apenas
   para liberar o acesso ao banco.
4. Em **Configurações do projeto › Geral › Seus apps**, crie um app Web e copie as
   chaves do `firebaseConfig`.
5. Copie `.env.local.example` para `.env.local` e preencha com essas chaves:

   ```bash
   cp .env.local.example .env.local
   ```

6. Publique as regras de `firestore.rules` (aba **Regras** do Firestore, ou
   `firebase deploy --only firestore:rules`). Elas liberam leitura e escrita apenas
   para sessões autenticadas, coleção por coleção.
7. Reinicie o `npm run dev`. As coleções `clientes`, `servicos`, `profissionais`,
   `atendimentos`, `transacoes` e o documento `configuracao/workspace` são criados
   na primeira execução.

Se as variáveis não forem definidas, o app continua no modo local sem erros.

## Estrutura

```
src/
  app/                  uma rota por tela (App Router, componentes de cliente)
  components/           primitivos de UI, cartões de indicador e chrome dos gráficos
  lib/
    types.ts            modelo de domínio (genérico entre segmentos)
    segments.ts         presets de negócio: rótulos, catálogos, categorias
    finance.ts          motor financeiro: resumo, DRE, aging, projeção, comissões
    periodo.ts          presets de período e comparação com o anterior
    demo-data.ts        gerador determinístico da base de demonstração
    data-context.tsx    camada de dados (localStorage ou Firestore)
```
