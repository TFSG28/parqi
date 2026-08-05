import type { ContributionStatus, DataSource } from '../entities/ParkingSpot.entity';

export interface VoteSummary {
    upvotes: number;
    downvotes: number;
}

export interface TrustResult {
    trustScore: number;
    status: ContributionStatus;
}

/**
 * Calcula a métrica de confiança de um estacionamento com base na fonte
 * de dados e nos votos da comunidade (validação híbrida).
 */
export interface ITrustCalculator {
    baseTrust(source: DataSource): number;
    apply(source: DataSource, currentStatus: ContributionStatus, votes: VoteSummary): TrustResult;
}
