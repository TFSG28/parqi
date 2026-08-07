import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { OsmImporter } from './OsmImporter.service';
import type { IParkingRepository } from '../../domain/repositories/IParking.repository';

function makeRepository(): IParkingRepository {
    return {
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
}

const lisboaNode = {
    type: 'node',
    id: 1,
    lat: 38.7223,
    lon: -9.1393,
    tags: { name: 'Parque das Amoreiras', parking: 'underground' },
};

const madeiraNode = {
    type: 'node',
    id: 2,
    lat: 32.6669,
    lon: -16.9241,
    tags: { parking: 'surface' },
};

const madridNode = {
    type: 'node',
    id: 3,
    lat: 40.4168,
    lon: -3.7038,
    tags: { parking: 'surface' },
};

const azoresNode = {
    type: 'node',
    id: 4,
    lat: 37.7394,
    lon: -25.6687,
    tags: { parking: 'surface' },
};

describe('OsmImporter', () => {
    let importer: OsmImporter;
    let repository: IParkingRepository;

    beforeEach(() => {
        repository = makeRepository();
        vi.mocked(repository.findByExternalId).mockResolvedValue(null);
        vi.mocked(repository.findNearby).mockResolvedValue([]);
        vi.mocked(repository.create).mockResolvedValue({ id: 'new' } as never);
        importer = new OsmImporter(repository);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('importa por bbox e rejeita pontos fora de Portugal', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
                    elements: [lisboaNode, madridNode], // Madrid fica fora (isInsidePortugal)
                }),
            })
        );

        const result = await importer.importRegion('continente');

        expect(result.region).toBe('continente');
        expect(result.imported).toBe(1);
        expect(result.skipped).toBe(1);
        expect(vi.mocked(repository.create).mock.calls[0][0]).toMatchObject({
            source: 'OVERPASS',
            externalId: 'node:1',
            status: 'APPROVED',
            parkingType: 'UNDERGROUND',
        });
    });

    it('faz a query com a bbox correta da região', async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValue({ ok: true, json: async () => ({ elements: [] }) });
        vi.stubGlobal('fetch', fetchMock);

        await importer.importRegion('madeira');

        const url = String(fetchMock.mock.calls[0][0]);
        const query = decodeURIComponent(url.split('data=')[1]);
        expect(query).toContain('node["amenity"="parking"](32.3,-17.5,33.2,-16.2)');
        expect(query).toContain('way["amenity"="parking"](32.3,-17.5,33.2,-16.2)');
    });

    it('cobre as três regiões em importAll e soma os totais', async () => {
        // devolve apenas os elementos dentro da bbox pedida (extraída da URL)
        const fetchMock = vi.fn().mockImplementation(async (url: string) => {
            const query = decodeURIComponent(String(url).split('data=')[1]);
            const match = query.match(/\(([0-9.-]+),([0-9.-]+),([0-9.-]+),([0-9.-]+)\)/);
            const [, s, w, n, e] = match!.map(Number);
            const inside = (el: { lat: number; lon: number }) =>
                el.lat >= s && el.lat <= n && el.lon >= w && el.lon <= e;
            return {
                ok: true,
                json: async () => ({
                    elements: [lisboaNode, madeiraNode, azoresNode].filter(inside),
                }),
            };
        });
        vi.stubGlobal('fetch', fetchMock);

        const result = await importer.importAll();

        expect(result.regions.map((r) => r.region)).toEqual([
            'continente',
            'madeira',
            'acores',
        ]);
        // cada região importa apenas os elementos do seu território
        expect(result.imported).toBe(3);
        expect(vi.mocked(repository.create)).toHaveBeenCalledTimes(3);
    });

    it('propaga erros da API Overpass', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({ ok: false, status: 429, text: async () => 'rate limited' })
        );

        await expect(importer.importRegion('continente')).rejects.toThrow(/429/);
    });
});
