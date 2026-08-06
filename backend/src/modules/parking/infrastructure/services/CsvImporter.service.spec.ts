import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CsvImporter, parseCsv } from './CsvImporter.service';
import type { IParkingRepository } from '../../domain/repositories/IParking.repository';

describe('parseCsv', () => {
    it('faz parse de CSV simples com vírgulas', () => {
        const rows = parseCsv('name,latitude,longitude\nParque A,41.44,-8.29\n');
        expect(rows).toEqual([{ name: 'Parque A', latitude: '41.44', longitude: '-8.29' }]);
    });

    it('suporta delimitador ; com vírgula decimal (padrão PT)', () => {
        const rows = parseCsv('nome;lat;lon\nParque B;41,44;-8,29\n');
        expect(rows).toEqual([{ nome: 'Parque B', lat: '41,44', lon: '-8,29' }]);
    });

    it('suporta aspas com delimitadores e quebras de linha dentro do campo', () => {
        const rows = parseCsv('name,notes\n"Parque, Central","linha 1\nlinha 2"\n');
        expect(rows).toEqual([{ name: 'Parque, Central', notes: 'linha 1\nlinha 2' }]);
    });

    it('devolve lista vazia para conteúdo vazio', () => {
        expect(parseCsv('')).toEqual([]);
        expect(parseCsv('\n\n')).toEqual([]);
    });
});

describe('CsvImporter', () => {
    let importer: CsvImporter;
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
        vi.mocked(mockRepository.create).mockResolvedValue({ id: 'new' } as never);

        importer = new CsvImporter(mockRepository);
    });

    it('importa linhas válidas como MUNICIPAL aprovado', async () => {
        const csv = 'name,latitude,longitude\nParque Central,41.44,-8.29\n';

        const result = await importer.importFromCsv(csv, { dataset: 'cm-guimaraes' });

        expect(result).toEqual({ imported: 1, skipped: 0, errors: 0 });
        expect(mockRepository.create).toHaveBeenCalledWith({
            name: 'Parque Central',
            description: null,
            geometry: { type: 'Point', coordinates: [-8.29, 41.44] },
            parkingType: 'OTHER',
            capacityRange: null,
            isFree: null,
            source: 'MUNICIPAL',
            externalId: 'cm-guimaraes:41.440000,-8.290000',
            status: 'APPROVED',
            trustScore: 7,
        });
    });

    it('usa colunas personalizadas e id do dataset', async () => {
        const csv = 'id;designacao;y;x\nP01;Parque do Toural;41,44;-8,29\n';

        const result = await importer.importFromCsv(csv, {
            dataset: 'cm-guimaraes',
            idColumn: 'id',
            nameColumn: 'designacao',
            latColumn: 'y',
            lonColumn: 'x',
        });

        expect(result.imported).toBe(1);
        expect(mockRepository.create).toHaveBeenCalledWith(
            expect.objectContaining({
                name: 'Parque do Toural',
                externalId: 'cm-guimaraes:P01',
                geometry: { type: 'Point', coordinates: [-8.29, 41.44] },
            })
        );
    });

    it('salta linhas com coordenadas inválidas', async () => {
        const csv = 'name,latitude,longitude\nSem coords,,\nFora de alcance,120,-8.29\nOK,41.44,-8.29\n';

        const result = await importer.importFromCsv(csv, { dataset: 'ds' });

        expect(result).toEqual({ imported: 1, skipped: 2, errors: 0 });
    });

    it('salta linhas já importadas (dedup por externalId)', async () => {
        vi.mocked(mockRepository.findByExternalId).mockResolvedValue({ id: 'existing' } as never);
        const csv = 'name,latitude,longitude\nParque,41.44,-8.29\n';

        const result = await importer.importFromCsv(csv, { dataset: 'ds' });

        expect(result).toEqual({ imported: 0, skipped: 1, errors: 0 });
        expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('salta linhas já cobertas por outra fonte (dedup cross-source)', async () => {
        vi.mocked(mockRepository.findNearby).mockResolvedValue([
            { id: 'osm-spot', source: 'OVERPASS' } as never,
        ]);
        const csv = 'name,latitude,longitude\nParque,41.44,-8.29\n';

        const result = await importer.importFromCsv(csv, { dataset: 'ds' });

        expect(result).toEqual({ imported: 0, skipped: 1, errors: 0 });
    });
});
