import 'reflect-metadata';
import './config/env';
import express, { Application } from 'express';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import { corsMiddleware } from './config';
import { helmetConfig, securityHeaders } from './config/security.config';
import { swaggerSpec } from './config/swagger.config';
import routes from './shared/routes';
import { initCronJobs } from './cron';
import { errorHandler } from './shared/middleware/error-handler.middleware';
import { correlationIdMiddleware } from './shared/middleware/correlation-id.middleware';
import { metricsMiddleware } from './shared/middleware/metrics.middleware';
import { sanitizationMiddleware } from './shared/middleware/sanitization.middleware';
import { healthCheck, readinessCheck, livenessCheck } from './shared/utils/health';
import { metricsHandler } from './config/metrics.config';
import { initCache } from './config/cache.config';


const app: Application = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');

initCronJobs();

const limiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    limit: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Muitas requisições, tente novamente mais tarde.'
    }
});

app.use(helmetConfig);
app.use(securityHeaders);
app.use(compression());
app.use(limiter);
app.use(correlationIdMiddleware);
app.use(metricsMiddleware);
app.use(corsMiddleware);
// 200kb chega para qualquer geometria da app (LineString máx. 100 pontos).
app.use(express.json({ limit: '200kb' }));
app.use(express.urlencoded({ extended: true, limit: '200kb' }));
app.use(cookieParser());
app.use(sanitizationMiddleware);

app.get('/health', healthCheck);
app.get('/health/ready', readinessCheck);
app.get('/health/live', livenessCheck);
app.get('/metrics', metricsHandler);

app.use('/api/v1', routes);

// Documentação Swagger
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Parqi API Docs',
}));
app.get('/api/docs.json', (_req, res) => {
    res.json(swaggerSpec);
});

app.use(errorHandler);

// Inicializa cache in-memory
initCache();

export default app;
