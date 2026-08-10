import { Request, Response } from 'express';
import { injectable, inject } from 'tsyringe';
import { USER_TOKENS } from '../../../../shared/container/tokens/user.tokens';
import { CreateUserUseCase } from '../../application/usecases/CreateUser.usecase';
import { SetUserActiveUseCase } from '../../application/usecases/SetUserActive.usecase';
import { DeleteAccountUseCase } from '../../application/usecases/DeleteAccount.usecase';
import { PushService } from '../../infrastructure/services/Push.service';
import { asyncHandler } from '../../../../shared/utils/async-handler';
import { ApiResponse } from '../../../../shared/utils/api-response';

@injectable()
export class UserController {
    constructor(
        @inject(USER_TOKENS.CreateUserUseCase) private readonly createUserUseCase: CreateUserUseCase,
        @inject(USER_TOKENS.SetUserActiveUseCase)
        private readonly setUserActiveUseCase: SetUserActiveUseCase,
        @inject(USER_TOKENS.DeleteAccountUseCase)
        private readonly deleteAccountUseCase: DeleteAccountUseCase,
        @inject(USER_TOKENS.PushService) private readonly pushService: PushService
    ) {}

    create = asyncHandler(async (req: Request, res: Response) => {
        const user = await this.createUserUseCase.execute(req.body);
        return ApiResponse.created(res, user);
    });

    /** Suspender/reativar conta (só admin). */
    setActive = asyncHandler(async (req: Request, res: Response) => {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const user = await this.setUserActiveUseCase.execute(id, req.body.isActive);
        return ApiResponse.success(res, user);
    });

    /** Eliminação da própria conta (RGPD), confirmada com a palavra-passe. */
    deleteMe = asyncHandler(async (req: Request, res: Response) => {
        await this.deleteAccountUseCase.execute(req.user!.userId, req.body.password);
        return ApiResponse.noContent(res);
    });

    /** Regista o token Expo Push do dispositivo atual. */
    registerPushToken = asyncHandler(async (req: Request, res: Response) => {
        await this.pushService.registerToken(req.user!.userId, req.body.token);
        return ApiResponse.success(res, { registered: true });
    });
}
