import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { userController, parkingController } from '../../../../shared/container/controllers';
import { validate } from '../../../../shared/middleware/validation.middleware';
import { authMiddleware } from '../../../../shared/middleware/auth.middleware';
import { csrfMiddleware } from '../../../../shared/middleware/csrf.middleware';
import { requireRole } from '../../../../shared/middleware/role.middleware';
import { CreateUserSchema } from '../../application/dtos/CreateUser.dto';
import { SetUserActiveSchema } from '../../application/dtos/SetUserActive.dto';

const router = Router();

// Anti-abuso: criação de contas em massa é o vetor de Sybil mais barato.
const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === 'test',
    message: { error: 'Demasiadas contas criadas. Tenta novamente mais tarde.' },
});

router.post('/', registerLimiter, validate(CreateUserSchema), userController.create);

// Estatísticas de contribuições do utilizador autenticado
router.get('/me/stats', authMiddleware, parkingController.myStats);

// Suspender/reativar conta (só admin)
router.patch(
    '/:id/active',
    authMiddleware,
    csrfMiddleware,
    requireRole('ADMIN'),
    validate(SetUserActiveSchema),
    userController.setActive
);

export default router;
