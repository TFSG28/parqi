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
import { regionToBbox, type Region } from '../../src/lib/geo';
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

    const nearbySpots = useMemo(
        () => filteredSpots.filter((s) => s.status === 'APPROVED').slice(0, 10),
        [filteredSpots]
    );

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
                    style={styles.searchBox}
                    onPress={() => router.push('/(tabs)')}
                    accessibilityRole="button"
                    accessibilityLabel="Pesquisar estacionamentos"
                >
                    <Ionicons name="search" size={16} color={colors.textMuted} />
                    <Text style={styles.searchText}>Lisboa, Portugal</Text>
                </Pressable>
                {loading && <ActivityIndicator color={colors.primary} size="small" />}
            </View>

            {/* Chips de filtro por tipo */}
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
                            onPress={() => setTypeFilter(t)}
                            style={[styles.filterChip, active && styles.filterChipActive]}
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
                    onMarkerPress={(id) => router.push(`/parking/${id}`)}
                    onBoundsChange={handleBoundsChange}
                    style={styles.map}
                />

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
                        style={[styles.controlBtn, styles.controlBtnActive]}
                        onPress={centerOnUser}
                        accessibilityLabel="Centrar na minha localização"
                    >
                        <Ionicons name="navigate" size={16} color={colors.primary} />
                    </Pressable>
                </View>
            </View>

            {/* Nearby strip */}
            <View style={styles.nearbySection}>
                <Text style={styles.nearbyTitle}>
                    PERTO DE TI · {nearbySpots.length} VERIFICADOS
                </Text>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.nearbyList}
                >
                    {nearbySpots.map((spot) => (
                        <Pressable
                            key={spot.id}
                            style={styles.nearbyCard}
                            onPress={() => router.push(`/parking/${spot.id}`)}
                        >
                            <Text style={styles.nearbyName} numberOfLines={1}>{spot.name}</Text>
                            <View style={styles.nearbyTrust}>
                                <TrustBar trustScore={spot.trustScore} />
                            </View>
                            <View style={styles.nearbyMeta}>
                                <TypeChip type={spot.parkingType} />
                                <Text style={styles.nearbyPrice}>{priceLabel(spot.isFree)}</Text>
                            </View>
                        </Pressable>
                    ))}
                    {nearbySpots.length === 0 && !loading && (
                        <Text style={styles.nearbyEmpty}>Sem estacionamentos verificados nesta zona.</Text>
                    )}
                </ScrollView>
            </View>

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
        fontSize: 14,
        color: colors.textMuted,
    },
    chipsScroll: {
        flexGrow: 0,
    },
    chips: {
        paddingHorizontal: 16,
        paddingBottom: 12,
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
        fontSize: 11,
        fontFamily: MONO,
        letterSpacing: 1.5,
        color: colors.textMuted,
        paddingHorizontal: 16,
        marginBottom: 8,
    },
    nearbyList: {
        paddingHorizontal: 16,
        gap: 12,
    },
    nearbyCard: {
        width: 160,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        padding: 12,
    },
    nearbyName: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 8,
    },
    nearbyTrust: {
        marginBottom: 8,
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
});
