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
import { ScoreBadge } from '../../src/components/ScoreBadge';
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

/** Rótulos curtos das pills do design v2. */
const TYPE_FILTERS: { id: TypeFilter; label: string }[] = [
    { id: 'all', label: 'Todos' },
    { id: 'SURFACE', label: 'Superfície' },
    { id: 'UNDERGROUND', label: 'Sub.' },
    { id: 'MULTI_STORY', label: 'Elevado' },
    { id: 'STREET', label: 'Via' },
];

const LEGEND = [
    { colorKey: 'primary' as const, label: 'Verificado' },
    { color: PALETTE.amberDeep, label: 'Em revisão' },
    { color: PALETTE.redDeep, label: 'Sinalizado' },
];

interface LatLng {
    latitude: number;
    longitude: number;
}

function priceLabel(isFree: boolean | null): string {
    if (isFree === true) return 'Gratuito';
    if (isFree === false) return 'Pago';
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

    // "Próximos" é honesto: ordena por distância real quando há localização.
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

    // Pins por estado: primário = verificado, âmbar = em revisão, vermelho = sinalizado
    const markers = useMemo(
        () =>
            filteredSpots
                .filter((s) => s.latitude !== null && s.longitude !== null)
                .map((s) => {
                    let color = colors.primary;
                    if (s.status === 'PENDING') color = PALETTE.amberDeep;
                    else if (s.status === 'FLAGGED' || s.status === 'REJECTED') color = PALETTE.redDeep;
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
            {/* Barra de pesquisa — como no design v2 */}
            <View style={styles.header}>
                <View style={styles.searchBox}>
                    <Pressable
                        style={({ pressed }) => [styles.searchMain, pressed && styles.pressed]}
                        onPress={() => router.push('/(tabs)')}
                        accessibilityRole="button"
                        accessibilityLabel="Pesquisar estacionamentos"
                    >
                        <Ionicons name="search" size={16} color={colors.textMuted} />
                        <Text style={styles.searchText}>Lisboa, Portugal</Text>
                    </Pressable>
                    <View style={styles.searchDivider} />
                    <Pressable
                        onPress={centerOnUser}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel="Centrar na minha localização"
                    >
                        <Ionicons name="navigate" size={16} color={colors.primary} />
                    </Pressable>
                </View>
            </View>

            {/* Pills de tipo — sempre visíveis, como no design v2 */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chipsScroll}
                contentContainerStyle={styles.chips}
            >
                {TYPE_FILTERS.map(({ id, label }) => {
                    const active = typeFilter === id;
                    return (
                        <Pressable
                            key={id}
                            onPress={() => setTypeFilter(id)}
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

            {/* Bottom sheet — próximos, como no design v2 */}
            <View style={styles.nearbySection}>
                <View style={styles.nearbyHandle} />
                <View style={styles.nearbyHeader}>
                    <Text style={styles.nearbyTitle}>Próximos</Text>
                    <Text style={styles.nearbyCount}>
                        {nearbySpots.filter((s) => s.status === 'APPROVED').length} verificados
                    </Text>
                </View>
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
                            <View style={styles.nearbyCardTop}>
                                <Text style={styles.nearbyName} numberOfLines={2}>{spot.name}</Text>
                                <ScoreBadge score={spot.trustScore} />
                            </View>
                            <Text style={styles.nearbyType}>{TYPE_DESIGN[spot.parkingType].label}</Text>
                            <Text style={[styles.nearbyPrice, spot.isFree && { color: colors.primary }]}>
                                {priceLabel(spot.isFree)}
                            </Text>
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
        paddingTop: 12,
        paddingBottom: 10,
    },
    searchBox: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: colors.card,
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 3 },
        elevation: 3,
    },
    searchMain: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    searchText: {
        flex: 1,
        fontSize: 14,
        color: colors.textMuted,
    },
    searchDivider: {
        width: 1,
        height: 16,
        backgroundColor: colors.border,
    },
    chipsScroll: {
        flexGrow: 0,
    },
    chips: {
        paddingHorizontal: 16,
        gap: 8,
        paddingBottom: 10,
    },
    filterChip: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 999,
        backgroundColor: colors.card,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    filterChipActive: {
        backgroundColor: colors.primary,
        shadowOpacity: 0.2,
    },
    filterChipText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.text,
    },
    filterChipTextActive: {
        color: colors.white,
    },
    mapWrap: {
        flex: 1,
        marginHorizontal: 16,
        borderRadius: 20,
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
        borderRadius: 12,
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
        borderRadius: 12,
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
        backgroundColor: colors.card,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 10,
        paddingBottom: 10,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: -4 },
        elevation: 8,
    },
    nearbyHandle: {
        alignSelf: 'center',
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.border,
        marginBottom: 10,
    },
    nearbyHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        marginBottom: 10,
    },
    nearbyTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.text,
    },
    nearbyCount: {
        fontSize: 12,
        color: colors.textMuted,
    },
    nearbyList: {
        paddingHorizontal: 16,
        gap: 12,
    },
    nearbyCard: {
        width: 176,
        backgroundColor: colors.background,
        borderRadius: 16,
        padding: 12,
    },
    nearbyCardPressed: {
        opacity: 0.85,
        transform: [{ scale: 0.98 }],
    },
    nearbyCardTop: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 8,
        marginBottom: 8,
    },
    nearbyName: {
        flex: 1,
        fontSize: 12,
        fontWeight: '700',
        color: colors.text,
        lineHeight: 16,
    },
    nearbyType: {
        fontSize: 10,
        color: colors.textMuted,
        marginBottom: 4,
    },
    nearbyPrice: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.text,
    },
    seeAllCard: {
        width: 96,
        minHeight: 76,
        borderRadius: 16,
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
