import { Request, Response } from 'express';
import { injectable, inject } from 'tsyringe';
import { randomBytes } from 'node:crypto';
import { AUTH_TOKENS } from '../../../../shared/container/tokens/auth.tokens';
import { LoginUseCase } from '../../application/usecases/Login.usecase';
import { GetCurrentUserUseCase } from '../../application/usecases/GetCurrentUser.usecase';
import { VerifyEmailUseCase } from '../../application/usecases/VerifyEmail.usecase';
import { ResendCodeUseCase } from '../../application/usecases/ResendCode.usecase';
import { PasswordResetService } from '../../infrastructure/services/PasswordReset.service';
import { IJwtService } from '../../domain/services/IJwt.service';
import { asyncHandler } from '../../../../shared/utils/async-handler';
import { ApiResponse } from '../../../../shared/utils/api-response';
import { UnauthorizedError } from '../../../../shared/errors/AppError';
import {
    ACCESS_TOKEN_COOKIE,
    CSRF_COOKIE,
    accessCookieOptions,
    csrfCookieOptions,
    clearCookieOptions,
} from '../../../../config/cookie.config';

@injectable()
export class AuthController {
    constructor(
        @inject(AUTH_TOKENS.LoginUseCase) private readonly loginUseCase: LoginUseCase,
        @inject(AUTH_TOKENS.GetCurrentUserUseCase) private readonly getCurrentUserUseCase: GetCurrentUserUseCase,
        @inject(AUTH_TOKENS.VerifyEmailUseCase) private readonly verifyEmailUseCase: VerifyEmailUseCase,
        @inject(AUTH_TOKENS.ResendCodeUseCase) private readonly resendCodeUseCase: ResendCodeUseCase,
        @inject(AUTH_TOKENS.PasswordResetService) private readonly passwordResetService: PasswordResetService,
        @inject(AUTH_TOKENS.IJwtService) private readonly jwtService: IJwtService
    ) {}

    private issueSession(res: Response, token: string): string {
        const csrfToken = randomBytes(32).toString('hex');
        res.cookie(ACCESS_TOKEN_COOKIE, token, accessCookieOptions);
        res.cookie(CSRF_COOKIE, csrfToken, csrfCookieOptions);
        return csrfToken;
    }

    login = asyncHandler(async (req: Request, res: Response) => {
        const result = await this.loginUseCase.execute(req.body);
        const csrfToken = this.issueSession(res, result.token);
        // `token` no corpo serve a app mobile (Authorization: Bearer); o cookie
        // continua a ser o mecanismo da web.
        return ApiResponse.success(res, { user: result.user, csrfToken, token: result.token });
    });

    logout = asyncHandler(async (_req: Request, res: Response) => {
        res.clearCookie(ACCESS_TOKEN_COOKIE, clearCookieOptions);
        res.clearCookie(CSRF_COOKIE, { ...clearCookieOptions, httpOnly: false });
        return ApiResponse.success(res, { message: 'Logout realizado com sucesso' });
    });

    me = asyncHandler(async (req: Request, res: Response) => {
        const user = await this.getCurrentUserUseCase.execute(req.user!.userId);
        return ApiResponse.success(res, user);
    });

    /** Valida o email com o código de 6 dígitos recebido. */
    verifyEmail = asyncHandler(async (req: Request, res: Response) => {
        const result = await this.verifyEmailUseCase.execute({
            userId: req.user!.userId,
            code: req.body.code,
        });
        return ApiResponse.success(res, result);
    });

    /** Reenvia o código de verificação (máx. 1 por minuto). */
    resendCode = asyncHandler(async (req: Request, res: Response) => {
        const result = await this.resendCodeUseCase.execute({ userId: req.user!.userId });
        return ApiResponse.success(res, result);
    });

    /** Pede um código de recuperação. Resposta idêntica exista a conta ou não. */
    forgotPassword = asyncHandler(async (req: Request, res: Response) => {
        await this.passwordResetService.requestReset(req.body.email);
        return ApiResponse.success(res, {
            message: 'Se o email existir, recebes um código de recuperação.',
        });
    });

    /** Define a palavra-passe nova com o código recebido por email. */
    resetPassword = asyncHandler(async (req: Request, res: Response) => {
        await this.passwordResetService.reset(req.body.email, req.body.code, req.body.password);
        return ApiResponse.success(res, { message: 'Palavra-passe alterada. Já podes entrar.' });
    });

    // Re-issues the access token + CSRF token while the current session is still
    // valid (sliding window). Fails with 401 once the access token has expired.
    refresh = asyncHandler(async (req: Request, res: Response) => {
        const token = req.cookies?.[ACCESS_TOKEN_COOKIE];
        if (!token) {
            throw new UnauthorizedError('Não autenticado');
        }

        let payload: { userId: string; email: string; role?: 'USER' | 'ADMIN' };
        try {
            payload = this.jwtService.verifyToken(token) as { userId: string; email: string; role?: 'USER' | 'ADMIN' };
        } catch {
            throw new UnauthorizedError('Sessão inválida ou expirada');
        }

        const newToken = this.jwtService.generateToken({
            userId: payload.userId,
            email: payload.email,
            role: payload.role,
        });
        const csrfToken = this.issueSession(res, newToken);
        return ApiResponse.success(res, { csrfToken });
    });
}
