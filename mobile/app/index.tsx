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
import { OsmMap, type OsmMapHandle } from '../src/components/OsmMap';
import { SpotCard } from '../src/components/SpotCard';
import { useAuth } from '../src/context/AuthContext';
import { parkingApi } from '../src/lib/api';
import { useTheme } from '../src/context/ThemeContext';
import { distanceKm, regionToBbox, type Region } from '../src/lib/geo';
import type { ThemeColors } from '../src/theme/colors';
import type { ParkingSpot } from '../src/types/parking';

const DEFAULT_REGION: Region = {
    latitude: 41.4426,
    longitude: -8.2914,
    latitudeDelta: 0.06,
    longitudeDelta: 0.06,
};

interface LatLng {
    latitude: number;
    longitude: number;
}

export default function HomeScreen() {
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const mapRef = useRef<OsmMapHandle>(null);
    const fetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastBbox = useRef(regionToBbox(DEFAULT_REGION));

    const [view, setView] = useState<'list' | 'map'>('list');
    const [center, setCenter] = useState<LatLng>(DEFAULT_REGION);
    const [userLocation, setUserLocation] = useState<LatLng | null>(null);
    const [spots, setSpots] = useState<ParkingSpot[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetchFailed, setFetchFailed] = useState(false);

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

    // Primeira carga + tentativa de centrar na localização do utilizador
    useEffect(() => {
        fetchSpots(regionToBbox(DEFAULT_REGION));
        (async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
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

    // Lista ordenada por distância ao utilizador (quando conhecida)
    const sortedSpots = useMemo(() => {
        if (!userLocation) return spots;
        return [...spots].sort((a, b) => {
            const da =
                a.latitude !== null && a.longitude !== null
                    ? distanceKm(userLocation.latitude, userLocation.longitude, a.latitude, a.longitude)
                    : Number.POSITIVE_INFINITY;
            const db =
                b.latitude !== null && b.longitude !== null
                    ? distanceKm(userLocation.latitude, userLocation.longitude, b.latitude, b.longitude)
                    : Number.POSITIVE_INFINITY;
            return da - db;
        });
    }, [spots, userLocation]);

    // Pins por estado: azul = verificado, laranja = em verificação, vermelho = sinalizado
    const markers = useMemo(
        () =>
            spots
                .filter((s) => s.latitude !== null && s.longitude !== null)
                .map((s) => ({
                    id: s.id,
                    latitude: s.latitude!,
                    longitude: s.longitude!,
                    color:
                        s.status === 'PENDING'
                            ? colors.accent
                            : s.status === 'FLAGGED'
                              ? colors.danger
                              : colors.primary,
                    textColor: s.status === 'PENDING' ? colors.onAccent : colors.white,
                })),
        [spots]
    );

    const handleBoundsChange = (bbox: string) => {
        if (fetchTimer.current) {
            clearTimeout(fetchTimer.current);
        }
        fetchTimer.current = setTimeout(() => fetchSpots(bbox), 400);
    };

    const centerOnUser = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
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

    const errorPill = fetchFailed && (
        <Pressable
            style={[styles.errorPill, { bottom: insets.bottom + 88 }]}
            onPress={() => fetchSpots(lastBbox.current)}
            accessibilityLabel="Sem ligação ao servidor. Tentar de novo"
        >
            <Ionicons name="cloud-offline" size={18} color={colors.white} />
            <Text style={styles.errorPillText}>Sem ligação ao servidor. Tenta de novo.</Text>
        </Pressable>
    );

    // ─────────────── Modo lista (ecrã principal) ───────────────
    if (view === 'list') {
        return (
            <View style={styles.container}>
                <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
                    <Text style={styles.logo}>Parqi</Text>
                    <View style={styles.topBarActions}>
                        {loading && <ActivityIndicator color={colors.white} size="small" />}
                        <Pressable onPress={() => router.push('/account')} accessibilityLabel="Conta e preferências" hitSlop={8}>
                            <Ionicons name="person-circle-outline" size={26} color={colors.white} />
                        </Pressable>
                    </View>
                </View>

                <FlatList
                    data={sortedSpots}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 96 }]}
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                    refreshControl={
                        <RefreshControl refreshing={loading} onRefresh={() => fetchSpots(lastBbox.current)} tintColor={colors.primary} />
                    }
                    renderItem={({ item }) => (
                        <SpotCard
                            spot={item}
                            distanceKm={
                                userLocation && item.latitude !== null && item.longitude !== null
                                    ? distanceKm(userLocation.latitude, userLocation.longitude, item.latitude, item.longitude)
                                    : undefined
                            }
                            onPress={() => router.push(`/parking/${item.id}`)}
                        />
                    )}
                    ListEmptyComponent={
                        !loading ? (
                            <View style={styles.emptyWrap}>
                                <Ionicons name="car-outline" size={40} color={colors.textMuted} />
                                <Text style={styles.emptyTitle}>Sem estacionamentos nesta zona</Text>
                                <Pressable style={styles.emptyCta} onPress={() => router.push('/contribute')}>
                                    <Text style={styles.emptyCtaText}>Adicionar o primeiro</Text>
                                </Pressable>
                            </View>
                        ) : null
                    }
                />

                {errorPill}

                {/* Ações: adicionar + mudar para o mapa (canto inferior direito) */}
                <View style={[styles.bottomFabs, { bottom: insets.bottom + 16 }]}>
                    <Pressable style={styles.fab} onPress={() => router.push('/contribute')} accessibilityLabel="Adicionar estacionamento">
                        <Ionicons name="add" size={26} color={colors.primary} />
                    </Pressable>
                    <Pressable
                        style={[styles.fab, styles.fabPrimary]}
                        onPress={() => setView('map')}
                        accessibilityLabel="Ver mapa"
                    >
                        <Ionicons name="map" size={22} color={colors.onAccent} />
                    </Pressable>
                </View>
            </View>
        );
    }

    // ─────────────── Modo mapa (OpenStreetMap) ───────────────
    return (
        <View style={styles.container}>
            <OsmMap
                ref={mapRef}
                center={center}
                zoom={14}
                cluster
                markers={markers}
                userLocation={userLocation}
                onMarkerPress={(id) => router.push(`/parking/${id}`)}
                onBoundsChange={handleBoundsChange}
                style={StyleSheet.absoluteFill}
            />

            {/* Barra superior */}
            <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
                <Text style={styles.logo}>Parqi</Text>
                {loading && <ActivityIndicator color={colors.white} size="small" />}
            </View>

            {/* Botões flutuantes */}
            <View style={[styles.fabColumn, { top: insets.top + 56 }]}>
                <Pressable style={styles.fab} onPress={centerOnUser} accessibilityLabel="Centrar na minha localização">
                    <Ionicons name="locate" size={22} color={colors.primary} />
                </Pressable>
                <Pressable style={styles.fab} onPress={() => router.push('/contribute')} accessibilityLabel="Adicionar estacionamento">
                    <Ionicons name="add" size={26} color={colors.primary} />
                </Pressable>
            </View>

            {errorPill}

            {/* Voltar à lista (canto inferior direito) */}
            <Pressable
                style={[styles.fab, styles.fabPrimary, styles.fabBottomRight, { bottom: insets.bottom + 16 }]}
                onPress={() => setView('list')}
                accessibilityLabel="Ver lista"
            >
                <Ionicons name="list" size={22} color={colors.onAccent} />
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
    topBarActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    logo: {
        fontSize: 22,
        fontWeight: '800',
        color: colors.white,
        letterSpacing: 0.5,
    },
    listContent: {
        padding: 16,
    },
    separator: {
        height: 10,
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
    bottomFabs: {
        position: 'absolute',
        right: 16,
        gap: 12,
        alignItems: 'center',
    },
    fabColumn: {
        position: 'absolute',
        right: 12,
        gap: 12,
    },
    fab: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 4,
    },
    fabPrimary: {
        backgroundColor: colors.accent,
    },
    fabBottomRight: {
        position: 'absolute',
        right: 16,
    },
    errorPill: {
        position: 'absolute',
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
