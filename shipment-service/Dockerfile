FROM node:20-alpine

WORKDIR /app

COPY shipment-service/package*.json ./
RUN npm ci

COPY shipment-service/ ./

ENV NODE_ENV=production

CMD ["node", "src/server.js"]
