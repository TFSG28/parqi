import { Request, Response } from 'express';
import client from 'prom-client';

const register = new client.Registry();

client.collectDefaultMetrics({ register });

export const httpRequestDuration = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duração das requisições HTTP em segundos',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.5, 1, 2, 5],
    registers: [register],
});

export const httpRequestTotal = new client.Counter({
    name: 'http_requests_total',
    help: 'Total de requisições HTTP',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register],
});

export const activeConnections = new client.Gauge({
    name: 'active_connections',
    help: 'Número de conexões ativas',
    registers: [register],
});

export const databaseQueryDuration = new client.Histogram({
    name: 'database_query_duration_seconds',
    help: 'Duração das queries do banco de dados',
    labelNames: ['operation'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1],
    registers: [register],
});

export const metricsHandler = async (req: Request, res: Response) => {
    res.setHeader('Content-Type', register.contentType);
    const metrics = await register.metrics();
    res.send(metrics);
};

export { register };
