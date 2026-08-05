import { Request, Response } from 'express';
import { injectable, inject } from 'tsyringe';
import { USER_TOKENS } from '../../../../shared/container/tokens/user.tokens';
import { CreateUserUseCase } from '../../application/usecases/CreateUser.usecase';
import { asyncHandler } from '../../../../shared/utils/async-handler';
import { ApiResponse } from '../../../../shared/utils/api-response';

@injectable()
export class UserController {
    constructor(
        @inject(USER_TOKENS.CreateUserUseCase) private readonly createUserUseCase: CreateUserUseCase
    ) {}

    create = asyncHandler(async (req: Request, res: Response) => {
        const user = await this.createUserUseCase.execute(req.body);
        return ApiResponse.created(res, user);
    });
}
