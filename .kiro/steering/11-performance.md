---
inclusion: manual
---

# Performance Optimization

## Caching Strategy

Caching is intentionally not bundled in the template — add it per-project only
after measuring a real hotspot. Options, from simplest to most involved:

- HTTP `Cache-Control` / `ETag` headers for public GET responses
- An in-process LRU (e.g. `lru-cache`) for a single instance
- A shared store (Redis/Memcached) when running multiple instances

## Database Optimization

### Connection Pooling

```typescript
// prisma.config.ts
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
  pool_timeout = 20
  connection_limit = 10
}
```

### Query Optimization

```typescript
// ❌ Ruim - N+1 queries
const users = await prisma.user.findMany();
for (const user of users) {
  const posts = await prisma.post.findMany({ where: { userId: user.id } });
}

// ✅ Bom - Single query com include
const users = await prisma.user.findMany({
  include: { posts: true }
});
```

### Indexes

```prisma
model User {
  id    String @id @default(uuid())
  email String @unique
  
  @@index([email])
  @@index([createdAt])
}
```

### Select Only Required Fields

```typescript
// ❌ Ruim - Busca tudo
const user = await prisma.user.findUnique({ where: { id } });

// ✅ Bom - Busca apenas necessário
const user = await prisma.user.findUnique({
  where: { id },
  select: { id: true, name: true, email: true }
});
```

## Response Compression

Já configurado via middleware:

```typescript
import compression from 'compression';
app.use(compression());
```

## Rate Limiting

### Por IP

```typescript
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 200,
});
```

### Por Usuário

```typescript
const userLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  keyGenerator: (req) => req.user?.id || req.ip,
});
```

## Pagination

```typescript
interface PaginationParams {
  page: number;
  limit: number;
}

const users = await prisma.user.findMany({
  skip: (page - 1) * limit,
  take: limit,
});

const total = await prisma.user.count();

return {
  data: users,
  pagination: {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  },
};
```

## Lazy Loading

### Frontend

```typescript
// Next.js dynamic import
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <p>Carregando...</p>,
});
```

## Bundle Optimization

### Backend

```json
{
  "scripts": {
    "build": "tsc --project tsconfig.build.json"
  }
}
```

### Frontend

```typescript
// next.config.ts
export default {
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  experimental: {
    optimizeCss: true,
  },
};
```

## Memory Management

### Avoid Memory Leaks

```typescript
// ❌ Ruim - Event listener não removido
emitter.on('event', handler);

// ✅ Bom - Cleanup
const cleanup = () => emitter.off('event', handler);
process.on('SIGTERM', cleanup);
```

### Stream Large Data

```typescript
// ❌ Ruim - Carrega tudo na memória
const users = await prisma.user.findMany();
res.json(users);

// ✅ Bom - Stream
const stream = await prisma.user.findMany({ stream: true });
stream.pipe(res);
```

## Monitoring Performance

### Métricas Importantes

1. **Response Time**: P50, P95, P99
2. **Throughput**: Requisições por segundo
3. **Error Rate**: % de erros
4. **Database Query Time**: Tempo médio de queries

### Identificar Gargalos

```bash
# Verificar queries lentas
docker exec perfect-template-db mysql -u root -p -e "
  SELECT * FROM information_schema.processlist 
  WHERE time > 1 
  ORDER BY time DESC;
"
```

## Load Testing

### k6 Script

```javascript
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 100,
  duration: '30s',
};

export default function () {
  const res = http.get('http://localhost:3001/api/v1/users');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
}
```

## Best Practices

1. **Cache agressivamente** dados que mudam pouco
2. **Use indexes** em campos de busca frequente
3. **Pagine** resultados grandes
4. **Comprima** responses
5. **Monitor** performance continuamente
6. **Profile** código em produção
7. **Otimize** queries N+1
8. **Use** connection pooling
