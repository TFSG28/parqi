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
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { ApiError, authApi, parkingApi } from '../../src/lib/api';
import { alpha10, MONO, PALETTE } from '../../src/theme/design';
import type { ThemeColors } from '../../src/theme/colors';
import type { ContributorStats } from '../../src/types/parking';

function levelLabel(rep: ContributorStats['reputation'] | undefined): string {
    if (rep?.isTrusted) return 'Contribuidor de confiança';
    if (rep?.isNew) return 'Novo membro';
    return 'Contribuidor';
}

const PERKS: { icon: keyof typeof Ionicons.glyphMap; text: string }[] = [
    { icon: 'trending-up', text: 'Peso de voto 1.4× (normal: 1.0×)' },
    { icon: 'chatbubble-outline', text: 'Edições aplicadas de imediato' },
    { icon: 'eye-outline', text: 'Vê detalhes de estacionamentos sinalizados' },
    { icon: 'shield-outline', text: 'Sem fila de moderação' },
];

export default function ProfileScreen() {
    const { user, logout } = useAuth();
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const [loggingOut, setLoggingOut] = useState(false);
    const [stats, setStats] = useState<ContributorStats | null>(null);
    const [statsLoading, setStatsLoading] = useState(false);
    const [statsError, setStatsError] = useState(false);
    const [deleteModal, setDeleteModal] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');
    const [deleting, setDeleting] = useState(false);

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
            list.push({ icon: 'flash', label: '10 estacionamentos', color: PALETTE.violet });
        }
        if (stats.approved >= 1) {
            list.push({ icon: 'star', label: 'Contribuidor', color: PALETTE.amber });
        }
        return list;
    }, [stats]);

    const quality = stats
        ? [
            { label: 'Aprovadas', count: stats.approved, color: colors.primary },
            { label: 'Em verificação', count: stats.pending, color: PALETTE.amberDeep },
            { label: 'Sinalizadas', count: stats.flagged + stats.rejected, color: PALETTE.redDeep },
        ]
        : [];

    const showRepSpinner = statsLoading && !stats;
    const repScoreText = rep ? rep.score.toFixed(1) : '—';
    const trustedMark = rep?.isTrusted ? '✓' : '';

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Perfil</Text>
                {user?.role === 'ADMIN' && (
                    <Pressable
                        style={styles.iconBtn}
                        onPress={() => router.push('/admin')}
                        accessibilityLabel="Administração"
                    >
                        <Ionicons name="settings-outline" size={16} color={colors.textMuted} />
                    </Pressable>
                )}
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
                {/* Avatar + nome */}
                <View style={styles.identity}>
                    <View style={styles.avatar}>
                        {user ? (
                            <Text style={styles.avatarText}>{user.name.trim().charAt(0).toUpperCase()}</Text>
                        ) : (
                            <Ionicons name="person" size={26} color={colors.primary} />
                        )}
                    </View>
                    <View>
                        <Text style={styles.name}>{user ? user.name : 'Sem sessão iniciada'}</Text>
                        {user ? (
                            <>
                                <Text style={styles.handle}>{handle}</Text>
                                <Text style={styles.level}>{level}</Text>
                            </>
                        ) : (
                            <Text style={styles.handle}>Entra para votar e adicionar estacionamentos.</Text>
                        )}
                    </View>
                </View>

                {!user && (
                    <Pressable style={styles.primaryBtn} onPress={() => router.push('/login')}>
                        <Text style={styles.primaryBtnText}>Entrar ou criar conta</Text>
                    </Pressable>
                )}

                {user?.emailVerified === false && (
                    <Pressable style={styles.verifyBanner} onPress={() => router.push('/verify')}>
                        <Ionicons name="mail-unread" size={16} color={PALETTE.amber} />
                        <Text style={styles.verifyText}>
                            Email não verificado — valida a tua conta para poderes contribuir.
                        </Text>
                        <Ionicons name="chevron-forward" size={14} color={PALETTE.amber} />
                    </Pressable>
                )}

                {user && (
                    <>
                        {/* Reputação */}
                        <View style={styles.card}>
                            <View style={styles.repHeader}>
                                <Text style={styles.sectionLabel}>REPUTAÇÃO</Text>
                                {showRepSpinner ? (
                                    <ActivityIndicator size="small" color={colors.primary} />
                                ) : (
                                    <Text style={styles.repValue}>
                                        {repScoreText}
                                        <Text style={styles.repMax}>/10</Text>
                                    </Text>
                                )}
                            </View>
                            <View style={styles.repTrack}>
                                <View style={[styles.repFill, { width: `${repPct}%` }]} />
                            </View>
                            <View style={styles.repScale}>
                                <Text style={styles.repScaleText}>Novo (0)</Text>
                                <Text style={[styles.repScaleText, { color: colors.primary }]}>
                                    Confiável ≥5 {trustedMark}
                                </Text>
                                <Text style={styles.repScaleText}>Perito (10)</Text>
                            </View>
                            {statsError && (
                                <Pressable style={styles.retry} onPress={loadStats}>
                                    <Ionicons name="refresh" size={14} color={colors.primary} />
                                    <Text style={styles.retryText}>Não foi possível carregar. Tentar de novo</Text>
                                </Pressable>
                            )}
                        </View>

                        {/* Stats grid */}
                        {stats && (
                            <View style={styles.statsGrid}>
                                {[
                                    { label: 'Total', value: stats.total, icon: 'location-outline' as const, color: PALETTE.sky },
                                    { label: 'Aprovadas', value: stats.approved, icon: 'checkmark-circle-outline' as const, color: PALETTE.emerald },
                                    { label: 'Em verificação', value: stats.pending, icon: 'time-outline' as const, color: PALETTE.amber },
                                    { label: 'Votos dados', value: stats.votesGiven, icon: 'thumbs-up-outline' as const, color: PALETTE.violet },
                                ].map(({ label, value, icon, color }) => (
                                    <View key={label} style={styles.statCard}>
                                        <Ionicons name={icon} size={16} color={color} />
                                        <View>
                                            <Text style={styles.statValue}>{value}</Text>
                                            <Text style={styles.statLabel}>{label}</Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}

                        {/* Badges */}
                        {badges.length > 0 && (
                            <View style={styles.card}>
                                <Text style={styles.sectionLabel}>DISTINTIVOS</Text>
                                <View style={styles.badgeRow}>
                                    {badges.map(({ icon, label, color }) => (
                                        <View
                                            key={label}
                                            style={[styles.badge, { backgroundColor: alpha10(color) }]}
                                        >
                                            <Ionicons name={icon} size={13} color={color} />
                                            <Text style={[styles.badgeText, { color }]}>{label}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* Qualidade das contribuições */}
                        {stats && stats.total > 0 && (
                            <View style={styles.card}>
                                <Text style={styles.sectionLabel}>QUALIDADE DAS CONTRIBUIÇÕES</Text>
                                <View style={styles.qualityList}>
                                    {quality.map(({ label, count, color }) => (
                                        <View key={label}>
                                            <View style={styles.qualityHeader}>
                                                <Text style={styles.qualityLabel}>{label}</Text>
                                                <Text style={[styles.qualityCount, { color }]}>
                                                    {count}/{stats.total}
                                                </Text>
                                            </View>
                                            <View style={styles.qualityTrack}>
                                                <View
                                                    style={[
                                                        styles.qualityFill,
                                                        { width: `${(count / stats.total) * 100}%`, backgroundColor: color },
                                                    ]}
                                                />
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* Perks */}
                        {rep?.isTrusted && (
                            <View style={styles.card}>
                                <Text style={styles.sectionLabel}>VANTAGENS DE UTILIZADOR CONFIÁVEL</Text>
                                {PERKS.map(({ icon, text }, i) => (
                                    <View
                                        key={text}
                                        style={[styles.perkRow, i < PERKS.length - 1 && styles.perkBorder]}
                                    >
                                        <Ionicons name={icon} size={14} color={colors.primary} />
                                        <Text style={styles.perkText}>{text}</Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </>
                )}

                {/* Legal */}
                <View style={styles.card}>
                    <Pressable
                        style={styles.aboutRow}
                        accessibilityRole="link"
                        onPress={() => Linking.openURL('https://parqi.pt/termos')}
                    >
                        <Ionicons name="document-text-outline" size={16} color={colors.textMuted} />
                        <Text style={styles.aboutText}>Termos e Condições</Text>
                        <Ionicons name="open-outline" size={13} color={colors.textMuted} />
                    </Pressable>
                    <Pressable
                        style={styles.aboutRow}
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
                            style={[styles.signOutBtn, loggingOut && styles.disabled]}
                            onPress={handleLogout}
                            disabled={loggingOut}
                        >
                            <Ionicons name="log-out-outline" size={16} color={colors.textMuted} />
                            <Text style={styles.signOutText}>Terminar sessão</Text>
                        </Pressable>
                        <Pressable onPress={() => setDeleteModal(true)} hitSlop={8}>
                            <Text style={styles.deleteLink}>Eliminar conta</Text>
                        </Pressable>
                    </>
                )}
            </ScrollView>

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
                                style={styles.modalCancel}
                                onPress={() => { setDeleteModal(false); setDeletePassword(''); }}
                            >
                                <Text style={styles.modalCancelText}>Cancelar</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.modalDelete, (!deletePassword || deleting) && styles.disabled]}
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
            paddingTop: 16,
            paddingBottom: 8,
        },
        title: {
            fontSize: 16,
            fontWeight: '600',
            color: colors.text,
        },
        iconBtn: {
            width: 36,
            height: 36,
            borderRadius: 8,
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
        avatar: {
            width: 64,
            height: 64,
            borderRadius: 16,
            backgroundColor: colors.primary + '26',
            borderWidth: 1,
            borderColor: colors.primary + '4D',
            alignItems: 'center',
            justifyContent: 'center',
        },
        avatarText: {
            fontSize: 24,
            fontWeight: '700',
            color: colors.primary,
        },
        name: {
            fontSize: 15,
            fontWeight: '700',
            color: colors.text,
        },
        handle: {
            fontSize: 12,
            fontFamily: MONO,
            color: colors.textMuted,
            marginTop: 1,
        },
        level: {
            fontSize: 12,
            fontFamily: MONO,
            color: colors.primary,
            marginTop: 2,
        },
        primaryBtn: {
            alignItems: 'center',
            paddingVertical: 14,
            borderRadius: 12,
            backgroundColor: colors.primary,
        },
        primaryBtnText: {
            fontSize: 14,
            fontWeight: '600',
            color: colors.white,
        },
        verifyBanner: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: alpha10(PALETTE.amber),
            borderRadius: 12,
            padding: 12,
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
            borderRadius: 12,
            padding: 16,
        },
        sectionLabel: {
            fontSize: 11,
            fontFamily: MONO,
            letterSpacing: 1.5,
            color: colors.textMuted,
            marginBottom: 10,
        },
        repHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
        },
        repValue: {
            fontSize: 24,
            fontWeight: '700',
            fontFamily: MONO,
            color: colors.primary,
        },
        repMax: {
            fontSize: 13,
            fontWeight: '400',
            color: colors.textMuted,
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
            gap: 8,
        },
        statCard: {
            width: '48%',
            flexGrow: 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 12,
            padding: 12,
        },
        statValue: {
            fontSize: 17,
            fontWeight: '700',
            fontFamily: MONO,
            color: colors.text,
        },
        statLabel: {
            fontSize: 10,
            fontFamily: MONO,
            color: colors.textMuted,
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
            fontWeight: '500',
            fontFamily: MONO,
        },
        qualityList: {
            gap: 10,
        },
        qualityHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: 4,
        },
        qualityLabel: {
            fontSize: 12,
            color: colors.textMuted,
        },
        qualityCount: {
            fontSize: 12,
            fontFamily: MONO,
        },
        qualityTrack: {
            height: 6,
            borderRadius: 3,
            backgroundColor: colors.border,
            overflow: 'hidden',
        },
        qualityFill: {
            height: '100%',
            borderRadius: 3,
        },
        perkRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            paddingVertical: 8,
        },
        perkBorder: {
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
        },
        perkText: {
            fontSize: 12,
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
        signOutBtn: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            paddingVertical: 14,
            borderRadius: 12,
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
