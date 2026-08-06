import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { OverpassImporter } from './OverpassImporter.service';
import type { IParkingRepository } from '../../domain/repositories/IParking.repository';

const nodeElement = {
    type: 'node',
    id: 123,
    lat: 41.44,
    lon: -8.29,
    tags: { name: 'Parque Central', parking: 'surface', capacity: '40', fee: 'no' },
};

const wayElement = {
    type: 'way',
    id: 456,
    geometry: [
        { lat: 41.441, lon: -8.291 },
        { lat: 41.441, lon: -8.290 },
        { lat: 41.442, lon: -8.290 },
        { lat: 41.442, lon: -8.291 },
        { lat: 41.441, lon: -8.291 },
    ],
    tags: { parking: 'underground' },
};

const privateNode = {
    type: 'node',
    id: 999,
    lat: 41.5,
    lon: -8.5,
    tags: { access: 'private' },
};

describe('OverpassImporter', () => {
    let importer: OverpassImporter;
    let mockRepository: IParkingRepository;

    beforeEach(() => {
        mockRepository = {
            create: vi.fn(),
            findById: vi.fn(),
            findByExternalId: vi.fn(),
            findNearby: vi.fn(),
            list: vi.fn(),
            getGeometry: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
            getVote: vi.fn(),
            upsertVote: vi.fn(),
            getVoteSummary: vi.fn(),
            createModerationLog: vi.fn(),
            countUserContributionsSince: vi.fn(),
            countUserVotesSince: vi.fn(),
            getContributorStats: vi.fn(),
        } as unknown as IParkingRepository;

        vi.mocked(mockRepository.findByExternalId).mockResolvedValue(null);
        vi.mocked(mockRepository.findNearby).mockResolvedValue([]);
        vi.mocked(mockRepository.create).mockResolvedValue({
            id: 'new',
            name: '',
            description: null,
            latitude: 0,
            longitude: 0,
            geometryType: 'POINT',
            parkingType: 'OTHER',
            capacityRange: null,
            isFree: null,
            hasPregnantSpaces: null,
            hasDisabledSpaces: null,
            hasEvCharging: null,
            isCovered: null,
            source: 'OVERPASS',
            externalId: '',
            status: 'APPROVED',
            trustScore: 6,
            requiresReview: false,
            duplicateOfId: null,
            contributorId: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        importer = new OverpassImporter(mockRepository);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('importa nodes e ways com mapeamento correto das tags OSM', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ elements: [nodeElement, wayElement, privateNode] }),
            })
        );

        const result = await importer.importByCity('Guimarães');

        // node importado + way importado; privado saltado
        expect(result).toEqual({ city: 'Guimarães', imported: 2, skipped: 1, errors: 0 });

        const createCalls = vi.mocked(mockRepository.create).mock.calls.map((c) => c[0]);
        const nodeCall = createCalls.find((c) => c.externalId === 'node:123');
        const wayCall = createCalls.find((c) => c.externalId === 'way:456');

        expect(nodeCall).toMatchObject({
            name: 'Parque Central',
            parkingType: 'SURFACE',
            capacityRange: 'RANGE_21_50',
            isFree: true,
            status: 'APPROVED',
            trustScore: 6,
            geometry: { type: 'Point', coordinates: [-8.29, 41.44] },
        });

        expect(wayCall).toMatchObject({
            parkingType: 'UNDERGROUND',
            status: 'APPROVED',
            trustScore: 6,
        });
        expect(wayCall?.geometry.type).toBe('Polygon');
    });

    it('salta elementos já existentes (dedup por externalId)', async () => {
        vi.mocked(mockRepository.findByExternalId).mockImplementation(async (_source, externalId) =>
            externalId === 'node:123' ? ({ id: 'existing' } as never) : null
        );
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ elements: [nodeElement, wayElement] }),
            })
        );

        const result = await importer.importByCity('Guimarães');

        expect(result.skipped).toBe(1);
        expect(result.imported).toBe(1);
    });

    it('salta elementos já cobertos por outra fonte (dedup cross-source)', async () => {
        vi.mocked(mockRepository.findNearby).mockResolvedValue([
            { id: 'geo-spot', source: 'GEOAPIFY' } as never,
        ]);
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ elements: [nodeElement] }),
            })
        );

        const result = await importer.importByCity('Guimarães');

        expect(result.imported).toBe(0);
        expect(result.skipped).toBe(1);
    });

    it('propaga erros da API Overpass', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({ ok: false, status: 429, text: async () => 'rate limited' })
        );

        await expect(importer.importByCity('Guimarães')).rejects.toThrow(/429/);
    });
});
