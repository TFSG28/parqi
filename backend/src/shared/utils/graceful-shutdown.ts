import { Server } from 'http';
import { prisma } from '../../lib/prisma';
import { logger } from './logger';

export const setupGracefulShutdown = (server: Server) => {
    const shutdown = async (signal: string) => {
        logger.info(`${signal} recebido, iniciando shutdown gracioso`);

        server.close(async () => {
            logger.info('Servidor HTTP fechado');

            try {
                await prisma.$disconnect();
                logger.info('Prisma desconectado');

                logger.info('Shutdown completo');
                process.exit(0);
            } catch (error) {
                logger.error({ error }, 'Erro durante shutdown');
                process.exit(1);
            }
        });

        setTimeout(() => {
            logger.error('Forçando shutdown após timeout');
            process.exit(1);
        }, 30000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('uncaughtException', (error) => {
        logger.error({ error }, 'Exceção não capturada');
        shutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason) => {
        logger.error({ reason }, 'Promise rejection não tratada');
        shutdown('unhandledRejection');
    });
};
