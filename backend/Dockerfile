# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

RUN npx prisma generate
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache dumb-init

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --only=production && \
    npx prisma generate && \
    npm cache clean --force

COPY --from=builder /app/dist ./dist

USER node

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health/live', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["dumb-init", "node", "dist/index.js"]
