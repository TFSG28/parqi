import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { formatScore } from '../lib/geo';
import { MONO, themedText, trustColor } from '../theme/design';
import type { ThemeColors } from '../theme/colors';

/** Barra fina + valor mono à direita, como o TrustBar do design. */
export function TrustBar({ trustScore }: Readonly<{ trustScore: number }>) {
    const { colors, resolvedScheme } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const pct = Math.min(100, Math.max(0, trustScore * 10));
    const color = themedText(trustColor(trustScore, colors.primary), resolvedScheme);

    return (
        <View style={styles.container}>
            <View style={styles.track}>
                <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color }]} />
            </View>
            <Text style={[styles.value, { color }]}>{formatScore(trustScore)}</Text>
        </View>
    );
}

const createStyles = (colors: ThemeColors) =>
    StyleSheet.create({
        container: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
        },
        track: {
            flex: 1,
            height: 6,
            borderRadius: 3,
            backgroundColor: colors.border,
            overflow: 'hidden',
        },
        fill: {
            height: '100%',
            borderRadius: 3,
        },
        value: {
            fontSize: 12,
            fontWeight: '700',
            fontFamily: MONO,
            fontVariant: ['tabular-nums'],
        },
    });
