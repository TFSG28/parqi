import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import userRouter from '../routes/user.routes';
import { errorHandler } from '../../../../shared/middleware/error-handler.middleware';

// Spec de integração: bcrypt real + base de dados real. Sob carga (ex.: com
// cobertura ativada) cada criação passa dos 5s do timeout padrão — sobe o teto.
describe('User Controller', { timeout: 20_000 }, () => {
  let app: Express;

  beforeAll(() => {
    // Configurar app de teste
    app = express();
    app.use(express.json());
    app.use('/user', userRouter);
    app.use(errorHandler);
  });

  describe('POST /user', () => {
    it('deve criar um novo usuário com sucesso', async () => {
      const response = await request(app)
        .post('/user')
        .send({
          name: 'Usuário Teste',
          email: `test${Date.now()}@example.com`,
          password: 'senha123',
        });

      expect(response.status).toBe(201);
      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.email).toContain('@example.com');
      expect(response.body.data).not.toHaveProperty('password');
    });

    it('deve ignorar campos desconhecidos como role (mass assignment)', async () => {
      const response = await request(app)
        .post('/user')
        .send({
          name: 'Usuário Teste',
          email: `massassign${Date.now()}@example.com`,
          password: 'senha123',
          role: 'ADMIN',
        });

      expect(response.status).toBe(201);
      expect(response.body.data).not.toHaveProperty('role');
    });

    it('deve retornar 409 se o email já existe', async () => {
      const email = `duplicate${Date.now()}@example.com`;

      // Primeiro criar um usuário
      await request(app).post('/user').send({
        name: 'Usuário Teste',
        email,
        password: 'senha123',
      });

      // Tentar criar o mesmo usuário novamente
      const response = await request(app).post('/user').send({
        name: 'Usuário Teste',
        email,
        password: 'senha123',
      });

      expect(response.status).toBe(409);
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
        });

      expect(response.status).toBe(400);
    });
  });
});
