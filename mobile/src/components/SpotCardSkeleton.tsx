import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { SkeletonBox } from './SkeletonBox';
import { useTheme } from '../context/ThemeContext';
import type { ThemeColors } from '../theme/colors';

/**
 * Versão skeleton do SpotCard — replica o layout exato (ícone, linhas de texto, badges)
 * para evitar layout shift quando os dados reais chegam.
 */
export function SpotCardSkeleton() {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    return (
        <View style={styles.card} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
            {/* Ícone do tipo */}
            <SkeletonBox width={40} height={40} borderRadius={12} />

            {/* Nome + detalhes */}
            <View style={styles.info}>
                <View style={styles.row75}>
                    <SkeletonBox height={14} borderRadius={4} />
                </View>
                <View style={styles.gap4} />
                <View style={styles.row55}>
                    <SkeletonBox height={11} borderRadius={4} />
                </View>
            </View>

            {/* TrustScore + status (direita) */}
            <View style={styles.right}>
                <SkeletonBox height={13} width={36} borderRadius={4} />
                <View style={styles.gap4} />
                <SkeletonBox height={12} width={72} borderRadius={4} />
            </View>
        </View>
    );
}

const createStyles = (colors: ThemeColors) =>
    StyleSheet.create({
        card: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.card,
            borderRadius: 14,
            padding: 12,
            gap: 12,
        },
        info: {
            flex: 1,
            gap: 4,
        },
        row75: {
            width: '75%',
        },
        row55: {
            width: '55%',
        },
        gap4: {
            height: 2,
        },
        right: {
            alignItems: 'flex-end',
            gap: 4,
        },
    });
