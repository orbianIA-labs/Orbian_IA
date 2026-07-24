# Lexio.IA Frontend

Frontend BETA da Lexio.IA, uma plataforma operacional juridica para advogados autonomos e pequenos escritorios.

## Stack

- React 19
- Vite
- TypeScript
- React Router
- TanStack Query
- Zustand
- Axios
- Zod + React Hook Form
- Tiptap

## Scripts

```bash
npm install
npm run dev
npm run build
npm run lint
```

## Fluxos cobertos na BETA

- Dashboard operacional com pecas e casos recentes
- Casos: listagem, detalhe e cadastro validado com Zod
- Pecas: biblioteca de templates, wizard inicial e editor Tiptap
- Clientes: mensagens prontas para comunicacao
- Billing: planos Free, Solo e Pro
- LGPD: consentimento tecnico e pagina de dados do usuario

## Seguranca

- Access token mantido apenas em memoria via Zustand
- Refresh token esperado como cookie httpOnly no backend
- Axios configurado com `withCredentials`
- Nenhuma chamada direta a APIs de IA no frontend
- Dados sensiveis e IA devem passar exclusivamente pela API .NET
