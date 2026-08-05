import { Router } from 'express';
import { authController } from '../../../../shared/container/controllers';
import { validate } from '../../../../shared/middleware/validation.middleware';
import { authMiddleware } from '../../../../shared/middleware/auth.middleware';
import { csrfMiddleware } from '../../../../shared/middleware/csrf.middleware';
import { LoginSchema } from '../../application/dtos/Login.dto';

const router = Router();

// Public
router.post('/login', validate(LoginSchema), authController.login);
router.post('/refresh', authController.refresh);

// Authenticated
router.get('/me', authMiddleware, authController.me);
router.post('/logout', authMiddleware, csrfMiddleware, authController.logout);

export default router;
