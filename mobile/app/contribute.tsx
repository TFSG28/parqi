import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View,
} from 'react-native';
import { Chip } from '../src/components/Chip';
import { OsmMap, type OsmMapHandle } from '../src/components/OsmMap';
import { useAuth } from '../src/context/AuthContext';
import { useTheme } from '../src/context/ThemeContext';
import { ApiError, parkingApi } from '../src/lib/api';
import { CAPACITY_LABELS, TYPE_META } from '../src/lib/geo';
import type { ThemeColors } from '../src/theme/colors';
import type { CapacityRange, Geometry, ParkingType } from '../src/types/parking';

interface LatLng {
    latitude: number;
    longitude: number;
}

const TYPE_OPTIONS: ParkingType[] = ['SURFACE', 'UNDERGROUND', 'MULTI_STORY', 'STREET', 'OTHER'];
const CAPACITY_OPTIONS: CapacityRange[] = [
    'RANGE_1_5',
    'RANGE_6_20',
    'RANGE_21_50',
    'RANGE_51_100',
    'RANGE_100_PLUS',
];

const GUIMARAES: LatLng = { latitude: 41.4426, longitude: -8.2914 };

export default function ContributeScreen() {
    const { user, loading } = useAuth();
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const mapRef = useRef<OsmMapHandle>(null);

    const [mode, setMode] = useState<'point' | 'polygon'>('point');
    const [point, setPoint] = useState<LatLng | null>(null);
    const [vertices, setVertices] = useState<LatLng[]>([]);

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [parkingType, setParkingType] = useState<ParkingType>('SURFACE');
    const [capacityRange, setCapacityRange] = useState<CapacityRange | null>(null);
    const [isFree, setIsFree] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Guarda de autenticação
    useEffect(() => {
        if (!loading && !user) {
            router.replace('/login');
        }
    }, [user, loading]);

    // Posição inicial = localização do utilizador (fallback Guimarães)
    useEffect(() => {
        (async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                    const loc = await Location.getCurrentPositionAsync({});
                    setPoint({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
                    mapRef.current?.centerOn(loc.coords.latitude, loc.coords.longitude, 16);
                    return;
                }
            } catch {
                // ignora
            }
            setPoint(GUIMARAES);
        })();
    }, []);

    const handleMapPress = (coordinate: LatLng) => {
        if (mode === 'point') {
            setPoint(coordinate);
        } else {
            setVertices((current) => [...current, coordinate]);
        }
    };

    const undoVertex = () => setVertices((current) => current.slice(0, -1));

    const buildGeometry = (): Geometry | null => {
        if (mode === 'point') {
            if (!point) return null;
            return { type: 'Point', coordinates: [point.longitude, point.latitude] };
        }
        if (vertices.length < 4) return null;
        const ring = vertices.map((v) => [v.longitude, v.latitude] as [number, number]);
        ring.push(ring[0]); // fechar o anel
        return { type: 'Polygon', coordinates: [ring] };
    };

    const submit = async () => {
        const geometry = buildGeometry();
        if (name.trim().length < 2) {
            Alert.alert('Falta o nome', 'Indica o nome do estacionamento.');
            return;
        }
        if (!geometry) {
            Alert.alert(
                'Geometria incompleta',
                mode === 'point'
                    ? 'Toca no mapa para marcar o local.'
                    : 'Adiciona pelo menos 4 vértices (toca no mapa).'
            );
            return;
        }

        setSubmitting(true);
        try {
            await parkingApi.create({
                name: name.trim(),
                description: description.trim() || undefined,
                geometry,
                parkingType,
                capacityRange: capacityRange ?? undefined,
                isFree,
            });
            Alert.alert(
                'Contribuição enviada',
                'O estacionamento entra em verificação pela comunidade.',
                [{ text: 'OK', onPress: () => router.back() }]
            );
        } catch (error) {
            if (error instanceof ApiError && error.status === 409 && error.details?.existingId) {
                Alert.alert('Já existe', `${error.message} Ver o existente?`, [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                        text: 'Ver',
                        onPress: () => router.replace(`/parking/${error.details!.existingId as string}`),
                    },
                ]);
            } else {
                Alert.alert(
                    'Erro',
                    error instanceof ApiError ? error.message : 'Não foi possível enviar a contribuição.'
                );
            }
        } finally {
            setSubmitting(false);
        }
    };

    // Leaflet usa pares [lat, lng]
    const polygonRing: [number, number][] =
        vertices.length > 1 ? [...vertices, vertices[0]].map((v) => [v.latitude, v.longitude]) : [];

    const mapMarkers =
        mode === 'point'
            ? point
                ? [{ id: 'point', latitude: point.latitude, longitude: point.longitude, color: colors.primary }]
                : []
            : vertices.map((v, index) => ({
                  id: `vertex-${index}`,
                  latitude: v.latitude,
                  longitude: v.longitude,
                  color: colors.accent,
                  kind: 'dot' as const,
              }));

    return (
        <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                {/* Seletor de modo */}
                <View style={styles.modeRow}>
                    <Chip label="Ponto" selected={mode === 'point'} onPress={() => setMode('point')} />
                    <Chip label="Polígono (área)" selected={mode === 'polygon'} onPress={() => setMode('polygon')} />
                </View>

                {/* Mapa de desenho */}
                <View style={styles.mapCard}>
                    <OsmMap
                        ref={mapRef}
                        center={GUIMARAES}
                        zoom={15}
                        markers={mapMarkers}
                        polygon={mode === 'polygon' ? polygonRing : []}
                        onMapPress={handleMapPress}
                        style={styles.map}
                    />

                    {mode === 'polygon' && (
                        <View style={styles.polygonControls}>
                            <Pressable
                                style={[styles.polygonButton, vertices.length === 0 && styles.polygonButtonDisabled]}
                                onPress={undoVertex}
                                disabled={vertices.length === 0}
                            >
                                <Ionicons name="arrow-undo" size={18} color={colors.white} />
                                <Text style={styles.polygonButtonText}>Desfazer</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.polygonButton, vertices.length === 0 && styles.polygonButtonDisabled]}
                                onPress={() => setVertices([])}
                                disabled={vertices.length === 0}
                            >
                                <Ionicons name="trash" size={18} color={colors.white} />
                                <Text style={styles.polygonButtonText}>Limpar</Text>
                            </Pressable>
                            <Text style={styles.polygonCount}>
                                {vertices.length < 4
                                    ? `${vertices.length}/4 vértices mínimos`
                                    : `${vertices.length} vértices`}
                            </Text>
                        </View>
                    )}
                    {mode === 'point' && (
                        <View style={styles.pointHint}>
                            <Text style={styles.pointHintText}>Toca no mapa para marcar ou ajustar a localização.</Text>
                        </View>
                    )}
                </View>

                {/* Formulário */}
                <Text style={styles.label}>Nome *</Text>
                <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="Ex.: Parque do Toural"
                    placeholderTextColor={colors.textMuted}
                    maxLength={120}
                />

                <Text style={styles.label}>Tipo</Text>
                <View style={styles.chipRow}>
                    {TYPE_OPTIONS.map((type) => (
                        <Chip
                            key={type}
                            label={TYPE_META[type].label}
                            selected={parkingType === type}
                            onPress={() => setParkingType(type)}
                        />
                    ))}
                </View>

                <Text style={styles.label}>Lotação (opcional)</Text>
                <View style={styles.chipRow}>
                    {CAPACITY_OPTIONS.map((range) => (
                        <Chip
                            key={range}
                            label={CAPACITY_LABELS[range]}
                            selected={capacityRange === range}
                            onPress={() => setCapacityRange(capacityRange === range ? null : range)}
                        />
                    ))}
                </View>

                <View style={styles.switchRow}>
                    <Text style={styles.label}>Gratuito</Text>
                    <Switch value={isFree} onValueChange={setIsFree} trackColor={{ true: colors.primary }} />
                </View>

                <Text style={styles.label}>Descrição (opcional)</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    value={description}
                    onChangeText={setDescription}
                    placeholder="Ex.: Entrada pela rua X, piso -1…"
                    placeholderTextColor={colors.textMuted}
                    maxLength={2000}
                    multiline
                />

                <Pressable
                    style={[styles.submitButton, submitting && styles.buttonDisabled]}
                    onPress={submit}
                    disabled={submitting}
                >
                    {submitting ? (
                        <ActivityIndicator color={colors.onAccent} />
                    ) : (
                        <>
                            <Ionicons name="send" size={18} color={colors.onAccent} />
                            <Text style={styles.submitText}>Enviar contribuição</Text>
                        </>
                    )}
                </Pressable>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
    flex: {
        flex: 1,
        backgroundColor: colors.background,
    },
    container: {
        flex: 1,
    },
    content: {
        padding: 16,
        gap: 8,
        paddingBottom: 40,
    },
    modeRow: {
        flexDirection: 'row',
        gap: 8,
    },
    mapCard: {
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
        marginVertical: 8,
    },
    map: {
        height: 260,
    },
    polygonControls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 10,
        backgroundColor: colors.card,
    },
    polygonButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.primary,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        opacity: 1,
    },
    polygonButtonText: {
        color: colors.white,
        fontSize: 12,
        fontWeight: '600',
    },
    polygonButtonDisabled: {
        opacity: 0.45,
    },
    polygonCount: {
        flex: 1,
        textAlign: 'right',
        fontSize: 12,
        color: colors.textMuted,
    },
    pointHint: {
        padding: 10,
        backgroundColor: colors.card,
    },
    pointHintText: {
        fontSize: 12,
        color: colors.textMuted,
        textAlign: 'center',
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.text,
        marginTop: 10,
    },
    input: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        padding: 12,
        backgroundColor: colors.card,
        color: colors.text,
        marginTop: 4,
    },
    textArea: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 4,
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 4,
    },
    submitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: colors.accent,
        borderRadius: 14,
        paddingVertical: 14,
        marginTop: 20,
    },
    submitText: {
        color: colors.onAccent,
        fontWeight: '700',
        fontSize: 15,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
});
