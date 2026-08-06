import { inject, injectable } from 'tsyringe';
import { prisma } from '../../../../lib/prisma';
import { PARKING_TOKENS } from '../../../../shared/container/tokens/parking.tokens';
import { IParkingRepository } from '../../domain/repositories/IParking.repository';
import { IReputationService, UserReputation } from '../../domain/services/IReputation.service';
import { CONTRIBUTION_LIMITS } from '../../domain/const';

/**
 * Reputação 0-10 de um contribuinte:
 *  - +2 por contribuição aprovada (máx. 8)
 *  - +0.5 por contribuição pendente (máx. 2)
 *  - +0.1 por voto positivo recebido (máx. 2)
 *  - -0.3 por voto negativo recebido
 *  - +1 por conta com mais de 30 dias
 * Confiável (>= 5): vota com peso 1 e edita parques alheios diretamente.
 * Novos/desconhecidos: votam com peso 0.5 e propõem sugestões (fila de moderação).
 */
@injectable()
export class ReputationService implements IReputationService {
    constructor(
        @inject(PARKING_TOKENS.IParkingRepository)
        private readonly parkingRepository: IParkingRepository
    ) {}

    async getForUser(userId: string): Promise<UserReputation> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { createdAt: true },
        });
        const stats = await this.parkingRepository.getContributorStats(userId);

        const hoursOld = user ? (Date.now() - user.createdAt.getTime()) / 3_600_000 : Number.POSITIVE_INFINITY;
        const isNew = !user || hoursOld < CONTRIBUTION_LIMITS.newAccountHours;

        let score = 0;
        score += Math.min(stats.approved * 2, 8);
        score += Math.min(stats.pending * 0.5, 2);
        score += Math.min(stats.votesReceivedUp * 0.1, 2);
        score -= stats.votesReceivedDown * 0.3;
        if (hoursOld > 30 * 24) {
            score += 1;
        }
        score = Math.round(Math.min(10, Math.max(0, score)) * 10) / 10;

        const isTrusted = score >= CONTRIBUTION_LIMITS.trustedReputationThreshold;

        return {
            score,
            isTrusted,
            isNew,
            voteWeight: isTrusted && !isNew ? 1 : CONTRIBUTION_LIMITS.newUserVoteWeight,
        };
    }
}
