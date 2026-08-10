import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { FavoritesProvider, useFavorites } from '../FavoritesContext';
import type { ParkingSpot } from '../../types/parking';

const STORAGE_KEY = 'parqi.favorites';

function makeSpot(overrides: Partial<ParkingSpot> = {}): ParkingSpot {
    return {
        id: 'spot-1',
        name: 'Parque do Toural',
        description: null,
        latitude: 41.44,
        longitude: -8.29,
        geometry: null,
        geometryType: 'POINT',
        parkingType: 'SURFACE',
        capacityRange: null,
        isFree: true,
        hasPregnantSpaces: null,
        hasDisabledSpaces: null,
        hasEvCharging: null,
        isCovered: null,
        source: 'COMMUNITY',
        status: 'APPROVED',
        trustScore: 6,
        requiresReview: false,
        contributorId: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        ...overrides,
    } as ParkingSpot;
}

const wrapper = ({ children }: { children: ReactNode }) => (
    <FavoritesProvider>{children}</FavoritesProvider>
);

beforeEach(() => {
    (AsyncStorage.clear as jest.Mock).mockClear();
    return AsyncStorage.clear();
});

describe('FavoritesContext', () => {
    it('começa vazio e adiciona/remove com toggleFavorite', async () => {
        const { result } = await renderHook(() => useFavorites(), { wrapper });
        expect(result.current.favorites).toHaveLength(0);

        await act(() => result.current.toggleFavorite(makeSpot()));
        expect(result.current.favorites).toHaveLength(1);
        expect(result.current.isFavorite('spot-1')).toBe(true);

        await act(() => result.current.toggleFavorite(makeSpot()));
        expect(result.current.favorites).toHaveLength(0);
        expect(result.current.isFavorite('spot-1')).toBe(false);
    });

    it('persiste no AsyncStorage e recarrega na sessão seguinte', async () => {
        const first = await renderHook(() => useFavorites(), { wrapper });
        await act(() => first.result.current.toggleFavorite(makeSpot()));
        await waitFor(async () => {
            expect(await AsyncStorage.getItem(STORAGE_KEY)).toContain('spot-1');
        });
        await first.unmount();

        const second = await renderHook(() => useFavorites(), { wrapper });
        await waitFor(() => {
            expect(second.result.current.isFavorite('spot-1')).toBe(true);
        });
    });

    it('refreshFavorite atualiza o snapshot só se já for favorito', async () => {
        const { result } = await renderHook(() => useFavorites(), { wrapper });

        await act(() => result.current.refreshFavorite(makeSpot()));
        expect(result.current.favorites).toHaveLength(0);

        await act(() => result.current.toggleFavorite(makeSpot()));
        await act(() => result.current.refreshFavorite(makeSpot({ name: 'Nome novo', trustScore: 8 })));
        expect(result.current.favorites[0].name).toBe('Nome novo');
        expect(result.current.favorites[0].trustScore).toBe(8);
    });
});
