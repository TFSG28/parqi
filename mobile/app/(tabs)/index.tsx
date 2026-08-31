import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Linking,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { Onboarding } from '../../src/components/Onboarding';
import { ScoreBadge } from '../../src/components/ScoreBadge';
import { SearchBar } from '../../src/components/SearchBar';
import { SpotCardSkeleton } from '../../src/components/SpotCardSkeleton';
import { StatusBadge } from '../../src/components/StatusBadge';
import { TypeChip } from '../../src/components/TypeChip';
import { parkingApi } from '../../src/lib/api';
import { useTheme } from '../../src/context/ThemeContext';
import { directionsUrl, regionToBbox, type Region } from '../../src/lib/geo';
import { distanceLabel, freshnessLabel, isStale, rankParkingSpots, readParkingCache, trustMessage, writeParkingCache } from '../../src/lib/parking';
import { AMENITY_DESIGN, MONO, TYPE_COLOR } from '../../src/theme/design';
import type { ThemeColors } from '../../src/theme/colors';
import type { ParkingSpot } from '../../src/types/parking';

const DEFAULT_REGION: Region = {
    latitude: 38.7369,
    longitude: -9.1427,
    latitudeDelta: 0.06,
    longitudeDelta: 0.06,
};

type StatusFilter = 'all' | 'APPROVED' | 'PENDING';
type SortBy = 'trust' | 'recent' | 'free';

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
    { id: 'all', label: 'Todos' },
    { id: 'APPROVED', label: 'Verificados' },
    { id: 'PENDING', label: 'Em revisão' },
];

const SORTS: { id: SortBy; label: string }[] = [
    { id: 'trust', label: 'Confiança' },
    { id: 'recent', label: 'Novos' },
    { id: 'free', label: 'Gratuitos' },
];

function priceLabel(isFree: boolean | null): string {
    if (isFree === true) return 'Gratuito';
    if (isFree === false) return 'Pago';
    return '—';
}

function ListSeparator() {
    return <View style={{ height: 12 }} />;
}

export default function DiscoverScreen() {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const lastBbox = useRef(regionToBbox(DEFAULT_REGION));

    const [spots, setSpots] = useState<ParkingSpot[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetchFailed, setFetchFailed] = useState(false);
    const [search, setSearch] = useState('');
    const [searchResults, setSearchResults] = useState<ParkingSpot[] | null>(null);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [sortBy, setSortBy] = useState<SortBy>('trust');
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [onboardingChecked, setOnboardingChecked] = useState(false);
    const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [showingCachedData, setShowingCachedData] = useState(false);

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
            setShowingCachedData(false);
            setFetchFailed(false);
            await writeParkingCache(items);
        } catch {
            if (spots.length === 0) {
                const cached = await readParkingCache();
                if (cached) {
                    setSpots(cached.items);
                    setShowingCachedData(true);
                }
            }
            setFetchFailed(true);
        } finally {
            setLoading(false);
        }
    }, []);

    const isFirstLoad = loading && spots.length === 0;

    // Primeira carga + centrar na localização do utilizador
    useEffect(() => {
        fetchSpots(regionToBbox(DEFAULT_REGION));
        (async () => {
            try {
                const perm = await Location.getForegroundPermissionsAsync();
                const status = perm.status === 'granted'
                    ? 'granted'
                    : (await Location.requestForegroundPermissionsAsync()).status;
                if (status === 'granted') {
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
                // sem permissão - mantém a região inicial
            }
        })();
    }, [fetchSpots]);

    // Pesquisa por nome no servidor (país inteiro) com debounce
    useEffect(() => {
        const q = search.trim();
        if (q.length < 2) {
            setSearchResults(null);
            return;
        }
        const timer = setTimeout(async () => {
            try {
                setSearchResults(await parkingApi.search(q));
            } catch {
                setSearchResults(null);
            }
        }, 350);
        return () => clearTimeout(timer);
    }, [search]);

    const hasActiveFilters = search.trim() !== '' || statusFilter !== 'all' || sortBy !== 'trust';

    const clearFilters = () => {
        setSearch('');
        setStatusFilter('all');
        setSortBy('trust');
    };

    const openRoute = (spot: ParkingSpot) => {
        if (spot.latitude === null || spot.longitude === null) return;
        Linking.openURL(directionsUrl(spot.latitude, spot.longitude)).catch(() => {});
    };

    const visible = useMemo(() => {
        const source = searchResults ?? spots;
        const q = search.trim().toLowerCase();
        const filtered = source.filter((s) => {
            const matchSearch = !q || searchResults ? true : s.name.toLowerCase().includes(q);
            const matchStatus = statusFilter === 'all' || s.status === statusFilter;
            return matchSearch && matchStatus;
        });
        if (sortBy === 'trust') return rankParkingSpots(filtered, userLocation);
        return [...filtered].sort((a, b) => {
            if (sortBy === 'recent') return b.updatedAt.localeCompare(a.updatedAt);
            return (a.isFree ? 0 : 1) - (b.isFree ? 0 : 1);
        });
    }, [spots, searchResults, search, statusFilter, sortBy, userLocation]);

    if (!onboardingChecked) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (showOnboarding) {
        return <Onboarding onDone={() => setShowOnboarding(false)} />;
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={isFirstLoad ? [] : visible}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                ItemSeparatorComponent={ListSeparator}
                ListHeaderComponent={
                    <View style={styles.listHeader}>
                        <SearchBar
                            value={search}
                            onChangeText={setSearch}
                            placeholder="Nome, rua, zona…"
                        />
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.chips}
                        >
                            {STATUS_FILTERS.map((f) => {
                                const active = statusFilter === f.id;
                                return (
                                    <Pressable
                                        key={f.id}
                                        onPress={() => setStatusFilter(f.id)}
                                        hitSlop={8}
                                        style={({ pressed }) => [
                                            styles.filterChip,
                                            active && styles.filterChipActive,
                                            pressed && styles.pressed,
                                        ]}
                                    >
                                        <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                                            {f.label}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                            <View style={styles.sortDivider} />
                            {SORTS.map((s) => {
                                const active = sortBy === s.id;
                                return (
                                    <Pressable
                                        key={s.id}
                                        onPress={() => setSortBy(s.id)}
                                        hitSlop={8}
                                        style={({ pressed }) => [
                                            styles.filterChip,
                                            active && styles.filterChipActive,
                                            pressed && styles.pressed,
                                        ]}
                                    >
                                        <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                                            {s.label}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </ScrollView>
                    </View>
                }
                refreshControl={
                    <RefreshControl
                        refreshing={loading && !isFirstLoad}
                        onRefresh={() => fetchSpots(lastBbox.current)}
                        tintColor={colors.primary}
                    />
                }
                renderItem={({ item: spot }) => {
                    const amenities = AMENITY_DESIGN.filter((a) => spot[a.key] === true);
                    const typeColor = TYPE_COLOR[spot.parkingType];
                    return (
                        <Pressable
                            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                            onPress={() => router.push(`/parking/${spot.id}`)}
                        >
                            <View style={styles.cardTop}>
                                <View style={[styles.typeDot, { backgroundColor: typeColor + '18' }]}>
                                    <Ionicons name="location" size={16} color={typeColor} />
                                </View>
                                <View style={styles.cardTitleWrap}>
                                    <Text style={styles.cardName} numberOfLines={2}>{spot.name}</Text>
                                    {spot.description ? (
                                        <Text style={styles.cardAddress} numberOfLines={1}>{spot.description}</Text>
                                    ) : null}
                                </View>
                                <ScoreBadge score={spot.trustScore} />
                            </View>

                            <View style={styles.metaRow}>
                                <StatusBadge status={spot.status} />
                                <TypeChip type={spot.parkingType} />
                                <Text
                                    style={[styles.price, spot.isFree && { color: colors.primary }]}
                                >
                                    {priceLabel(spot.isFree)}
                                </Text>
                            </View>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoText}>
                                    {distanceLabel(spot, userLocation) ?? 'Distância indisponível'}
                                </Text>
                                <Text style={[styles.infoText, isStale(spot.updatedAt) && styles.infoTextStale]}>
                                    {freshnessLabel(spot.updatedAt)}
                                </Text>
                                <Text style={styles.infoText} numberOfLines={1}>
                                    {trustMessage(spot)}
                                </Text>
                            </View>

                            <View style={styles.cardFooter}>
                                {amenities.length > 0 ? (
                                    <View style={styles.amenities}>
                                        {amenities.map((a) => (
                                            <Ionicons
                                                key={a.key}
                                                name={a.icon}
                                                size={14}
                                                color={colors.textMuted}
                                                accessibilityLabel={a.label}
                                            />
                                        ))}
                                    </View>
                                ) : <View />}
                                <Pressable
                                    style={({ pressed }) => [styles.routeButton, pressed && styles.pressed]}
                                    onPress={(event) => {
                                        event.stopPropagation();
                                        openRoute(spot);
                                    }}
                                    disabled={spot.latitude === null || spot.longitude === null}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Abrir rota para ${spot.name}`}
                                >
                                    <Ionicons name="navigate" size={15} color={colors.primary} />
                                    <Text style={styles.routeButtonText}>Rota</Text>
                                </Pressable>
                            </View>
                        </Pressable>
                    );
                }}
                ListEmptyComponent={
                    isFirstLoad ? (
                        <View style={styles.skeletons}>
                            {[0, 1, 2, 3].map((i) => <SpotCardSkeleton key={i} />)}
                        </View>
                    ) : (
                        <View style={styles.emptyWrap}>
                            <Text style={styles.emptyText}>Nenhum estacionamento corresponde à pesquisa.</Text>
                            {!hasActiveFilters && (
                                <Text style={styles.emptyHint}>Experimenta outro nome ou zona.</Text>
                            )}
                            {hasActiveFilters && (
                                <Pressable
                                    style={({ pressed }) => [styles.emptyAction, pressed && styles.pressed]}
                                    onPress={clearFilters}
                                    hitSlop={8}
                                    accessibilityRole="button"
                                >
                                    <Text style={styles.emptyActionText}>Limpar filtros</Text>
                                </Pressable>
                            )}
                        </View>
                    )
                }
            />

            {(fetchFailed || showingCachedData) && (
                <Pressable
                    style={({ pressed }) => [styles.errorPill, pressed && styles.pressed]}
                    onPress={() => fetchSpots(lastBbox.current)}
                    accessibilityRole="button"
                    accessibilityLabel="Sem ligação ao servidor. Tentar de novo"
                >
                    <Ionicons name={showingCachedData ? "time-outline" : "cloud-offline"} size={18} color={colors.white} />
                    <Text style={styles.errorPillText}>
                        {showingCachedData ? 'A mostrar os últimos dados guardados. Toca para atualizar.' : 'Sem ligação ao servidor. Tenta de novo.'}
                    </Text>
                </Pressable>
            )}
        </View>
    );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    center: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    listHeader: {
        paddingTop: 12,
        paddingBottom: 12,
        gap: 10,
    },
    chips: {
        gap: 8,
        paddingRight: 8,
    },
    sortDivider: {
        width: 1,
        height: 18,
        backgroundColor: colors.border,
        marginHorizontal: 2,
    },
    filterChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
    },
    filterChipActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    filterChipText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textMuted,
    },
    filterChipTextActive: {
        color: colors.white,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    skeletons: {
        gap: 12,
    },
    card: {
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 16,
        padding: 14,
    },
    cardPressed: {
        opacity: 0.85,
        transform: [{ scale: 0.99 }],
    },
    cardTop: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        marginBottom: 10,
    },
    typeDot: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardTitleWrap: {
        flex: 1,
        minWidth: 0,
        paddingRight: 4,
    },
    cardName: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.text,
        lineHeight: 18,
    },
    cardAddress: {
        fontSize: 12,
        color: colors.textMuted,
        marginTop: 2,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
    },
    price: {
        marginLeft: 'auto',
        fontSize: 12,
        fontWeight: '600',
        fontFamily: MONO,
        color: colors.textMuted,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 10,
        flexWrap: 'wrap',
    },
    infoText: {
        fontSize: 11,
        color: colors.textMuted,
    },
    infoTextStale: {
        color: colors.accent,
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    amenities: {
        flex: 1,
        flexDirection: 'row',
        gap: 12,
    },
    routeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        backgroundColor: colors.primary + '12',
    },
    routeButtonText: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.primary,
    },
    emptyWrap: {
        paddingVertical: 48,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 14,
        color: colors.textMuted,
    },
    emptyHint: {
        marginTop: 6,
        fontSize: 12,
        color: colors.textMuted,
    },
    emptyAction: {
        marginTop: 14,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
    },
    emptyActionText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.primary,
    },
    errorPill: {
        position: 'absolute',
        bottom: 20,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: colors.danger,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 999,
    },
    errorPillText: {
        color: colors.white,
        fontSize: 13,
        fontWeight: '600',
    },
    pressed: {
        opacity: 0.85,
        transform: [{ scale: 0.99 }],
    },
});
