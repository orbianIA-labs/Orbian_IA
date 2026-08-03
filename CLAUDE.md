# Orbian IA (frontend) — contexto do produto

Frontend do Orbian, plataforma SaaS jurídica. React 19 + TypeScript + Vite, TanStack Query, react-hook-form + zod, react-router-dom (`HashRouter`), editor Tiptap (`OrbianEditor.tsx`).
Repo irmão do backend: `Orbian_API` (.NET 10 minimal API + Postgres), que tem seu próprio `CLAUDE.md`.

## Navegação e modelo de dados (cliente-first)

**Clientes** é o item principal de navegação (não "Casos"). Fluxo: cadastra-se um **Cliente**, dentro dele cadastram-se os **Casos**. `NewCasePage` aceita `?clienteId=&clienteNome=` para vir pré-preenchido a partir de um cliente já existente, e também faz **smart-prefill** automático (tribunal/vara/UF/área/honorários) a partir do caso mais recente daquele cliente.

Páginas (`src/pages/`): `clientes` (list/detail/new), `cases` (detail, new — a lista antiga `CasesPage` foi removida, Clientes é a tela principal agora), `documentos`, `pecas`, `biblioteca` (modelos de peças), `dashboard`, `profile` (Configurações — seção de IA foi removida daqui), `admin`, `auth`.

## Pipeline do caso

`EtapaPipeline` (`types/domain.types.ts`) e o array `PIPELINE` (`lib/pipeline.ts`): `cadastro → documentos → pecas → prazos → encerramento`. O enum ainda tem `revisao`/`protocolo`/`atualizacoes` por compatibilidade, mas **a tela de Revisão foi removida do fluxo** — ao terminar de gerar uma peça, o usuário volta direto pro workspace do caso, não passa por revisão.

O stepper horizontal é um componente compartilhado, `components/case/PipelineStepper.tsx`, usado de forma idêntica em `CaseDetailPage`, `DocumentosPage` e `PecasPage` (stage head + progresso% + dots numerados + setas prev/next + botão de avançar opcional). Ao mexer no pipeline, mexer nesse componente, não duplicar.

`CaseDetailPage.tsx` tem 3 grandes branches de render: workspace padrão (novo layout, ver abaixo), `revisao`/`encerramento` (telas antigas, elaboradas, **intocadas**), e `arquivadoManualmente`.

## Workspace do caso (layout novo)

Grid com: header (breadcrumb, badge de status, metadados do caso), stepper, coluna "Peça" (preview + botão "Abrir Editor", **não** editor embutido), coluna central "Timeline do Caso" (cronológica ascendente: criação, documento, peça, prazo, andamento), coluna "Prazos" (lista + adicionar/editar), barra de ações inferior (Gerar Peça, Adicionar Documento, Registrar Andamento, Atualizar Prazo, Compartilhar Resumo).

A tela do caso **não tem scroll externo**: `.page-shell:has(> .workspace-layout)` zera padding/overflow do wrapper genérico, e só os painéis internos (Timeline, Prazos) rolam via `flex:1; min-height:0; overflow-y:auto`. Esse padrão (`:has()` pra full-bleed) também é usado em `.pecas-page-shell` — reaproveitar em vez de reinventar se aparecer outra tela cheia.

## Fonte

Sistema de tipografia usa `@fontsource/geist-sans` + `@fontsource/geist-mono` (self-hosted, sem CDN). Nomes reais no CSS: `"Geist Sans"` e `"Geist Mono"` (não é só `"Geist"`).
- `--font-head` (títulos) → Geist 600
- `--font-body` (texto) → Geist 400
- `--font-ui` (menus/botões/labels) → Geist 500
- `--font-mono` (nº de processo, IDs, códigos) → Geist Mono

## Documentos

Drag-and-drop de arquivos direto do explorador pra área de documentos (workspace e `DocumentosPage`). Persistência real no backend (bytea no Postgres, não é mock).

## Exclusão de cliente

`ConfirmDialog` (genérico, `components/ui/`) + `ResolverClienteComCasosDialog` (aparece quando o backend recusa a exclusão por caso ativo — oferece "Transferir casos" via `ClienteCombobox` pesquisável, ou "Excluir mesmo assim") — usados em `ClientesPage` e `ClienteDetailPage`, mesmo padrão nos dois lugares. `lib/validators.ts` replica no frontend a validação de CPF/CNPJ (checksum)/telefone/e-mail que o backend também faz, pra dar erro inline antes de bater na API.

## Auto-save do Novo Caso

`NewCasePage` salva rascunho em dois níveis: localStorage (debounce ~500ms, sobrevive a F5 e queda de internet porque não depende do backend) + sincronização silenciosa com o servidor (debounce ~2.5s, best-effort — ignora erro se estiver offline, tenta de novo na próxima digitação). Chave `orbian:new-case-draft:{clienteId ?? 'anon'}`, restaurada ao abrir a tela e limpa ao submeter o caso com sucesso.

## Peças — citação de lei/jurisprudência

Quando a IA insere lei/jurisprudência/súmula, o trecho citado vem envolvido em `<span class="peca-destaque">` — CSS é só `display:block; margin:14px 3ch` (bloco recuado dos dois lados, **sem** mudar cor/borda). A regra vive no prompt do backend (`PecasService.EditarPecaComIaAsync`), não no frontend.

## Cuidado / débito conhecido

O painel "ORBIAN IA INSIGHTS" em `NewCasePage` hoje só faz validação client-side (regex de CNJ, dígito de CPF/CNPJ) — **não é IA de verdade**, apesar do nome. Pendente: avaliar integrações reais (LLM, API do CNJ/DataJud, validação Receita Federal, OCR) antes de vender isso como feature de IA. Ver decisão do usuário: não inventar/fingir dado ou IA — ou implementa de verdade ou é honesto sobre o que é.

## Disciplina de testes locais (E2E manual)

Sempre conta de teste descartável (`qa.*@orbian.local`), backend local (porta 8081, modo Development), Vite dev server local (porta 5173). Ao final, apagar dados de teste e parar servidores. Usar as ferramentas de browser (`preview_start`, `read_page`, etc.) para verificar visualmente antes de reportar como concluído — nunca assumir que UI funciona só porque compilou.

## Infra/deploy

Ver `CLAUDE.md` do backend para detalhes completos de GCP/Supabase/Vercel. Resumo: PROD serve em `app.orbianlegal.com.br` (Cloud Run + Nginx), HML em `hml.orbianlegal.com.br` (Vercel). `main` = PROD (trunk-based), qualquer outra branch dispara deploy de HML.
