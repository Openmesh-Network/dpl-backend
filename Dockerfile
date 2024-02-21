# Primeira Etapa: Construção (Builder)
FROM ubuntu:latest AS builder

# Instalar ferramentas necessárias
RUN apt-get update && \
    apt-get install -y curl make g++ && \
    curl -sL https://deb.nodesource.com/setup_16.x | bash - && \
    apt-get install -y nodejs

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

# Segunda Etapa: Imagem Final
FROM ubuntu:latest

WORKDIR /app

# Instalar Node.js
RUN apt-get update && \
    apt-get install -y curl make g++ && \
    curl -sL https://deb.nodesource.com/setup_16.x | bash - && \
    apt-get install -y nodejs

# Instalar o dfx
# RUN curl -fsSL https://internetcomputer.org/install.sh | sh

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

EXPOSE 3000
CMD [ "npm", "run", "start:prod" ]