import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useAuth } from '../src/context/AuthContext';
import { useTheme } from '../src/context/ThemeContext';
import { ApiError } from '../src/lib/api';
import type { ThemeColors } from '../src/theme/colors';

const RESEND_LOCK_SECONDS = 60;

export default function VerifyScreen() {
    const { user, verifyEmail, resendCode, logout } = useAuth();
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const [code, setCode] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [countdown, setCountdown] = useState(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Contagem decrescente para o botão "Reenviar"
    useEffect(() => {
        if (countdown <= 0) {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
            return;
        }
        timerRef.current = setInterval(() => setCountdown((v) => v - 1), 1000);
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [countdown]);

    const submit = async () => {
        if (code.trim().length !== 6) {
            setError('Introduz o código de 6 dígitos recebido por email.');
            return;
        }
        setBusy(true);
        setError(null);
        try {
            await verifyEmail(code.trim());
            Alert.alert('Email verificado', 'A tua conta está validada. Boas contribuições!', [
                {
                    text: 'Continuar',
                    onPress: () => (router.canGoBack() ? router.back() : router.replace('/')),
                },
            ]);
        } catch (e) {
            setError(e instanceof ApiError ? e.message : 'Não foi possível validar. Tenta de novo.');
        } finally {
            setBusy(false);
        }
    };

    const resend = async () => {
        setBusy(true);
        setError(null);
        try {
            const wait = await resendCode();
            setCountdown(wait > 0 ? wait : RESEND_LOCK_SECONDS);
        } catch (e) {
            if (e instanceof ApiError && e.status === 429) {
                // O backend devolve waitSeconds em details; regex é só fallback
                const waitSeconds = Number((e.details?.waitSeconds as number | undefined) ?? NaN);
                setCountdown(Number.isFinite(waitSeconds) && waitSeconds > 0 ? waitSeconds : RESEND_LOCK_SECONDS);
                setError(e.message);
            } else {
                setError(e instanceof ApiError ? e.message : 'Não foi possível reenviar o código.');
            }
        } finally {
            setBusy(false);
        }
    };

    const leave = async () => {
        await logout();
        router.replace('/login');
    };

    const canResend = countdown <= 0 && !busy;

    return (
        <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <View style={styles.content}>
                <View style={styles.iconWrap}>
                    <Ionicons name="mail-open" size={34} color={colors.primary} />
                </View>
                <Text style={styles.title}>Confirma o teu email</Text>
                <Text style={styles.subtitle}>
                    Enviámos um código de 6 dígitos para{' '}
                    <Text style={styles.email}>{user?.email ?? 'o teu email'}</Text>. Introdu-lo abaixo
                    para validares a conta e poderes contribuir.
                </Text>

                <TextInput
                    style={styles.codeInput}
                    value={code}
                    onChangeText={(value) => setCode(value.replace(/[^0-9]/g, '').slice(0, 6))}
                    placeholder="••••••"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus
                    textAlign="center"
                    editable={!busy}
                />

                {error && <Text style={styles.error}>{error}</Text>}

                <Pressable style={[styles.submit, busy && styles.disabled]} onPress={submit} disabled={busy}>
                    {busy ? (
                        <ActivityIndicator color={colors.white} />
                    ) : (
                        <Text style={styles.submitText}>Validar conta</Text>
                    )}
                </Pressable>

                <Pressable style={styles.resend} onPress={resend} disabled={!canResend}>
                    <Ionicons name="refresh" size={16} color={canResend ? colors.primary : colors.textMuted} />
                    <Text style={[styles.resendText, !canResend && styles.resendDisabled]}>
                        {countdown > 0 ? `Reenviar código em ${countdown}s` : 'Reenviar código'}
                    </Text>
                </Pressable>

                <Pressable style={styles.logout} onPress={leave}>
                    <Text style={styles.logoutText}>Terminar sessão</Text>
                </Pressable>
            </View>
        </KeyboardAvoidingView>
    );
}

const createStyles = (colors: ThemeColors) =>
    StyleSheet.create({
        flex: {
            flex: 1,
            backgroundColor: colors.background,
        },
        content: {
            flex: 1,
            padding: 24,
            justifyContent: 'center',
            gap: 10,
        },
        iconWrap: {
            alignSelf: 'center',
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 8,
        },
        title: {
            fontSize: 22,
            fontWeight: '800',
            color: colors.text,
            textAlign: 'center',
        },
        subtitle: {
            fontSize: 14,
            color: colors.textMuted,
            textAlign: 'center',
            lineHeight: 20,
        },
        email: {
            fontWeight: '700',
            color: colors.text,
        },
        codeInput: {
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 14,
            paddingVertical: 16,
            backgroundColor: colors.card,
            color: colors.text,
            fontSize: 28,
            fontWeight: '800',
            letterSpacing: 12,
            marginTop: 14,
        },
        error: {
            color: colors.danger,
            fontSize: 13,
            textAlign: 'center',
            marginTop: 4,
        },
        submit: {
            backgroundColor: colors.primary,
            borderRadius: 14,
            paddingVertical: 14,
            alignItems: 'center',
            marginTop: 10,
        },
        submitText: {
            color: colors.white,
            fontWeight: '700',
            fontSize: 15,
        },
        disabled: {
            opacity: 0.6,
        },
        resend: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            marginTop: 14,
            paddingVertical: 8,
        },
        resendText: {
            color: colors.primary,
            fontSize: 14,
            fontWeight: '600',
        },
        resendDisabled: {
            color: colors.textMuted,
        },
        logout: {
            alignItems: 'center',
            marginTop: 20,
            paddingVertical: 8,
        },
        logoutText: {
            color: colors.textMuted,
            fontSize: 13,
            textDecorationLine: 'underline',
        },
    });
