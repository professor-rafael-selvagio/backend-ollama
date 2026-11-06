# Backend Seguro para Ollama

Backend independente, escalável e de alto desempenho construído em **Node.js 20**, **Express 5** e **TypeScript**, projetado para atuar como um gateway intermediário seguro entre aplicações frontend (ex: React) e o serviço de inteligência artificial **Ollama** executando em container Linux.

---

## 1. Descrição do Projeto

O objetivo deste projeto é fornecer uma camada de API controlada, segura e padronizada para inferência de modelos locais de Inteligência Artificial sem expor a porta interna do Ollama (11434) publicamente na internet.

O backend é responsável por:
- **Autenticação e Autorização:** Validação de tokens JWT através do Supabase Auth.
- **Validação Estrita:** Inspeção de tipos, tamanhos de entrada e schemas com **Zod**.
- **Defesa em Profundidade:** Proteção de cabeçalhos HTTP com **Helmet**, restrição de CORS e proteção contra ataques de DoS por meio de **Express Rate Limit**.
- **Controle de Modelos:** Whitelist configurável de modelos permitidos (`ALLOWED_MODELS`).
- **Resiliência e Observabilidade:** Logs estruturados com ofuscação de credenciais, timeouts gerenciados e tratamento centralizado de exceções.

---

## 2. Arquitetura do Sistema

```
                    +--------------------+
                    |   Frontend React   |
                    +---------+----------+
                              |
                              | HTTPS (porta 443)
                              v
                    +--------------------+
                    |   Nginx / Caddy    |
                    | (Reverse Proxy/SSL)|
                    +---------+----------+
                              |
                              | HTTP (porta 3000)
                              v
    +------------------------------------------------------+
    |              Container: ollama-backend               |
    |          (Node.js 20 + Express 5 + TS)               |
    |                                                      |
    |  - Helmet & CORS Configurado                         |
    |  - Rate Limiter (Geral e Específico para IA)         |
    |  - Supabase Auth JWT Verification                    |
    |  - Zod Schemas Validation (Prompt, Mensagens, Opções)|
    |  - Whitelist de Modelos (ALLOWED_MODELS)             |
    +-------------------------+----------------------------+
                              |
                              | Rede Docker Privada: ia-interna
                              | (http://ollama:11434)
                              v
    +------------------------------------------------------+
    |               Container: ollama                      |
    |          (Instalação Oficial do Ollama)              |
    |                                                      |
    |  - Modelos LLM: Llama 3, Mistral, Qwen, etc.         |
    |  - Porta 11434 NÃO exposta externamente             |
    +------------------------------------------------------+
```

---

## 3. Tecnologias Utilizadas

- **Runtime:** Node.js 20 LTS (imagem `node:20-slim`)
- **Framework Web:** Express 5 (`express@^5.0.1`)
- **Linguagem:** TypeScript 5.8+ com tipagem estrita
- **Validação de Dados:** Zod 3.24+
- **Segurança HTTP:** Helmet 8, CORS com verificação de whitelist
- **Controle de Tráfego:** Express Rate Limit 7
- **Autenticação:** Supabase Auth (`@supabase/supabase-js`)
- **Containerização:** Docker e Docker Compose
- **Testes Automatizados:** Vitest 3 + Supertest

---

## 4. Requisitos

### Para Desenvolvimento Local no Mac:
- **Node.js:** Versão 20 ou superior (`node -v`)
- **NPM:** Versão 9 ou superior (`npm -v`)
- **Git**

### Para Produção no Servidor Linux:
- **Docker Engine:** Versão 24 ou superior
- **Docker Compose:** Versão 2 ou superior
- **Rede Docker:** `ia-interna` criada previamente

---

## 5. Instalação Local

1. Navegue até a pasta do backend:
   ```bash
   cd servidor/backend
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Crie seu arquivo de variáveis de ambiente a partir do exemplo:
   ```bash
   cp ../.env.example ../.env
   ```

---

## 6. Configuração das Variáveis de Ambiente

Edite o arquivo `servidor/.env` conforme a sua necessidade:

| Variável | Padrão | Descrição |
| :--- | :--- | :--- |
| `NODE_ENV` | `development` | Ambiente de execução (`development`, `test`, `production`). |
| `PORT` | `3000` | Porta local onde o backend escuta requisições HTTP. |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | URL base do Ollama (em produção: `http://ollama:11434`). |
| `OLLAMA_TIMEOUT` | `120000` | Tempo limite para respostas do Ollama em ms (2 minutos). |
| `ALLOWED_ORIGINS` | `http://localhost:5173` | Origens autorizadas para CORS (separadas por vírgula). |
| `ALLOWED_MODELS` | *(vazio)* | Lista de modelos permitidos (ex: `llama3:8b,mistral:7b`). Se vazio, todos os instalados são permitidos. |
| `SUPABASE_URL` | *(opcional)* | URL do seu projeto no Supabase (ex: `https://xyz.supabase.co`). |
| `SUPABASE_ANON_KEY` | *(opcional)* | Chave pública anônima do Supabase para validação de JWT. |
| `REQUIRE_AUTH` | `false` | Se `true`, rejeita qualquer requisição sem token Bearer válido do Supabase. |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Janela de tempo do rate limit geral (1 minuto). |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Máximo de requisições gerais por IP por minuto. |
| `AI_RATE_LIMIT_WINDOW_MS` | `60000` | Janela de tempo para rotas de IA (1 minuto). |
| `AI_RATE_LIMIT_MAX_REQUESTS`| `20` | Máximo de gerações/chat de IA por IP por minuto. |

---

## 7. Execução em Desenvolvimento

### Iniciar o servidor local com hot-reload:
```bash
cd servidor/backend
npm run dev
```

O servidor iniciará em `http://localhost:3000`.

### Compilar TypeScript para produção localmente:
```bash
npm run build
npm start
```

---

## 8. Comandos Docker

A pasta `servidor/` contém o arquivo `docker-compose.yml` pronto para produção.

### 8.1. Construir a imagem local:
```bash
cd servidor
docker compose build
```

### 8.2. Subir o container em segundo plano:
```bash
docker compose up -d
```

### 8.3. Visualizar logs em tempo real:
```bash
docker compose logs -f backend
```

### 8.4. Verificar status e healthcheck do container:
```bash
docker compose ps
```

### 8.5. Parar o serviço:
```bash
docker compose down
```

---

## 9. Configuração da Rede Docker (`ia-interna`)

No servidor de produção, o Ollama e o backend comunicam-se de forma isolada pela rede `ia-interna`.

1. **Criar a rede no servidor (caso ainda não exista):**
   ```bash
   docker network create ia-interna
   ```

2. **Conectar o container Ollama existente à rede:**
   ```bash
   docker network connect --alias ollama ia-interna <NOME_DO_CONTAINER_OLLAMA>
   ```

3. **Verificar se os containers estão na mesma rede:**
   ```bash
   docker network inspect ia-interna
   ```

O parâmetro `--alias ollama` garante que o backend consiga resolver a rota `http://ollama:11434` mesmo se o container original tiver outro nome.

---

## 10. Integração com Ollama & Túnel SSH no Mac

Durante o desenvolvimento no Mac, você não precisa ter o Ollama instalado na sua máquina local:

1. **Abra um túnel SSH seguro com o servidor Linux:**
   ```bash
   ssh -L 11434:localhost:11434 usuario@ip_do_servidor
   ```
2. No seu arquivo `servidor/.env`, aponte para o túnel:
   ```env
   OLLAMA_BASE_URL=http://localhost:11434
   ```
3. O backend local enviará as requisições criptografadas pelo túnel diretamente para o Ollama remoto.

---

## 11. Configuração de Segurança

- **Proteção contra SSRF e Injeção de Modelos:**
  O schema Zod valida o nome do modelo com regex estrita (`/^(?:[a-zA-Z0-9_\-]+(?:\.[a-zA-Z0-9_\-]+)*\/)?[a-zA-Z0-9_\-]+(?::[a-zA-Z0-9_\.\-]+)?$/`), impedindo que atacantes passem URLs arbitrárias (`http://...`), caminhos de arquivo (`../`) ou caracteres de escape.
- **Whitelist Restrita (`ALLOWED_MODELS`):**
  Se a variável `ALLOWED_MODELS` estiver definida no `.env`, qualquer requisição solicitando modelos fora da lista é sumariamente bloqueada com **403 Forbidden**.
- **Autenticação Real com Supabase Auth:**
  O middleware extrai o token `Bearer <jwt>` e valida sua integridade e expiração diretamente com o método `supabase.auth.getUser(token)`. Tokens forjados são rejeitados com **401 Unauthorized**.
- **Rate Limit Especializado para IA:**
  Gerações de IA consomem recursos pesados de GPU/CPU. Rotas `/generate` e `/chat` contam com limitador estrito para evitar exaustão de hardware.
- **Ocultação de Informações Sensíveis:**
  O logger estruturado ofusca automaticamente tokens, senhas e headers `Authorization`. Em ambiente `production`, stack traces de erros nunca são retornados ao cliente.

---

## 12. Testes Automatizados

O projeto conta com uma suíte de testes de unidade e integração utilizando **Vitest** e **Supertest**, simulando cenários reais e mocks de resposta:

```bash
cd servidor/backend
npm test
```

### Cenários validados pelos testes:
- `GET /health`: Funcionamento e ausência de vazamento de credenciais.
- `GET /api/ollama/status`: Status `200` quando disponível e `503` quando o Ollama estiver fora do ar.
- `GET /api/ollama/models`: Listagem filtrada de modelos.
- `POST /api/ollama/generate`: Validação de payloads válidos, prompts vazios e bloqueio de SSRF.
- `POST /api/ollama/chat`: Validação de histórico de mensagens, papéis permitidos e geração.
- `ALLOWED_MODELS`: Bloqueio 403 para modelos não autorizados.
- `Timeout`: Disparo de erro 504 quando o Ollama excede o tempo limite.
- `Rate Limiting`: Disparo de status 429 após excesso de requisições.
- `Autenticação`: Bloqueio 401 para tokens ausentes ou inválidos.
- `Tratamento 404`: Respostas padronizadas para rotas inexistentes.

---

## 13. Deploy no Servidor Linux

Para implantar no servidor de produção:

1. Transfira a pasta `servidor/` para o servidor (via git, rsync ou scp):
   ```bash
   rsync -avz --exclude 'node_modules' --exclude 'dist' ./servidor usuario@servidor:/opt/servidor
   ```
2. Conecte-se via SSH ao servidor:
   ```bash
   ssh usuario@servidor
   cd /opt/servidor
   ```
3. Crie o arquivo `.env` de produção:
   ```bash
   cp .env.example .env
   ```
   Configure no `.env`:
   ```env
   NODE_ENV=production
   PORT=3000
   OLLAMA_BASE_URL=http://ollama:11434
   ALLOWED_ORIGINS=https://meuapp.com.br
   REQUIRE_AUTH=true
   SUPABASE_URL=https://meu-projeto.supabase.co
   SUPABASE_ANON_KEY=minha-chave-supabase
   ALLOWED_MODELS=llama3:8b,mistral:7b
   ```
4. Verifique a rede `ia-interna` e o container do Ollama:
   ```bash
   docker network create ia-interna 2>/dev/null || true
   docker network connect --alias ollama ia-interna <NOME_DO_CONTAINER_OLLAMA> 2>/dev/null || true
   ```
5. Suba o container com Docker Compose:
   ```bash
   docker compose up -d --build
   ```
6. Verifique o status da aplicação:
   ```bash
   docker compose ps
   curl http://localhost:3000/health
   ```

---

## 14. Exemplos de Requisições com cURL

### 14.1. Cadastro de Usuário (`POST /api/auth/register`):
Permite criar novas contas de usuário diretamente pelo backend:
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "aluno@escola.com",
    "password": "senhaSegura123",
    "name": "Aluno Exemplo"
  }'
```
**Resposta (201 Created):**
```json
{
  "status": "success",
  "message": "Usuário registrado com sucesso.",
  "data": {
    "user": {
      "id": "e4f5a6b7-8c9d-4e5f-a6b7-8c9d4e5fa6b7",
      "email": "aluno@escola.com",
      "name": "Aluno Exemplo",
      "role": "authenticated"
    },
    "session": {
      "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refresh_token": "rF8d7s6g...",
      "expires_in": 3600,
      "token_type": "Bearer"
    }
  }
}
```

### 14.2. Login de Usuário (`POST /api/auth/login`):
Autentica o usuário e retorna os tokens JWT de acesso:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "aluno@escola.com",
    "password": "senhaSegura123"
  }'
```
**Resposta (200 OK):**
```json
{
  "status": "success",
  "message": "Login realizado com sucesso.",
  "data": {
    "user": {
      "id": "e4f5a6b7-8c9d-4e5f-a6b7-8c9d4e5fa6b7",
      "email": "aluno@escola.com",
      "role": "authenticated"
    },
    "session": {
      "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refresh_token": "rF8d7s6g...",
      "expires_in": 3600,
      "token_type": "Bearer"
    }
  }
}
```

### 14.3. Renovação de Sessão (`POST /api/auth/refresh`):
```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "rF8d7s6g..."
  }'
```

### 14.4. Perfil do Usuário Logado (`GET /api/auth/me`):
```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer <SEU_TOKEN_JWT>"
```

### 14.5. Healthcheck:
```bash
curl -X GET http://localhost:3000/health
```
**Resposta (200 OK):**
```json
{
  "status": "ok",
  "service": "ollama-backend"
}
```

### 14.6. Status do Ollama:
```bash
curl -X GET http://localhost:3000/api/ollama/status
```
**Resposta (200 OK):**
```json
{
  "status": "ok",
  "available": true,
  "latencyMs": 14
}
```

### 14.7. Listar Modelos:
```bash
curl -X GET http://localhost:3000/api/ollama/models \
  -H "Authorization: Bearer <SEU_TOKEN_JWT>"
```
**Resposta (200 OK):**
```json
{
  "models": [
    {
      "name": "llama3:8b",
      "size": 4661224676
    }
  ],
  "total": 1
}
```

### 14.4. Geração de Texto (`/generate`):
```bash
curl -X POST http://localhost:3000/api/ollama/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <SEU_TOKEN_SUPABASE>" \
  -d '{
    "model": "llama3:8b",
    "prompt": "Explique o que é Docker em duas frases.",
    "options": {
      "temperature": 0.7,
      "num_predict": 150
    }
  }'
```

### 14.5. Conversação Chat (`/chat`):
```bash
curl -X POST http://localhost:3000/api/ollama/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <SEU_TOKEN_SUPABASE>" \
  -d '{
    "model": "llama3:8b",
    "messages": [
      {
        "role": "system",
        "content": "Você é um tutor técnico de desenvolvimento de software."
      },
      {
        "role": "user",
        "content": "Qual a diferença entre uma imagem e um container Docker?"
      }
    ],
    "options": {
      "temperature": 0.5
    }
  }'
```

### 14.6. Criar Novo Chat / Conversa (`POST /api/conversations`):
```bash
curl -X POST http://localhost:3000/api/conversations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <SEU_TOKEN_SUPABASE>" \
  -d '{
    "model": "llama3:8b",
    "title": "Dúvidas de Banco de Dados"
  }'
```
**Resposta (201 Created):**
```json
{
  "id": "e6a14d5f-4a02-4bb6-a810-77a82b9921e1",
  "user_id": "user-uuid",
  "title": "Dúvidas de Banco de Dados",
  "model": "llama3:8b",
  "created_at": "2026-11-06T14:00:00.000Z",
  "updated_at": "2026-11-06T14:00:00.000Z"
}
```

### 14.7. Listar Conversas do Usuário (`GET /api/conversations`):
```bash
curl -X GET http://localhost:3000/api/conversations \
  -H "Authorization: Bearer <SEU_TOKEN_SUPABASE>"
```
**Resposta (200 OK):**
```json
{
  "conversations": [
    {
      "id": "e6a14d5f-4a02-4bb6-a810-77a82b9921e1",
      "user_id": "user-uuid",
      "title": "Dúvidas de Banco de Dados",
      "model": "llama3:8b",
      "created_at": "2026-11-06T14:00:00.000Z",
      "updated_at": "2026-11-06T14:00:00.000Z"
    }
  ],
  "total": 1
}
```

### 14.8. Obter Histórico Completo de Mensagens (`GET /api/conversations/:id`):
```bash
curl -X GET http://localhost:3000/api/conversations/e6a14d5f-4a02-4bb6-a810-77a82b9921e1 \
  -H "Authorization: Bearer <SEU_TOKEN_SUPABASE>"
```
**Resposta (200 OK):**
```json
{
  "id": "e6a14d5f-4a02-4bb6-a810-77a82b9921e1",
  "user_id": "user-uuid",
  "title": "Dúvidas de Banco de Dados",
  "model": "llama3:8b",
  "created_at": "2026-11-06T14:00:00.000Z",
  "updated_at": "2026-11-06T14:05:00.000Z",
  "messages": [
    {
      "id": "msg-1",
      "role": "user",
      "content": "Como funciona uma chave estrangeira?",
      "created_at": "2026-11-06T14:04:50.000Z"
    },
    {
      "id": "msg-2",
      "role": "assistant",
      "content": "Uma chave estrangeira (Foreign Key) é uma coluna que referencia a chave primária de outra tabela...",
      "tokens": 48,
      "created_at": "2026-11-06T14:05:00.000Z"
    }
  ]
}
```

### 14.9. Enviar Mensagem no Chat e Salvar no Banco (`POST /api/conversations/:id/messages`):
Envia a dúvida do usuário, envia o contexto acumulado ao Ollama e **salva automaticamente tanto a pergunta quanto a resposta no banco de dados**:
```bash
curl -X POST http://localhost:3000/api/conversations/e6a14d5f-4a02-4bb6-a810-77a82b9921e1/messages \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <SEU_TOKEN_SUPABASE>" \
  -d '{
    "content": "Dê um exemplo prático em SQL."
  }'
```
**Resposta (200 OK):**
```json
{
  "userMessage": {
    "id": "msg-3",
    "conversation_id": "e6a14d5f-4a02-4bb6-a810-77a82b9921e1",
    "role": "user",
    "content": "Dê um exemplo prático em SQL.",
    "created_at": "2026-11-06T14:06:00.000Z"
  },
  "assistantMessage": {
    "id": "msg-4",
    "conversation_id": "e6a14d5f-4a02-4bb6-a810-77a82b9921e1",
    "role": "assistant",
    "content": "Aqui está um exemplo em SQL:\n\n```sql\nCREATE TABLE pedidos (...);\n```",
    "tokens": 52,
    "created_at": "2026-11-06T14:06:02.000Z"
  }
}
```

### 14.10. Renomear Título da Conversa (`PATCH /api/conversations/:id`):
```bash
curl -X PATCH http://localhost:3000/api/conversations/e6a14d5f-4a02-4bb6-a810-77a82b9921e1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <SEU_TOKEN_SUPABASE>" \
  -d '{
    "title": "Modelagem Relacional de Pedidos"
  }'
```

### 14.11. Excluir Conversa e Mensagens (`DELETE /api/conversations/:id`):
```bash
curl -X DELETE http://localhost:3000/api/conversations/e6a14d5f-4a02-4bb6-a810-77a82b9921e1 \
  -H "Authorization: Bearer <SEU_TOKEN_SUPABASE>"
```
**Resposta (200 OK):**
```json
{
  "success": true
}
```

---

## 15. Migração de Banco de Dados Supabase (PostgreSQL)

O arquivo de criação de tabelas e políticas de segurança RLS está pronto para execução:
📁 **[`servidor/supabase/migrations/20261106_create_chat_tables.sql`](file:///Users/rafael.selvagio/Projetos/MyApps/ProjetosServidorDidatico/backend_ollama/servidor/supabase/migrations/20261106_create_chat_tables.sql)**

Para executar:
1. Abra o painel do seu projeto no [Supabase Dashboard](https://supabase.com/dashboard).
2. Vá em **SQL Editor** -> **New Query**.
3. Cole o conteúdo de `servidor/supabase/migrations/20261106_create_chat_tables.sql` e execute (**Run**).
4. As tabelas `conversations` e `messages` serão criadas com índices de alta performance e Row Level Security (RLS) habilitado.

---

## 15. Solução de Problemas Comuns

### 1. `503 Service Unavailable: Não foi possível conectar ao container do Ollama`
- **Causa:** O backend não está conseguindo alcançar o Ollama no endereço `OLLAMA_BASE_URL`.
- **Solução:**
  - Em desenvolvimento local, certifique-se de que o túnel SSH está ativo (`ssh -L 11434:localhost:11434 ...`).
  - Em produção com Docker, verifique se ambos os containers estão conectados na rede `ia-interna`:
    ```bash
    docker network inspect ia-interna
    ```
  - Verifique se o container do Ollama possui o alias `ollama`:
    ```bash
    docker network connect --alias ollama ia-interna <NOME_DO_CONTAINER_OLLAMA>
    ```

### 2. `403 Forbidden: O modelo 'xyz' não está autorizado`
- **Causa:** O modelo solicitado não consta na variável `ALLOWED_MODELS` do `.env`.
- **Solução:** Adicione o modelo desejado à lista `ALLOWED_MODELS` no `.env` (ex: `ALLOWED_MODELS=llama3:8b,xyz`) ou deixe a variável vazia para permitir todos os modelos instalados.

### 3. `401 Unauthorized: Token de autenticação ausente ou formato inválido`
- **Causa:** A variável `REQUIRE_AUTH=true` está ativada e a requisição não enviou o cabeçalho `Authorization: Bearer <token>` ou o token JWT do Supabase expirou.
- **Solução:** Gere um novo token de acesso através do Supabase Auth ou desative temporariamente para testes locais configurando `REQUIRE_AUTH=false`.

### 4. `429 Too Many Requests: Limite de requisições excedido`
- **Causa:** O cliente enviou mais requisições do que o configurado em `AI_RATE_LIMIT_MAX_REQUESTS` ou `RATE_LIMIT_MAX_REQUESTS`.
- **Solução:** Ajuste os limites no arquivo `.env` para o volume esperado pela aplicação frontend.

