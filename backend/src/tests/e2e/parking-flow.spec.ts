import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../app';

describe('Parking API — fluxo completo', () => {
    let token: string;
    let parkingId: string;

    beforeAll(async () => {
        // Regista e faz login
        const email = `test-${Date.now()}@parqi.pt`;
        await request(app).post('/api/v1/user').send({
            name: 'Test Runner',
            email,
            password: 'Test1234!',
        });

        const loginRes = await request(app).post('/api/v1/auth/login').send({
            email,
            password: 'Test1234!',
        });

        token = loginRes.body.data.token;
    });

    it('GET /parking — lista vazia devolve 200', async () => {
        const res = await request(app).get('/api/v1/parking?limit=10');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('POST /parking — cria um parque', async () => {
        const res = await request(app)
            .post('/api/v1/parking')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'Parque de Teste',
                geometry: {
                    type: 'Point',
                    coordinates: [-8.2914, 41.4426],
                },
                parkingType: 'SURFACE',
            });

        expect(res.status).toBe(201);
        expect(res.body.data.name).toBe('Parque de Teste');
        expect(res.body.data.status).toBe('PENDING');
        parkingId = res.body.data.id;
    });

    it('GET /parking/:id — devolve o parque criado', async () => {
        const res = await request(app).get(`/api/v1/parking/${parkingId}`);
        expect(res.status).toBe(200);
        expect(res.body.data.id).toBe(parkingId);
    });

    it('POST /parking/:id/vote — vota positivamente', async () => {
        const res = await request(app)
            .post(`/api/v1/parking/${parkingId}/vote`)
            .set('Authorization', `Bearer ${token}`)
            .send({ value: 1 });

        expect(res.status).toBe(200);
    });

    it('POST /parking/:id/suggest — sugere alteração', async () => {
        const res = await request(app)
            .post(`/api/v1/parking/${parkingId}/suggest`)
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Parque de Teste Renomeado', reason: 'Nome mais claro' });

        expect(res.status).toBe(200);
    });

    it('GET /user/me/stats — devolve estatísticas do contribuidor', async () => {
        const res = await request(app)
            .get('/api/v1/user/me/stats')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.data.total).toBeGreaterThanOrEqual(1);
    });
});
