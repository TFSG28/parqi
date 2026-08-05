import { z } from 'zod';

export const CreateUserSchema = z.object({
    body: z.object({
        name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
        email: z.email('Email inválido'),
        password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
    }),
});

export type CreateUserDTO = z.infer<typeof CreateUserSchema>['body'];
