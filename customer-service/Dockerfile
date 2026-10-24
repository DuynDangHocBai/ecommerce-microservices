FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY customer-service/package*.json ./
RUN npm ci

COPY customer-service/ ./
COPY proto/ /app/proto/

ENV PROTO_DIR=/app/proto
ENV NODE_ENV=production

RUN npx prisma generate

CMD ["sh", "-c", "npx prisma migrate deploy && node prisma/seed.js && node src/server.js"]
