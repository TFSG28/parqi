import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Parqi API',
            version: '1.0.0',
            description:
                'API comunitária para encontrar estacionamento em Portugal. Autenticação via JWT (Bearer token).',
        },
        servers: [
            {
                url: process.env.API_URL || 'http://localhost:3001/api/v1',
                description: 'Servidor local',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
    },
    apis: ['./src/modules/**/presentation/routes/*.routes.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
