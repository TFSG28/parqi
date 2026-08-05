import { defineConfig, configDefaults } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        setupFiles: ['./src/tests/setup.ts'],
        // e2e specs are Playwright tests (npm run test:e2e), not vitest.
        exclude: [...configDefaults.exclude, 'src/tests/e2e/**'],
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
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
});
