import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapLayerPicker } from '../../src/components/MapLayerPicker';
import { AppMap, type AppMapHandle, type MapLayer } from '../../src/components/AppMap';
import { parkingApi } from '../../src/lib/api';
import { useTheme } from '../../src/context/ThemeContext';
import { regionToBbox, type Region } from '../../src/lib/geo';
import type { ThemeColors } from '../../src/theme/colors';
import type { ParkingSpot } from '../../src/types/parking';

const DEFAULT_REGION: Region = {
    latitude: 38.7369,
    longitude: -9.1427,
    latitudeDelta: 0.06,
    longitudeDelta: 0.06,
};

interface LatLng {
    latitude: number;
    longitude: number;
}

export default function MapScreen() {
    const insets = useSafeAreaInsets();
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
                const perm = await Location.getForegroundPermissionsAsync();
                const status = perm.status === 'granted'
                    ? 'granted'
                    : (await Location.requestForegroundPermissionsAsync()).status;
                if (status === 'granted') {
                    // última posição conhecida primeiro: centra já, sem esperar pelo GPS
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
        [spots, colors]
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
            {/* Barra superior */}
            <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
                <Text style={styles.logo}>Parqi</Text>
                {loading && <ActivityIndicator color={colors.white} size="small" />}
            </View>

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

            {/* Camadas do mapa (satélite, dark, topo...) */}
            <MapLayerPicker
                onChange={setMapLayer}
                style={{ position: 'absolute', right: 12, bottom: 20 }}
            />

            {/* Botões flutuantes */}
            <View style={[styles.fabColumn, { top: insets.top + 56 }]}>
                <Pressable style={styles.fab} onPress={centerOnUser} accessibilityLabel="Centrar na minha localização">
                    <Ionicons name="locate" size={22} color={colors.primary} />
                </Pressable>
                <Pressable style={styles.fab} onPress={() => router.push('/contribute')} accessibilityLabel="Adicionar estacionamento">
                    <Ionicons name="add" size={26} color={colors.primary} />
                </Pressable>
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
    map: {
        flex: 1,
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
    errorPill: {
        position: 'absolute',
        bottom: 20,
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
