FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY order-service/package*.json ./
RUN npm ci

COPY order-service/ ./
COPY proto/ /app/proto/

ENV PROTO_DIR=/app/proto
ENV NODE_ENV=production

RUN npx prisma generate

CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]
