import { Request, Response } from 'express';
import { injectable, inject } from 'tsyringe';
import { USER_TOKENS } from '../../../../shared/container/tokens/user.tokens';
import { CreateUserUseCase } from '../../application/usecases/CreateUser.usecase';
import { SetUserActiveUseCase } from '../../application/usecases/SetUserActive.usecase';
import { asyncHandler } from '../../../../shared/utils/async-handler';
import { ApiResponse } from '../../../../shared/utils/api-response';

@injectable()
export class UserController {
    constructor(
        @inject(USER_TOKENS.CreateUserUseCase) private readonly createUserUseCase: CreateUserUseCase,
        @inject(USER_TOKENS.SetUserActiveUseCase)
        private readonly setUserActiveUseCase: SetUserActiveUseCase
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
}
