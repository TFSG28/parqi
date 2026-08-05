FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache dumb-init

ENV NODE_ENV production

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["dumb-init", "node_modules/.bin/next", "start"]
