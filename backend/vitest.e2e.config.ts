import { defineConfig } from 'vitest/config';
import path from 'node:path';

/**
 * Suite e2e da API: testes supertest contra a app Express em processo.
 * Precisa de uma base de dados real (PostGIS) — corre em CI com um serviço
 * postgres e localmente com o .env de desenvolvimento.
 *
 * Uso: npm run test:e2e
 */
export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        setupFiles: ['./src/tests/setup.ts'],
        include: ['src/tests/e2e/**/*.spec.ts'],
        hookTimeout: 120_000,
        testTimeout: 60_000,
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
});
