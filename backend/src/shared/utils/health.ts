import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';

interface HealthCheck {
    status: 'healthy' | 'unhealthy';
    timestamp: string;
    uptime: number;
    services: {
        database: ServiceStatus;
    };
    memory: {
        used: number;
        total: number;
        percentage: number;
    };
}

interface ServiceStatus {
    status: 'up' | 'down';
    responseTime?: number;
    error?: string;
}

const checkDatabase = async (): Promise<ServiceStatus> => {
    const start = Date.now();
    try {
        await prisma.$queryRaw`SELECT 1`;
        return {
            status: 'up',
            responseTime: Date.now() - start,
        };
    } catch (error) {
        return {
            status: 'down',
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
};

export const healthCheck = async (req: Request, res: Response) => {
    const database = await checkDatabase();

    const memUsage = process.memoryUsage();
    const totalMem = memUsage.heapTotal;
    const usedMem = memUsage.heapUsed;

    const health: HealthCheck = {
        status: database.status === 'up' ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        services: {
            database,
        },
        memory: {
            used: Math.round(usedMem / 1024 / 1024),
            total: Math.round(totalMem / 1024 / 1024),
            percentage: Math.round((usedMem / totalMem) * 100),
        },
    };

    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
};

export const readinessCheck = async (req: Request, res: Response) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.status(200).json({ status: 'ready' });
    } catch (error) {
        res.status(503).json({ status: 'not ready' });
    }
};

export const livenessCheck = (req: Request, res: Response) => {
    res.status(200).json({ status: 'alive' });
};
