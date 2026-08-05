import { Request, Response } from 'express';
import { injectable, inject } from 'tsyringe';
import { randomBytes } from 'node:crypto';
import { AUTH_TOKENS } from '../../../../shared/container/tokens/auth.tokens';
import { LoginUseCase } from '../../application/usecases/Login.usecase';
import { GetCurrentUserUseCase } from '../../application/usecases/GetCurrentUser.usecase';
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
        return ApiResponse.success(res, { user: result.user, csrfToken });
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

    // Re-issues the access token + CSRF token while the current session is still
    // valid (sliding window). Fails with 401 once the access token has expired.
    refresh = asyncHandler(async (req: Request, res: Response) => {
        const token = req.cookies?.[ACCESS_TOKEN_COOKIE];
        if (!token) {
            throw new UnauthorizedError('Não autenticado');
        }

        let payload: { userId: string; email: string };
        try {
            payload = this.jwtService.verifyToken(token) as { userId: string; email: string };
        } catch {
            throw new UnauthorizedError('Sessão inválida ou expirada');
        }

        const newToken = this.jwtService.generateToken({ userId: payload.userId, email: payload.email });
        const csrfToken = this.issueSession(res, newToken);
        return ApiResponse.success(res, { csrfToken });
    });
}
