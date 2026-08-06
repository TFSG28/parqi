import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { OsmMap } from '../../src/components/OsmMap';
import { StatusBadge } from '../../src/components/StatusBadge';
import { TrustBar } from '../../src/components/TrustBar';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { ApiError, parkingApi } from '../../src/lib/api';
import { CAPACITY_LABELS, directionsUrl, SOURCE_META, TYPE_META } from '../../src/lib/geo';
import type { ThemeColors } from '../../src/theme/colors';
import type { ParkingSpot } from '../../src/types/parking';

const DETAIL_ROWS: {
    key: 'hasPregnantSpaces' | 'hasDisabledSpaces' | 'hasEvCharging' | 'isCovered';
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
}[] = [
    { key: 'hasPregnantSpaces', label: 'Lugares para grávidas', icon: 'woman' },
    { key: 'hasDisabledSpaces', label: 'Mobilidade reduzida', icon: 'accessibility' },
    { key: 'hasEvCharging', label: 'Carregamento elétrico', icon: 'flash' },
    { key: 'isCovered', label: 'Coberto', icon: 'umbrella' },
];

export default function ParkingDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user } = useAuth();
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const [spot, setSpot] = useState<ParkingSpot | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [voting, setVoting] = useState(false);
    const [reasonModal, setReasonModal] = useState(false);
    const [reason, setReason] = useState('');

    const load = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        try {
            setSpot(await parkingApi.get(id));
            setNotFound(false);
        } catch (error) {
            if (error instanceof ApiError && error.status === 404) {
                setNotFound(true);
            } else {
                Alert.alert('Erro', 'Não foi possível carregar o estacionamento.');
            }
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        load();
    }, [load]);

    const requireAuth = (): boolean => {
        if (!user) {
            router.push('/login');
            return false;
        }
        return true;
    };

    const doVote = async (value: 1 | -1, voteReason?: string) => {
        if (!spot) return;
        setVoting(true);
        try {
            setSpot(await parkingApi.vote(spot.id, value, voteReason));
        } catch (error) {
            Alert.alert('Erro', error instanceof ApiError ? error.message : 'Não foi possível votar.');
        } finally {
            setVoting(false);
            setReasonModal(false);
            setReason('');
        }
    };

    const handleVote = (value: 1 | -1) => {
        if (!requireAuth()) return;
        if (value === -1) {
            setReasonModal(true);
            return;
        }
        doVote(1);
    };

    const openRoute = () => {
        if (spot?.latitude !== null && spot?.longitude !== null) {
            Linking.openURL(directionsUrl(spot!.latitude!, spot!.longitude!)).catch(() =>
                Alert.alert('Erro', 'Não foi possível abrir o Google Maps.')
            );
        }
    };

    const openSuggest = () => {
        if (!requireAuth()) return;
        router.push(`/suggest/${spot!.id}`);
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (notFound || !spot) {
        return (
            <View style={styles.center}>
                <Text style={styles.emptyTitle}>Estacionamento não encontrado</Text>
                <Pressable style={styles.primaryButton} onPress={() => router.back()}>
                    <Text style={styles.primaryButtonText}>Voltar</Text>
                </Pressable>
            </View>
        );
    }

    const type = TYPE_META[spot.parkingType];
    const source = SOURCE_META[spot.source];
    const isOwner = user?.id === spot.contributorId;
    // Leaflet usa pares [lat, lng]; o GeoJSON vem [lng, lat]
    const polygonRing: [number, number][] =
        spot.geometry?.type === 'Polygon'
            ? spot.geometry.coordinates[0].map((c) => [c[1], c[0]] as [number, number])
            : [];
    const linePoints: [number, number][] =
        spot.geometry?.type === 'LineString'
            ? spot.geometry.coordinates.map((c) => [c[1], c[0]] as [number, number])
            : [];
    const mapCenter = {
        latitude: spot.latitude ?? 41.4426,
        longitude: spot.longitude ?? -8.2914,
    };
    const knownDetails = DETAIL_ROWS.filter((row) => spot[row.key] === true);

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            {/* Cabeçalho */}
            <View style={styles.header}>
                <View style={[styles.typeIcon, { backgroundColor: type.color + '22' }]}>
                    <Ionicons name={type.icon} size={26} color={type.color} />
                </View>
                <View style={styles.headerText}>
                    <Text style={styles.name}>{spot.name}</Text>
                    <View style={styles.metaRow}>
                        <Text style={styles.typeLabel}>{type.label}</Text>
                        <View style={[styles.sourceBadge, { backgroundColor: source.color + '1A' }]}>
                            <Ionicons name={source.icon} size={11} color={source.color} />
                            <Text style={[styles.sourceLabel, { color: source.color }]}>{source.label}</Text>
                        </View>
                    </View>
                    {spot.requiresReview && (
                        <Text style={styles.reviewHint}>A aguardar revisão manual</Text>
                    )}
                </View>
                <StatusBadge status={spot.status} />
            </View>

            {/* Confiança */}
            <View style={styles.card}>
                <TrustBar trustScore={spot.trustScore} />
            </View>

            {/* Detalhes */}
            <View style={styles.card}>
                <View style={styles.detailRow}>
                    <Ionicons name="car" size={18} color={colors.textMuted} />
                    <Text style={styles.detailText}>
                        {spot.capacityRange ? CAPACITY_LABELS[spot.capacityRange] : 'Lotação desconhecida'}
                    </Text>
                </View>
                <View style={styles.detailRow}>
                    <Ionicons name={spot.isFree === true ? 'pricetag' : spot.isFree === false ? 'wallet' : 'help'} size={18} color={colors.textMuted} />
                    <Text style={styles.detailText}>
                        {spot.isFree === true ? 'Gratuito' : spot.isFree === false ? 'Pago' : 'Custo desconhecido'}
                    </Text>
                </View>
                {knownDetails.length > 0 && (
                    <View style={styles.detailsDivider}>
                        {knownDetails.map((row) => (
                            <View key={row.key} style={styles.detailRow}>
                                <Ionicons name={row.icon} size={18} color={colors.success} />
                                <Text style={styles.detailText}>{row.label}</Text>
                                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                            </View>
                        ))}
                    </View>
                )}
                {spot.description ? (
                    <Text style={styles.description}>{spot.description}</Text>
                ) : null}
            </View>

            {/* Pré-visualização no mapa */}
            <View style={styles.mapCard}>
                <OsmMap
                    center={mapCenter}
                    zoom={16}
                    interactive={false}
                    polygon={polygonRing}
                    polyline={linePoints}
                    markers={
                        spot.latitude !== null && spot.longitude !== null
                            ? [{ id: spot.id, latitude: spot.latitude, longitude: spot.longitude, color: type.color }]
                            : []
                    }
                    style={styles.mapPreview}
                />
            </View>

            {/* Ações */}
            <View style={styles.actions}>
                <Pressable style={[styles.upvoteButton, voting && styles.buttonDisabled]} onPress={() => handleVote(1)} disabled={voting}>
                    <Ionicons name="thumbs-up" size={18} color={colors.success} />
                    <Text style={styles.upvoteText}>Confirmar</Text>
                </Pressable>
                <Pressable style={[styles.downvoteButton, voting && styles.buttonDisabled]} onPress={() => handleVote(-1)} disabled={voting}>
                    <Ionicons name="thumbs-down" size={18} color={colors.danger} />
                    <Text style={styles.downvoteText}>Reportar</Text>
                </Pressable>
                <Pressable style={styles.routeButton} onPress={openRoute}>
                    <Ionicons name="navigate" size={18} color={colors.onAccent} />
                    <Text style={styles.routeText}>Rota</Text>
                </Pressable>
            </View>

            {/* Complementar informação */}
            <Pressable style={styles.suggestButton} onPress={openSuggest}>
                <Ionicons name={isOwner ? 'create-outline' : 'git-compare-outline'} size={18} color={colors.primary} />
                <Text style={styles.suggestText}>
                    {isOwner ? 'Editar este estacionamento' : 'Sugerir alteração ou informação'}
                </Text>
            </Pressable>
            {!user && (
                <Text style={styles.authHint}>Inicia sessão para votar ou adicionar estacionamentos.</Text>
            )}

            {/* Modal motivo do voto negativo */}
            <Modal visible={reasonModal} transparent animationType="slide">
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Porque é que este estacionamento está errado?</Text>
                        <TextInput
                            style={styles.modalInput}
                            value={reason}
                            onChangeText={setReason}
                            placeholder="Ex.: já não existe, é privado…"
                            placeholderTextColor={colors.textMuted}
                            maxLength={200}
                            multiline
                        />
                        <View style={styles.modalActions}>
                            <Pressable style={styles.modalCancel} onPress={() => setReasonModal(false)}>
                                <Text style={styles.modalCancelText}>Cancelar</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.primaryButton, !reason.trim() && styles.buttonDisabled]}
                                disabled={!reason.trim() || voting}
                                onPress={() => doVote(-1, reason.trim())}
                            >
                                <Text style={styles.primaryButtonText}>Enviar</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        padding: 16,
        gap: 12,
        paddingBottom: 40,
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: 24,
    },
    emptyTitle: {
        fontSize: 16,
        color: colors.textMuted,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    typeIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerText: {
        flex: 1,
        gap: 4,
    },
    name: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
    },
    typeLabel: {
        fontSize: 13,
        color: colors.textMuted,
    },
    sourceBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 999,
    },
    sourceLabel: {
        fontSize: 11,
        fontWeight: '700',
    },
    reviewHint: {
        fontSize: 11,
        color: colors.accent,
        fontWeight: '600',
    },
    card: {
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 10,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    detailText: {
        fontSize: 14,
        color: colors.text,
        flex: 1,
    },
    detailsDivider: {
        gap: 8,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingTop: 10,
    },
    description: {
        fontSize: 14,
        color: colors.text,
        lineHeight: 20,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingTop: 10,
    },
    mapCard: {
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
    },
    mapPreview: {
        height: 180,
    },
    actions: {
        flexDirection: 'row',
        gap: 10,
    },
    upvoteButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.success,
        backgroundColor: colors.card,
    },
    upvoteText: {
        color: colors.success,
        fontWeight: '600',
    },
    downvoteButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.danger,
        backgroundColor: colors.card,
    },
    downvoteText: {
        color: colors.danger,
        fontWeight: '600',
    },
    routeButton: {
        flex: 1.2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: colors.accent,
    },
    routeText: {
        color: colors.onAccent,
        fontWeight: '700',
    },
    suggestButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 13,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.primary,
        backgroundColor: colors.card,
    },
    suggestText: {
        color: colors.primary,
        fontWeight: '600',
    },
    authHint: {
        textAlign: 'center',
        fontSize: 12,
        color: colors.textMuted,
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    modalCard: {
        backgroundColor: colors.card,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        gap: 12,
        paddingBottom: 32,
    },
    modalTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
    },
    modalInput: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        padding: 12,
        minHeight: 80,
        textAlignVertical: 'top',
        color: colors.text,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
    },
    modalCancel: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
    },
    modalCancelText: {
        color: colors.textMuted,
        fontWeight: '600',
    },
    primaryButton: {
        backgroundColor: colors.primary,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
        alignItems: 'center',
    },
    primaryButtonText: {
        color: colors.white,
        fontWeight: '700',
    },
    buttonDisabled: {
        opacity: 0.5,
    },
});
