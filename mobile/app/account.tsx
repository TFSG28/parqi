import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Chip } from '../src/components/Chip';
import { useAuth } from '../src/context/AuthContext';
import { useTheme, type ThemeMode } from '../src/context/ThemeContext';
import type { ThemeColors } from '../src/theme/colors';

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
