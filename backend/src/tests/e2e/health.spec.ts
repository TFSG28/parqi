import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../app';

/**
 * Health checks da API — convertidos de Playwright para supertest:
 * correm em processo, sem servidor nem browser, ideais para CI.
 */
describe('Health Checks', () => {
    it('GET /health — estado saudável com base de dados up', async () => {
        const response = await request(app).get('/health');

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('healthy');
        expect(response.body.services.database.status).toBe('up');
    });

    it('GET /health/ready — pronto para servir tráfego', async () => {
        const response = await request(app).get('/health/ready');

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('ready');
    });

    it('GET /health/live — processo vivo', async () => {
        const response = await request(app).get('/health/live');

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('alive');
    });

    it('GET /metrics — métricas Prometheus expostas', async () => {
        const response = await request(app).get('/metrics');

        expect(response.text).toContain('http_requests_total');
        expect(response.text).toContain('http_request_duration_seconds');
    });
});
