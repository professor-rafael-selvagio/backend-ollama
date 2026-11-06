# Plataforma Ollama - Sistema Didático Full Stack

Plataforma completa e segura para interação com modelos locais de Inteligência Artificial via Ollama em servidor Linux.

O código da aplicação, configurações Docker e documentação completa estão localizados dentro do diretório:

📁 **[`servidor/`](file:///Users/rafael.selvagio/Projetos/MyApps/ProjetosServidorDidatico/plataforma_ollama/servidor)**

---

### Componentes da Plataforma:

1. **Frontend (`servidor/frontend`):**
   - Interface web moderna estilo ChatGPT / OpenWebUI construída em **React 18**, **TypeScript**, **Vite** e **Tailwind CSS**.
   - Agrupamento de conversas por **Projetos** (pastas com cores customizadas).
   - Seletor dinâmico de modelos de IA com verificação de status em tempo real.
   - Renderização rica de **Markdown** com realce de sintaxe em códigos e botão de copiar.
   - Container Nginx servindo a aplicação na porta `8080`.

2. **Backend (`servidor/backend`):**
   - API REST em **Node.js 20**, **Express 5** e **TypeScript**.
   - Autenticação JWT com senhas hasheadas via `bcrypt`.
   - Gerenciamento de projetos, chats e histórico de mensagens.
   - Segurança robusta: Helmet, CORS, Rate Limit e validação estrita com Zod.
   - Comunicação com o Ollama isolada na rede privada Docker `ia-interna`.

3. **Banco de Dados (`servidor/postgres`):**
   - PostgreSQL 16 com volume persistente para usuários, projetos, conversas e mensagens.

---

### Início Rápido:

```bash
# Executar o ecossistema completo com Docker Compose:
cd servidor
docker compose up -d --build

# Acessar a aplicação no navegador:
# Frontend Web: http://localhost:8080 (ou http://IP_DO_SERVIDOR:8080)
# Backend API:  http://localhost:3000
```

Consulte a documentação completa e detalhada em:
- [Documentação Geral da API e Deploy](file:///Users/rafael.selvagio/Projetos/MyApps/ProjetosServidorDidatico/plataforma_ollama/servidor/README.md)
- [Guia de Integração e Rede Docker do Ollama](file:///Users/rafael.selvagio/Projetos/MyApps/ProjetosServidorDidatico/plataforma_ollama/servidor/ollama/README.md)
