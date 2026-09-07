import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Linking,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { Chip } from '../src/components/Chip';
import { PasswordInput } from '../src/components/PasswordInput';
import { useAuth } from '../src/context/AuthContext';
import { useTheme } from '../src/context/ThemeContext';
import { ApiError } from '../src/lib/api';
import type { ThemeColors } from '../src/theme/colors';

type Mode = 'login' | 'register';

// GO_BACK falha quando o login é o primeiro ecrã da stack (ex.: após replace do guard)
function goBackSafe() {
    if (router.canGoBack()) {
        router.back();
    } else {
        router.replace('/');
    }
}

export default function LoginScreen() {
    const { login, register, user } = useAuth();
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    const [mode, setMode] = useState<Mode>('login');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (user) {
            goBackSafe();
        }
    }, [user]);

    const submit = async () => {
        const trimmedEmail = email.trim();
        if (mode === 'register' && name.trim().length < 3) {
            setError('Indica o teu nome (mín. 3 caracteres).');
            return;
        }
        if (!trimmedEmail.includes('@')) {
            setError('Introduz um email válido.');
            return;
        }
        if (password.length < 6) {
            setError('A palavra-passe deve ter pelo menos 6 caracteres.');
            return;
        }

        setBusy(true);
        setError(null);
        try {
            if (mode === 'login') {
                await login(trimmedEmail, password);
            } else {
                await register(name.trim(), trimmedEmail, password);
            }
            goBackSafe();
        } catch (e) {
            setError(e instanceof ApiError ? e.message : 'Não foi possível concluir. Tenta de novo.');
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
                <Text style={styles.logo}>Parqi</Text>
                <Text style={styles.tagline}>
                    Encontra estacionamento e ajuda a comunidade a mantê-lo atualizado.
                </Text>

                <View style={styles.modeRow}>
                    <Chip label="Entrar" selected={mode === 'login'} onPress={() => { setMode('login'); setError(null); }} />
                    <Chip label="Criar conta" selected={mode === 'register'} onPress={() => { setMode('register'); setError(null); }} />
                </View>

                {mode === 'register' && (
                    <>
                        <Text style={styles.label}>Nome</Text>
                        <TextInput
                            style={styles.input}
                            value={name}
                            onChangeText={setName}
                            placeholder="O teu nome"
                            placeholderTextColor={colors.textMuted}
                            autoCapitalize="words"
                            autoComplete="name"
                        />
                    </>
                )}

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

                <Text style={styles.label}>Palavra-passe</Text>
                <PasswordInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••"
                    autoComplete={mode === 'register' ? 'new-password' : 'password'}
                />

                {error && <Text style={styles.error}>{error}</Text>}

                {mode === 'login' && (
                    <Pressable
                        onPress={() => router.push('/forgot-password')}
                        hitSlop={8}
                        style={({ pressed }) => pressed && styles.pressed}
                    >
                        <Text style={styles.forgot}>Esqueceste-te da palavra-passe?</Text>
                    </Pressable>
                )}

                <Pressable
                    style={({ pressed }) => [
                        styles.submit,
                        busy && styles.disabled,
                        pressed && !busy && styles.pressed,
                    ]}
                    onPress={submit}
                    disabled={busy}
                >
                    {busy ? (
                        <ActivityIndicator color={colors.white} />
                    ) : (
                        <Text style={styles.submitText}>
                            {mode === 'login' ? 'Entrar' : 'Criar conta'}
                        </Text>
                    )}
                </Pressable>

                {mode === 'register' && (
                    <>
                        <Text style={styles.hint}>
                            Ao criares conta aceitas os{' '}
                            <Text style={styles.link} onPress={() => Linking.openURL('https://parqi.pt/termos')}>
                                Termos e Condições
                            </Text>{' '}
                            e a{' '}
                            <Text style={styles.link} onPress={() => Linking.openURL('https://parqi.pt/privacidade')}>
                                Política de Privacidade
                            </Text>
                            .
                        </Text>
                        <Text style={styles.hint}>
                            Recebes um código por email para validar a conta antes de contribuir.
                        </Text>
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
    logo: {
        fontSize: 40,
        fontWeight: '800',
        color: colors.primary,
        marginTop: 24,
    },
    tagline: {
        fontSize: 14,
        color: colors.textMuted,
        marginBottom: 16,
        lineHeight: 20,
    },
    modeRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 8,
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
    disabled: {
        opacity: 0.6,
    },
    pressed: {
        opacity: 0.85,
        transform: [{ scale: 0.99 }],
    },
    hint: {
        fontSize: 12,
        color: colors.textMuted,
        textAlign: 'center',
        marginTop: 16,
        lineHeight: 18,
    },
    link: {
        color: colors.primary,
        textDecorationLine: 'underline',
    },
    forgot: {
        color: colors.primary,
        fontSize: 13,
        fontWeight: '600',
        marginTop: 12,
        alignSelf: 'flex-end',
    },
});
