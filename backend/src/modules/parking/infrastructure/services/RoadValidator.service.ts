import { injectable } from 'tsyringe';
import { env } from '../../../../config/env';
import type { ParkingGeometryInput, ParkingType } from '../../domain/entities/ParkingSpot.entity';
import {
    IRoadValidator,
    RoadValidationResult,
} from '../../domain/services/IRoadValidator.service';
import { getReferencePoint } from '../../domain/geo';
import { CONTRIBUTION_LIMITS } from '../../domain/const';

interface OverpassWay {
    id: number;
    tags?: Record<string, string>;
    geometry?: { lat: number; lon: number }[];
}

/** Classes de via onde estacionar é proibido. */
const FORBIDDEN_HIGHWAYS = new Set([
    'motorway',
    'motorway_link',
    'trunk',
    'trunk_link',
    'construction',
]);

/** Classes de via onde estacionar na via (STREET) é razoável. */
const STREET_OK_HIGHWAYS = new Set([
    'residential',
    'living_street',
    'service',
    'unclassified',
    'tertiary',
    'tertiary_link',
    'secondary',
    'secondary_link',
    'primary',
    'primary_link',
]);

const RADIUS = CONTRIBUTION_LIMITS.roadValidationRadiusMeters;
const MIN_DISTANCE = CONTRIBUTION_LIMITS.minDistanceToRoadCenterline;

/** Distância (m) de um ponto a um segmento, em projeção local. */
function distanceToSegment(
    lat: number,
    lon: number,
    a: { lat: number; lon: number },
    b: { lat: number; lon: number }
): number {
    const lat0 = lat;
    const cosLat = Math.cos((lat0 * Math.PI) / 180);
    const mx = 111_320 * cosLat;
    const my = 110_540;
    const px = lon * mx;
    const py = lat * my;
    const ax = a.lon * mx;
    const ay = a.lat * my;
    const bx = b.lon * mx;
    const by = b.lat * my;

    const dx = bx - ax;
    const dy = by - ay;
    if (dx === 0 && dy === 0) {
        return Math.hypot(px - ax, py - ay);
    }
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function wayDistance(
    lat: number,
    lon: number,
    geometry: { lat: number; lon: number }[]
): number {
    if (geometry.length < 2) {
        return Number.POSITIVE_INFINITY;
    }
    let min = Number.POSITIVE_INFINITY;
    for (let i = 0; i < geometry.length - 1; i++) {
        min = Math.min(min, distanceToSegment(lat, lon, geometry[i], geometry[i + 1]));
        if (min < 0.1) break;
    }
    return min;
}

/**
 * Validação contra a rede viária (OpenStreetMap via Overpass API).
 * Falhas de rede/limite são "skipped" (não bloqueiam) — a comunidade valida depois.
 */
@injectable()
export class RoadValidator implements IRoadValidator {
    private readonly cache = new Map<string, RoadValidationResult>();

    async validate(
        geometry: ParkingGeometryInput,
        parkingType: ParkingType
    ): Promise<RoadValidationResult> {
        const [lon, lat] = getReferencePoint(geometry);
        const cacheKey = `${lat.toFixed(4)},${lon.toFixed(4)}:${parkingType}`;
        const cached = this.cache.get(cacheKey);
        if (cached) {
            return cached;
        }

        const result = await this.check(lat, lon, parkingType);
        this.cache.set(cacheKey, result);
        return result;
    }

    private async check(
        lat: number,
        lon: number,
        parkingType: ParkingType
    ): Promise<RoadValidationResult> {
        try {
            const query = [
                '[out:json][timeout:15];',
                `way(around:${RADIUS},${lat},${lon})[highway];`,
                'out tags geom;',
            ].join('');

            const url = `${env.OVERPASS_API_URL}?data=${encodeURIComponent(query)}`;
            const response = await fetch(url, {
                headers: { 'User-Agent': 'parqi/1.0 (api.parqi.pt)' },
                signal: AbortSignal.timeout(12_000),
            });
            if (!response.ok) {
                return { ok: true, skipped: true };
            }
            const data = (await response.json()) as { elements?: OverpassWay[] };
            const ways = data.elements ?? [];
            if (ways.length === 0) {
                return {
                    ok: false,
                    reason: 'Não encontrámos nenhuma estrada perto — verifica se o local está correto.',
                };
            }

            const nearest: { distance: number; tags: Record<string, string> }[] = [];

            for (const way of ways) {
                const geometry = way.geometry ?? [];
                if (geometry.length < 2) continue;
                const distance = wayDistance(lat, lon, geometry);
                nearest.push({ distance, tags: way.tags ?? {} });
            }

            nearest.sort((a, b) => a.distance - b.distance);

            // Autoestradas / vias rápidas / construção
            const forbidden = nearest.find(
                (w) =>
                    FORBIDDEN_HIGHWAYS.has(w.tags.highway ?? '') &&
                    w.distance < RADIUS * 0.8
            );
            if (forbidden) {
                return {
                    ok: false,
                    reason:
                        'Este local está numa autoestrada ou via rápida, onde estacionar é proibido.',
                };
            }

            // Túneis e rotundas
            const tunnel = nearest.find((w) => w.tags.tunnel === 'yes' && w.distance < 10);
            if (tunnel) {
                return {
                    ok: false,
                    reason: 'Este local parece estar dentro de um túnel, onde não se pode estacionar.',
                };
            }
            const roundabout = nearest.find(
                (w) => w.tags.junction === 'roundabout' && w.distance < 10
            );
            if (roundabout) {
                return {
                    ok: false,
                    reason: 'Este local está numa rotunda — não se pode estacionar aqui.',
                };
            }

            // Estacionamento na via: exige estrada estacionável por perto
            if (parkingType === 'STREET') {
                const okRoad = nearest.some(
                    (w) => STREET_OK_HIGHWAYS.has(w.tags.highway ?? '') && w.distance <= RADIUS
                );
                if (!okRoad) {
                    return {
                        ok: false,
                        reason:
                            'Não parece ser ao longo de uma estrada onde se possa estacionar. Escolhe uma via residencial ou local.',
                    };
                }
                // "Berma": demasiado perto do eixo da via (em cima dos carris)
                if (nearest[0] && nearest[0].distance < MIN_DISTANCE) {
                    return {
                        ok: false,
                        reason:
                            'O local parece estar em cima da estrada ou numa berma. Coloca o estacionamento ao lado da via, não sobre ela.',
                    };
                }
            }

            return { ok: true };
        } catch {
            // Falha de rede / timeout: não bloqueia a contribuição
            return { ok: true, skipped: true };
        }
    }
}
