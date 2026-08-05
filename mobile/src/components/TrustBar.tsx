import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { formatTrust, trustColorKey } from '../lib/geo';
import type { ThemeColors } from '../theme/colors';

export function TrustBar({ trustScore }: { trustScore: number }) {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const pct = Math.min(100, Math.max(0, trustScore * 10));
    const color = colors[trustColorKey(trustScore)];

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.label}>Confiança da comunidade</Text>
                <Text style={[styles.value, { color }]}>{formatTrust(trustScore)}</Text>
            </View>
            <View style={styles.track}>
                <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color }]} />
            </View>
        </View>
    );
}

const createStyles = (colors: ThemeColors) =>
    StyleSheet.create({
        container: {
            gap: 6,
        },
        header: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
        },
        label: {
            fontSize: 13,
            color: colors.textMuted,
        },
        value: {
            fontSize: 13,
            fontWeight: '700',
        },
        track: {
            height: 8,
            borderRadius: 4,
            backgroundColor: colors.border,
            overflow: 'hidden',
        },
        fill: {
            height: '100%',
            borderRadius: 4,
        },
    });
