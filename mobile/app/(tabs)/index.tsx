import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HeroSection } from '../../src/components/HeroSection';
import { Onboarding } from '../../src/components/Onboarding';
import { SearchBar } from '../../src/components/SearchBar';
import { SpotCard } from '../../src/components/SpotCard';
import { SpotCardSkeleton } from '../../src/components/SpotCardSkeleton';
import { parkingApi } from '../../src/lib/api';
import { useFavorites } from '../../src/context/FavoritesContext';
import { useTheme } from '../../src/context/ThemeContext';
import { distanceKm, regionToBbox, type Region } from '../../src/lib/geo';
import type { ThemeColors } from '../../src/theme/colors';
import type { ParkingSpot } from '../../src/types/parking';

const DEFAULT_REGION: Region = {
    latitude: 38.7369,
    longitude: -9.1427,
    latitudeDelta: 0.06,
    longitudeDelta: 0.06,
};

/** Relance ao volante: só os mais próximos à cabeça; o resto a pedido. */
const NEARBY_COUNT = 5;

/** Placeholder usado para os skeletons durante a primeira carga. */
const SKELETON_PLACEHOLDER = { _skeleton: true } as const;
type ListItem = ParkingSpot | typeof SKELETON_PLACEHOLDER;

interface LatLng {
    latitude: number;
    longitude: number;
}

export default function ListScreen() {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const { favorites } = useFavorites();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const lastBbox = useRef(regionToBbox(DEFAULT_REGION));

    const [userLocation, setUserLocation] = useState<LatLng | null>(null);
    const [spots, setSpots] = useState<ParkingSpot[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetchFailed, setFetchFailed] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<ParkingSpot[] | null>(null);
    const [showAll, setShowAll] = useState(false);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [onboardingChecked, setOnboardingChecked] = useState(false);

    // Verifica se o onboarding já foi visto
    useEffect(() => {
        AsyncStorage.getItem('parqi.onboarding_done')
            .then((val) => {
                if (val !== '1') setShowOnboarding(true);
            })
            .catch(() => { })
            .finally(() => setOnboardingChecked(true));
    }, []);

    const fetchSpots = useCallback(async (bbox: string) => {
        lastBbox.current = bbox;
        setLoading(true);
        try {
            const items = await parkingApi.list(bbox);
            setSpots(items);
            setFetchFailed(false);
        } catch {
            // mantém os últimos resultados, mas mostra o aviso
            setFetchFailed(true);
        } finally {
            setLoading(false);
        }
    }, []);

    const verifiedSpots = useMemo(
        () => spots.filter((s) => s.status === 'APPROVED').length,
        [spots],
    );

    // Primeira carga (sem localização) — mostra skeletons logo no arranque
    const isFirstLoad = loading && spots.length === 0;

    // Primeira carga + tentativa de centrar na localização do utilizador
    useEffect(() => {
        fetchSpots(regionToBbox(DEFAULT_REGION));
        (async () => {
            try {
                const perm = await Location.getForegroundPermissionsAsync();
                const status = perm.status === 'granted'
                    ? 'granted'
                    : (await Location.requestForegroundPermissionsAsync()).status;
                if (status === 'granted') {
                    // última posição conhecida primeiro: ordena e carrega já, sem esperar pelo GPS
                    const last = await Location.getLastKnownPositionAsync();
                    if (last) {
                        const quick = { latitude: last.coords.latitude, longitude: last.coords.longitude };
                        setUserLocation(quick);
                        fetchSpots(regionToBbox({ ...quick, latitudeDelta: 0.03, longitudeDelta: 0.03 }));
                    }
                    const loc = await Location.getCurrentPositionAsync({});
                    const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
                    setUserLocation(coords);
                    fetchSpots(regionToBbox({ ...coords, latitudeDelta: 0.03, longitudeDelta: 0.03 }));
                }
            } catch {
                // sem permissão de localização - mantém a região inicial
            }
        })();
    }, [fetchSpots]);

    // Pesquisa via servidor (nome, todo o país) com debounce; enquanto a
    // resposta não chega, o filtro local sobre o viewport dá resposta imediata
    useEffect(() => {
        const q = searchQuery.trim();
        if (q.length < 2) {
            setSearchResults(null);
            return;
        }
        const timer = setTimeout(async () => {
            try {
                setSearchResults(await parkingApi.search(q));
            } catch {
                setSearchResults(null); // sem servidor, fica o filtro local
            }
        }, 350);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Lista ordenada por proximidade + filtrada por pesquisa
    const displayedSpots = useMemo(() => {
        const source = searchResults ?? spots;
        const base = userLocation ? [...source].sort((a, b) => {
            const da = a.latitude !== null && a.longitude !== null
                ? distanceKm(userLocation.latitude, userLocation.longitude, a.latitude, a.longitude)
                : Number.POSITIVE_INFINITY;
            const db = b.latitude !== null && b.longitude !== null
                ? distanceKm(userLocation.latitude, userLocation.longitude, b.latitude, b.longitude)
                : Number.POSITIVE_INFINITY;
            return da - db;
        }) : source;

        const q = searchQuery.trim().toLowerCase();
        if (!q || searchResults) return base;
        return base.filter((s) => s.name.toLowerCase().includes(q));
    }, [spots, searchResults, userLocation, searchQuery]);

    // Favoritos: snapshot local, substituído por dados frescos quando estão no viewport
    const favoriteSpots = useMemo(() => {
        const merged = favorites.map((f) => spots.find((s) => s.id === f.id) ?? f);
        if (!userLocation) return merged;
        return [...merged].sort((a, b) => {
            const da = a.latitude !== null && a.longitude !== null
                ? distanceKm(userLocation.latitude, userLocation.longitude, a.latitude, a.longitude)
                : Number.POSITIVE_INFINITY;
            const db = b.latitude !== null && b.longitude !== null
                ? distanceKm(userLocation.latitude, userLocation.longitude, b.latitude, b.longitude)
                : Number.POSITIVE_INFINITY;
            return da - db;
        });
    }, [favorites, spots, userLocation]);

    // Só os 5 mais próximos à partida; pesquisa e "Mostrar mais" revelam o resto
    const isSearching = searchQuery.trim().length > 0;
    const visibleSpots = isSearching || showAll ? displayedSpots : displayedSpots.slice(0, NEARBY_COUNT);
    const hiddenCount = displayedSpots.length - visibleSpots.length;

    const errorPill = fetchFailed && (
        <Pressable
            style={styles.errorPill}
            onPress={() => fetchSpots(lastBbox.current)}
            accessibilityLabel="Sem ligação ao servidor. Tentar de novo"
        >
            <Ionicons name="cloud-offline" size={18} color={colors.white} />
            <Text style={styles.errorPillText}>Sem ligação ao servidor. Tenta de novo.</Text>
        </Pressable>
    );

    // ─────────────── A aguardar verificação do onboarding ───────────────
    if (!onboardingChecked) {
        return (
            <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    // ─────────────── Onboarding (primeira sessão) ───────────────
    if (showOnboarding) {
        return <Onboarding onDone={() => setShowOnboarding(false)} />;
    }

    return (
        <View style={styles.container}>
            <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
                <Text style={styles.logo}>Parqi</Text>
                {loading && !isFirstLoad && <ActivityIndicator color={colors.white} size="small" />}
            </View>

            <FlatList<ListItem>
                data={(isFirstLoad ? new Array<ListItem>(NEARBY_COUNT).fill(SKELETON_PLACEHOLDER) : visibleSpots) as ListItem[]}
                keyExtractor={(item, index) => ('_skeleton' in (item as object) ? `skel-${index}` : (item as ParkingSpot).id)}
                contentContainerStyle={styles.listContent}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                accessibilityLabel="Lista de estacionamentos"
                accessibilityRole="list"
                refreshControl={
                    <RefreshControl refreshing={loading && !isFirstLoad} onRefresh={() => fetchSpots(lastBbox.current)} tintColor={colors.primary} accessibilityLabel="Atualizar lista" />
                }
                ListHeaderComponent={
                    !isFirstLoad ? (
                        <>
                            <HeroSection totalSpots={spots.length} verifiedSpots={verifiedSpots} />
                            {spots.length > 0 && (
                                <SearchBar value={searchQuery} onChangeText={setSearchQuery} />
                            )}
                            {favoriteSpots.length > 0 && !isSearching && (
                                <>
                                    <Text style={styles.sectionLabel}>Favoritos</Text>
                                    <View style={styles.favoritesList}>
                                        {favoriteSpots.map((fav) => (
                                            <SpotCard
                                                key={`fav-${fav.id}`}
                                                spot={fav}
                                                distanceKm={
                                                    userLocation && fav.latitude !== null && fav.longitude !== null
                                                        ? distanceKm(userLocation.latitude, userLocation.longitude, fav.latitude, fav.longitude)
                                                        : undefined
                                                }
                                                onPress={() => router.push(`/parking/${fav.id}`)}
                                            />
                                        ))}
                                    </View>
                                </>
                            )}
                            {displayedSpots.length > 0 && !isSearching && (
                                <Text style={styles.sectionLabel}>
                                    {userLocation ? 'Mais próximos de ti' : 'Nesta zona'}
                                </Text>
                            )}
                        </>
                    ) : null
                }
                renderItem={({ item }) => {
                    if ('_skeleton' in (item as object)) {
                        return <SpotCardSkeleton />;
                    }
                    const spot = item as ParkingSpot;
                    return (
                        <SpotCard
                            spot={spot}
                            distanceKm={
                                userLocation && spot.latitude !== null && spot.longitude !== null
                                    ? distanceKm(userLocation.latitude, userLocation.longitude, spot.latitude, spot.longitude)
                                    : undefined
                            }
                            onPress={() => router.push(`/parking/${spot.id}`)}
                        />
                    );
                }}
                ListFooterComponent={
                    !isFirstLoad && hiddenCount > 0 ? (
                        <Pressable
                            style={styles.showMore}
                            onPress={() => setShowAll(true)}
                            accessibilityRole="button"
                            accessibilityLabel={`Mostrar mais ${hiddenCount} estacionamentos`}
                        >
                            <Text style={styles.showMoreText}>Mostrar mais {hiddenCount}</Text>
                            <Ionicons name="chevron-down" size={16} color={colors.primary} />
                        </Pressable>
                    ) : null
                }
                ListEmptyComponent={
                    !loading ? (
                        <View style={styles.emptyWrap}>
                            <Ionicons name={searchQuery ? 'search' : 'car-outline'} size={40} color={colors.textMuted} />
                            <Text style={styles.emptyTitle}>
                                {searchQuery ? 'Nenhum resultado para esta pesquisa' : 'Sem estacionamentos nesta zona'}
                            </Text>
                            {!searchQuery && (
                                <Pressable style={styles.emptyCta} onPress={() => router.push('/contribute')}>
                                    <Text style={styles.emptyCtaText}>Adicionar o primeiro</Text>
                                </Pressable>
                            )}
                        </View>
                    ) : null
                }
            />

            {errorPill}

            {/* Adicionar estacionamento: a ação primária, em laranja */}
            <Pressable style={styles.fab} onPress={() => router.push('/contribute')} accessibilityLabel="Adicionar estacionamento">
                <Ionicons name="add" size={28} color={colors.onAccent} />
            </Pressable>
        </View>
    );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 10,
        backgroundColor: colors.bar,
    },
    logo: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.white,
    },
    listContent: {
        padding: 16,
        paddingBottom: 96,
    },
    separator: {
        height: 10,
    },
    sectionLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.textMuted,
        marginTop: 12,
        marginBottom: 8,
    },
    favoritesList: {
        gap: 10,
    },
    showMore: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 12,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        backgroundColor: colors.card,
    },
    showMoreText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.primary,
    },
    emptyWrap: {
        alignItems: 'center',
        gap: 12,
        paddingTop: 80,
    },
    emptyTitle: {
        fontSize: 15,
        color: colors.textMuted,
    },
    emptyCta: {
        backgroundColor: colors.accent,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 12,
    },
    emptyCtaText: {
        color: colors.onAccent,
        fontWeight: '700',
    },
    fab: {
        position: 'absolute',
        right: 16,
        bottom: 20,
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 4,
    },
    errorPill: {
        position: 'absolute',
        bottom: 88,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: colors.danger,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 999,
        maxWidth: '86%',
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 4,
    },
    errorPillText: {
        flexShrink: 1,
        fontSize: 13,
        fontWeight: '600',
        color: colors.white,
    },
});
