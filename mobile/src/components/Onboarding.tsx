import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import type { ThemeColors } from '../theme/colors';

const STORAGE_KEY = 'parqi.onboarding_done';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Step {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    description: string;
}

const STEPS: Step[] = [
    {
        icon: 'search',
        title: 'Encontra estacionamento',
        description: 'Vê os lugares disponíveis perto de ti, com distância, tipo e confiança da comunidade.',
    },
    {
        icon: 'thumbs-up',
        title: 'Vota e verifica',
        description: 'Confirma se um lugar existe ou reporta se está errado. Cada voto melhora os dados.',
    },
    {
        icon: 'add-circle',
        title: 'Contribui',
        description: 'Adiciona lugares que não existem no mapa. A comunidade agradece.',
    },
];

interface OnboardingProps {
    onDone: () => void;
}

export function Onboarding({ onDone }: OnboardingProps) {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const [current, setCurrent] = useState(0);
    const fade = useRef(new Animated.Value(1)).current;
    const slideAnim = useRef(new Animated.Value(1)).current;
    const listRef = useRef<FlatList<Step>>(null);

    // Animação de entrada apenas na primeira montagem
    useEffect(() => {
        slideAnim.setValue(0);
        Animated.spring(slideAnim, {
            toValue: 1,
            tension: 80,
            friction: 12,
            useNativeDriver: true,
        }).start();
    }, []);

    // Reinicia a animação de entrada quando muda de slide
    useEffect(() => {
        slideAnim.setValue(0);
        Animated.spring(slideAnim, {
            toValue: 1,
            tension: 80,
            friction: 12,
            useNativeDriver: true,
        }).start();
    }, [current]);

    const finish = useCallback(async () => {
        await AsyncStorage.setItem(STORAGE_KEY, '1');
        onDone();
    }, [onDone]);

    const goTo = (index: number) => {
        listRef.current?.scrollToIndex({ index, animated: true });
        setCurrent(index);
    };

    return (
        <Animated.View style={[styles.overlay, { opacity: fade, paddingTop: insets.top }]}>
            {/* Saltar */}
            <Pressable
                style={[styles.skip, { top: insets.top + 12 }]}
                onPress={finish}
                accessibilityLabel="Saltar introdução"
            >
                <Text style={styles.skipText}>Saltar</Text>
            </Pressable>

            <FlatList
                ref={listRef}
                data={STEPS}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                    setCurrent(idx);
                }}
                keyExtractor={(_, i) => String(i)}
                renderItem={({ item, index }) => {
                    const isActive = index === current;
                    const translateY = isActive ? slideAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [16, 0],
                    }) : 0;
                    return (
                        <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
                            <Animated.View style={[styles.iconCircle, { transform: [{ translateY }] }]}>
                                <Ionicons name={item.icon} size={36} color={colors.primary} />
                            </Animated.View>
                            <Animated.Text style={[styles.title, { transform: [{ translateY }] }]}>{item.title}</Animated.Text>
                            <Animated.Text style={[styles.desc, { transform: [{ translateY }] }]}>{item.description}</Animated.Text>
                        </View>
                    );
                }}
            />

            {/* Dots + CTA */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
                <View style={styles.dots}>
                    {STEPS.map((_, i) => (
                        <View
                            key={i}
                            style={[styles.dot, i === current && styles.dotActive]}
                        />
                    ))}
                </View>

                {current < STEPS.length - 1 ? (
                    <Pressable
                        style={[styles.nextBtn, { backgroundColor: colors.primary }]}
                        onPress={() => goTo(current + 1)}
                        accessibilityLabel="Próximo passo"
                    >
                        <Text style={styles.nextText}>Seguinte</Text>
                    </Pressable>
                ) : (
                    <Pressable
                        style={[styles.nextBtn, { backgroundColor: colors.accent }]}
                        onPress={finish}
                        accessibilityLabel="Começar a usar o Parqi"
                    >
                        <Text style={styles.doneText}>Começar</Text>
                    </Pressable>
                )}
            </View>
        </Animated.View>
    );
}

const createStyles = (colors: ThemeColors) =>
    StyleSheet.create({
        overlay: {
            ...StyleSheet.absoluteFill,
            backgroundColor: colors.background,
            zIndex: 100,
        },
        skip: {
            position: 'absolute',
            right: 16,
            zIndex: 10,
            paddingVertical: 8,
            paddingHorizontal: 12,
        },
        skipText: {
            fontSize: 14,
            color: colors.textMuted,
        },
        slide: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 32,
            gap: 14,
        },
        iconCircle: {
            width: 88,
            height: 88,
            borderRadius: 24,
            backgroundColor: colors.primary + '20',
            borderWidth: 1.5,
            borderColor: colors.primary + '30',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 8,
        },
        title: {
            fontSize: 22,
            fontWeight: '700',
            color: colors.text,
            textAlign: 'center',
        },
        desc: {
            fontSize: 14,
            color: colors.textMuted,
            textAlign: 'center',
            lineHeight: 21,
            maxWidth: 280,
        },
        footer: {
            alignItems: 'center',
            gap: 20,
        },
        dots: {
            flexDirection: 'row',
            gap: 8,
        },
        dot: {
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: colors.border,
        },
        dotActive: {
            backgroundColor: colors.primary,
            width: 20,
        },
        nextBtn: {
            paddingHorizontal: 36,
            paddingVertical: 14,
            borderRadius: 14,
        },
        nextText: {
            color: colors.white,
            fontWeight: '700',
            fontSize: 15,
        },
        doneText: {
            color: colors.onAccent,
            fontWeight: '700',
            fontSize: 15,
        },
    });
