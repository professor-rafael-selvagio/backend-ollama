# ==============================================================================
# ESTÁGIO 1: Compilação e Build
# ==============================================================================
FROM node:20-slim AS builder

WORKDIR /app

# Copia arquivos de manifesto
COPY package.json package-lock.json* ./

# Instalação limpa e reproduzível de todas as dependências
RUN npm ci

# Copia arquivos de configuração e código-fonte
COPY tsconfig.json ./
COPY src/ ./src/

# Executa compilação do TypeScript para JavaScript (dist/)
RUN npm run build

# Remove dependências de desenvolvimento para otimizar o tamanho final
RUN npm prune --production

# ==============================================================================
# ESTÁGIO 2: Imagem Final de Execução (Otimizada e Segura)
# ==============================================================================
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Criação de usuário não-root com permissões mínimas
RUN groupadd -g 10001 nodeuser && \
    useradd -u 10001 -g nodeuser -s /bin/sh -m nodeuser

# Copia manifestos, dependências de produção e código compilado
COPY --chown=nodeuser:nodeuser package.json package-lock.json* ./
COPY --chown=nodeuser:nodeuser --from=builder /app/node_modules ./node_modules
COPY --chown=nodeuser:nodeuser --from=builder /app/dist ./dist

# Alterna para o usuário não-root
USER nodeuser

# Expõe exclusivamente a porta do backend HTTP
EXPOSE 3000

# Healthcheck nativo em Node.js (sem depender de curl ou wget na imagem slim)
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 3000) + '/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Inicia o servidor com suporte a tratamento de sinais
CMD ["node", "dist/server.js"]

