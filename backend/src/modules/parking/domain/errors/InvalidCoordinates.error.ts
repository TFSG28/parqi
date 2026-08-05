import { AppError } from '../../../../shared/errors/AppError';

export class InvalidCoordinatesError extends AppError {
    constructor(message = 'As coordenadas devem estar dentro de Portugal') {
        super(message, 400);
    }
}
