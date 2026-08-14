import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { formatScore } from '../lib/geo';
import { MONO, trustColor } from '../theme/design';
import type { ThemeColors } from '../theme/colors';

/** Badge quadrado com a pontuação de confiança, como o ScoreBadge do design v2. */
export function ScoreBadge({ score, large }: Readonly<{ score: number; large?: boolean }>) {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const color = trustColor(score, colors.primary);

    return (
        <View
            style={[
                styles.badge,
                { backgroundColor: color + '18', width: large ? 52 : 40, height: large ? 52 : 40 },
            ]}
        >
            <Text style={[styles.text, { color, fontSize: large ? 18 : 14 }]}>
                {formatScore(score)}
            </Text>
        </View>
    );
}

const createStyles = (colors: ThemeColors) =>
    StyleSheet.create({
        badge: {
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 40,
        },
        text: {
            fontWeight: '700',
            fontFamily: MONO,
            fontVariant: ['tabular-nums'],
        },
    });
