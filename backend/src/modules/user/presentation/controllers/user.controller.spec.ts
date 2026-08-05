import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import { userRouter } from '../routes/user.routes';

describe('User Controller', () => {
  let app: Express;

  beforeAll(() => {
    // Configurar app de teste
    app = express();
    app.use(express.json());
    app.use('/user', userRouter);
  });

  describe('POST /user', () => {
    it('deve criar um novo usuário com sucesso', async () => {
      const response = await request(app)
        .post('/user')
        .send({
          name: 'Usuário Teste',
          email: `test${Date.now()}@example.com`,
          password: 'senha123',
          role: 'CLIENT',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.email).toContain('@example.com');
    });

    it('deve retornar 400 se o email já existe', async () => {
      const email = `duplicate${Date.now()}@example.com`;

      // Primeiro criar um usuário
      await request(app).post('/user').send({
        name: 'Usuário Teste',
        email,
        password: 'senha123',
        role: 'CLIENT',
      });

      // Tentar criar o mesmo usuário novamente
      const response = await request(app).post('/user').send({
        name: 'Usuário Teste',
        email,
        password: 'senha123',
        role: 'CLIENT',
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('já existe');
    });

    it('deve retornar 400 se dados obrigatórios estão faltando', async () => {
      const response = await request(app)
        .post('/user')
        .send({
          name: 'Usuário Teste',
          // email faltando
          password: 'senha123',
        });

      expect(response.status).toBe(400);
    });

    it('deve retornar 400 se o email é inválido', async () => {
      const response = await request(app)
        .post('/user')
        .send({
          name: 'Usuário Teste',
          email: 'email-invalido',
          password: 'senha123',
          role: 'CLIENT',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /user/:id', () => {
    it('deve retornar um usuário por ID', async () => {
      // Primeiro criar um usuário
      const createResponse = await request(app)
        .post('/user')
        .send({
          name: 'Usuário Teste',
          email: `gettest${Date.now()}@example.com`,
          password: 'senha123',
          role: 'CLIENT',
        });

      const userId = createResponse.body.id;

      // Buscar o usuário
      const response = await request(app).get(`/user/${userId}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(userId);
      expect(response.body).not.toHaveProperty('password');
    });

    it('deve retornar 404 se o usuário não existe', async () => {
      const response = await request(app).get('/user/id-inexistente');

      expect(response.status).toBe(404);
    });
  });
});
