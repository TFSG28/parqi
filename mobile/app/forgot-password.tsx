import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
} from 'react-native';
import { PasswordInput } from '../src/components/PasswordInput';
import { useTheme } from '../src/context/ThemeContext';
import { ApiError, authApi } from '../src/lib/api';
import type { ThemeColors } from '../src/theme/colors';

type Step = 'email' | 'code';

const RESEND_LOCK_SECONDS = 60;

export default function ForgotPasswordScreen() {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const [step, setStep] = useState<Step>('email');
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Contagem decrescente para o botão "Reenviar" (paridade com o ecrã de verificação)
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

    const requestCode = async () => {
        const trimmed = email.trim();
        if (!trimmed.includes('@')) {
            setError('Introduz um email válido.');
            return;
        }
        setBusy(true);
        setError(null);
        try {
            await authApi.forgotPassword(trimmed);
            setStep('code');
            setCountdown(RESEND_LOCK_SECONDS);
        } catch (e) {
            if (e instanceof ApiError && e.status === 429) {
                setCountdown(RESEND_LOCK_SECONDS);
            }
            setError(e instanceof ApiError ? e.message : 'Não foi possível pedir o código. Tenta de novo.');
        } finally {
            setBusy(false);
        }
    };

    const canResend = countdown <= 0 && !busy;

    const submitReset = async () => {
        if (code.length !== 6) {
            setError('O código tem 6 dígitos.');
            return;
        }
        if (password.length < 6) {
            setError('A palavra-passe deve ter pelo menos 6 caracteres.');
            return;
        }
        setBusy(true);
        setError(null);
        try {
            await authApi.resetPassword(email.trim(), code, password);
            Alert.alert('Palavra-passe alterada', 'Já podes entrar com a palavra-passe nova.', [
                { text: 'OK', onPress: () => router.back() },
            ]);
        } catch (e) {
            setError(e instanceof ApiError ? e.message : 'Não foi possível alterar. Tenta de novo.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                <Text style={styles.title}>Recuperar palavra-passe</Text>

                {step === 'email' ? (
                    <>
                        <Text style={styles.subtitle}>
                            Indica o email da tua conta. Se existir, recebes um código de 6 dígitos para
                            definires uma palavra-passe nova.
                        </Text>
                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            style={styles.input}
                            value={email}
                            onChangeText={setEmail}
                            placeholder="email@exemplo.pt"
                            placeholderTextColor={colors.textMuted}
                            autoCapitalize="none"
                            autoCorrect={false}
                            keyboardType="email-address"
                            autoComplete="email"
                        />
                        {error && <Text style={styles.error}>{error}</Text>}
                        <Pressable
                            style={({ pressed }) => [
                                styles.submit,
                                busy && styles.disabled,
                                pressed && !busy && styles.pressed,
                            ]}
                            onPress={requestCode}
                            disabled={busy}
                        >
                            {busy ? (
                                <ActivityIndicator color={colors.white} />
                            ) : (
                                <Text style={styles.submitText}>Enviar código</Text>
                            )}
                        </Pressable>
                    </>
                ) : (
                    <>
                        <Text style={styles.subtitle}>
                            Enviámos um código para <Text style={styles.email}>{email.trim()}</Text>. Introduz
                            o código e a palavra-passe nova.
                        </Text>
                        <Text style={styles.label}>Código</Text>
                        <TextInput
                            style={styles.input}
                            value={code}
                            onChangeText={(value) => setCode(value.replace(/[^0-9]/g, '').slice(0, 6))}
                            placeholder="••••••"
                            placeholderTextColor={colors.textMuted}
                            keyboardType="number-pad"
                            maxLength={6}
                        />
                        <Text style={styles.label}>Palavra-passe nova</Text>
                        <PasswordInput
                            value={password}
                            onChangeText={setPassword}
                            placeholder="••••••••"
                            autoComplete="new-password"
                        />
                        {error && <Text style={styles.error}>{error}</Text>}
                        <Pressable
                            style={({ pressed }) => [
                                styles.submit,
                                busy && styles.disabled,
                                pressed && !busy && styles.pressed,
                            ]}
                            onPress={submitReset}
                            disabled={busy}
                        >
                            {busy ? (
                                <ActivityIndicator color={colors.white} />
                            ) : (
                                <Text style={styles.submitText}>Alterar palavra-passe</Text>
                            )}
                        </Pressable>
                        <Pressable
                            style={({ pressed }) => [styles.resend, pressed && styles.pressed]}
                            onPress={requestCode}
                            disabled={!canResend}
                            hitSlop={8}
                        >
                            <Ionicons
                                name="refresh"
                                size={16}
                                color={canResend ? colors.primary : colors.textMuted}
                            />
                            <Text style={[styles.resendText, !canResend && styles.resendDisabled]}>
                                {countdown > 0 ? `Reenviar código em ${countdown}s` : 'Reenviar código'}
                            </Text>
                        </Pressable>
                    </>
                )}
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
        padding: 24,
        gap: 6,
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        color: colors.text,
        marginTop: 16,
    },
    subtitle: {
        fontSize: 14,
        color: colors.textMuted,
        lineHeight: 20,
        marginBottom: 10,
    },
    email: {
        fontWeight: '700',
        color: colors.text,
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
    error: {
        color: colors.danger,
        fontSize: 13,
        marginTop: 8,
    },
    submit: {
        backgroundColor: colors.primary,
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 20,
    },
    submitText: {
        color: colors.white,
        fontWeight: '700',
        fontSize: 15,
    },
    resend: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 16,
        paddingVertical: 8,
    },
    resendText: {
        color: colors.primary,
        fontWeight: '600',
        fontSize: 13,
    },
    resendDisabled: {
        color: colors.textMuted,
    },
    disabled: {
        opacity: 0.6,
    },
    pressed: {
        opacity: 0.85,
        transform: [{ scale: 0.99 }],
    },
});
