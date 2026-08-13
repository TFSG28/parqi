import { useMemo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import type { ThemeColors } from '../theme/colors';

interface ChipProps {
    label: string;
    selected: boolean;
    onPress: () => void;
}

export function Chip({ label, selected, onPress }: ChipProps) {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                styles.chip,
                selected && styles.chipSelected,
                pressed && styles.chipPressed,
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            hitSlop={8}
        >
            <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
        </Pressable>
    );
}

const createStyles = (colors: ThemeColors) =>
    StyleSheet.create({
        chip: {
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.card,
        },
    chipSelected: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    chipPressed: {
        opacity: 0.7,
        transform: [{ scale: 0.97 }],
    },
        label: {
            fontSize: 13,
            color: colors.text,
        },
        labelSelected: {
            color: colors.white,
            fontWeight: '600',
        },
    });
