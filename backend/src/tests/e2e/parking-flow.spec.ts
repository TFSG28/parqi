import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../app';
import { prisma } from '../../lib/prisma';

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

/**
 * Fluxo completo da API com dois utilizadores reais:
 *   contribuidor cria → votante (outro utilizador) vota e sugere → stats.
 *
 * Usa Bearer token (como a app Expo), por isso o CSRF não se aplica.
 */
describe('Parking API — fluxo completo', () => {
    let contributorToken: string;
    let voterToken: string;
    let parkingId: string;

    /** Registo → login. Devolve o token Bearer. */
    async function createUser(name: string): Promise<string> {
        const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@parqi.pt`;

        await request(app).post('/api/v1/user').send({
            name,
            email,
            password: 'Test1234!',
        });

        const loginRes = await request(app).post('/api/v1/auth/login').send({
            email,
            password: 'Test1234!',
        });
        return loginRes.body.data.token;
    }

    beforeAll(async () => {
        // Remove resíduos de runs anteriores no mesmo ponto de teste
        // (a regra anti-duplicados de 30 m bloquearia a criação).
        await prisma.parkingSpot.deleteMany({
            where: { name: { startsWith: 'Parque de Teste' }, source: 'COMMUNITY' },
        });

        contributorToken = await createUser('E2E Contribuidor');
        voterToken = await createUser('E2E Votante');
    }, 120_000);

    afterAll(async () => {
        // Limpa os artefactos deste run (spots criados no ponto de teste),
        // para a próxima execução não bater com a regra de duplicados.
        await prisma.parkingSpot.deleteMany({
            where: { name: { startsWith: 'Parque de Teste' }, source: 'COMMUNITY' },
        });
    });

    it('GET /parking — lista vazia devolve 200', async () => {
        const res = await request(app).get('/api/v1/parking?limit=10');

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('POST /parking — cria um parque', async () => {
        const spotName = `Parque de Teste ${Date.now()}`;
        const res = await request(app)
            .post('/api/v1/parking')
            .set('Authorization', `Bearer ${contributorToken}`)
            .send({
                name: spotName,
                geometry: {
                    type: 'Point',
                    // Coordenadas de teste com rede viária válida.
                    coordinates: [-8.2914, 41.4426],
                },
                parkingType: 'SURFACE',
            });

        expect(res.status, `create: ${JSON.stringify(res.body)}`).toBe(201);
        expect(res.body.data.name).toBe(spotName);
        expect(res.body.data.status).toBe('PENDING');
        parkingId = res.body.data.id;
    });

    it('GET /parking/:id — devolve o parque criado', async () => {
        const res = await request(app).get(`/api/v1/parking/${parkingId}`);

        expect(res.status, `GET byId: ${JSON.stringify(res.body)}`).toBe(200);
        expect(res.body.data.id).toBe(parkingId);
    });

    it('POST /parking/:id/vote — outro utilizador vota positivamente', async () => {
        const res = await request(app)
            .post(`/api/v1/parking/${parkingId}/vote`)
            .set('Authorization', `Bearer ${voterToken}`)
            .send({ value: 1 });

        expect(res.status, `vote: ${JSON.stringify(res.body)}`).toBe(200);
    });

    it('POST /parking/:id/vote — o criador não pode votar na própria contribuição', async () => {
        const res = await request(app)
            .post(`/api/v1/parking/${parkingId}/vote`)
            .set('Authorization', `Bearer ${contributorToken}`)
            .send({ value: 1 });

        expect(res.status).toBe(400);
    });

    it('POST /parking/:id/suggest — sugere alteração', async () => {
        const res = await request(app)
            .post(`/api/v1/parking/${parkingId}/suggest`)
            .set('Authorization', `Bearer ${voterToken}`)
            .send({ name: `Parque Renomeado ${Date.now()}`, reason: 'Nome mais claro' });

        expect(res.status, `suggest: ${JSON.stringify(res.body)}`).toBe(201);
        expect(res.body.data.suggestion.status).toBe('PENDING');
    });

    it('GET /user/me/stats — devolve estatísticas do contribuidor', async () => {
        const res = await request(app)
            .get('/api/v1/user/me/stats')
            .set('Authorization', `Bearer ${contributorToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.total).toBeGreaterThanOrEqual(1);
    });
});
