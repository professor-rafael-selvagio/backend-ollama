# Plano de Implementação: Tema Vermelho, Movimentação de Chats e Área do Usuário

> **Para executores agenticos:** SUB-HABILIDADE OBRIGATÓRIA: Use `superpowers:executing-plans` para implementar este plano tarefa por tarefa. Os passos utilizam a sintaxe de caixas de seleção (`- [ ]`) para rastreamento.

**Objetivo:** Adaptar a identidade visual da plataforma para o tema vermelho, permitir vincular e mover conversas ativas para projetos e implementar a área de perfil do usuário com visualização de dados cadastrais e troca de senha.

**Arquitetura:** 
1. **Backend:** Endpoint autenticado `POST /api/auth/change-password` com validação de senha atual via bcrypt e atualização no PostgreSQL/InMemory, coberto por testes unitários e de integração no Vitest.
2. **Frontend Styling:** Reconfiguração das variáveis de cores da marca em `tailwind.config.js` para tons de vermelho/rose, ajustando gradientes e elementos visuais nos componentes.
3. **Frontend Features:** Componente modal `UserProfileModal.tsx` acessível pelo rodapé da Sidebar, sincronização aprimorada no `RenameModal.tsx` e atalho de movimentação de projeto no `Header.tsx`.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Lucide Icons, Express 5, PostgreSQL (`pg`), bcryptjs, Vitest, Vite.

---

## Estrutura de Arquivos

### Backend
- Modificar: `servidor/backend/src/schemas/auth.schema.ts` (schema de troca de senha)
- Modificar: `servidor/backend/src/services/auth.service.ts` (método `changePassword`)
- Modificar: `servidor/backend/src/controllers/auth.controller.ts` (handler `changePassword`)
- Modificar: `servidor/backend/src/routes/auth.routes.ts` (rota `POST /change-password`)
- Testes: `servidor/backend/tests/auth.test.ts` (testes de troca de senha com sucesso e senhas incorretas)

### Frontend
- Modificar: `servidor/frontend/tailwind.config.js` (tema de cores vermelho)
- Modificar: `servidor/frontend/src/services/api.ts` (método `auth.changePassword`)
- Criar: `servidor/frontend/src/components/UserProfileModal.tsx` (área do usuário e troca de senha)
- Modificar: `servidor/frontend/src/components/RenameModal.tsx` (sincronização do chat selecionado)
- Modificar: `servidor/frontend/src/components/Header.tsx` (seletor/indicador para mover projeto diretamente)
- Modificar: `servidor/frontend/src/components/Sidebar.tsx` (gatilho de abertura do modal de perfil e tema vermelho)
- Modificar: `servidor/frontend/src/components/ChatArea.tsx` (gradientes e botões no tema vermelho)
- Modificar: `servidor/frontend/src/components/MessageItem.tsx` (avatares e elementos no tema vermelho)
- Modificar: `servidor/frontend/src/pages/ChatDashboard.tsx` (estados e integração do modal de usuário)
- Modificar: `servidor/frontend/src/pages/LoginPage.tsx` e `RegisterPage.tsx` (tema vermelho)

---

## Tarefas

### Tarefa 1: Backend - Endpoint de Troca de Senha (`POST /api/auth/change-password`)

**Arquivos:**
- Modificar: `servidor/backend/src/schemas/auth.schema.ts`
- Modificar: `servidor/backend/src/services/auth.service.ts`
- Modificar: `servidor/backend/src/controllers/auth.controller.ts`
- Modificar: `servidor/backend/src/routes/auth.routes.ts`
- Testar: `servidor/backend/tests/auth.test.ts`

- [ ] **Passo 1: Escrever teste automatizado para troca de senha no `tests/auth.test.ts`**
  - Testar sucesso na troca de senha com senha atual correta.
  - Testar rejeição com 401 quando senha atual estiver incorreta.
  - Testar rejeição com 400 para nova senha com menos de 6 caracteres.
- [ ] **Passo 2: Rodar teste para verificar falha (Red)**
- [ ] **Passo 3: Implementar `changePasswordSchema` em `auth.schema.ts`**
- [ ] **Passo 4: Implementar `changePassword` em `auth.service.ts` (`PostgresAuthService` e `InMemoryAuthService`)**
- [ ] **Passo 5: Implementar `authController.changePassword` e plugar rota em `auth.routes.ts`**
- [ ] **Passo 6: Rodar testes para verificar sucesso (Green)**
- [ ] **Passo 7: Commit das alterações do backend**

---

### Tarefa 2: Frontend - Tema Vermelho nos Componentes e Tailwind

**Arquivos:**
- Modificar: `servidor/frontend/tailwind.config.js`
- Modificar: `servidor/frontend/src/components/ChatArea.tsx`
- Modificar: `servidor/frontend/src/components/MessageItem.tsx`
- Modificar: `servidor/frontend/src/components/Sidebar.tsx`
- Modificar: `servidor/frontend/src/pages/LoginPage.tsx`
- Modificar: `servidor/frontend/src/pages/RegisterPage.tsx`

- [ ] **Passo 1: Atualizar paleta de cores `brand` no `tailwind.config.js` para tons de vermelho/rose**
  - `brand-500: #ef4444`, `brand-600: #dc2626`, `brand-700: #b91c1c`, etc.
- [ ] **Passo 2: Substituir gradientes `from-brand-600 to-emerald-400` para `from-red-600 to-rose-400` em `ChatArea`, `MessageItem` e `Sidebar`**
- [ ] **Passo 3: Validar e ajustar ícones e sombras nos formulários de Login e Registro**
- [ ] **Passo 4: Executar build do frontend para confirmar conformidade visual e ausência de erros**
- [ ] **Passo 5: Commit do tema visual vermelho**

---

### Tarefa 3: Frontend - Mover Chat Iniciado para Projeto

**Arquivos:**
- Modificar: `servidor/frontend/src/components/RenameModal.tsx`
- Modificar: `servidor/frontend/src/components/Header.tsx`
- Modificar: `servidor/frontend/src/pages/ChatDashboard.tsx`

- [ ] **Passo 1: Corrigir `RenameModal.tsx` para sincronizar estado interno via `useEffect` sempre que a prop `conversation` for alterada**
- [ ] **Passo 2: Adicionar botão de movimentação rápida de projeto no `Header.tsx` para o chat ativo**
- [ ] **Passo 3: Conectar a ação de alteração de projeto no `ChatDashboard.tsx` atualizando a lista de conversas e o chat atual**
- [ ] **Passo 4: Commit da funcionalidade de movimentação de chat**

---

### Tarefa 4: Frontend - Área do Usuário e Troca de Senha

**Arquivos:**
- Modificar: `servidor/frontend/src/services/api.ts`
- Criar: `servidor/frontend/src/components/UserProfileModal.tsx`
- Modificar: `servidor/frontend/src/components/Sidebar.tsx`
- Modificar: `servidor/frontend/src/pages/ChatDashboard.tsx`

- [ ] **Passo 1: Adicionar chamada de API `auth.changePassword(currentPassword, newPassword)` em `api.ts`**
- [ ] **Passo 2: Criar componente `UserProfileModal.tsx` com exibição de Nome, Email, Perfil e formulário com validações de troca de senha**
- [ ] **Passo 3: Conectar gatilho de abertura no rodapé do `Sidebar.tsx` (área do usuário)**
- [ ] **Passo 4: Integrar modal no `ChatDashboard.tsx`**
- [ ] **Passo 5: Commit da área do usuário**

---

### Tarefa 5: Validação Integral, Build e Publicação

- [ ] **Passo 1: Rodar todos os testes automatizados do backend (`npm test`)**
- [x] **Passo 1: Rodar suíte de testes automatizados do backend (`npm test`)**
- [x] **Passo 2: Rodar compilação do backend TypeScript (`npm run build`)**
- [x] **Passo 3: Rodar compilação do frontend Vite (`npm run build`)**
- [x] **Passo 4: Atualização de perfil de usuário com suporte a edição de nome e retorno de nome completo salvo**
- [x] **Passo 5: Aplicação do logotipo oficial SENAI no topo da barra lateral, telas de login, registro, tela inicial de chat e favicon**
- [x] **Passo 6: Enviar todas as alterações ao repositório GitHub (`origin main`)**

