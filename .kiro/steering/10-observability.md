---
inclusion: manual
---

# Observability e Monitoring

## Health Checks

### Endpoints Disponíveis

```typescript
GET /health        // Status geral
GET /health/ready  // Readiness probe
GET /health/live   // Liveness probe
```

### Uso em Kubernetes

```yaml
livenessProbe:
  httpGet:
    path: /health/live
    port: 3001
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health/ready
    port: 3001
  initialDelaySeconds: 5
  periodSeconds: 5
```

## Métricas (Prometheus)

### Endpoint
```
GET /metrics
```

### Métricas Disponíveis

- `http_requests_total` - Total de requisições
- `http_request_duration_seconds` - Latência
- `active_connections` - Conexões ativas
- `database_query_duration_seconds` - Tempo de queries

### Configuração Prometheus

```yaml
scrape_configs:
  - job_name: 'perfect-template'
    static_configs:
      - targets: ['localhost:3001']
    metrics_path: '/metrics'
```

## Logging

### Structured Logging com Pino

```typescript
import { logger } from './shared/utils/logger';

logger.info({ userId: '123' }, 'Usuário criado');
logger.error({ error, correlationId }, 'Erro ao processar');
```

### Correlation IDs

Cada requisição recebe um ID único:

```typescript
// Automático via middleware
req.correlationId // uuid

// No response header
X-Correlation-Id: <uuid>
```

### Buscar logs por Correlation ID

```bash
docker logs backend | grep "correlationId\":\"<uuid>"
```

## Distributed Tracing

### Implementação Futura

Para adicionar tracing:

1. Instalar OpenTelemetry
```bash
npm install @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node
```

2. Configurar no index.ts
```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';

const sdk = new NodeSDK({
  serviceName: 'perfect-template-backend',
  traceExporter: new JaegerExporter(),
});

sdk.start();
```

## Alerting

### Alertas Recomendados

1. **Alta taxa de erro (5xx)**
```
rate(http_requests_total{status_code=~"5.."}[5m]) > 0.05
```

2. **Alta latência**
```
histogram_quantile(0.95, http_request_duration_seconds) > 1
```

3. **Database down**
```
up{job="perfect-template"} == 0
```

4. **Memória alta**
```
process_resident_memory_bytes > 500000000
```

## Dashboards

### Grafana Dashboard Básico

```json
{
  "dashboard": {
    "title": "Perfect Template",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [{
          "expr": "rate(http_requests_total[5m])"
        }]
      },
      {
        "title": "Latency P95",
        "targets": [{
          "expr": "histogram_quantile(0.95, http_request_duration_seconds)"
        }]
      }
    ]
  }
}
```

## Performance Monitoring

### Métricas de Database

```typescript
import { databaseQueryDuration } from './config/metrics.config';

const timer = databaseQueryDuration.startTimer({ operation: 'findUser' });
const user = await prisma.user.findUnique({ where: { id } });
timer();
```

### Cache Hit Rate

```typescript
// Implementar contador de cache hits/misses
const cacheHits = new Counter({
  name: 'cache_hits_total',
  help: 'Total cache hits',
});

const cacheMisses = new Counter({
  name: 'cache_misses_total',
  help: 'Total cache misses',
});
```

## Best Practices

1. **Sempre use correlation IDs** para rastrear requisições
2. **Log em nível apropriado**: info para operações normais, error para falhas
3. **Não logue dados sensíveis**: senhas, tokens, PII
4. **Use métricas para decisões**: não confie apenas em logs
5. **Configure alertas proativos**: não espere usuários reportarem
