# Monitoramento de Recursos do Servidor com Persistência Periódica e Gráfico de Linha em Tempo Real

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar coleta periódica a cada 5 minutos dos recursos do servidor (CPU, RAM, Disco) com persistência no PostgreSQL, endpoint para histórico de medições, leitura em tempo real a cada 10 segundos no frontend e visualização em gráfico de linha interativo com carga inicial das 5 últimas medições e visualizador de dados históricos completos.

**Architecture:**
- **PostgreSQL**: Tabela `public.server_metrics_history` com índices por data (`created_at DESC`), criada de forma idempotente em `initializeDatabase`.
- **Backend (Node.js/Express/TypeScript)**:
  - Serviço em background (`ServerMetricsCollector`) que executa a cada 5 minutos e registra snapshot dos recursos no banco ou memória.
  - Implementação em `PostgresAdminService` e `InMemoryAdminService` para `saveSystemResourceMetric` e `getSystemResourceHistory(limit, hours)`.
  - Endpoint `GET /api/admin/system-resources/history` protegido por autenticação e middleware de administrador.
- **Frontend (React/TypeScript/Tailwind CSS)**:
  - Atualização do polling de `/api/admin/system-resources` de 4s para 10s.
  - Inicialização ao abrir a aba "Recursos do Servidor" carregando as últimas 5 medidas (`limit=5`) do banco via `/api/admin/system-resources/history`.
  - Gráfico de linha vetorial interativo (SVG responsivo) com 3 séries temporais (CPU, Memória, Disco) com tooltips, linhas de grade de 0% a 100%, legenda com valores dinâmicos e suporte a deslizamento a cada 10 segundos.
  - Seção / Modal de visualização de histórico completo persistido com seletor de período (últimas 5 medidas, 1h, 6h, 24h, 7d), gráfico agregado e tabela detalhada.

**Tech Stack:** TypeScript, Node.js, Express, PostgreSQL, Vitest, React, Tailwind CSS, Lucide React.

---

### Task 1: Tabela no PostgreSQL e Tipos de Dados
- [x] Atualizar `servidor/backend/src/types/index.ts`:
  - Adicionar interface `SystemResourceHistoryEntry` e filtros.
- [x] Atualizar `servidor/backend/src/config/database.ts`:
  - Criar tabela `public.server_metrics_history` com colunas:
    - `id` (uuid PK)
    - `cpu_usage_percent` (numeric)
    - `cpu_cores` (integer)
    - `memory_total_bytes` (bigint)
    - `memory_used_bytes` (bigint)
    - `memory_usage_percent` (numeric)
    - `disk_total_bytes` (bigint)
    - `disk_used_bytes` (bigint)
    - `disk_usage_percent` (numeric)
    - `uptime_seconds` (bigint)
    - `created_at` (timestamptz default now())
  - Criar índice `idx_server_metrics_created_at` em `created_at DESC`.

### Task 2: Métodos de Persistência e Consulta no AdminService
- [x] Atualizar interface `IAdminService` em `servidor/backend/src/services/admin.service.ts`:
  - `saveSystemResourceMetric(data?: SystemResourcesResponse): Promise<SystemResourceHistoryEntry>`
  - `getSystemResourceHistory(limit?: number, hours?: number): Promise<SystemResourceHistoryEntry[]>`
- [x] Implementar em `PostgresAdminService`:
  - Insert na tabela `server_metrics_history`.
  - Query com paginação / filtro por período em `server_metrics_history`.
- [x] Implementar em `InMemoryAdminService`:
  - Armazenamento em array em memória (buffer circular com até 500 registros) para manter testes e ambiente sem Postgres funcionando perfeitamente.

### Task 3: Serviço Coletor em Background (A cada 5 minutos)
- [x] Criar `servidor/backend/src/services/metrics-collector.service.ts`:
  - Função `startMetricsCollector(intervalMs = 5 * 60 * 1000)`:
    - Executa uma medição inicial logo no boot.
    - Agenda execução a cada 5 minutos (`setInterval`).
    - Usa `.unref()` para não travar o processo Node.js.
  - Função `stopMetricsCollector()` para testes e graceful shutdown.
- [x] Integrar inicialização no `server.ts` e encerramento em `handleShutdown`.

### Task 4: Rota e Controller do Histórico de Recursos
- [x] Adicionar método `getSystemResourcesHistory` em `servidor/backend/src/controllers/admin.controller.ts`:
  - Extrai `limit` (default 5, max 1000) e `hours` (opcional) de `req.query`.
  - Retorna `status: "success"` com `history: SystemResourceHistoryEntry[]`.
- [x] Adicionar rota `GET /api/admin/system-resources/history` em `servidor/backend/src/routes/admin.routes.ts`.
- [x] Atualizar testes em `servidor/backend/tests/admin.test.ts`:
  - Testar retorno da rota de histórico.
  - Testar salvamento e recuperação de histórico de recursos.

### Task 5: Integração da API no Frontend
- [x] Atualizar `servidor/frontend/src/services/api.ts`:
  - Adicionar tipagem `SystemResourceHistoryEntry`.
  - Adicionar método `api.admin.getSystemResourceHistory(limit?: number, hours?: number)`.

### Task 6: Gráfico de Linha Vetorial e Polling a cada 10 segundos
- [x] Criar componente reutilizável `servidor/frontend/src/components/ResourceLineChart.tsx`:
  - Gráfico responsivo em SVG com eixos Y (0% a 100%), gridlines, eixos X com horários.
  - Linhas suaves ou poligonais para CPU (azul/vermelho), Memória (roxo), Disco (âmbar).
  - Tooltip interativo ao passar o mouse com percentual exato e timestamp.
  - Legenda com botões para ativar/desativar séries.
- [x] Atualizar `servidor/frontend/src/pages/AdminDashboard.tsx`:
  - Alterar intervalo de polling de 4s para 10s (`10000ms`).
  - No `loadSystemResources` ou no mount da aba `resources`:
    - Chamar `api.admin.getSystemResourceHistory(5)` para puxar as últimas 5 medições (de 5 em 5 minutos) salvas no banco.
    - Alimentar o estado do gráfico com essas 5 medidas iniciais.
    - A cada 10 segundos, puxar o novo snapshot ao vivo de `api.admin.getSystemResources()` e adicionar novo ponto ao gráfico.
  - Adicionar botão e modal/seção "Acessar Histórico Completo do Banco":
    - Filtros de período (Últimas 5 medidas, 1 hora, 6 horas, 24 horas, 7 dias, Todos).
    - Gráfico do histórico persistido.
    - Tabela completa de registros gravados a cada 5 minutos.

### Task 7: Verificação, Build e Testes Automatizados
- [x] Executar suíte completa de testes no backend (`npm test`).
- [x] Executar compilação do frontend (`npm run build`).
- [x] Testar fluxo completo de inicialização, polling e gráfico.
