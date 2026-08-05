import { AppError } from '../../../../shared/errors/AppError';

export class ParkingNotFoundError extends AppError {
    constructor() {
        super('Estacionamento não encontrado', 404);
    }
}
