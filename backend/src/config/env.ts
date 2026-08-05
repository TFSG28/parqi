import { z } from 'zod';

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().default('3001').transform(Number),
    
    DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatório'),
    DATABASE_USER: z.string().min(1, 'DATABASE_USER é obrigatório'),
    DATABASE_PASSWORD: z.string().min(1, 'DATABASE_PASSWORD é obrigatório'),
    DATABASE_NAME: z.string().min(1, 'DATABASE_NAME é obrigatório'),
    DATABASE_HOST: z.string().min(1, 'DATABASE_HOST é obrigatório'),
    DATABASE_PORT: z.string().default('3306').transform(Number),
    
    JWT_SECRET: z.string().min(64, 'JWT_SECRET deve ter pelo menos 64 caracteres'),
    ENCRYPTION_KEY: z.string().length(64, 'ENCRYPTION_KEY deve ter 64 caracteres hexadecimais'),
    
    IP_SERVER: z.string().default('localhost'),
    EMAIL: z.email('EMAIL deve ser um email válido'),
    EMAIL_PASS: z.string().min(1, 'EMAIL_PASS é obrigatório'),
    
    FRONT_URL: z.url('FRONT_URL deve ser uma URL válida'),
});

export type Env = z.infer<typeof envSchema>;

let env: Env;

try {
    env = envSchema.parse(process.env);
} catch (error) {
    if (error instanceof z.ZodError) {
        console.error('❌ Erro de validação de variáveis de ambiente:');
        error.issues.forEach((issue) => {
            console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
        });
        process.exit(1);
    }
    throw error;
}

export { env };
