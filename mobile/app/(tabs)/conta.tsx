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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Chip } from '../../src/components/Chip';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme, type ThemeMode } from '../../src/context/ThemeContext';
import { ApiError, authApi, parkingApi } from '../../src/lib/api';
import type { ThemeColors } from '../../src/theme/colors';
import type { ContributorStats } from '../../src/types/parking';

const THEME_OPTIONS: { mode: ThemeMode; label: string }[] = [
    { mode: 'system', label: 'Sistema' },
    { mode: 'light', label: 'Claro' },
    { mode: 'dark', label: 'Escuro' },
];

export default function AccountScreen() {
    const insets = useSafeAreaInsets();
    const { user, logout } = useAuth();
    const { colors, mode, setMode } = useTheme();
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

    const repColor =
        stats && stats.reputation.score >= 5
            ? colors.success
            : stats && stats.reputation.score >= 3
                ? colors.accent
                : colors.danger;

    return (
        <View style={styles.container}>
            <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
                <Text style={styles.topBarTitle}>Conta</Text>
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
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
                            ) : statsError ? (
                                <Pressable style={styles.statsRetry} onPress={loadStats} accessibilityRole="button">
                                    <Ionicons name="refresh" size={16} color={colors.primary} />
                                    <Text style={styles.statsRetryText}>
                                        Não foi possível carregar. Tentar de novo
                                    </Text>
                                </Pressable>
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

                {/* Sobre */}
                <Text style={styles.sectionTitle}>Sobre</Text>
                <View style={styles.card}>
                    <Pressable
                        style={styles.aboutRow}
                        accessibilityRole="link"
                        onPress={() => Linking.openURL('https://parqi.pt/termos')}
                    >
                        <Ionicons name="document-text-outline" size={18} color={colors.textMuted} />
                        <Text style={styles.aboutText}>Termos e Condições</Text>
                        <Ionicons name="open-outline" size={15} color={colors.textMuted} />
                    </Pressable>
                    <Pressable
                        style={styles.aboutRow}
                        accessibilityRole="link"
                        onPress={() => Linking.openURL('https://parqi.pt/privacidade')}
                    >
                        <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
                        <Text style={styles.aboutText}>Política de Privacidade</Text>
                        <Ionicons name="open-outline" size={15} color={colors.textMuted} />
                    </Pressable>
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

                {/* Eliminação de conta (RGPD) */}
                {user && (
                    <Pressable onPress={() => setDeleteModal(true)} hitSlop={8}>
                        <Text style={styles.deleteLink}>Eliminar conta</Text>
                    </Pressable>
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
        topBar: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingBottom: 10,
            backgroundColor: colors.bar,
        },
        topBarTitle: {
            fontSize: 20,
            fontWeight: '700',
            color: colors.white,
        },
        scroll: {
            flex: 1,
        },
        content: {
            padding: 16,
            paddingBottom: 32,
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
        aboutRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingVertical: 6,
        },
        aboutText: {
            flex: 1,
            fontSize: 14,
            color: colors.text,
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
        deleteLink: {
            textAlign: 'center',
            color: colors.textMuted,
            fontSize: 13,
            textDecorationLine: 'underline',
            marginTop: 4,
            marginBottom: 12,
        },
        statsRetry: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            paddingVertical: 8,
        },
        statsRetryText: {
            color: colors.primary,
            fontSize: 13,
            fontWeight: '600',
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
        modalHint: {
            fontSize: 13,
            color: colors.textMuted,
            lineHeight: 19,
        },
        modalInput: {
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 12,
            padding: 12,
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
        modalDelete: {
            backgroundColor: colors.danger,
            paddingVertical: 12,
            paddingHorizontal: 20,
            borderRadius: 12,
            alignItems: 'center',
        },
        modalDeleteText: {
            color: colors.white,
            fontWeight: '700',
        },
        disabled: {
            opacity: 0.5,
        },
    });
