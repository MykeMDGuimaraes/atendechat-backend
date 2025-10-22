# Etapa 1 - Build da aplicação
FROM node:18-alpine AS builder

# Diretório de trabalho
WORKDIR /app

# Copiar package.json e instalar dependências
COPY package*.json ./
RUN npm install

# Copiar todo o código
COPY . .

# Compilar TypeScript (se houver build)
RUN npm run build || echo "Sem build - talvez projeto seja JS puro"

# Etapa 2 - Imagem final (mais leve)
FROM node:18-alpine

WORKDIR /app

# Copiar app da imagem anterior
COPY --from=builder /app /app

# Garantir apenas dependências de produção
RUN npm install --omit=dev

# Expôr a porta (confirme se o app usa 3000)
EXPOSE 3000

# Comando inicial
CMD ["npm", "start"]
