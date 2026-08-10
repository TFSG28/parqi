import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authController } from '../../../../shared/container/controllers';
import { validate } from '../../../../shared/middleware/validation.middleware';
import { authMiddleware } from '../../../../shared/middleware/auth.middleware';
import { csrfMiddleware } from '../../../../shared/middleware/csrf.middleware';
import { LoginSchema } from '../../application/dtos/Login.dto';
import { VerifyEmailSchema } from '../../application/dtos/VerifyEmail.dto';
import { ResendCodeSchema } from '../../application/dtos/ResendCode.dto';
import { ForgotPasswordSchema } from '../../application/dtos/ForgotPassword.dto';
import { ResetPasswordSchema } from '../../application/dtos/ResetPassword.dto';

const router = Router();

// Anti brute-force: limite apertado só no login.
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === 'test',
    message: { error: 'Demasiadas tentativas de login. Tenta novamente mais tarde.' },
});

// Recuperação de palavra-passe: público, com limite apertado por IP
const passwordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === 'test',
    message: { error: 'Demasiados pedidos. Tenta novamente mais tarde.' },
});

// Public
router.post('/login', loginLimiter, validate(LoginSchema), authController.login);
router.post('/refresh', authController.refresh);
router.post('/forgot-password', passwordLimiter, validate(ForgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', passwordLimiter, validate(ResetPasswordSchema), authController.resetPassword);

// Authenticated
router.get('/me', authMiddleware, authController.me);
router.post('/logout', authMiddleware, csrfMiddleware, authController.logout);

// Verificação de email por código
router.post(
    '/verify-email',
    authMiddleware,
    csrfMiddleware,
    validate(VerifyEmailSchema),
    authController.verifyEmail
);
router.post('/resend-code', authMiddleware, csrfMiddleware, validate(ResendCodeSchema), authController.resendCode);

export default router;
