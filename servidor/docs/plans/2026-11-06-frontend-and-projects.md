# Plano de Implementação: Frontend React e Agrupamento por Projetos

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o módulo de agrupamento de chats por Projetos no backend e construir o frontend completo em React + Vite + Tailwind CSS executando em container Nginx via Docker Compose.

**Architecture:** O sistema adota arquitetura monorepo em `plataforma_ollama/servidor`. O backend adiciona a tabela `projects` e endpoints REST para CRUD de projetos e filtragem de conversas. O frontend em React + TypeScript consome a API REST, gerencia autenticação JWT, organiza chats em pastas/projetos colapsáveis, oferece seletor de modelos do Ollama e renderiza mensagens em Markdown com realce de sintaxe. Um container Nginx serve o build estático do frontend na porta 8080.

**Tech Stack:**
- **Backend:** Node.js 20, Express 5, TypeScript, PostgreSQL (pg), Zod, Vitest.
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide React, React Markdown, Rehype Highlight.
- **Infraestrutura:** Docker, Docker Compose, Nginx Alpine.

---

## Global Constraints

- Manter compatibilidade com PostgreSQL e modo de desenvolvimento offline em memória.
- Todos os endpoints protegidos devem validar o token JWT emitido no login.
- O frontend deve ser responsivo (desktop e mobile).
- O build final do frontend deve rodar isolado em container Nginx sem expor ferramentas de build.
- Manter 100% dos testes automatizados do backend passando.

---

## Tasks

### Task 1: Backend - Módulo de Projetos (Banco de Dados, Schemas e Serviços)

**Files:**
- Modify: `servidor/supabase/migrations/20261106_create_chat_tables.sql`
- Create: `servidor/backend/src/schemas/project.schema.ts`
- Create: `servidor/backend/src/services/project.service.ts`
- Modify: `servidor/backend/src/types/index.ts`
- Modify: `servidor/backend/src/services/conversation.service.ts`

- [x] Atualizar migration SQL adicionando a tabela `public.projects` e a coluna `project_id` em `public.conversations`.
- [x] Definir tipos `Project`, `CreateProjectInput`, `UpdateProjectInput` em `src/types/index.ts`.
- [x] Criar schemas Zod em `src/schemas/project.schema.ts` para validação de entrada.
- [x] Implementar `ProjectService` com suporte a `PostgresProjectRepository` e `InMemoryProjectRepository`.
- [x] Atualizar `ConversationService` para suportar atribuição de `project_id` na criação e filtragem por projeto na listagem.

---

### Task 2: Backend - Controllers, Rotas e Testes Automatizados de Projetos

**Files:**
- Create: `servidor/backend/src/controllers/project.controller.ts`
- Create: `servidor/backend/src/routes/project.routes.ts`
- Modify: `servidor/backend/src/app.ts`
- Create: `servidor/backend/tests/project.test.ts`

- [x] Criar `ProjectController` com métodos `create`, `list`, `getById`, `update`, `delete`.
- [x] Criar `project.routes.ts` com proteção de `authMiddleware` e registrar em `app.ts` sob `/api/projects`.
- [x] Escrever suíte de testes em `tests/project.test.ts` validando criação, listagem, atualização, exclusão e isolamento entre usuários.
- [x] Executar `npm test` e `npm run build` garantindo 100% de aprovação.

---

### Task 3: Frontend - Scaffolding do Projeto Vite + React + Tailwind CSS

**Files:**
- Create: `servidor/frontend/package.json`
- Create: `servidor/frontend/vite.config.ts`
- Create: `servidor/frontend/tsconfig.json`
- Create: `servidor/frontend/tailwind.config.js`
- Create: `servidor/frontend/postcss.config.js`
- Create: `servidor/frontend/index.html`
- Create: `servidor/frontend/src/main.tsx`
- Create: `servidor/frontend/src/index.css`

- [x] Inicializar estrutura do frontend com React 18, TypeScript, Tailwind CSS e Lucide Icons.
- [x] Configurar proxy no Vite para encaminhar requisições `/api` para `http://localhost:3000` em dev.
- [x] Instalar dependências e validar build de teste com `npm run build`.

---

### Task 4: Frontend - Camada de Serviços, Contexto de Autenticação e Telas de Auth

**Files:**
- Create: `servidor/frontend/src/types/index.ts`
- Create: `servidor/frontend/src/services/api.ts`
- Create: `servidor/frontend/src/context/AuthContext.tsx`
- Create: `servidor/frontend/src/pages/LoginPage.tsx`
- Create: `servidor/frontend/src/pages/RegisterPage.tsx`

- [x] Criar cliente HTTP com interceptor para injetar cabeçalho `Authorization: Bearer <token>` e tratar 401.
- [x] Implementar `AuthContext` com métodos `login`, `register`, `logout` e recuperação de sessão salva.
- [x] Criar componentes de tela `LoginPage` e `RegisterPage` com design profissional, validação de campos e feedback visual de erros.

---

### Task 5: Frontend - Barra Lateral com Agrupamento por Projetos e Gestão de Chats

**Files:**
- Create: `servidor/frontend/src/components/Sidebar.tsx`
- Create: `servidor/frontend/src/components/ProjectModal.tsx`
- Create: `servidor/frontend/src/components/RenameModal.tsx`

- [x] Implementar Sidebar com lista colapsável de Projetos e seus respectivos chats.
- [x] Implementar seção para Chats Gerais (sem projeto).
- [x] Criar botões e modais para:
  - Criar novo projeto (com escolha de cor/nome).
  - Criar novo chat dentro do projeto selecionado ou na raiz.
  - Renomear e excluir projeto/chat.
- [x] Adicionar rodapé com perfil do usuário logado e botão de Logout.

---

### Task 6: Frontend - Cabeçalho, Seletor de Modelos e Área de Mensagens com Markdown

**Files:**
- Create: `servidor/frontend/src/components/Header.tsx`
- Create: `servidor/frontend/src/components/ChatArea.tsx`
- Create: `servidor/frontend/src/components/MessageItem.tsx`
- Create: `servidor/frontend/src/components/ChatInput.tsx`
- Create: `servidor/frontend/src/pages/ChatDashboard.tsx`
- Modify: `servidor/frontend/src/App.tsx`

- [x] Criar `Header` com dropdown para seleção dinâmica de modelos (`qwen2.5:3b`, `deepseek-r1:14b`).
- [x] Implementar `ChatArea` com renderização de balões de mensagens em ordem cronológica.
- [x] Implementar `MessageItem` com renderização de Markdown, tabelas, blocos de código com destaque de sintaxe e botão de copiar código.
- [x] Implementar `ChatInput` com auto-resize de textarea, envio via tecla Enter e indicador visual de carregamento ("IA pensando...").
- [x] Integrar tudo no `ChatDashboard` e no componente principal `App.tsx`.

---

### Task 7: Dockerização do Frontend e Atualização do Docker Compose

**Files:**
- Create: `servidor/frontend/Dockerfile`
- Create: `servidor/frontend/nginx.conf`
- Modify: `servidor/docker-compose.yml`
- Modify: `servidor/.env.example`
- Modify: `servidor/README.md`

- [x] Criar `Dockerfile` multi-stage para o frontend (builder Node.js -> runtime Nginx Alpine).
- [x] Criar `nginx.conf` configurando SPA fallback (`try_files $uri /index.html;`) e gzip.
- [x] Adicionar serviço `frontend` no `docker-compose.yml` mapeando porta `8080:80` e conectado à rede `ia-interna`.
- [x] Atualizar `.env.example` e documentação com instruções de build e execução.

---

### Task 8: Testes Finais, Auditoria de Integração e Commit no Git

**Files:**
- All modified and new files.

- [x] Executar suíte completa de testes no backend (`npm test`).
- [x] Executar build de produção do backend (`npm run build`).
- [x] Executar build de produção do frontend (`npm run build`).
- [x] Atualizar repositório Git com commit bem estruturado e enviar para o GitHub (`git push`).

