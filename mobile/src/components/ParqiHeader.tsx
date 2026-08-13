import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { MONO } from '../theme/design';
import type { ThemeColors } from '../theme/colors';

/** Status bar do design: dot + PARQI, \"PT · Portugal\" e toggle de tema. */
export function ParqiHeader() {
    const insets = useSafeAreaInsets();
    const { colors, resolvedScheme, setMode } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const isDark = resolvedScheme === 'dark';

    return (
        <View style={[styles.bar, { paddingTop: insets.top + 6 }]}>
            <View style={styles.brand}>
                <View style={styles.dot} />
                <Text style={styles.logo}>PARQI</Text>
            </View>
            <View style={styles.right}>
                <Text style={styles.region}>PT · Portugal</Text>
                <Pressable
                    onPress={() => setMode(isDark ? 'light' : 'dark')}
                    style={({ pressed }) => [styles.toggle, pressed && styles.pressed]}
                    accessibilityRole="button"
                    accessibilityLabel={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
                    hitSlop={10}
                >
                    <Ionicons
                        name={isDark ? 'sunny-outline' : 'moon-outline'}
                        size={12}
                        color={colors.textMuted}
                    />
                    <Text style={styles.toggleText}>{isDark ? 'Claro' : 'Escuro'}</Text>
                </Pressable>
            </View>
        </View>
    );
}

const createStyles = (colors: ThemeColors) =>
    StyleSheet.create({
        bar: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingBottom: 4,
            backgroundColor: colors.background,
        },
        brand: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
        },
        dot: {
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: colors.primary,
        },
        logo: {
            fontSize: 10,
            fontWeight: '700',
            fontFamily: MONO,
            letterSpacing: 3,
            color: colors.primary,
        },
        right: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
        },
        region: {
            fontSize: 10,
            fontFamily: MONO,
            color: colors.textMuted,
        },
        toggle: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: colors.border,
        },
        toggleText: {
            fontSize: 11,
            fontWeight: '600',
            color: colors.textMuted,
        },
        pressed: {
            opacity: 0.85,
            transform: [{ scale: 0.99 }],
        },
    });
