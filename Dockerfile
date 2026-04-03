# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
WORKDIR /app

# Только зависимости (кэшируется)
COPY package*.json ./
#RUN npm ci --omit=dev
RUN npm ci

# Код
COPY src ./src

ENV NODE_ENV=production
ENV HOST=0.0.0.0
EXPOSE 3000

CMD ["node", "src/index.js"]