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
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { Onboarding } from '../../src/components/Onboarding';
import { SpotCardSkeleton } from '../../src/components/SpotCardSkeleton';
import { StatusBadge } from '../../src/components/StatusBadge';
import { TrustBar } from '../../src/components/TrustBar';
import { TypeChip } from '../../src/components/TypeChip';
import { parkingApi } from '../../src/lib/api';
import { useTheme } from '../../src/context/ThemeContext';
import { CAPACITY_LABELS, distanceKm, formatDistance, regionToBbox, type Region } from '../../src/lib/geo';
import { AMENITY_DESIGN, MONO, PALETTE, SOURCE_LABELS } from '../../src/theme/design';
import type { ThemeColors } from '../../src/theme/colors';
import type { ParkingSpot } from '../../src/types/parking';

const DEFAULT_REGION: Region = {
    latitude: 38.7369,
    longitude: -9.1427,
    latitudeDelta: 0.06,
    longitudeDelta: 0.06,
};

type StatusFilter = 'all' | 'APPROVED' | 'PENDING';
type SortBy = 'trust' | 'votes' | 'recent';

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
    { id: 'all', label: 'Todos' },
    { id: 'APPROVED', label: 'Verificados' },
    { id: 'PENDING', label: 'Em verificação' },
];

const SORTS: { id: SortBy; label: string }[] = [
    { id: 'trust', label: 'Confiança' },
    { id: 'votes', label: 'Votos' },
    { id: 'recent', label: 'Novos' },
];

interface LatLng {
    latitude: number;
    longitude: number;
}

function priceLabel(isFree: boolean | null): string {
    if (isFree === true) return 'GRÁTIS';
    if (isFree === false) return 'PAGO';
    return '—';
}

function ListSeparator() {
    return <View style={{ height: 12 }} />;
}

export default function DiscoverScreen() {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const lastBbox = useRef(regionToBbox(DEFAULT_REGION));

    const [userLocation, setUserLocation] = useState<LatLng | null>(null);
    const [spots, setSpots] = useState<ParkingSpot[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetchFailed, setFetchFailed] = useState(false);
    const [search, setSearch] = useState('');
    const [searchResults, setSearchResults] = useState<ParkingSpot[] | null>(null);
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [sortBy, setSortBy] = useState<SortBy>('trust');
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [onboardingChecked, setOnboardingChecked] = useState(false);

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

    const visible = useMemo(() => {
        const source = searchResults ?? spots;
        const q = search.trim().toLowerCase();
        const filtered = source.filter((s) => {
            const matchSearch = !q || searchResults ? true : s.name.toLowerCase().includes(q);
            const matchStatus = statusFilter === 'all' || s.status === statusFilter;
            return matchSearch && matchStatus;
        });
        return [...filtered].sort((a, b) => {
            if (sortBy === 'recent') return b.createdAt.localeCompare(a.createdAt);
            // 'votes' não existe por spot na API; trustScore é o proxy mais próximo
            return b.trustScore - a.trustScore;
        });
    }, [spots, searchResults, search, statusFilter, sortBy]);

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
            <View style={styles.header}>
                <Text style={styles.title}>Descobrir estacionamento</Text>
                <View style={styles.searchBox}>
                    <Ionicons name="search" size={16} color={colors.textMuted} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Procurar por nome ou rua…"
                        placeholderTextColor={colors.textMuted}
                        value={search}
                        onChangeText={setSearch}
                    />
                </View>
                <View style={styles.filterRow}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                        {STATUS_FILTERS.map((f) => {
                            const active = statusFilter === f.id;
                            return (
                                <Pressable
                                    key={f.id}
                                    onPress={() => setStatusFilter(f.id)}
                                    style={[styles.filterChip, active && styles.filterChipActive]}
                                >
                                    <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                                        {f.label}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </ScrollView>
                    <View style={styles.sortRow}>
                        {SORTS.map((s) => {
                            const active = sortBy === s.id;
                            return (
                                <Pressable
                                    key={s.id}
                                    onPress={() => setSortBy(s.id)}
                                    style={[styles.sortBtn, active && styles.sortBtnActive]}
                                >
                                    <Text style={[styles.sortText, active && styles.sortTextActive]}>
                                        {s.label}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>
                </View>
            </View>

            <FlatList
                data={isFirstLoad ? [] : visible}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                ItemSeparatorComponent={ListSeparator}
                refreshControl={
                    <RefreshControl
                        refreshing={loading && !isFirstLoad}
                        onRefresh={() => fetchSpots(lastBbox.current)}
                        tintColor={colors.primary}
                    />
                }
                renderItem={({ item: spot }) => {
                    const dist =
                        userLocation && spot.latitude !== null && spot.longitude !== null
                            ? distanceKm(userLocation.latitude, userLocation.longitude, spot.latitude, spot.longitude)
                            : null;
                    const amenities = AMENITY_DESIGN.filter((a) => spot[a.key] === true);
                    return (
                        <Pressable style={styles.card} onPress={() => router.push(`/parking/${spot.id}`)}>
                            <View style={styles.cardTop}>
                                <View style={styles.cardTitleWrap}>
                                    <Text style={styles.cardName} numberOfLines={1}>{spot.name}</Text>
                                    {spot.description ? (
                                        <Text style={styles.cardAddress} numberOfLines={1}>{spot.description}</Text>
                                    ) : null}
                                </View>
                                <View style={styles.cardRight}>
                                    <Text style={styles.price}>{priceLabel(spot.isFree)}</Text>
                                    {dist !== null && <Text style={styles.distance}>{formatDistance(dist)}</Text>}
                                </View>
                            </View>

                            <View style={styles.trustWrap}>
                                <TrustBar trustScore={spot.trustScore} />
                            </View>

                            <View style={styles.metaRow}>
                                <StatusBadge status={spot.status} />
                                <TypeChip type={spot.parkingType} />
                                {spot.capacityRange && (
                                    <Text style={styles.capacity}>{CAPACITY_LABELS[spot.capacityRange]}</Text>
                                )}
                                <View style={styles.amenities}>
                                    {amenities.slice(0, 3).map((a) => (
                                        <Ionicons key={a.key} name={a.icon} size={12} color={colors.textMuted} />
                                    ))}
                                </View>
                            </View>

                            <View style={styles.cardFooter}>
                                <Ionicons name="thumbs-up" size={12} color={PALETTE.emerald} />
                                <Ionicons name="thumbs-down" size={12} color={PALETTE.red} />
                                <Text style={styles.footerText}>
                                    por {SOURCE_LABELS[spot.source]} · {spot.createdAt.slice(0, 10)}
                                </Text>
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
                        </View>
                    )
                }
            />

            {fetchFailed && (
                <Pressable
                    style={styles.errorPill}
                    onPress={() => fetchSpots(lastBbox.current)}
                    accessibilityLabel="Sem ligação ao servidor. Tentar de novo"
                >
                    <Ionicons name="cloud-offline" size={18} color={colors.white} />
                    <Text style={styles.errorPillText}>Sem ligação ao servidor. Tenta de novo.</Text>
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
    header: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 12,
        gap: 12,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: colors.text,
        padding: 0,
    },
    filterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    chips: {
        gap: 8,
    },
    filterChip: {
        paddingHorizontal: 12,
        paddingVertical: 4,
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
        fontWeight: '500',
        fontFamily: MONO,
        color: colors.textMuted,
    },
    filterChipTextActive: {
        color: colors.white,
    },
    sortRow: {
        flexDirection: 'row',
        gap: 4,
        marginLeft: 'auto',
    },
    sortBtn: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.border,
    },
    sortBtnActive: {
        borderColor: colors.primary + '99',
        backgroundColor: colors.primary + '1A',
    },
    sortText: {
        fontSize: 10,
        fontFamily: MONO,
        color: colors.textMuted,
    },
    sortTextActive: {
        color: colors.primary,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    separator: {
        height: 12,
    },
    skeletons: {
        gap: 12,
    },
    card: {
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        padding: 16,
    },
    cardTop: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    cardTitleWrap: {
        flex: 1,
        paddingRight: 12,
    },
    cardName: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
    },
    cardAddress: {
        fontSize: 12,
        color: colors.textMuted,
        marginTop: 2,
    },
    cardRight: {
        alignItems: 'flex-end',
    },
    price: {
        fontSize: 12,
        fontWeight: '700',
        fontFamily: MONO,
        color: colors.primary,
    },
    distance: {
        fontSize: 10,
        fontFamily: MONO,
        color: colors.textMuted,
        marginTop: 2,
    },
    trustWrap: {
        marginBottom: 10,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
    },
    capacity: {
        fontSize: 10,
        fontFamily: MONO,
        color: colors.textMuted,
    },
    amenities: {
        flexDirection: 'row',
        gap: 6,
        marginLeft: 'auto',
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    footerText: {
        fontSize: 10,
        fontFamily: MONO,
        color: colors.textMuted,
        marginLeft: 'auto',
    },
    emptyWrap: {
        paddingVertical: 48,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 14,
        color: colors.textMuted,
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
});
