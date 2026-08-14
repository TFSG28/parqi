import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
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
import { Onboarding } from '../../src/components/Onboarding';
import { TypeChip } from '../../src/components/TypeChip';
import { TrustBar } from '../../src/components/TrustBar';
import { useAuth } from '../../src/context/AuthContext';
import { useFavorites } from '../../src/context/FavoritesContext';
import { useTheme } from '../../src/context/ThemeContext';
import { ApiError, authApi, parkingApi } from '../../src/lib/api';
import { formatScore } from '../../src/lib/geo';
import { alpha10, MONO, PALETTE, themedText } from '../../src/theme/design';
import type { ThemeColors } from '../../src/theme/colors';
import type { ContributorStats } from '../../src/types/parking';

function levelLabel(rep: ContributorStats['reputation'] | undefined): string {
    if (rep?.isTrusted) return 'Utilizador de Confiança';
    if (rep?.isNew) return 'Novo membro';
    return 'Contribuidor';
}

function initialsOf(name: string): string {
    return name
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p.charAt(0).toUpperCase())
        .join('');
}

const PERKS: { icon: keyof typeof Ionicons.glyphMap; text: string }[] = [
    { icon: 'trending-up', text: 'Peso de voto 1,4× (padrão: 1×)' },
    { icon: 'shield-checkmark', text: 'Fila de moderação ignorada' },
    { icon: 'chatbubble-outline', text: 'Sugestões de melhoria diretas' },
    { icon: 'speedometer-outline', text: 'Limite: 10 submissões por dia' },
];

const FAQ_ITEMS: { q: string; a: string }[] = [
    {
        q: 'Como funciona a confiança (0–10)?',
        a: 'Cada voto ajusta a pontuação: +1,5 por confirmação e −2 por reporte. A partir de 5 o lugar fica Verificado; abaixo de 3 entra em revisão.',
    },
    {
        q: 'Como funciona o peso dos votos?',
        a: 'Contas novas e utilizadores sem confiança votam com peso 0,5. A partir da reputação 5 (Confiável) passas a votar com peso total.',
    },
    {
        q: 'Posso alterar ou anular o meu voto?',
        a: 'Sim. Toca outra vez no teu voto para o anular, ou vota no sentido contrário para o mudar. A confiança é recalculada de imediato.',
    },
    {
        q: 'Quem pode adicionar estacionamentos?',
        a: 'Qualquer pessoa com conta e email validado. Contribuições de contas novas entram na fila de moderação antes de aparecerem no mapa.',
    },
    {
        q: 'De onde vêm os dados oficiais?',
        a: 'Importamos dados públicos da OpenStreetMap, Geoapify e câmaras municipais. Esses lugares têm confiança base mais alta que os da comunidade.',
    },
    {
        q: 'Como elimino a minha conta?',
        a: 'Em Perfil → Eliminar conta, com confirmação por palavra-passe. As contribuições já validadas ficam no mapa, anonimizadas.',
    },
];

export default function ProfileScreen() {
    const { user, logout } = useAuth();
    const { favorites } = useFavorites();
    const { colors, resolvedScheme } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const [loggingOut, setLoggingOut] = useState(false);
    const [stats, setStats] = useState<ContributorStats | null>(null);
    const [statsLoading, setStatsLoading] = useState(false);
    const [statsError, setStatsError] = useState(false);
    const [deleteModal, setDeleteModal] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');
    const [deleting, setDeleting] = useState(false);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    const loadStats = useCallback(async () => {
        if (!user) return;
        setStatsLoading(true);
        setStatsError(false);
        try {
            setStats(await parkingApi.stats());
        } catch (error) {
            setStatsError(true);
            if (error instanceof ApiError && error.status === 429) {
                Alert.alert('Limite atingido', error.message);
            }
        } finally {
            setStatsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        loadStats();
    }, [loadStats]);

    const handleDeleteAccount = async () => {
        if (!deletePassword) return;
        setDeleting(true);
        try {
            await authApi.deleteAccount(deletePassword);
            setDeleteModal(false);
            setDeletePassword('');
            await logout();
            Alert.alert('Conta eliminada', 'Os teus dados pessoais foram removidos. Até um dia!');
        } catch (error) {
            Alert.alert(
                'Erro',
                error instanceof ApiError ? error.message : 'Não foi possível eliminar a conta.'
            );
        } finally {
            setDeleting(false);
        }
    };

    const handleLogout = async () => {
        setLoggingOut(true);
        try {
            await logout();
        } catch {
            Alert.alert('Erro', 'Não foi possível terminar a sessão.');
        } finally {
            setLoggingOut(false);
        }
    };

    const rep = stats?.reputation;
    const repPct = rep ? Math.min(100, (rep.score / 10) * 100) : 0;
    const level = levelLabel(rep);
    const handle = user ? `@${user.email.split('@')[0]}` : '';

    const badges = useMemo(() => {
        const list: { icon: keyof typeof Ionicons.glyphMap; label: string; color: string }[] = [];
        if (!stats) return list;
        if (stats.reputation.isTrusted) {
            list.push({ icon: 'shield-checkmark', label: 'De confiança', color: PALETTE.emerald });
        }
        if (stats.total >= 10) {
            list.push({ icon: 'flash', label: '10 locais', color: PALETTE.violet });
        }
        if (stats.approved >= 1) {
            list.push({ icon: 'star', label: 'Contribuidor', color: PALETTE.amber });
        }
        return list;
    }, [stats]);

    const showRepSpinner = statsLoading && !stats;
    const repScoreText = rep ? formatScore(rep.score) : '—';
    const trustedMark = rep?.isTrusted ? '✓' : '';

    const statCards: { label: string; value: string; color: string }[] = stats
        ? [
            { label: 'Locais adicionados', value: String(stats.total), color: colors.primary },
            { label: 'Verificados', value: String(stats.approved), color: '#10B981' },
            { label: 'Votos dados', value: String(stats.votesGiven), color: colors.text },
            { label: 'Taxa de aprovação', value: `${Math.round(stats.approvedRate)}%`, color: PALETTE.amberDeep },
        ]
        : [];

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Perfil</Text>
                {user?.role === 'ADMIN' && (
                    <Pressable
                        style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
                        onPress={() => router.push('/admin')}
                        accessibilityLabel="Administração"
                    >
                        <Ionicons name="settings-outline" size={16} color={colors.textMuted} />
                    </Pressable>
                )}
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
                {/* Avatar + nome, como no design v2 */}
                <View style={styles.identity}>
                    <View style={styles.avatar}>
                        {user ? (
                            <Text style={styles.avatarText}>{initialsOf(user.name) || '?'}</Text>
                        ) : (
                            <Ionicons name="person" size={26} color={colors.white} />
                        )}
                    </View>
                    <View style={styles.identityInfo}>
                        <Text style={styles.name} numberOfLines={2}>{user ? user.name : 'Sem sessão iniciada'}</Text>
                        {user ? (
                            <>
                                <Text style={styles.handle} numberOfLines={1}>{handle}</Text>
                                <View style={styles.trustPill}>
                                    <Ionicons name="shield-checkmark" size={12} color={colors.primary} />
                                    <Text style={styles.trustPillText}>{level}</Text>
                                </View>
                            </>
                        ) : (
                            <Text style={styles.handle}>Entra para votar e adicionar estacionamentos.</Text>
                        )}
                    </View>
                </View>

                {!user && (
                    <Pressable
                        style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
                        onPress={() => router.push('/login')}
                    >
                        <Text style={styles.primaryBtnText}>Entrar ou criar conta</Text>
                    </Pressable>
                )}

                {user?.emailVerified === false && (
                    <Pressable
                        style={({ pressed }) => [styles.verifyBanner, pressed && styles.pressed]}
                        onPress={() => router.push('/verify')}
                    >
                        <Ionicons name="mail-unread" size={16} color={PALETTE.amber} />
                        <Text style={styles.verifyText}>
                            Email não verificado — valida a tua conta para poderes contribuir.
                        </Text>
                        <Ionicons name="chevron-forward" size={14} color={PALETTE.amber} />
                    </Pressable>
                )}

                {/* Favoritos guardados no dispositivo */}
                <View style={styles.card}>
                    <Text style={styles.sectionLabel}>Favoritos</Text>
                    {favorites.length === 0 ? (
                        <Text style={styles.favEmpty}>
                            Ainda não guardaste favoritos. Toca no coração de um estacionamento para o
                            encontrares aqui.
                        </Text>
                    ) : (
                        favorites.map((f) => (
                            <Pressable
                                key={f.id}
                                style={({ pressed }) => [styles.favRow, pressed && styles.favRowPressed]}
                                onPress={() => router.push(`/parking/${f.id}`)}
                                accessibilityRole="button"
                            >
                                <View style={styles.favInfo}>
                                    <Text style={styles.favName} numberOfLines={1}>{f.name}</Text>
                                    <TypeChip type={f.parkingType} />
                                </View>
                                <View style={styles.favTrust}>
                                    <TrustBar trustScore={f.trustScore} />
                                </View>
                            </Pressable>
                        ))
                    )}
                </View>

                {user && (
                    <>
                        {/* Reputação */}
                        <View style={styles.card}>
                            <View style={styles.repHeader}>
                                <Text style={styles.sectionLabel}>Reputação</Text>
                                {showRepSpinner ? (
                                    <ActivityIndicator size="small" color={colors.primary} />
                                ) : (
                                    <Text style={styles.repValue}>{repScoreText}</Text>
                                )}
                            </View>
                            <View style={styles.repTrack}>
                                <View style={[styles.repFill, { width: `${repPct}%` }]} />
                            </View>
                            <View style={styles.repScale}>
                                <Text style={styles.repScaleText}>Novo</Text>
                                <Text style={[styles.repScaleText, { color: colors.primary }]}>
                                    ≥ 5 Confiança {trustedMark}
                                </Text>
                                <Text style={styles.repScaleText}>Expert</Text>
                            </View>
                            {statsError && (
                                <Pressable
                                    style={({ pressed }) => [styles.retry, pressed && styles.pressed]}
                                    onPress={loadStats}
                                >
                                    <Ionicons name="refresh" size={14} color={colors.primary} />
                                    <Text style={styles.retryText}>Não foi possível carregar. Tentar de novo</Text>
                                </Pressable>
                            )}
                        </View>

                        {/* Stats grid — valores a cores, como no design v2 */}
                        {statCards.length > 0 && (
                            <View style={styles.statsGrid}>
                                {statCards.map(({ label, value, color }) => (
                                    <View key={label} style={styles.statCard}>
                                        <Text style={[styles.statValue, { color }]}>{value}</Text>
                                        <Text style={styles.statLabel}>{label}</Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Distintivos */}
                        {badges.length > 0 && (
                            <View style={styles.card}>
                                <Text style={styles.sectionLabel}>Distintivos</Text>
                                <View style={styles.badgeRow}>
                                    {badges.map(({ icon, label, color }) => {
                                        const textColor = themedText(color, resolvedScheme);
                                        return (
                                            <View
                                                key={label}
                                                style={[styles.badge, { backgroundColor: alpha10(color) }]}
                                            >
                                                <Ionicons name={icon} size={13} color={textColor} />
                                                <Text style={[styles.badgeText, { color: textColor }]}>{label}</Text>
                                            </View>
                                        );
                                    })}
                                </View>
                            </View>
                        )}

                        {/* Privilégios ativos */}
                        {rep?.isTrusted && (
                            <View style={styles.card}>
                                <Text style={styles.sectionLabel}>Privilégios ativos</Text>
                                {PERKS.map(({ icon, text }) => (
                                    <View key={text} style={styles.perkRow}>
                                        <View style={styles.perkIcon}>
                                            <Ionicons name={icon} size={13} color={colors.primary} />
                                        </View>
                                        <Text style={styles.perkText}>{text}</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </>
                )}

                {/* Ajuda */}
                <View style={styles.card}>
                    <Text style={styles.sectionLabel}>Ajuda</Text>
                    <Pressable
                        style={({ pressed }) => [styles.aboutRow, pressed && styles.pressed]}
                        accessibilityRole="button"
                        onPress={() => setShowOnboarding(true)}
                        hitSlop={8}
                    >
                        <Ionicons name="eye-outline" size={16} color={colors.textMuted} />
                        <Text style={styles.aboutText}>Ver introdução</Text>
                        <Ionicons name="chevron-forward" size={13} color={colors.textMuted} />
                    </Pressable>
                    {FAQ_ITEMS.map((item, i) => (
                        <View key={item.q}>
                            <Pressable
                                style={({ pressed }) => [styles.aboutRow, pressed && styles.pressed]}
                                accessibilityRole="button"
                                onPress={() => setOpenFaq(openFaq === i ? null : i)}
                                hitSlop={8}
                            >
                                <Ionicons name="help-circle-outline" size={16} color={colors.textMuted} />
                                <Text style={styles.aboutText}>{item.q}</Text>
                                <Ionicons
                                    name={openFaq === i ? 'chevron-up' : 'chevron-down'}
                                    size={13}
                                    color={colors.textMuted}
                                />
                            </Pressable>
                            {openFaq === i && <Text style={styles.faqAnswer}>{item.a}</Text>}
                        </View>
                    ))}
                </View>

                {/* Legal */}
                <View style={styles.card}>
                    <Pressable
                        style={({ pressed }) => [styles.aboutRow, pressed && styles.pressed]}
                        accessibilityRole="link"
                        onPress={() => Linking.openURL('https://parqi.pt/termos')}
                    >
                        <Ionicons name="document-text-outline" size={16} color={colors.textMuted} />
                        <Text style={styles.aboutText}>Termos e Condições</Text>
                        <Ionicons name="open-outline" size={13} color={colors.textMuted} />
                    </Pressable>
                    <Pressable
                        style={({ pressed }) => [styles.aboutRow, pressed && styles.pressed]}
                        accessibilityRole="link"
                        onPress={() => Linking.openURL('https://parqi.pt/privacidade')}
                    >
                        <Ionicons name="lock-closed-outline" size={16} color={colors.textMuted} />
                        <Text style={styles.aboutText}>Política de Privacidade</Text>
                        <Ionicons name="open-outline" size={13} color={colors.textMuted} />
                    </Pressable>
                </View>

                {user && (
                    <>
                        <Pressable
                            style={({ pressed }) => [
                                styles.signOutBtn,
                                loggingOut && styles.disabled,
                                pressed && !loggingOut && styles.pressed,
                            ]}
                            onPress={handleLogout}
                            disabled={loggingOut}
                        >
                            <Ionicons name="log-out-outline" size={16} color={colors.textMuted} />
                            <Text style={styles.signOutText}>Terminar sessão</Text>
                        </Pressable>
                        <Pressable
                            onPress={() => setDeleteModal(true)}
                            hitSlop={8}
                            style={({ pressed }) => pressed && styles.pressed}
                        >
                            <Text style={styles.deleteLink}>Eliminar conta</Text>
                        </Pressable>
                    </>
                )}
            </ScrollView>

            {/* Rever a introdução (modal a ecrã inteiro) */}
            <Modal
                visible={showOnboarding}
                animationType="fade"
                onRequestClose={() => setShowOnboarding(false)}
            >
                <Onboarding onDone={() => setShowOnboarding(false)} />
            </Modal>

            {/* Confirmação de eliminação, com palavra-passe */}
            <Modal visible={deleteModal} transparent animationType="slide">
                <View style={styles.modalBackdrop}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Eliminar conta</Text>
                        <Text style={styles.modalHint}>
                            Isto remove os teus dados pessoais de forma definitiva. As contribuições já
                            validadas ficam no mapa, anonimizadas. Confirma com a tua palavra-passe.
                        </Text>
                        <TextInput
                            style={styles.modalInput}
                            value={deletePassword}
                            onChangeText={setDeletePassword}
                            placeholder="Palavra-passe"
                            placeholderTextColor={colors.textMuted}
                            secureTextEntry
                            autoComplete="password"
                        />
                        <View style={styles.modalActions}>
                            <Pressable
                                style={({ pressed }) => [styles.modalCancel, pressed && styles.pressed]}
                                onPress={() => { setDeleteModal(false); setDeletePassword(''); }}
                            >
                                <Text style={styles.modalCancelText}>Cancelar</Text>
                            </Pressable>
                            <Pressable
                                style={({ pressed }) => [
                                    styles.modalDelete,
                                    (!deletePassword || deleting) && styles.disabled,
                                    pressed && !deleting && deletePassword && styles.pressed,
                                ]}
                                onPress={handleDeleteAccount}
                                disabled={!deletePassword || deleting}
                            >
                                {deleting ? (
                                    <ActivityIndicator color={colors.white} />
                                ) : (
                                    <Text style={styles.modalDeleteText}>Eliminar conta</Text>
                                )}
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const createStyles = (colors: ThemeColors) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 8,
        },
        title: {
            fontSize: 20,
            fontWeight: '800',
            color: colors.text,
        },
        iconBtn: {
            width: 36,
            height: 36,
            borderRadius: 12,
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
        },
        scroll: {
            flex: 1,
        },
        content: {
            paddingHorizontal: 16,
            paddingBottom: 24,
            gap: 12,
        },
        identity: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 16,
            marginTop: 8,
            marginBottom: 4,
        },
        identityInfo: {
            flex: 1,
            minWidth: 0,
        },
        avatar: {
            width: 64,
            height: 64,
            borderRadius: 16,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
        },
        avatarText: {
            fontSize: 24,
            fontWeight: '800',
            color: colors.white,
        },
        name: {
            fontSize: 20,
            fontWeight: '800',
            color: colors.text,
        },
        handle: {
            fontSize: 14,
            color: colors.textMuted,
            marginTop: 2,
        },
        trustPill: {
            flexDirection: 'row',
            alignItems: 'center',
            alignSelf: 'flex-start',
            gap: 5,
            marginTop: 8,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 999,
            backgroundColor: colors.primary + '1A',
        },
        trustPillText: {
            fontSize: 12,
            fontWeight: '600',
            color: colors.primary,
        },
        primaryBtn: {
            alignItems: 'center',
            paddingVertical: 14,
            borderRadius: 16,
            backgroundColor: colors.primary,
        },
        primaryBtnText: {
            fontSize: 14,
            fontWeight: '600',
            color: colors.white,
        },
        pressed: {
            opacity: 0.85,
            transform: [{ scale: 0.99 }],
        },
        verifyBanner: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: alpha10(PALETTE.amber),
            borderRadius: 16,
            padding: 12,
        },
        favEmpty: {
            fontSize: 12,
            color: colors.textMuted,
            lineHeight: 18,
        },
        favRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingVertical: 6,
        },
        favRowPressed: {
            opacity: 0.7,
        },
        favInfo: {
            flex: 1,
            gap: 4,
        },
        favName: {
            fontSize: 13,
            fontWeight: '600',
            color: colors.text,
        },
        favTrust: {
            width: 120,
        },
        verifyText: {
            flex: 1,
            fontSize: 12,
            color: colors.text,
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
        repHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10,
        },
        repValue: {
            fontSize: 28,
            fontWeight: '800',
            fontFamily: MONO,
            color: colors.primary,
        },
        repTrack: {
            height: 8,
            borderRadius: 4,
            backgroundColor: colors.border,
            overflow: 'hidden',
            marginBottom: 8,
        },
        repFill: {
            height: '100%',
            borderRadius: 4,
            backgroundColor: colors.primary,
        },
        repScale: {
            flexDirection: 'row',
            justifyContent: 'space-between',
        },
        repScaleText: {
            fontSize: 10,
            fontFamily: MONO,
            color: colors.textMuted,
        },
        retry: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            marginTop: 10,
        },
        retryText: {
            fontSize: 12,
            color: colors.primary,
        },
        statsGrid: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 10,
        },
        statCard: {
            width: '48%',
            flexGrow: 1,
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 16,
            padding: 14,
        },
        statValue: {
            fontSize: 24,
            fontWeight: '800',
            fontFamily: MONO,
            marginBottom: 2,
        },
        statLabel: {
            fontSize: 12,
            color: colors.textMuted,
            lineHeight: 16,
        },
        badgeRow: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
        },
        badge: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 999,
        },
        badgeText: {
            fontSize: 12,
            fontWeight: '600',
        },
        perkRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingVertical: 6,
        },
        perkIcon: {
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: colors.primary + '1A',
            alignItems: 'center',
            justifyContent: 'center',
        },
        perkText: {
            flex: 1,
            fontSize: 13,
            color: colors.textMuted,
        },
        aboutRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingVertical: 8,
        },
        aboutText: {
            flex: 1,
            fontSize: 13,
            color: colors.text,
        },
        faqAnswer: {
            fontSize: 12,
            color: colors.textMuted,
            lineHeight: 18,
            paddingLeft: 42,
            paddingRight: 12,
            paddingBottom: 10,
        },
        signOutBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            paddingVertical: 14,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
        },
        signOutText: {
            fontSize: 14,
            fontWeight: '500',
            color: colors.textMuted,
        },
        deleteLink: {
            fontSize: 13,
            color: colors.danger,
            textAlign: 'center',
            paddingVertical: 4,
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
        modalHint: {
            fontSize: 13,
            color: colors.textMuted,
            lineHeight: 19,
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
        modalDelete: {
            flex: 1,
            alignItems: 'center',
            paddingVertical: 12,
            borderRadius: 10,
            backgroundColor: colors.danger,
        },
        modalDeleteText: {
            fontSize: 14,
            fontWeight: '600',
            color: colors.white,
        },
    });
