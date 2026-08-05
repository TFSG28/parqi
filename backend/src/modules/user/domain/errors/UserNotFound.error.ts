import { NotFoundError } from '../../../../shared/errors/AppError';

export class UserNotFoundError extends NotFoundError {
    constructor(message = 'Usuário não encontrado') {
        super(message);
    }
}
