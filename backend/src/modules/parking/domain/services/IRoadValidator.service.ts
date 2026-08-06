import type { ParkingGeometryInput, ParkingType } from '../entities/ParkingSpot.entity';

export interface RoadValidationResult {
    ok: boolean;
    /** Motivo legível (PT-PT) quando ok === false. */
    reason?: string;
    /** true quando o Overpass não respondeu (falha/limite) — não bloqueia. */
    skipped?: boolean;
}

/**
 * Valida se um local é plausível para estacionar, contra a rede viária (OSM/Overpass):
 *  - rejeita autoestradas, vias rápidas, túneis, pontes/viadutos e rotundas;
 *  - rejeita pontos demasiado próximos do eixo da estrada (berma/carris);
 *  - para STREET exige uma estrada estacionável a menos de X metros.
 */
export interface IRoadValidator {
    validate(
        geometry: ParkingGeometryInput,
        parkingType: ParkingType
    ): Promise<RoadValidationResult>;
}
