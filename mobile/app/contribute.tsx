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
import { MapLayerPicker } from '../src/components/MapLayerPicker';
import { AppMap, type AppMapHandle, type MapLayer } from '../src/components/AppMap';
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

type DrawMode = 'point' | 'polygon' | 'line';

const TYPE_OPTIONS: ParkingType[] = ['SURFACE', 'UNDERGROUND', 'MULTI_STORY', 'STREET', 'OTHER'];
const CAPACITY_OPTIONS: CapacityRange[] = [
    'RANGE_1_5',
    'RANGE_6_20',
    'RANGE_21_50',
    'RANGE_51_100',
    'RANGE_100_PLUS',
];

const DEFAULT_LOCATION: LatLng = { latitude: 38.7369, longitude: -9.1427 };

const DETAIL_FIELDS: {
    key: 'hasPregnantSpaces' | 'hasDisabledSpaces' | 'hasEvCharging' | 'isCovered';
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
}[] = [
    { key: 'hasPregnantSpaces', label: 'Lugares para grávidas', icon: 'woman' },
    { key: 'hasDisabledSpaces', label: 'Mobilidade reduzida', icon: 'accessibility' },
    { key: 'hasEvCharging', label: 'Carregamento elétrico', icon: 'flash' },
    { key: 'isCovered', label: 'Coberto', icon: 'umbrella' },
];

export default function ContributeScreen() {
    const { user, loading } = useAuth();
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const mapRef = useRef<AppMapHandle>(null);

    const [mode, setMode] = useState<DrawMode>('point');
    const [point, setPoint] = useState<LatLng | null>(null);
    const [vertices, setVertices] = useState<LatLng[]>([]);
    const [mapLayer, setMapLayer] = useState<MapLayer>('standard');

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [parkingType, setParkingType] = useState<ParkingType>('SURFACE');
    const [capacityRange, setCapacityRange] = useState<CapacityRange | null>(null);
    const [isFree, setIsFree] = useState(false);
    const [details, setDetails] = useState({
        hasPregnantSpaces: false,
        hasDisabledSpaces: false,
        hasEvCharging: false,
        isCovered: false,
    });
    const [submitting, setSubmitting] = useState(false);

    // Guarda de autenticação
    useEffect(() => {
        if (!loading && !user) {
            router.replace('/login');
        }
    }, [user, loading]);

    // Posição inicial = localização do utilizador (fallback Lisboa)
    useEffect(() => {
        (async () => {
            try {
                const perm = await Location.getForegroundPermissionsAsync();
                const status = perm.status === 'granted'
                    ? 'granted'
                    : (await Location.requestForegroundPermissionsAsync()).status;
                if (status === 'granted') {
                    const loc = await Location.getCurrentPositionAsync({});
                    setPoint({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
                    mapRef.current?.centerOn(loc.coords.latitude, loc.coords.longitude, 16);
                    return;
                }
            } catch {
                // ignora
            }
            setPoint(DEFAULT_LOCATION);
        })();
    }, []);

    // Na via (STREET) desenha-se uma linha ao longo da estrada
    const selectType = (type: ParkingType) => {
        setParkingType(type);
        if (type === 'STREET') {
            setMode('line');
        } else if (mode === 'line') {
            setMode('point');
            setVertices([]);
        }
    };

    const selectMode = (next: DrawMode) => {
        setMode(next);
        setVertices([]);
        if (next === 'line') {
            setParkingType('STREET');
        } else if (parkingType === 'STREET') {
            setParkingType('SURFACE');
        }
    };

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
        if (mode === 'line') {
            if (vertices.length < 2) return null;
            return {
                type: 'LineString',
                coordinates: vertices.map((v) => [v.longitude, v.latitude] as [number, number]),
            };
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
                    : mode === 'line'
                      ? 'Toca no mapa para desenhar a linha ao longo da estrada (2 pontos ou mais).'
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
                hasPregnantSpaces: details.hasPregnantSpaces || undefined,
                hasDisabledSpaces: details.hasDisabledSpaces || undefined,
                hasEvCharging: details.hasEvCharging || undefined,
                isCovered: details.isCovered || undefined,
            });
            Alert.alert(
                'Contribuição enviada',
                parkingType === 'STREET'
                    ? 'O estacionamento na via entra em verificação pela comunidade.'
                    : 'O estacionamento entra em verificação pela comunidade.',
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
    const linePoints: [number, number][] = vertices.map((v) => [v.latitude, v.longitude]);

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

    const minVertices = mode === 'line' ? 2 : 4;

    return (
        <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                {/* Regras da comunidade: educar antes de submeter poupa moderação depois */}
                <View style={styles.rulesCard}>
                    <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
                    <Text style={styles.rulesText}>
                        Só lugares reais e na posição exata. Se já existir no mapa a menos de 30 m,
                        sugere uma edição em vez de criar outro. As primeiras contribuições passam por
                        revisão.
                    </Text>
                </View>

                {/* Seletor de modo */}
                <View style={styles.modeRow}>
                    <Chip label="Ponto" selected={mode === 'point'} onPress={() => selectMode('point')} />
                    <Chip label="Área" selected={mode === 'polygon'} onPress={() => selectMode('polygon')} />
                    <Chip label="Na via (linha)" selected={mode === 'line'} onPress={() => selectMode('line')} />
                </View>

                {/* Mapa de desenho */}
                <View style={styles.mapCard}>
                    <AppMap
                        ref={mapRef}
                        center={DEFAULT_LOCATION}
                        zoom={15}
                        markers={mapMarkers}
                        polygon={mode === 'polygon' ? polygonRing : []}
                        polyline={mode === 'line' ? linePoints : []}
                        layer={mapLayer}
                        onMapPress={handleMapPress}
                        style={styles.map}
                    />
                    <MapLayerPicker onChange={setMapLayer} style={styles.layerPicker} />

                    {mode !== 'point' && (
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
                                {vertices.length < minVertices
                                    ? `${vertices.length}/${minVertices} pontos mínimos`
                                    : `${vertices.length} pontos`}
                            </Text>
                        </View>
                    )}
                    <View style={styles.pointHint}>
                        <Text style={styles.pointHintText}>
                            {mode === 'point' && 'Toca no mapa para marcar ou ajustar a localização.'}
                            {mode === 'polygon' && 'Toca no mapa para adicionar vértices da área.'}
                            {mode === 'line' &&
                                'Toca no mapa ao longo da estrada para desenhar a linha de estacionamento.'}
                        </Text>
                    </View>
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
                            onPress={() => selectType(type)}
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

                {/* Detalhes de acessibilidade e serviços */}
                <Text style={styles.label}>Detalhes (opcional)</Text>
                <View style={styles.detailsCard}>
                    {DETAIL_FIELDS.map((field) => (
                        <View key={field.key} style={styles.switchRow}>
                            <View style={styles.detailLabelRow}>
                                <Ionicons name={field.icon} size={17} color={colors.textMuted} />
                                <Text style={styles.detailLabel}>{field.label}</Text>
                            </View>
                            <Switch
                                value={details[field.key]}
                                onValueChange={(value) => setDetails((current) => ({ ...current, [field.key]: value }))}
                                trackColor={{ true: colors.primary }}
                            />
                        </View>
                    ))}
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
    rulesCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        padding: 12,
    },
    rulesText: {
        flex: 1,
        fontSize: 12,
        lineHeight: 18,
        color: colors.textMuted,
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
    layerPicker: {
        position: 'absolute',
        top: 196,
        right: 8,
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
    detailsCard: {
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 16,
        padding: 12,
        marginTop: 4,
        gap: 2,
    },
    detailLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    detailLabel: {
        fontSize: 14,
        color: colors.text,
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
