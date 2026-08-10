import { injectable } from 'tsyringe';
import type { ContributionStatus, DataSource } from '../../domain/entities/ParkingSpot.entity';
import type {
    ITrustCalculator,
    TrustResult,
    VoteSummary,
} from '../../domain/services/ITrustCalculator.service';

/**
 * Regras de confiança (0 a 10):
 *  - Confiança base por fonte: dados oficiais/importados têm mais crédito que a comunidade.
 *  - Upvote: +1.5 | Downvote: -2
 *  - PENDING  -> APPROVED quando confiança >= 5
 *  - APPROVED -> FLAGGED  quando confiança < 3 (entra em fila de moderação manual)
 *  - FLAGGED  -> APPROVED quando a comunidade recupera a confiança >= 5
 *  - Qualquer estado -> REJECTED quando a pontuação bruta cai a -2 ou menos
 *    (>= 2 downvotes líquidos de peso total; a comunidade rejeita sozinha, sem admin)
 *  - REJECTED nunca muda automaticamente (só admin)
 */
@injectable()
export class TrustCalculator implements ITrustCalculator {
    private readonly BASE_TRUST: Record<DataSource, number> = {
        COMMUNITY: 2,
        OVERPASS: 6,
        GEOAPIFY: 6,
        MUNICIPAL: 7,
    };
    private readonly UPVOTE_WEIGHT = 1.5;
    private readonly DOWNVOTE_WEIGHT = -2;
    private readonly APPROVE_THRESHOLD = 5;
    private readonly FLAG_THRESHOLD = 3;
    private readonly REJECT_RAW_THRESHOLD = -2;
    private readonly MAX = 10;
    private readonly MIN = 0;

    baseTrust(source: DataSource): number {
        return this.BASE_TRUST[source] ?? 0;
    }

    apply(source: DataSource, currentStatus: ContributionStatus, votes: VoteSummary): TrustResult {
        const raw =
            this.baseTrust(source) +
            votes.upvotes * this.UPVOTE_WEIGHT +
            votes.downvotes * this.DOWNVOTE_WEIGHT;

        const trustScore =
            Math.round(Math.min(this.MAX, Math.max(this.MIN, raw)) * 10) / 10;

        if (currentStatus === 'REJECTED') {
            return { trustScore, status: currentStatus };
        }

        // Rejeição automática pela comunidade: usa a pontuação bruta (sem clamp)
        // para exigir sinal negativo real, não apenas um downvote num spot novo.
        if (raw <= this.REJECT_RAW_THRESHOLD) {
            return { trustScore, status: 'REJECTED' };
        }

        let status = currentStatus;
        if (status === 'PENDING' && trustScore >= this.APPROVE_THRESHOLD) {
            status = 'APPROVED';
        } else if (status === 'APPROVED' && trustScore < this.FLAG_THRESHOLD) {
            status = 'FLAGGED';
        } else if (status === 'FLAGGED' && trustScore >= this.APPROVE_THRESHOLD) {
            status = 'APPROVED';
        }

        return { trustScore, status };
    }
}
