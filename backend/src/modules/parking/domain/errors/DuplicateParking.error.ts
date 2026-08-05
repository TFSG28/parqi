import { AppError } from '../../../../shared/errors/AppError';

export class DuplicateParkingError extends AppError {
    constructor(
        public readonly existingId: string,
        message = 'Já existe um estacionamento registado perto deste local'
    ) {
        super(message, 409, true, { existingId });
    }
}
