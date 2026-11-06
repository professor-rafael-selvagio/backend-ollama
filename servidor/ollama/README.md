# Documentação e Integração com o Container Ollama

Esta pasta é reservada exclusivamente para documentação, comandos de referência e configurações auxiliares de integração com o serviço Ollama.

> ⚠️ **IMPORTANTE:**
> - **Não instale** uma segunda instância do Ollama aqui.
> - O container do Ollama **já está em execução** no servidor Linux de produção.
> - Não recrie, não pare e não modifique containers existentes sem necessidade.

---

## 1. Conexão do Container Existente à Rede `ia-interna`

O backend se comunica com o Ollama através da rede Docker privada isolada chamada `ia-interna`.

### 1.1. Verificar se a rede existe no servidor:
```bash
docker network ls | grep ia-interna
```

Se a rede não existir no servidor, crie-a com:
```bash
docker network create ia-interna
```

### 1.2. Descobrir o nome do container do Ollama em execução:
```bash
docker ps --filter "ancestor=ollama/ollama" --format "table {{.ID}}\t{{.Names}}\t{{.Status}}\t{{.Ports}}"
```
Ou listar todos os containers:
```bash
docker ps
```

### 1.3. Conectar o container Ollama à rede `ia-interna`:
Substitua `<NOME_DO_CONTAINER_OLLAMA>` pelo nome real encontrado no passo anterior:
```bash
docker network connect --alias ollama ia-interna <NOME_DO_CONTAINER_OLLAMA>
```
> O parâmetro `--alias ollama` garante que o backend conseguirá resolver o hostname `http://ollama:11434` mesmo se o container original tiver outro nome (como `ollama_server`, `ollama1`, etc.).

### 1.4. Validar se a conexão foi estabelecida:
```bash
docker network inspect ia-interna
```
Deverá exibir tanto o container do Ollama quanto o container `ollama-backend` na mesma lista de conexões.

---

## 2. Desenvolvimento Local no Mac via Túnel SSH

Durante o desenvolvimento local no Mac, você não precisa ter o Ollama instalado localmente nem expor a porta 11434 publicamente na internet.

Para conectar seu backend local ao Ollama do servidor remoto com total segurança:

```bash
# Cria um túnel SSH seguro encaminhando a porta local 11434 para o servidor
ssh -L 11434:localhost:11434 usuario@ip_do_servidor
```

Com o túnel ativo, configure no seu `.env` local:
```env
OLLAMA_BASE_URL=http://localhost:11434
```

Assim, todas as chamadas feitas pelo backend local viajarão criptografadas pelo túnel SSH diretamente até a API privada do Ollama no servidor.

---

## 3. Gestão de Modelos no Servidor (Comandos Úteis)

Para gerenciar modelos dentro do container Ollama existente no servidor:

```bash
# Listar modelos já baixados
docker exec -it <NOME_DO_CONTAINER_OLLAMA> ollama list

# Baixar um novo modelo (ex: Llama 3 8B)
docker exec -it <NOME_DO_CONTAINER_OLLAMA> ollama pull llama3:8b

# Baixar modelo leve para testes rápidos (ex: Qwen 2.5 1.5B ou TinyLlama)
docker exec -it <NOME_DO_CONTAINER_OLLAMA> ollama pull qwen2.5:1.5b
docker exec -it <NOME_DO_CONTAINER_OLLAMA> ollama pull tinyllama

# Testar geração de texto diretamente no terminal do container
docker exec -it <NOME_DO_CONTAINER_OLLAMA> ollama run llama3:8b "Olá, responda em uma linha."
```

