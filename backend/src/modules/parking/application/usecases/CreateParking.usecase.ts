import { inject, injectable } from 'tsyringe';
import { PARKING_TOKENS } from '../../../../shared/container/tokens/parking.tokens';
import { USER_TOKENS } from '../../../../shared/container/tokens/user.tokens';
import { IUserRepository } from '../../../user/domain/repositories/IUser.repository';
import { IParkingRepository } from '../../domain/repositories/IParking.repository';
import { ITrustCalculator } from '../../domain/services/ITrustCalculator.service';
import { IReputationService } from '../../domain/services/IReputation.service';
import { IRoadValidator } from '../../domain/services/IRoadValidator.service';
import { assertEmailVerified } from '../../../auth/application/guards/email-verified.guard';
import { ParkingSpotEntity } from '../../domain/entities/ParkingSpot.entity';
import { DuplicateParkingError } from '../../domain/errors/DuplicateParking.error';
import { InvalidCoordinatesError } from '../../domain/errors/InvalidCoordinates.error';
import { TooManyRequestsError, ValidationError } from '../../../../shared/errors/AppError';
import { CreateParkingDTO } from '../dtos/CreateParking.dto';
import { CONTRIBUTION_LIMITS, DUPLICATE_RADIUS_METERS } from '../../domain/const';
import { getReferencePoint, isGeometryInsidePortugal } from '../../domain/geo';

export interface CreateParkingInput extends CreateParkingDTO {
    userId: string;
    userRole?: string;
}

/**
 * Auto-validação de uma contribuição da comunidade:
 *  - coordenadas dentro de Portugal (sempre)
 *  - limite diário de contribuições (anti-spam)
 *  - sem duplicados a menos de 30 metros
 *  - validação contra a rede viária (autoestradas, túneis, bermas...)
 * A contribuição entra como PENDING (revisão manual se for conta nova);
 * a comunidade vota e o TrustCalculator decide a transição de estado.
 */
@injectable()
export class CreateParkingUseCase {
    constructor(
        @inject(PARKING_TOKENS.IParkingRepository)
        private readonly parkingRepository: IParkingRepository,
        @inject(PARKING_TOKENS.ITrustCalculator)
        private readonly trustCalculator: ITrustCalculator,
        @inject(PARKING_TOKENS.IRoadValidator)
        private readonly roadValidator: IRoadValidator,
        @inject(PARKING_TOKENS.IReputationService)
        private readonly reputationService: IReputationService,
        @inject(USER_TOKENS.IUserRepository)
        private readonly userRepository: IUserRepository
    ) {}

    async execute(data: CreateParkingInput): Promise<ParkingSpotEntity> {
        // A conta tem de ter o email validado (anti-spam)
        await assertEmailVerified(this.userRepository, data.userId, data.userRole, 'adicionar estacionamentos');

        const [longitude, latitude] = getReferencePoint(data.geometry);

        // Todos os vértices têm de estar dentro de Portugal (fronteira real, não só bbox)
        if (!isGeometryInsidePortugal(data.geometry)) {
            throw new InvalidCoordinatesError();
        }

        const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const todayCount = await this.parkingRepository.countUserContributionsSince(data.userId, since);
        if (todayCount >= CONTRIBUTION_LIMITS.maxContributionsPerDay) {
            throw new TooManyRequestsError(
                `Atingiste o limite diário de ${CONTRIBUTION_LIMITS.maxContributionsPerDay} contribuições. Volta amanhã.`
            );
        }

        const nearby = await this.parkingRepository.findNearby(
            latitude,
            longitude,
            DUPLICATE_RADIUS_METERS
        );
        if (nearby.length > 0) {
            throw new DuplicateParkingError(nearby[0].id);
        }

        // Prevenção de locais inválidos (bermas, autoestradas, túneis, rotundas)
        const road = await this.roadValidator.validate(data.geometry, data.parkingType);
        if (!road.ok) {
            throw new ValidationError(road.reason ?? 'Este local não parece válido para estacionar.');
        }

        // Contas novas: as primeiras contribuições entram em fila de revisão manual
        const stats = await this.parkingRepository.getContributorStats(data.userId);
        const requiresReview =
            stats.total < CONTRIBUTION_LIMITS.firstContributionsRequireReview ||
            (await this.reputationService.getForUser(data.userId)).isNew;

        return this.parkingRepository.create({
            name: data.name,
            description: data.description ?? null,
            geometry: data.geometry,
            parkingType: data.parkingType,
            capacityRange: data.capacityRange ?? null,
            isFree: data.isFree ?? null,
            hasPregnantSpaces: data.hasPregnantSpaces ?? null,
            hasDisabledSpaces: data.hasDisabledSpaces ?? null,
            hasEvCharging: data.hasEvCharging ?? null,
            isCovered: data.isCovered ?? null,
            source: 'COMMUNITY',
            status: 'PENDING',
            trustScore: this.trustCalculator.baseTrust('COMMUNITY'),
            requiresReview,
            contributorId: data.userId,
        });
    }
}
