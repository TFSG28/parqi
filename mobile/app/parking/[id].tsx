import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
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
import { ScoreBadge } from '../../src/components/ScoreBadge';
import { StatusBadge } from '../../src/components/StatusBadge';
import { TrustBar } from '../../src/components/TrustBar';
import { useAuth } from '../../src/context/AuthContext';
import { useFavorites } from '../../src/context/FavoritesContext';
import { useTheme } from '../../src/context/ThemeContext';
import { ApiError, parkingApi } from '../../src/lib/api';
import { CAPACITY_LABELS, directionsUrl, formatDate, formatScore } from '../../src/lib/geo';
import { AMENITY_DESIGN, MONO, PALETTE, SOURCE_LABELS, themedText, trustColor, TYPE_DESIGN } from '../../src/theme/design';
import type { ThemeColors } from '../../src/theme/colors';
import type { ParkingSpot } from '../../src/types/parking';

function priceLabel(isFree: boolean | null): string {
    if (isFree === true) return 'Gratuito';
    if (isFree === false) return 'Pago';
    return '—';
}

function trustCaption(score: number): string {
    // Os limiares espelham o TrustCalculator: aprovado a 5, sinalizado abaixo de 3.
    if (score >= 8) return 'Bem verificado pela comunidade.';
    if (score >= 5) return 'Verificado pela comunidade.';
    return 'Em revisão. Confirma antes de ir.';
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
    const scoreColor = trustColor(spot.trustScore, colors.primary);
    const amenities = AMENITY_DESIGN.filter((a) => spot[a.key] === true);
    const polygonRing = polygonRingOf(spot);
    const linePoints = linePointsOf(spot);
    const mapCenter = {
        latitude: spot.latitude ?? 41.4426,
        longitude: spot.longitude ?? -8.2914,
    };

    const keyFacts: { label: string; value: string; highlight?: boolean }[] = [
        { label: 'Tipo', value: TYPE_DESIGN[spot.parkingType].label },
        { label: 'Capacidade', value: spot.capacityRange ? CAPACITY_LABELS[spot.capacityRange] : '—' },
        { label: 'Tarifa', value: priceLabel(spot.isFree), highlight: spot.isFree === true },
        { label: 'Adicionado', value: formatDate(spot.createdAt) },
    ];

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

            {/* Hero — gradiente na cor da confiança, como no design v2 */}
            <View style={[styles.hero, { paddingTop: insets.top + 12, backgroundColor: scoreColor + '14' }]}>
                <View style={styles.heroRow}>
                    <Pressable
                        style={({ pressed }) => [styles.backLink, pressed && styles.pressed]}
                        onPress={() => router.back()}
                        accessibilityRole="button"
                        accessibilityLabel="Voltar"
                        hitSlop={8}
                    >
                        <Ionicons name="arrow-back" size={16} color={colors.textMuted} />
                        <Text style={styles.backLinkText}>Voltar</Text>
                    </Pressable>
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
                            size={16}
                            color={isFavorite(spot.id) ? colors.accent : colors.textMuted}
                        />
                    </Pressable>
                </View>

                <View style={styles.heroBody}>
                    <View style={styles.heroTitleWrap}>
                        <StatusBadge status={spot.status} />
                        <Text style={styles.name}>{spot.name}</Text>
                        {spot.description ? (
                            <Text style={styles.address}>{spot.description}</Text>
                        ) : null}
                    </View>
                    <View style={styles.heroScore}>
                        <ScoreBadge score={spot.trustScore} large />
                        <Text style={styles.heroScoreLabel}>CONFIANÇA</Text>
                    </View>
                </View>
            </View>

            <View style={styles.body}>
                {/* Factos-chave */}
                <View style={styles.card}>
                    <View style={styles.factsGrid}>
                        {keyFacts.map(({ label, value, highlight }) => (
                            <View key={label} style={styles.factCell}>
                                <Text style={styles.factLabel}>{label}</Text>
                                <Text style={[styles.factValue, highlight && { color: colors.primary }]}>
                                    {value}
                                </Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Confiança */}
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

                {/* Comodidades */}
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

                {/* Localização */}
                <View style={styles.card}>
                    <Text style={styles.sectionLabel}>Localização</Text>
                    {spot.latitude !== null && spot.longitude !== null ? (
                        <Text style={styles.coords}>
                            {spot.latitude.toFixed(5)}°N, {Math.abs(spot.longitude).toFixed(5)}°O
                        </Text>
                    ) : (
                        <Text style={styles.coords}>Coordenadas não disponíveis</Text>
                    )}
                    <Text style={styles.submittedBy}>Submetido por {SOURCE_LABELS[spot.source]}</Text>
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
        paddingHorizontal: 16,
        paddingBottom: 28,
    },
    heroRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    backLink: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    backLinkText: {
        fontSize: 14,
        color: colors.textMuted,
    },
    favBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.card + 'CC',
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroBody: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    heroTitleWrap: {
        flex: 1,
        minWidth: 0,
    },
    name: {
        fontSize: 24,
        fontWeight: '800',
        color: colors.text,
        marginTop: 8,
        lineHeight: 29,
    },
    address: {
        fontSize: 14,
        color: colors.textMuted,
        marginTop: 4,
    },
    heroScore: {
        alignItems: 'center',
        gap: 4,
    },
    heroScoreLabel: {
        fontSize: 10,
        fontFamily: MONO,
        letterSpacing: 1,
        color: colors.textMuted,
    },
    body: {
        paddingHorizontal: 16,
        gap: 12,
    },
    card: {
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 16,
        padding: 16,
    },
    sectionLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 10,
    },
    factsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        rowGap: 16,
    },
    factCell: {
        width: '50%',
    },
    factLabel: {
        fontSize: 12,
        color: colors.textMuted,
        marginBottom: 4,
    },
    factValue: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
    },
    trustHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    trustValue: {
        fontSize: 22,
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
        borderRadius: 12,
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
        paddingVertical: 12,
        borderRadius: 12,
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
        fontWeight: '600',
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
    coords: {
        fontSize: 12,
        fontFamily: MONO,
        color: colors.textMuted,
    },
    submittedBy: {
        fontSize: 12,
        color: colors.textMuted,
        marginTop: 4,
    },
    mapCard: {
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
    },
    mapPreview: {
        height: 160,
    },
    routeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 16,
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
