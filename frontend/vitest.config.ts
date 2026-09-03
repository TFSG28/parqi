import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./src/tests/setup.ts'],
        coverage: {
            provider: 'v8',
            // Ativo por omissão: sem isto os thresholds nunca são avaliados.
            enabled: true,
            reporter: ['text', 'json', 'html'],
            // Toda a src conta — sem include, só os ficheiros importados pelos
            // testes aparecem e as percentagens ficam inflacionadas.
            include: ['src/**'],
            exclude: [
                'node_modules/',
                'src/tests/',
                '.next/',
                '**/*.spec.tsx',
                '**/*.test.tsx',
            ],
            // Ratchet: piso atual da suite; sobe à medida que os componentes
            // e contexts ganham specs. Nunca pode descer.
            thresholds: {
                statements: 22,
                branches: 14,
                functions: 22,
                lines: 23,
            },
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
});
