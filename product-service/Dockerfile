FROM node:20-alpine

WORKDIR /app

COPY product-service/package*.json ./
RUN npm ci

COPY product-service/ ./
COPY proto/ /app/proto/

ENV PROTO_DIR=/app/proto
ENV NODE_ENV=production

CMD ["sh", "-c", "node seed.js && node src/server.js"]
