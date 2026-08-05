import 'reflect-metadata';
import 'dotenv/config';
import { setupContainer } from './shared/container/container';
import { env } from './config/env';
import { logger } from './shared/utils/logger';
import { createServer } from 'node:http';
import { setupGracefulShutdown } from './shared/utils/graceful-shutdown';

// Register DI bindings BEFORE importing app: routes resolve controllers from the
// container at import time, so the container must be populated first.
setupContainer();

async function start() {
    const { default: app } = await import('./app');

    const server = createServer(app);

    server.listen(env.PORT, '0.0.0.0', () => {
        logger.info({ port: env.PORT, environment: env.NODE_ENV }, 'Servidor iniciado');
        logger.info(`Health check: http://localhost:${env.PORT}/health`);
        logger.info(`Metrics: http://localhost:${env.PORT}/metrics`);
        logger.info(`API: http://localhost:${env.PORT}/api/v1`);
    });

    setupGracefulShutdown(server);
}

start().catch((err) => {
    logger.error({ err }, 'Falha ao iniciar o servidor');
    process.exit(1);
});
