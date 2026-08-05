import { AppError } from '../../../../shared/errors/AppError';

export class InvalidParkingActionError extends AppError {
    constructor(message: string) {
        super(message, 400);
    }
}
