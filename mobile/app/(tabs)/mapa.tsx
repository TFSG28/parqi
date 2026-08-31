import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { AppMap, type AppMapHandle, type MapLayer } from '../../src/components/AppMap';
import { MapLayerPicker } from '../../src/components/MapLayerPicker';
import { ScoreBadge } from '../../src/components/ScoreBadge';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { parkingApi } from '../../src/lib/api';
import { regionToBbox, type Region } from '../../src/lib/geo';
import { distanceLabel, freshnessLabel, readParkingCache, trustMessage, writeParkingCache } from '../../src/lib/parking';
import { PALETTE, TYPE_DESIGN } from '../../src/theme/design';
import type { ThemeColors } from '../../src/theme/colors';
import type { ParkingSpot, ParkingType } from '../../src/types/parking';

const DEFAULT_REGION: Region = {
    latitude: 38.7369,
    longitude: -9.1427,
    latitudeDelta: 0.06,
    longitudeDelta: 0.06,
};

type TypeFilter = 'all' | ParkingType;

const TYPE_FILTERS: { id: TypeFilter; label: string; icon?: keyof typeof Ionicons.glyphMap }[] = [
    { id: 'all', label: 'Tudo' },
    { id: 'SURFACE', label: 'Rua', icon: 'car-outline' },
    { id: 'UNDERGROUND', label: 'Subterrâneo', icon: 'arrow-down-circle-outline' },
    { id: 'MULTI_STORY', label: 'Edifício', icon: 'business-outline' },
    { id: 'STREET', label: 'Via', icon: 'navigate-outline' },
];

interface LatLng {
    latitude: number;
    longitude: number;
}

export default function MapScreen() {
    const { colors, resolvedScheme } = useTheme();
    const { user } = useAuth();
    const insets = useSafeAreaInsets();
    const styles = useMemo(() => createStyles(colors, insets.top), [colors, insets.top]);
    const mapRef = useRef<AppMapHandle>(null);
    const fetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastBbox = useRef(regionToBbox(DEFAULT_REGION));

    const [center, setCenter] = useState<LatLng>(DEFAULT_REGION);
    const [mapLayer, setMapLayer] = useState<MapLayer>(resolvedScheme === 'dark' ? 'dark' : 'standard');
    const [userLocation, setUserLocation] = useState<LatLng | null>(null);
    const [spots, setSpots] = useState<ParkingSpot[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetchFailed, setFetchFailed] = useState(false);
    const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [selectedSpot, setSelectedSpot] = useState<ParkingSpot | null>(null);
    const [showingCachedData, setShowingCachedData] = useState(false);
    const [confirming, setConfirming] = useState(false);

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
            const cached = await readParkingCache();
            if (cached) {
                setSpots(cached.items);
                setShowingCachedData(true);
            }
            setFetchFailed(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSpots(regionToBbox(DEFAULT_REGION));
        (async () => {
            try {
                const permission = await Location.getForegroundPermissionsAsync();
                const status = permission.status === 'granted'
                    ? 'granted'
                    : (await Location.requestForegroundPermissionsAsync()).status;
                if (status !== 'granted') return;

                const last = await Location.getLastKnownPositionAsync();
                if (last) {
                    const quick = { latitude: last.coords.latitude, longitude: last.coords.longitude };
                    setUserLocation(quick);
                    setCenter(quick);
                    fetchSpots(regionToBbox({ ...quick, latitudeDelta: 0.03, longitudeDelta: 0.03 }));
                }

                const current = await Location.getCurrentPositionAsync({});
                const coords = { latitude: current.coords.latitude, longitude: current.coords.longitude };
                setUserLocation(coords);
                setCenter(coords);
                fetchSpots(regionToBbox({ ...coords, latitudeDelta: 0.03, longitudeDelta: 0.03 }));
            } catch {
                // Sem permissão ou localização disponível, mantém a região inicial.
            }
        })();
    }, [fetchSpots]);

    const filteredSpots = useMemo(
        () => spots.filter((spot) => typeFilter === 'all' || spot.parkingType === typeFilter),
        [spots, typeFilter]
    );

    const markers = useMemo(
        () => filteredSpots
            .filter((spot) => spot.latitude !== null && spot.longitude !== null)
            .map((spot) => ({
                id: spot.id,
                latitude: spot.latitude!,
                longitude: spot.longitude!,
                color: spot.status === 'APPROVED' ? colors.primary : PALETTE.amberDeep,
                textColor: colors.white,
            })),
        [filteredSpots, colors]
    );

    const handleBoundsChange = (bbox: string) => {
        if (fetchTimer.current) clearTimeout(fetchTimer.current);
        fetchTimer.current = setTimeout(() => fetchSpots(bbox), 450);
    };

    useEffect(() => () => {
        if (fetchTimer.current) clearTimeout(fetchTimer.current);
    }, []);

    const centerOnUser = async () => {
        try {
            const permission = await Location.getForegroundPermissionsAsync();
            const status = permission.status === 'granted'
                ? 'granted'
                : (await Location.requestForegroundPermissionsAsync()).status;
            if (status !== 'granted') return;

            const current = await Location.getCurrentPositionAsync({});
            const coords = { latitude: current.coords.latitude, longitude: current.coords.longitude };
            setUserLocation(coords);
            mapRef.current?.centerOn(coords.latitude, coords.longitude, 15);
        } catch {
            // Ignora falhas pontuais de localização.
        }
    };

    return (
        <View style={styles.container}>
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
                onMarkerPress={(id) => {
                    const spot = spots.find((item) => item.id === id);
                    if (spot) setSelectedSpot(spot);
                }}
                onMapPress={() => setSelectedSpot(null)}
                onBoundsChange={handleBoundsChange}
                style={styles.map}
            />

            <View style={styles.topOverlay} pointerEvents="box-none">
                <View style={styles.searchBar}>
                    <Pressable
                        style={({ pressed }) => [styles.searchMain, pressed && styles.pressed]}
                        onPress={() => router.push('/')}
                        accessibilityRole="button"
                        accessibilityLabel="Pesquisar estacionamento"
                    >
                        <Ionicons name="search" size={20} color={colors.text} />
                        <Text style={styles.searchLabel} numberOfLines={1}>Pesquisar estacionamento</Text>
                    </Pressable>
                    <View style={styles.searchDivider} />
                    {loading ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                        <Pressable
                            style={({ pressed }) => [
                                styles.filterButton,
                                (filtersOpen || typeFilter !== 'all') && styles.filterButtonActive,
                                pressed && styles.pressed,
                            ]}
                            onPress={() => setFiltersOpen((open) => !open)}
                            accessibilityRole="button"
                            accessibilityLabel="Mostrar filtros"
                            accessibilityState={{ expanded: filtersOpen }}
                        >
                            <Ionicons
                                name="options-outline"
                                size={20}
                                color={filtersOpen || typeFilter !== 'all' ? colors.white : colors.textMuted}
                            />
                        </Pressable>
                    )}
                </View>

                {filtersOpen && (
                    <View style={styles.filterPanel}>
                        <View style={styles.filterPanelHeader}>
                            <Text style={styles.filterTitle}>Tipo de estacionamento</Text>
                            <Pressable
                                onPress={() => {
                                    setTypeFilter('all');
                                    setSelectedSpot(null);
                                    setFiltersOpen(false);
                                }}
                                accessibilityRole="button"
                                accessibilityLabel="Limpar filtro"
                            >
                                <Text style={styles.clearFilter}>Limpar</Text>
                            </Pressable>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
                            {TYPE_FILTERS.map(({ id, label, icon }) => {
                                const active = typeFilter === id;
                                return (
                                    <Pressable
                                        key={id}
                                        onPress={() => {
                                            setTypeFilter(id);
                                            setSelectedSpot(null);
                                            setFiltersOpen(false);
                                        }}
                                        style={({ pressed }) => [
                                            styles.filter,
                                            active && styles.filterActive,
                                            pressed && styles.pressed,
                                        ]}
                                        accessibilityRole="button"
                                        accessibilityState={{ selected: active }}
                                    >
                                        {icon ? <Ionicons name={icon} size={14} color={active ? colors.white : colors.text} /> : null}
                                        <Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text>
                                    </Pressable>
                                );
                            })}
                        </ScrollView>
                    </View>
                )}
            </View>

            {selectedSpot && (
                <View style={styles.previewCard}>
                    <View style={styles.previewTop}>
                        <View style={styles.previewMarker}>
                            <Text style={styles.previewMarkerText}>P</Text>
                        </View>
                        <View style={styles.previewCopy}>
                            <Text style={styles.previewName} numberOfLines={1}>{selectedSpot.name}</Text>
                            <Text style={styles.previewMeta} numberOfLines={1}>
                                {TYPE_DESIGN[selectedSpot.parkingType].label}
                                {selectedSpot.isFree !== null ? ` · ${selectedSpot.isFree ? 'Gratuito' : 'Pago'}` : ''}
                            </Text>
                            <Text style={styles.previewFreshness} numberOfLines={1}>
                                {distanceLabel(selectedSpot, userLocation) ?? 'Distância indisponível'} · {freshnessLabel(selectedSpot.updatedAt)}
                            </Text>
                        </View>
                        <Pressable
                            style={({ pressed }) => [styles.closePreview, pressed && styles.pressed]}
                            onPress={() => setSelectedSpot(null)}
                            accessibilityRole="button"
                            accessibilityLabel="Fechar pré-visualização"
                            hitSlop={8}
                        >
                            <Ionicons name="close" size={18} color={colors.textMuted} />
                        </Pressable>
                    </View>
                    <Text style={styles.previewTrust} numberOfLines={1}>{trustMessage(selectedSpot)}</Text>
                    <View style={styles.previewActions}>
                        <Pressable
                            style={({ pressed }) => [styles.confirmButton, pressed && styles.pressed, confirming && styles.disabled]}
                            disabled={confirming}
                            onPress={async () => {
                                if (!user) {
                                    router.push('/login');
                                    return;
                                }
                                setConfirming(true);
                                try {
                                    const updated = await parkingApi.vote(selectedSpot.id, 1);
                                    setSelectedSpot(updated);
                                    setSpots((current) => current.map((spot) => spot.id === updated.id ? updated : spot));
                                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                                } catch {
                                    router.push(`/parking/${selectedSpot.id}`);
                                } finally {
                                    setConfirming(false);
                                }
                            }}
                            accessibilityRole="button"
                            accessibilityLabel={`Confirmar informação de ${selectedSpot.name}`}
                        >
                            <Ionicons name="checkmark" size={15} color={colors.primary} />
                            <Text style={styles.confirmButtonText}>{confirming ? 'A confirmar…' : 'Confirmar'}</Text>
                        </Pressable>
                        <Pressable
                            style={({ pressed }) => [styles.reportButton, pressed && styles.pressed]}
                            onPress={() => router.push(`/parking/${selectedSpot.id}`)}
                            accessibilityRole="button"
                            accessibilityLabel={`Corrigir informação de ${selectedSpot.name}`}
                        >
                            <Text style={styles.reportButtonText}>Corrigir</Text>
                        </Pressable>
                    </View>
                    <View style={styles.previewBottom}>
                        <ScoreBadge score={selectedSpot.trustScore} />
                        <Pressable
                            style={({ pressed }) => [styles.detailsButton, pressed && styles.pressed]}
                            onPress={() => router.push(`/parking/${selectedSpot.id}`)}
                            accessibilityRole="button"
                            accessibilityLabel={`Ver detalhes de ${selectedSpot.name}`}
                        >
                            <Text style={styles.detailsButtonText}>Ver detalhes</Text>
                            <Ionicons name="arrow-forward" size={16} color={colors.white} />
                        </Pressable>
                    </View>
                </View>
            )}

            <Pressable
                style={({ pressed }) => [styles.listButton, pressed && styles.pressed]}
                onPress={() => router.push('/')}
                accessibilityRole="button"
                accessibilityLabel="Abrir lista de estacionamentos"
            >
                <Ionicons name="list" size={20} color={colors.primary} />
            </Pressable>

            <View style={[styles.mapControls, selectedSpot && styles.mapControlsRaised]}>
                <MapLayerPicker onChange={setMapLayer} style={styles.layerPicker} />
                <Pressable
                    style={({ pressed }) => [styles.locationButton, pressed && styles.pressed]}
                    onPress={centerOnUser}
                    accessibilityRole="button"
                    accessibilityLabel="Centrar na minha localização"
                >
                    <Ionicons name="navigate" size={20} color={colors.primary} />
                </Pressable>
            </View>

            {(fetchFailed || showingCachedData) && (
                <Pressable
                    style={({ pressed }) => [styles.errorPill, pressed && styles.pressed]}
                    onPress={() => fetchSpots(lastBbox.current)}
                    accessibilityRole="button"
                    accessibilityLabel="Sem ligação ao servidor. Tentar de novo"
                >
                    <Ionicons name={fetchFailed ? "cloud-offline" : "time-outline"} size={17} color={colors.white} />
                    <Text style={styles.errorPillText}>
                        {showingCachedData ? 'A mostrar os últimos dados guardados. Tocar para atualizar.' : 'Sem ligação. Tocar para tentar de novo.'}
                    </Text>
                </Pressable>
            )}
        </View>
    );
}

const createStyles = (colors: ThemeColors, topInset: number) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    map: {
        flex: 1,
    },
    topOverlay: {
        position: 'absolute',
        top: topInset + 8,
        left: 14,
        right: 14,
        gap: 10,
    },
    searchBar: {
        minHeight: 54,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: colors.card,
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 5,
    },
    searchMain: {
        flex: 1,
        minHeight: 42,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 8,
    },
    searchLabel: {
        flex: 1,
        fontSize: 15,
        fontWeight: '700',
        color: colors.text,
    },
    searchDivider: {
        width: 1,
        height: 24,
        backgroundColor: colors.border,
    },
    filterButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
    },
    filterButtonActive: {
        backgroundColor: colors.primary,
    },
    filterPanel: {
        paddingHorizontal: 14,
        paddingVertical: 11,
        borderRadius: 18,
        backgroundColor: colors.card,
        shadowColor: '#000',
        shadowOpacity: 0.16,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
    },
    filterPanelHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 9,
    },
    filterTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.textMuted,
    },
    clearFilter: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.primary,
    },
    filters: {
        gap: 8,
        paddingRight: 10,
    },
    filter: {
        minHeight: 38,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 13,
        borderRadius: 999,
        backgroundColor: colors.background,
    },
    filterActive: {
        backgroundColor: colors.primary,
    },
    filterText: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.text,
    },
    filterTextActive: {
        color: colors.white,
    },
    listButton: {
        position: 'absolute',
        left: 14,
        bottom: 22,
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.card,
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowRadius: 9,
        shadowOffset: { width: 0, height: 3 },
        elevation: 5,
    },
    mapControls: {
        position: 'absolute',
        right: 14,
        bottom: 22,
        alignItems: 'center',
        gap: 10,
    },
    mapControlsRaised: {
        bottom: 150,
    },
    layerPicker: {
        position: 'relative',
    },
    locationButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.card,
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowRadius: 9,
        shadowOffset: { width: 0, height: 3 },
        elevation: 5,
    },
    previewCard: {
        position: 'absolute',
        left: 14,
        right: 14,
        bottom: 18,
        padding: 14,
        borderRadius: 22,
        backgroundColor: colors.card,
        shadowColor: '#000',
        shadowOpacity: 0.22,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: -2 },
        elevation: 8,
    },
    previewTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    previewMarker: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
    },
    previewMarkerText: {
        fontSize: 18,
        fontWeight: '800',
        color: colors.white,
    },
    previewCopy: {
        flex: 1,
        minWidth: 0,
    },
    previewName: {
        fontSize: 14,
        fontWeight: '800',
        color: colors.text,
    },
    previewMeta: {
        marginTop: 3,
        fontSize: 12,
        color: colors.textMuted,
    },
    previewFreshness: {
        marginTop: 3,
        fontSize: 11,
        color: colors.textMuted,
    },
    previewTrust: {
        marginTop: 12,
        fontSize: 11,
        color: colors.textMuted,
    },
    closePreview: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.muted,
    },
    previewActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 10,
    },
    confirmButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 10,
        backgroundColor: colors.primary + '12',
    },
    confirmButtonText: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.primary,
    },
    reportButton: {
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 10,
        backgroundColor: colors.background,
    },
    reportButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textMuted,
    },
    previewBottom: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginTop: 12,
    },
    detailsButton: {
        flex: 1,
        minHeight: 42,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderRadius: 14,
        backgroundColor: colors.primary,
    },
    detailsButtonText: {
        fontSize: 13,
        fontWeight: '800',
        color: colors.white,
    },
    errorPill: {
        position: 'absolute',
        bottom: 24,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 999,
        backgroundColor: colors.danger,
    },
    errorPillText: {
        color: colors.white,
        fontSize: 12,
        fontWeight: '700',
    },
    disabled: {
        opacity: 0.5,
    },
    pressed: {
        opacity: 0.82,
        transform: [{ scale: 0.98 }],
    },
});
