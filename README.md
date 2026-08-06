# Dashboard Financeiro

Sistema simples de controle financeiro e de pagamentos de consultas.

## Funcionalidades

- **Dashboard**: resumo de recebido, a receber, despesas e saldo, com gráficos de receitas x despesas e status das consultas.
- **Consultas**: cadastro de pacientes/consultas com valor, data, forma de pagamento e status (pago, pendente, atrasado).
- **Financeiro**: controle geral de receitas e despesas (aluguel, materiais, assinaturas etc.), separado das consultas.

Os dados são salvos no **Firebase (Firestore)** quando configurado. Sem configuração, o app funciona no modo offline/demo salvando tudo no `localStorage` do navegador — útil para testar sem depender de credenciais.

## Rodando localmente

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000`.

## Configurando o Firebase (persistência real)

1. Crie um projeto em [console.firebase.google.com](https://console.firebase.google.com).
2. No menu lateral, ative o **Firestore Database** (modo produção).
3. Ainda no menu, em **Build > Authentication > Sign-in method**, ative o provedor **Anônimo**. É só isso — não existe tela de login, o app se autentica sozinho em segundo plano apenas para liberar o acesso ao banco.
4. Em **Configurações do projeto > Geral > Seus apps**, crie um app Web e copie as chaves do `firebaseConfig`.
5. Copie `.env.local.example` para `.env.local` e preencha com essas chaves:

   ```bash
   cp .env.local.example .env.local
   ```

6. Publique as regras de segurança do arquivo `firestore.rules` deste repositório no Firestore (aba **Regras**, ou via Firebase CLI: `firebase deploy --only firestore:rules`). Elas liberam leitura/escrita apenas para quem estiver autenticado (mesmo que anonimamente).
7. Reinicie o `npm run dev`. Na primeira execução, o app cria as coleções `consultas` e `transacoes` no Firestore com os dados de exemplo.

Se as variáveis de ambiente não forem definidas, o app continua funcionando normalmente no modo local (`localStorage`), sem erros.
