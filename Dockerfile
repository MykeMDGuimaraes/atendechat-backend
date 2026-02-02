# ------------------------------
# 1️⃣ STAGE: BUILD (COMPILAÇÃO)
# ------------------------------
FROM node:18-alpine AS builder

# Criar diretório do app
WORKDIR /app

# Instalar dependências necessárias para pacotes Git
RUN apk add --no-cache git

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências (sem dev)
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Copiar o restante do código
COPY . .

# Compilar TypeScript
RUN npm run build


# ------------------------------
# 2️⃣ STAGE: RUNTIME (EXECUÇÃO)
# ------------------------------
FROM node:18-alpine

WORKDIR /app

# Copiar somente o necessário do build
COPY --from=builder /app/package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

# Expõe a porta (altere se precisar)
EXPOSE 3000

# Comando para iniciar o servidor
CMD ["npm", "start"]
