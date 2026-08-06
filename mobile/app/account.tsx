import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Chip } from '../src/components/Chip';
import { useAuth } from '../src/context/AuthContext';
import { useTheme, type ThemeMode } from '../src/context/ThemeContext';
import { ApiError, parkingApi } from '../src/lib/api';
import type { ThemeColors } from '../src/theme/colors';
import type { ContributorStats } from '../src/types/parking';

const THEME_OPTIONS: { mode: ThemeMode; label: string }[] = [
    { mode: 'system', label: 'Sistema' },
    { mode: 'light', label: 'Claro' },
    { mode: 'dark', label: 'Escuro' },
];

export default function AccountScreen() {
    const { user, logout } = useAuth();
    const { colors, mode, setMode } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const [loggingOut, setLoggingOut] = useState(false);
    const [stats, setStats] = useState<ContributorStats | null>(null);
    const [statsLoading, setStatsLoading] = useState(false);

    const loadStats = useCallback(async () => {
        if (!user) return;
        setStatsLoading(true);
        try {
            setStats(await parkingApi.stats());
        } catch (error) {
            // métricas não são críticas; mostra vazio
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

    const repColor =
        stats && stats.reputation.score >= 5
            ? colors.success
            : stats && stats.reputation.score >= 3
              ? colors.accent
              : colors.danger;

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            {/* Perfil */}
            {user ? (
                <View style={styles.profileCard}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{user.name.trim().charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={styles.profileInfo}>
                        <Text style={styles.name}>{user.name}</Text>
                        <Text style={styles.email}>{user.email}</Text>
                        {user.role === 'ADMIN' && (
                            <View style={styles.adminBadge}>
                                <Ionicons name="shield-checkmark" size={12} color={colors.accent} />
                                <Text style={styles.adminBadgeText}>Administrador</Text>
                            </View>
                        )}
                    </View>
                </View>
            ) : (
                <View style={styles.profileCard}>
                    <View style={styles.avatar}>
                        <Ionicons name="person" size={24} color={colors.white} />
                    </View>
                    <View style={styles.profileInfo}>
                        <Text style={styles.name}>Sem sessão iniciada</Text>
                        <Text style={styles.email}>Entra para votar e adicionar estacionamentos.</Text>
                    </View>
                </View>
            )}

            {!user && (
                <Pressable style={styles.loginButton} onPress={() => router.push('/login')}>
                    <Text style={styles.loginButtonText}>Entrar ou criar conta</Text>
                </Pressable>
            )}

            {/* Email ainda não validado */}
            {user?.emailVerified === false && (
                <Pressable style={styles.verifyBanner} onPress={() => router.push('/verify')}>
                    <Ionicons name="mail-unread" size={18} color={colors.onAccent} />
                    <Text style={styles.verifyBannerText}>
                        Email não verificado — valida a tua conta para poderes contribuir.
                    </Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.onAccent} />
                </Pressable>
            )}

            {/* As minhas contribuições */}
            {user && (
                <>
                    <Text style={styles.sectionTitle}>As minhas contribuições</Text>
                    <View style={styles.card}>
                        {statsLoading && !stats ? (
                            <ActivityIndicator color={colors.primary} />
                        ) : stats ? (
                            <>
                                <View style={styles.repRow}>
                                    <View style={styles.repLeft}>
                                        <Ionicons name="ribbon" size={22} color={repColor} />
                                        <View>
                                            <Text style={styles.repLabel}>Reputação</Text>
                                            <Text style={[styles.repValue, { color: repColor }]}>
                                                {stats.reputation.score.toFixed(1)}/10
                                                {stats.reputation.isTrusted ? ' · confiável' : ''}
                                            </Text>
                                        </View>
                                    </View>
                                    <Text style={styles.repHint}>
                                        {stats.reputation.isTrusted
                                            ? 'As tuas edições aplicam-se de imediato e os teus votos valem mais.'
                                            : 'Contribui e recebe confirmações para ficares confiável.'}
                                    </Text>
                                </View>

                                <View style={styles.statsGrid}>
                                    <View style={styles.statCell}>
                                        <Text style={styles.statValue}>{stats.total}</Text>
                                        <Text style={styles.statLabel}>Total</Text>
                                    </View>
                                    <View style={styles.statCell}>
                                        <Text style={[styles.statValue, { color: colors.success }]}>{stats.approved}</Text>
                                        <Text style={styles.statLabel}>Aprovadas</Text>
                                    </View>
                                    <View style={styles.statCell}>
                                        <Text style={[styles.statValue, { color: colors.accent }]}>{stats.pending}</Text>
                                        <Text style={styles.statLabel}>Em verificação</Text>
                                    </View>
                                    <View style={styles.statCell}>
                                        <Text style={[styles.statValue, { color: colors.danger }]}>{stats.rejected + stats.flagged}</Text>
                                        <Text style={styles.statLabel}>Rejeitadas/Sinalizadas</Text>
                                    </View>
                                </View>

                                <View style={styles.statsRow}>
                                    <Ionicons name="checkmark-done" size={15} color={colors.textMuted} />
                                    <Text style={styles.statsRowText}>{stats.approvedRate}% de aprovação</Text>
                                </View>
                                <View style={styles.statsRow}>
                                    <Ionicons name="thumbs-up" size={15} color={colors.textMuted} />
                                    <Text style={styles.statsRowText}>
                                        {stats.votesReceivedUp} confirmações recebidas · {stats.votesReceivedDown} reportes
                                    </Text>
                                </View>
                                <View style={styles.statsRow}>
                                    <Ionicons name="hand-left" size={15} color={colors.textMuted} />
                                    <Text style={styles.statsRowText}>{stats.votesGiven} votos dados</Text>
                                </View>
                                {stats.avgTrustApproved > 0 && (
                                    <View style={styles.statsRow}>
                                        <Ionicons name="shield-half" size={15} color={colors.textMuted} />
                                        <Text style={styles.statsRowText}>
                                            Confiança média dos aprovados: {stats.avgTrustApproved.toFixed(1)}/10
                                        </Text>
                                    </View>
                                )}
                            </>
                        ) : null}
                    </View>
                </>
            )}

            {/* Administração (admin) */}
            {user?.role === 'ADMIN' && (
                <Pressable style={styles.adminButton} onPress={() => router.push('/admin')}>
                    <Ionicons name="shield-checkmark" size={18} color={colors.onAccent} />
                    <Text style={styles.adminButtonText}>Administração · moderação</Text>
                </Pressable>
            )}

            {/* Preferências */}
            <Text style={styles.sectionTitle}>Preferências</Text>
            <View style={styles.card}>
                <Text style={styles.prefLabel}>Tema</Text>
                <View style={styles.chipRow}>
                    {THEME_OPTIONS.map((option) => (
                        <Chip
                            key={option.mode}
                            label={option.label}
                            selected={mode === option.mode}
                            onPress={() => setMode(option.mode)}
                        />
                    ))}
                </View>
            </View>

            {/* Sessão */}
            {user && (
                <Pressable
                    style={[styles.logoutButton, loggingOut && styles.disabled]}
                    onPress={handleLogout}
                    disabled={loggingOut}
                >
                    <Ionicons name="log-out-outline" size={18} color={colors.danger} />
                    <Text style={styles.logoutText}>Terminar sessão</Text>
                </Pressable>
            )}

            <Text style={styles.hint}>
                Quem contribui com lugares validados fica sem anúncios, para sempre.
            </Text>
        </ScrollView>
    );
}

const createStyles = (colors: ThemeColors) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: colors.background,
        },
        content: {
            padding: 16,
            gap: 12,
        },
        profileCard: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 14,
            backgroundColor: colors.card,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: colors.border,
        },
        avatar: {
            width: 52,
            height: 52,
            borderRadius: 14,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
        },
        avatarText: {
            color: colors.white,
            fontSize: 22,
            fontWeight: '800',
        },
        profileInfo: {
            flex: 1,
            gap: 2,
        },
        name: {
            fontSize: 16,
            fontWeight: '700',
            color: colors.text,
        },
        email: {
            fontSize: 13,
            color: colors.textMuted,
        },
        adminBadge: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            alignSelf: 'flex-start',
            marginTop: 2,
        },
        adminBadgeText: {
            fontSize: 11,
            fontWeight: '700',
            color: colors.accent,
        },
        loginButton: {
            backgroundColor: colors.accent,
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: 'center',
        },
        loginButtonText: {
            color: colors.onAccent,
            fontWeight: '700',
        },
        verifyBanner: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            backgroundColor: colors.accent,
            borderRadius: 12,
            paddingVertical: 12,
            paddingHorizontal: 14,
        },
        verifyBannerText: {
            flex: 1,
            color: colors.onAccent,
            fontSize: 13,
            fontWeight: '600',
            lineHeight: 18,
        },
        sectionTitle: {
            fontSize: 13,
            fontWeight: '700',
            color: colors.textMuted,
            textTransform: 'uppercase',
            letterSpacing: 0.6,
            marginTop: 8,
        },
        card: {
            backgroundColor: colors.card,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: colors.border,
            gap: 10,
        },
        repRow: {
            gap: 8,
        },
        repLeft: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
        },
        repLabel: {
            fontSize: 12,
            color: colors.textMuted,
        },
        repValue: {
            fontSize: 18,
            fontWeight: '800',
        },
        repHint: {
            fontSize: 12,
            color: colors.textMuted,
            lineHeight: 17,
        },
        statsGrid: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            borderTopWidth: 1,
            borderTopColor: colors.border,
            paddingTop: 10,
        },
        statCell: {
            alignItems: 'center',
            gap: 2,
        },
        statValue: {
            fontSize: 18,
            fontWeight: '800',
            color: colors.text,
        },
        statLabel: {
            fontSize: 10,
            color: colors.textMuted,
            textAlign: 'center',
        },
        statsRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
        },
        statsRowText: {
            fontSize: 13,
            color: colors.textMuted,
            flex: 1,
        },
        adminButton: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            backgroundColor: colors.accent,
            borderRadius: 12,
            paddingVertical: 14,
        },
        adminButtonText: {
            color: colors.onAccent,
            fontWeight: '700',
        },
        prefLabel: {
            fontSize: 14,
            fontWeight: '600',
            color: colors.text,
        },
        chipRow: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
        },
        logoutButton: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            borderWidth: 1,
            borderColor: colors.danger,
            borderRadius: 12,
            paddingVertical: 13,
            marginTop: 8,
        },
        logoutText: {
            color: colors.danger,
            fontWeight: '600',
        },
        disabled: {
            opacity: 0.5,
        },
        hint: {
            fontSize: 12,
            color: colors.textMuted,
            textAlign: 'center',
            marginTop: 12,
            lineHeight: 18,
        },
    });
