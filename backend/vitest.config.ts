import { defineConfig, configDefaults } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        setupFiles: ['./src/tests/setup.ts'],
        // e2e specs are Playwright tests (npm run test:e2e), not vitest.
        exclude: [...configDefaults.exclude, 'src/tests/e2e/**', 'dist/**'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                'src/tests/',
                'dist/',
                '**/*.spec.ts',
                '**/*.test.ts',
            ],
            // Porteira anti-regressão: a cobertura nunca pode descer abaixo destes
            // mínimos. Sobem à medida que os use cases ganham specs.
            thresholds: {
                statements: 35,
                branches: 27,
                functions: 31,
                lines: 61,
            },
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
});