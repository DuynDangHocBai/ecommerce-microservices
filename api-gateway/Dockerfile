FROM node:20-alpine

WORKDIR /app

COPY api-gateway/package*.json ./
RUN npm ci

COPY api-gateway/ ./

ENV NODE_ENV=production

CMD ["node", "src/server.js"]
