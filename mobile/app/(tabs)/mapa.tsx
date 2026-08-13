import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { MapLayerPicker } from '../../src/components/MapLayerPicker';
import { AppMap, type AppMapHandle, type MapLayer } from '../../src/components/AppMap';
import { TrustBar } from '../../src/components/TrustBar';
import { TypeChip } from '../../src/components/TypeChip';
import { parkingApi } from '../../src/lib/api';
import { useTheme } from '../../src/context/ThemeContext';
import { distanceKm, regionToBbox, type Region } from '../../src/lib/geo';
import { MONO, PALETTE, TYPE_DESIGN } from '../../src/theme/design';
import type { ThemeColors } from '../../src/theme/colors';
import type { ParkingSpot, ParkingType } from '../../src/types/parking';

const DEFAULT_REGION: Region = {
    latitude: 38.7369,
    longitude: -9.1427,
    latitudeDelta: 0.06,
    longitudeDelta: 0.06,
};

type TypeFilter = 'all' | ParkingType;

const TYPE_FILTERS: TypeFilter[] = ['all', 'SURFACE', 'UNDERGROUND', 'MULTI_STORY', 'STREET'];

const LEGEND = [
    { colorKey: 'primary' as const, label: 'Verificado' },
    { color: PALETTE.amberDeep, label: 'Em verificação' },
    { color: PALETTE.redDeep, label: 'Sinalizado' },
];

interface LatLng {
    latitude: number;
    longitude: number;
}

function priceLabel(isFree: boolean | null): string {
    if (isFree === true) return 'GRÁTIS';
    if (isFree === false) return 'PAGO';
    return '';
}

export default function MapScreen() {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const mapRef = useRef<AppMapHandle>(null);
    const fetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastBbox = useRef(regionToBbox(DEFAULT_REGION));

    const [center, setCenter] = useState<LatLng>(DEFAULT_REGION);
    const [mapLayer, setMapLayer] = useState<MapLayer>('standard');
    const [userLocation, setUserLocation] = useState<LatLng | null>(null);
    const [spots, setSpots] = useState<ParkingSpot[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetchFailed, setFetchFailed] = useState(false);
    const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [stripExpanded, setStripExpanded] = useState(false);
    const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

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
            setHasLoadedOnce(true);
        }
    }, []);

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
                    const last = await Location.getLastKnownPositionAsync();
                    if (last) {
                        const quick = { latitude: last.coords.latitude, longitude: last.coords.longitude };
                        setUserLocation(quick);
                        setCenter(quick);
                        fetchSpots(regionToBbox({ ...quick, latitudeDelta: 0.03, longitudeDelta: 0.03 }));
                    }
                    const loc = await Location.getCurrentPositionAsync({});
                    const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
                    setUserLocation(coords);
                    setCenter(coords);
                    fetchSpots(regionToBbox({ ...coords, latitudeDelta: 0.03, longitudeDelta: 0.03 }));
                }
            } catch {
                // sem permissão de localização - mantém a região inicial
            }
        })();
    }, [fetchSpots]);

    const filteredSpots = useMemo(
        () => spots.filter((s) => typeFilter === 'all' || s.parkingType === typeFilter),
        [spots, typeFilter]
    );

    // "Perto de ti" é honesto: ordena por distância real quando há localização.
    const nearbySpots = useMemo(() => {
        const approved = filteredSpots.filter((s) => s.status === 'APPROVED');
        if (!userLocation) {
            return approved.slice(0, 10);
        }
        return approved
            .filter((s) => s.latitude !== null && s.longitude !== null)
            .map((s) => ({
                spot: s,
                dist: distanceKm(userLocation.latitude, userLocation.longitude, s.latitude!, s.longitude!),
            }))
            .sort((a, b) => a.dist - b.dist)
            .slice(0, 10)
            .map(({ spot }) => spot);
    }, [filteredSpots, userLocation]);

    // Peeks de 6 cartões; "Ver todos" expande para a lista completa da zona.
    const nearbyPeek = useMemo(() => nearbySpots.slice(0, 6), [nearbySpots]);
    const visibleNearby = stripExpanded ? nearbySpots : nearbyPeek;
    const hiddenNearby = Math.max(0, nearbySpots.length - nearbyPeek.length);

    // Pins por estado: primário = verificado, âmbar = pendente, vermelho = sinalizado
    const markers = useMemo(
        () =>
            filteredSpots
                .filter((s) => s.latitude !== null && s.longitude !== null)
                .map((s) => {
                    let color = colors.primary;
                    if (s.status === 'PENDING') color = PALETTE.amberDeep;
                    else if (s.status === 'FLAGGED') color = PALETTE.redDeep;
                    return {
                        id: s.id,
                        latitude: s.latitude!,
                        longitude: s.longitude!,
                        color,
                        textColor: colors.white,
                    };
                }),
        [filteredSpots, colors]
    );

    const handleBoundsChange = (bbox: string) => {
        if (fetchTimer.current) {
            clearTimeout(fetchTimer.current);
        }
        fetchTimer.current = setTimeout(() => fetchSpots(bbox), 400);
    };

    // Limpa o timer pendente ao sair do ecrã (evita fetch após unmount)
    useEffect(() => {
        return () => {
            if (fetchTimer.current) {
                clearTimeout(fetchTimer.current);
            }
        };
    }, []);

    const centerOnUser = async () => {
        try {
            const perm = await Location.getForegroundPermissionsAsync();
            const status = perm.status === 'granted'
                ? 'granted'
                : (await Location.requestForegroundPermissionsAsync()).status;
            if (status !== 'granted') {
                return;
            }
            const loc = await Location.getCurrentPositionAsync({});
            const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
            setUserLocation(coords);
            mapRef.current?.centerOn(coords.latitude, coords.longitude, 15);
        } catch {
            // ignora
        }
    };

    return (
        <View style={styles.container}>
            {/* Header: pesquisa + loading */}
            <View style={styles.header}>
                <Pressable
                    style={({ pressed }) => [styles.searchBox, pressed && styles.pressed]}
                    onPress={() => router.push('/(tabs)')}
                    accessibilityRole="button"
                    accessibilityLabel="Pesquisar estacionamentos"
                >
                    <Ionicons name="search" size={16} color={colors.textMuted} />
                    <Text style={styles.searchText}>Procurar estacionamento</Text>
                    <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                </Pressable>
            </View>

            {/* Filtro por tipo: um controlo recolhido; a linha de chips só aparece ao abrir */}
            <View style={styles.filtersWrap}>
                <Pressable
                    style={({ pressed }) => [styles.filterToggle, pressed && styles.pressed]}
                    onPress={() => setFiltersOpen((v) => !v)}
                    accessibilityRole="button"
                    accessibilityLabel="Filtrar por tipo"
                    accessibilityState={{ expanded: filtersOpen }}
                    hitSlop={8}
                >
                    <Ionicons name="funnel-outline" size={14} color={colors.textMuted} />
                    <Text style={styles.filterToggleText}>
                        {typeFilter === 'all' ? 'Filtrar' : `Filtrar · ${TYPE_DESIGN[typeFilter].label}`}
                    </Text>
                    <Ionicons
                        name={filtersOpen ? 'chevron-up' : 'chevron-down'}
                        size={14}
                        color={colors.textMuted}
                    />
                </Pressable>
                {filtersOpen && (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.chipsScroll}
                        contentContainerStyle={styles.chips}
                    >
                        {TYPE_FILTERS.map((t) => {
                            const active = typeFilter === t;
                            const label = t === 'all' ? 'Todos os tipos' : TYPE_DESIGN[t].label;
                            return (
                                <Pressable
                                    key={t}
                                    onPress={() => {
                                        setTypeFilter(t);
                                        setFiltersOpen(false);
                                    }}
                                    hitSlop={8}
                                    style={({ pressed }) => [
                                        styles.filterChip,
                                        active && styles.filterChipActive,
                                        pressed && styles.pressed,
                                    ]}
                                >
                                    <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                                        {label}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </ScrollView>
                )}
            </View>

            {/* Mapa */}
            <View style={styles.mapWrap}>
                <AppMap
                    ref={mapRef}
                    center={center}
                    zoom={14}
                    cluster
                    markers={markers}
                    userLocation={userLocation}
                    layer={mapLayer}
                    brandColor={colors.primary}
                    accentColor={colors.accent}
                    onMarkerPress={(id) => router.push(`/parking/${id}`)}
                    onBoundsChange={handleBoundsChange}
                    style={styles.map}
                />

                {/* Estado da carga: diz o que está a acontecer quando a zona muda */}
                {loading && (
                    <View style={styles.refreshPill}>
                        <ActivityIndicator size="small" color={colors.primary} />
                        <Text style={styles.refreshPillText}>
                            {hasLoadedOnce ? 'A atualizar zona…' : 'A carregar zona…'}
                        </Text>
                    </View>
                )}

                {/* Legenda */}
                <View style={styles.legend}>
                    {LEGEND.map((item) => (
                        <View key={item.label} style={styles.legendRow}>
                            <View
                                style={[
                                    styles.legendDot,
                                    { backgroundColor: 'colorKey' in item && item.colorKey ? colors.primary : item.color },
                                ]}
                            />
                            <Text style={styles.legendText}>{item.label}</Text>
                        </View>
                    ))}
                </View>

                {/* Controlos */}
                <View style={styles.controls}>
                    <MapLayerPicker onChange={setMapLayer} style={styles.layerPicker} />
                    <Pressable
                        style={({ pressed }) => [
                            styles.controlBtn,
                            styles.controlBtnActive,
                            pressed && styles.pressed,
                        ]}
                        onPress={centerOnUser}
                        accessibilityLabel="Centrar na minha localização"
                        hitSlop={6}
                    >
                        <Ionicons name="navigate" size={16} color={colors.primary} />
                    </Pressable>
                </View>
            </View>

            {/* Nearby strip */}
            <View style={styles.nearbySection}>
                <Text style={styles.nearbyTitle}>
                    {userLocation
                        ? `Perto de ti · ${nearbySpots.length} verificados`
                        : `Verificados nesta zona · ${nearbySpots.length}`}
                </Text>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.nearbyList}
                >
                    {visibleNearby.map((spot) => (
                        <Pressable
                            key={spot.id}
                            style={({ pressed }) => [styles.nearbyCard, pressed && styles.nearbyCardPressed]}
                            onPress={() => router.push(`/parking/${spot.id}`)}
                        >
                            <Text style={styles.nearbyName} numberOfLines={1}>{spot.name}</Text>
                            <View style={styles.nearbyTrust}>
                                <TrustBar trustScore={spot.trustScore} />
                            </View>
                            <View style={styles.nearbyMeta}>
                                <TypeChip type={spot.parkingType} />
                                <Text style={styles.nearbyPrice} numberOfLines={1}>{priceLabel(spot.isFree)}</Text>
                            </View>
                        </Pressable>
                    ))}
                    {hiddenNearby > 0 && (
                        <Pressable
                            style={({ pressed }) => [styles.seeAllCard, pressed && styles.pressed]}
                            onPress={() => setStripExpanded((v) => !v)}
                            accessibilityRole="button"
                            accessibilityLabel={
                                stripExpanded ? 'Recolher lista' : 'Ver todos os estacionamentos perto de ti'
                            }
                            hitSlop={8}
                        >
                            <Text style={styles.seeAllText}>
                                {stripExpanded ? 'Recolher' : `Ver todos (+${hiddenNearby})`}
                            </Text>
                        </Pressable>
                    )}
                    {nearbySpots.length === 0 && !loading && (
                        <Text style={styles.nearbyEmpty}>Sem estacionamentos verificados nesta zona.</Text>
                    )}
                </ScrollView>
            </View>

            {fetchFailed && (
                <Pressable
                    style={({ pressed }) => [styles.errorPill, pressed && styles.pressed]}
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 12,
    },
    searchBox: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 9,
    },
    searchText: {
        flex: 1,
        fontSize: 14,
        color: colors.textMuted,
    },
    filtersWrap: {
        paddingHorizontal: 16,
        paddingBottom: 12,
        gap: 8,
    },
    filterToggle: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    filterToggleText: {
        fontSize: 12,
        fontWeight: '500',
        color: colors.text,
    },
    chipsScroll: {
        flexGrow: 0,
    },
    chips: {
        gap: 8,
        paddingRight: 8,
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
        color: colors.textMuted,
    },
    filterChipTextActive: {
        color: colors.white,
    },
    mapWrap: {
        flex: 1,
        marginHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
    },
    map: {
        flex: 1,
    },
    refreshPill: {
        position: 'absolute',
        top: 12,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: colors.card + 'E6',
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 999,
        paddingHorizontal: 14,
        paddingVertical: 7,
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3,
    },
    refreshPillText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.text,
    },
    legend: {
        position: 'absolute',
        left: 12,
        bottom: 12,
        backgroundColor: colors.card + 'E6',
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
        gap: 4,
    },
    legendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    legendText: {
        fontSize: 10,
        fontFamily: MONO,
        color: colors.textMuted,
    },
    controls: {
        position: 'absolute',
        right: 12,
        bottom: 12,
        gap: 8,
        alignItems: 'center',
    },
    layerPicker: {
        position: 'relative',
    },
    controlBtn: {
        width: 36,
        height: 36,
        borderRadius: 8,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 4,
    },
    controlBtnActive: {
        backgroundColor: colors.primary + '1A',
    },
    nearbySection: {
        paddingTop: 12,
        paddingBottom: 8,
    },
    nearbyTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textMuted,
        paddingHorizontal: 16,
        marginBottom: 8,
    },
    nearbyList: {
        paddingHorizontal: 16,
        gap: 12,
    },
    nearbyCard: {
        width: 132,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        padding: 10,
    },
    nearbyCardPressed: {
        opacity: 0.85,
        transform: [{ scale: 0.98 }],
    },
    nearbyName: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 6,
    },
    nearbyTrust: {
        marginBottom: 6,
    },
    seeAllCard: {
        width: 92,
        minHeight: 60,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 10,
    },
    seeAllText: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.primary,
        textAlign: 'center',
    },
    nearbyMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    nearbyPrice: {
        fontSize: 10,
        fontFamily: MONO,
        color: colors.primary,
    },
    nearbyEmpty: {
        fontSize: 12,
        color: colors.textMuted,
        paddingVertical: 16,
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
