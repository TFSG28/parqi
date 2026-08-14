import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import type { ThemeColors } from '../theme/colors';

/** Status bar do design v2: dot + PARQI e toggle de tema circular (ícone). */
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
            <Pressable
                onPress={() => setMode(isDark ? 'light' : 'dark')}
                style={({ pressed }) => [styles.toggle, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
                hitSlop={10}
            >
                <Ionicons
                    name={isDark ? 'sunny' : 'moon'}
                    size={14}
                    color={colors.textMuted}
                />
            </Pressable>
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
            paddingBottom: 6,
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
            fontSize: 12,
            fontWeight: '700',
            letterSpacing: 2,
            color: colors.primary,
        },
        toggle: {
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: colors.muted,
            alignItems: 'center',
            justifyContent: 'center',
        },
        pressed: {
            opacity: 0.85,
            transform: [{ scale: 0.96 }],
        },
    });
