# Dashboard Financeiro

Sistema simples de controle financeiro e de pagamentos de consultas.

## Funcionalidades

- **Dashboard**: resumo de recebido, a receber, despesas e saldo, com gráficos de receitas x despesas e status das consultas.
- **Consultas**: cadastro de pacientes/consultas com valor, data, forma de pagamento e status (pago, pendente, atrasado).
- **Financeiro**: controle geral de receitas e despesas (aluguel, materiais, assinaturas etc.), separado das consultas.

Os dados ficam salvos no `localStorage` do navegador (protótipo sem backend). Uma próxima etapa é migrar a persistência para o Firebase.

## Rodando localmente

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000`.
