import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Linking,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppMap } from '../../src/components/AppMap';
import { StatusBadge } from '../../src/components/StatusBadge';
import { TrustBar } from '../../src/components/TrustBar';
import { TypeChip } from '../../src/components/TypeChip';
import { useAuth } from '../../src/context/AuthContext';
import { useFavorites } from '../../src/context/FavoritesContext';
import { useTheme } from '../../src/context/ThemeContext';
import { ApiError, parkingApi } from '../../src/lib/api';
import { CAPACITY_LABELS, directionsUrl, formatDate, formatScore } from '../../src/lib/geo';
import { AMENITY_DESIGN, MONO, PALETTE, SOURCE_LABELS, themedText, trustColor } from '../../src/theme/design';
import type { ThemeColors } from '../../src/theme/colors';
import type { ParkingSpot, ParkingType } from '../../src/types/parking';

/** Imagens hero por tipo, as mesmas do design. */
const HERO_IMAGES: Partial<Record<ParkingType, string>> = {
    UNDERGROUND: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=600&h=300&fit=crop&auto=format',
    MULTI_STORY: 'https://images.unsplash.com/photo-1590674899484-13da64c9c3d7?w=600&h=300&fit=crop&auto=format',
};
const HERO_DEFAULT = 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=600&h=300&fit=crop&auto=format';

/** Ícone de fallback do hero por tipo, quando a imagem remota falha. */
const HERO_ICONS: Record<ParkingType, keyof typeof Ionicons.glyphMap> = {
    SURFACE: 'car-outline',
    UNDERGROUND: 'lock-closed-outline',
    MULTI_STORY: 'layers-outline',
    STREET: 'navigate-outline',
    OTHER: 'location-outline',
};

function priceLabel(isFree: boolean | null): string {
    if (isFree === true) return 'GRÁTIS';
    if (isFree === false) return 'PAGO';
    return '—';
}

function trustCaption(score: number): string {
    // Os limiares espelham o TrustCalculator: aprovado a 5, sinalizado abaixo de 3.
    if (score >= 8) return 'Bem verificado pela comunidade.';
    if (score >= 5) return 'Verificado pela comunidade.';
    return 'Em verificação. Confirma antes de ir.';
}

/** Leaflet usa pares [lat, lng]; o GeoJSON vem [lng, lat]. */
function polygonRingOf(spot: ParkingSpot): [number, number][] {
    if (spot.geometry?.type !== 'Polygon') return [];
    return spot.geometry.coordinates[0].map((c) => [c[1], c[0]] as [number, number]);
}

function linePointsOf(spot: ParkingSpot): [number, number][] {
    if (spot.geometry?.type !== 'LineString') return [];
    return spot.geometry.coordinates.map((c) => [c[1], c[0]] as [number, number]);
}

interface VoteButtonProps {
    dir: 'up' | 'down';
    voted: 'up' | 'down' | null;
    voting: boolean;
    onPress: () => void;
    styles: ReturnType<typeof createStyles>;
    mutedColor: string;
}

function VoteButton({ dir, voted, voting, onPress, styles, mutedColor }: Readonly<VoteButtonProps>) {
    const { resolvedScheme } = useTheme();
    const isUp = dir === 'up';
    const active = voted === dir;
    const activeColor = themedText(isUp ? PALETTE.emerald : PALETTE.red, resolvedScheme);
    const activeStyle = isUp ? styles.voteBtnUp : styles.voteBtnDown;
    return (
        <Pressable
            style={({ pressed }) => [
                styles.voteBtn,
                active && activeStyle,
                voting && styles.disabled,
                pressed && styles.votePressed,
            ]}
            onPress={onPress}
            disabled={voting}
        >
            <Ionicons
                name={isUp ? 'thumbs-up' : 'thumbs-down'}
                size={16}
                color={active ? activeColor : mutedColor}
            />
            <Text style={[styles.voteText, active && { color: activeColor }]}>
                {isUp ? 'Confirmar' : 'Reportar'}
            </Text>
        </Pressable>
    );
}

function submissionRowsOf(spot: ParkingSpot): { label: string; value: string }[] {
    return [
        { label: 'Adicionado por', value: SOURCE_LABELS[spot.source] },
        { label: 'Data', value: formatDate(spot.createdAt) },
    ];
}

export default function ParkingDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const { isFavorite, toggleFavorite, refreshFavorite } = useFavorites();
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const [spot, setSpot] = useState<ParkingSpot | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [voting, setVoting] = useState(false);
    const [voted, setVoted] = useState<'up' | 'down' | null>(null);
    const [heroFailed, setHeroFailed] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [reasonModal, setReasonModal] = useState(false);
    const [reason, setReason] = useState('');

    const load = useCallback(async (opts?: { refresh?: boolean }) => {
        if (!id) return;
        if (opts?.refresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }
        try {
            const fresh = await parkingApi.get(id);
            setSpot(fresh);
            setVoted(fresh.myVote ?? null);
            refreshFavorite(fresh);
            setNotFound(false);
        } catch (error) {
            if (error instanceof ApiError && error.status === 404) {
                setNotFound(true);
            } else {
                Alert.alert('Erro', opts?.refresh ? 'Não foi possível atualizar.' : 'Não foi possível carregar o estacionamento.');
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [id, refreshFavorite]);

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
            setVoted(value === 1 ? 'up' : 'down');
            Haptics.selectionAsync().catch(() => {});
        } catch (error) {
            Alert.alert('Erro', error instanceof ApiError ? error.message : 'Não foi possível votar.');
        } finally {
            setVoting(false);
            setReasonModal(false);
            setReason('');
        }
    };

    const doUnvote = async () => {
        if (!spot) return;
        setVoting(true);
        try {
            setSpot(await parkingApi.unvote(spot.id));
            setVoted(null);
            Haptics.selectionAsync().catch(() => {});
        } catch (error) {
            Alert.alert('Erro', error instanceof ApiError ? error.message : 'Não foi possível anular o voto.');
        } finally {
            setVoting(false);
        }
    };

    const handleVote = (value: 1 | -1) => {
        if (!requireAuth()) return;
        // Tocar no voto ativo anula-o
        if ((voted === 'up' && value === 1) || (voted === 'down' && value === -1)) {
            doUnvote();
            return;
        }
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
                <Stack.Screen options={{ headerShown: false }} />
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (notFound || !spot) {
        return (
            <View style={styles.center}>
                <Stack.Screen options={{ headerShown: false }} />
                <Text style={styles.emptyTitle}>Estacionamento não encontrado</Text>
                <Pressable
                    style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
                    onPress={() => router.back()}
                >
                    <Text style={styles.primaryButtonText}>Voltar</Text>
                </Pressable>
            </View>
        );
    }

    const isOwner = user?.id === spot.contributorId;
    const heroUri = HERO_IMAGES[spot.parkingType] ?? HERO_DEFAULT;
    const scoreColor = trustColor(spot.trustScore, colors.primary);
    const amenities = AMENITY_DESIGN.filter((a) => spot[a.key] === true);
    const polygonRing = polygonRingOf(spot);
    const linePoints = linePointsOf(spot);
    const mapCenter = {
        latitude: spot.latitude ?? 41.4426,
        longitude: spot.longitude ?? -8.2914,
    };
    const submissionRows = submissionRowsOf(spot);

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={() => load({ refresh: true })}
                    tintColor={colors.primary}
                />
            }
        >
            <Stack.Screen options={{ headerShown: false }} />

            {/* Hero */}
            <View style={styles.hero}>
                {heroFailed ? (
                    <View style={styles.heroFallback}>
                        <Ionicons name={HERO_ICONS[spot.parkingType]} size={44} color={colors.primary} />
                    </View>
                ) : (
                    <Image
                        source={{ uri: heroUri }}
                        style={styles.heroImage}
                        onError={() => setHeroFailed(true)}
                    />
                )}
                <View style={styles.heroOverlay} />
                <Pressable
                    style={({ pressed }) => [styles.backBtn, { top: insets.top + 8 }, pressed && styles.pressed]}
                    onPress={() => router.back()}
                    accessibilityRole="button"
                    accessibilityLabel="Voltar"
                >
                    <Ionicons name="arrow-back" size={18} color={colors.text} />
                </Pressable>
                <View style={[styles.heroStatus, { top: insets.top + 8 }]}>
                    <StatusBadge status={spot.status} />
                </View>
                <Pressable
                    style={({ pressed }) => [styles.favBtn, pressed && styles.pressed]}
                    onPress={() => {
                        Haptics.selectionAsync().catch(() => {});
                        toggleFavorite(spot);
                    }}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={isFavorite(spot.id) ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                >
                    <Ionicons
                        name={isFavorite(spot.id) ? 'heart' : 'heart-outline'}
                        size={20}
                        color={isFavorite(spot.id) ? colors.accent : colors.text}
                    />
                </Pressable>
            </View>

            <View style={styles.body}>
                {/* Título */}
                <View style={styles.titleBlock}>
                    <Text style={styles.name}>{spot.name}</Text>
                    {spot.description ? (
                        <Text style={styles.address}>{spot.description}</Text>
                    ) : null}
                    <View style={styles.titleMeta}>
                        <TypeChip type={spot.parkingType} />
                        <Text style={styles.price}>{priceLabel(spot.isFree)}</Text>
                        {spot.capacityRange && (
                            <Text style={styles.capacity}>· {CAPACITY_LABELS[spot.capacityRange]}</Text>
                        )}
                    </View>
                    {spot.requiresReview && (
                        <Text style={styles.reviewHint}>A aguardar revisão manual</Text>
                    )}
                </View>

                {/* Trust score */}
                <View style={styles.card}>
                    <View style={styles.trustHeader}>
                        <Text style={styles.sectionLabel}>Confiança da comunidade</Text>
                        <Text style={[styles.trustValue, { color: scoreColor }]}>
                            {formatScore(spot.trustScore)}
                            <Text style={styles.trustMax}>/10</Text>
                        </Text>
                    </View>
                    <TrustBar trustScore={spot.trustScore} />
                    <Text style={styles.trustCaption}>{trustCaption(spot.trustScore)}</Text>
                </View>

                {/* Amenities */}
                {amenities.length > 0 && (
                    <View style={styles.card}>
                        <Text style={styles.sectionLabel}>Comodidades</Text>
                        <View style={styles.amenityGrid}>
                            {amenities.map((a) => (
                                <View key={a.key} style={styles.amenityCell}>
                                    <Ionicons name={a.icon} size={14} color={colors.primary} />
                                    <Text style={styles.amenityText}>{a.label}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Votos da comunidade */}
                <View style={styles.card}>
                    <Text style={styles.sectionLabel}>Votos da comunidade</Text>
                    {isOwner ? (
                        <Text style={styles.ownerVoteHint}>
                            Este estacionamento é teu — a comunidade decide.
                        </Text>
                    ) : (
                        <>
                            <View style={styles.voteRow}>
                                <VoteButton
                                    dir="up"
                                    voted={voted}
                                    voting={voting}
                                    onPress={() => handleVote(1)}
                                    styles={styles}
                                    mutedColor={colors.textMuted}
                                />
                                <VoteButton
                                    dir="down"
                                    voted={voted}
                                    voting={voting}
                                    onPress={() => handleVote(-1)}
                                    styles={styles}
                                    mutedColor={colors.textMuted}
                                />
                            </View>
                            {voted && (
                                <Text style={styles.undoHint}>Toca no teu voto para o anular.</Text>
                            )}
                            {!user && (
                                <Text style={styles.authHint}>Inicia sessão para votar.</Text>
                            )}
                        </>
                    )}
                </View>

                {/* Mapa */}
                <View style={styles.mapCard}>
                    <AppMap
                        center={mapCenter}
                        zoom={16}
                        interactive={false}
                        polygon={polygonRing}
                        polyline={linePoints}
                        brandColor={colors.primary}
                        accentColor={colors.accent}
                        markers={
                            spot.latitude !== null && spot.longitude !== null
                                ? [{ id: spot.id, latitude: spot.latitude, longitude: spot.longitude, color: colors.primary }]
                                : []
                        }
                        style={styles.mapPreview}
                    />
                </View>

                {/* Submission info */}
                <View style={styles.card}>
                    <Text style={styles.sectionLabel}>Informação da submissão</Text>
                    <View style={styles.infoList}>
                        {submissionRows.map(({ label, value }) => (
                            <View key={label} style={styles.infoRow}>
                                <Text style={styles.infoLabel}>{label}</Text>
                                <Text style={styles.infoValue}>{value}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Ações */}
                <Pressable
                    style={({ pressed }) => [styles.routeBtn, pressed && styles.pressed]}
                    onPress={openRoute}
                >
                    <Ionicons name="navigate" size={16} color={colors.white} />
                    <Text style={styles.routeText}>Rota</Text>
                </Pressable>
                <Pressable
                    style={({ pressed }) => [styles.suggestBtn, pressed && styles.pressed]}
                    onPress={openSuggest}
                >
                    <Ionicons
                        name={isOwner ? 'create-outline' : 'git-compare-outline'}
                        size={16}
                        color={colors.primary}
                    />
                    <Text style={styles.suggestText}>
                        {isOwner ? 'Editar este estacionamento' : 'Sugerir alteração ou informação'}
                    </Text>
                </Pressable>
            </View>

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
                            <Pressable
                                style={({ pressed }) => [styles.modalCancel, pressed && styles.pressed]}
                                onPress={() => setReasonModal(false)}
                            >
                                <Text style={styles.modalCancelText}>Cancelar</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.primaryButton, !reason.trim() && styles.disabled]}
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
    scrollContent: {
        paddingBottom: 40,
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: 24,
        backgroundColor: colors.background,
    },
    emptyTitle: {
        fontSize: 16,
        color: colors.textMuted,
    },
    hero: {
        height: 190,
        backgroundColor: colors.card,
    },
    heroImage: {
        width: '100%',
        height: '100%',
        opacity: 0.55,
    },
    heroFallback: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary + '14',
    },
    heroOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: colors.background + '66',
    },
    backBtn: {
        position: 'absolute',
        left: 16,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.card + 'E6',
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroStatus: {
        position: 'absolute',
        right: 16,
    },
    favBtn: {
        position: 'absolute',
        right: 16,
        bottom: 12,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.card + 'E6',
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    body: {
        paddingHorizontal: 16,
        gap: 12,
        marginTop: -8,
    },
    titleBlock: {
        marginBottom: 4,
    },
    name: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
    },
    address: {
        fontSize: 14,
        color: colors.textMuted,
        marginTop: 2,
    },
    titleMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 8,
    },
    price: {
        fontSize: 12,
        fontWeight: '700',
        fontFamily: MONO,
        color: colors.primary,
    },
    capacity: {
        fontSize: 12,
        fontFamily: MONO,
        color: colors.textMuted,
    },
    reviewHint: {
        fontSize: 12,
        color: PALETTE.amber,
        marginTop: 6,
    },
    card: {
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        padding: 16,
    },
    sectionLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 10,
    },
    trustHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    trustValue: {
        fontSize: 24,
        fontWeight: '700',
        fontFamily: MONO,
    },
    trustMax: {
        fontSize: 13,
        fontWeight: '400',
        color: colors.textMuted,
    },
    trustCaption: {
        fontSize: 11,
        color: colors.textMuted,
        marginTop: 8,
    },
    amenityGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    amenityCell: {
        width: '48%',
        flexGrow: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: colors.background,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    amenityText: {
        fontSize: 12,
        fontWeight: '500',
        color: colors.text,
    },
    voteRow: {
        flexDirection: 'row',
        gap: 12,
    },
    voteBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
    },
    voteBtnUp: {
        backgroundColor: PALETTE.emerald + '1A',
        borderColor: PALETTE.emerald + '66',
    },
    voteBtnDown: {
        backgroundColor: PALETTE.red + '1A',
        borderColor: PALETTE.red + '66',
    },
    votePressed: {
        opacity: 0.7,
        transform: [{ scale: 0.98 }],
    },
    voteText: {
        fontSize: 13,
        fontWeight: '500',
        fontFamily: MONO,
        color: colors.textMuted,
    },
    authHint: {
        fontSize: 11,
        color: colors.textMuted,
        marginTop: 10,
        textAlign: 'center',
    },
    undoHint: {
        fontSize: 11,
        color: colors.primary,
        marginTop: 10,
        textAlign: 'center',
    },
    ownerVoteHint: {
        fontSize: 12,
        color: colors.textMuted,
        textAlign: 'center',
    },
    pressed: {
        opacity: 0.85,
        transform: [{ scale: 0.99 }],
    },
    mapCard: {
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
    },
    mapPreview: {
        height: 160,
    },
    infoList: {
        gap: 8,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    infoLabel: {
        fontSize: 12,
        color: colors.textMuted,
    },
    infoValue: {
        fontSize: 12,
        fontFamily: MONO,
        color: colors.text,
    },
    routeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: colors.primary,
    },
    routeText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.white,
    },
    suggestBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
    },
    suggestText: {
        fontSize: 13,
        fontWeight: '500',
        color: colors.primary,
    },
    primaryButton: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: colors.primary,
    },
    primaryButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.white,
    },
    disabled: {
        opacity: 0.5,
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalCard: {
        backgroundColor: colors.card,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        gap: 12,
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: colors.text,
    },
    modalInput: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 15,
        color: colors.text,
        backgroundColor: colors.background,
        minHeight: 70,
        textAlignVertical: 'top',
    },
    modalActions: {
        flexDirection: 'row',
        gap: 10,
    },
    modalCancel: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.border,
    },
    modalCancelText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
    },
});
