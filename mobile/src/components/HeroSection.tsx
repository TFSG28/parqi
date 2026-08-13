import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import type { ThemeColors } from '../theme/colors';

interface HeroSectionProps {
    /** Total de spots no viewport atual. */
    totalSpots: number;
    /** Spots verificados (APPROVED) no viewport. */
    verifiedSpots: number;
}

/**
 * Card de destaque no topo da home — tom refinado e tranquilo.
 *  - Utilizador logado: saudação discreta + stats
 *  - Não logado: mensagem de boas-vindas + CTA subtil
 *  - Quando totalSpots === 0, devolve null e delega ao estado vazio da lista.
 */
export function HeroSection({ totalSpots, verifiedSpots }: Readonly<HeroSectionProps>) {
    const { user } = useAuth();
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    if (totalSpots === 0) {
        return null;
    }

    return (
        <View style={styles.hero}>
            <View style={styles.heroInner}>
                {user ? (
                    <Text style={styles.greeting}>
                        Olá, {user.name.trim().split(' ')[0]}
                    </Text>
                ) : (
                    <Text style={styles.greeting}>Encontra estacionamento perto de ti</Text>
                )}

                <Text style={styles.subtitle}>
                    {totalSpots} estacionamentos encontrados · {verifiedSpots} verificados
                </Text>

                <View style={styles.statsRow}>
                    <View style={styles.statPill}>
                        <Ionicons name="shield-checkmark" size={14} color="#A7F3D0" />
                        <Text style={styles.statText}>
                            {verifiedSpots} verificados
                        </Text>
                    </View>
                </View>

                {!user && (
                    <Pressable
                        style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
                        onPress={() => router.push('/login')}
                        accessibilityRole="button"
                        accessibilityLabel="Entrar ou criar conta na comunidade Parqi"
                    >
                        <Text style={styles.ctaText}>Junta-te à comunidade</Text>
                    </Pressable>
                )}
            </View>
        </View>
    );
}

const createStyles = (colors: ThemeColors) =>
    StyleSheet.create({
        hero: {
            marginBottom: 8,
            borderRadius: 16,
            backgroundColor: colors.heroBg,
            shadowColor: '#000',
            shadowOpacity: 0.10,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 3 },
            elevation: 3,
        },
        heroInner: {
            padding: 16,
            gap: 6,
        },
        greeting: {
            fontSize: 18,
            fontWeight: '600',
            color: colors.white,
        },
        subtitle: {
            fontSize: 13,
            color: 'rgba(255,255,255,0.75)',
            lineHeight: 19,
        },
        statsRow: {
            flexDirection: 'row',
            gap: 8,
            marginTop: 2,
        },
        statPill: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
            backgroundColor: 'rgba(255,255,255,0.10)',
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 999,
        },
        statText: {
            fontSize: 12,
            fontWeight: '600',
            color: '#A7F3D0',
        },
        cta: {
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 6,
            // Outline branco translúcido em vez de laranja sólido —
            // mantém o convite à ação sem competir visualmente.
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.40)',
            paddingVertical: 10,
            borderRadius: 12,
        },
        ctaText: {
            fontWeight: '600',
            fontSize: 13,
            color: 'rgba(255,255,255,0.92)',
        },
        pressed: {
            opacity: 0.85,
            transform: [{ scale: 0.99 }],
        },
    });
