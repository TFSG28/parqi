import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { alpha10, STATUS_DESIGN, themedText } from '../theme/design';
import { useTheme } from '../context/ThemeContext';
import type { ContributionStatus } from '../types/parking';

/** Pill de estado do design v2: ícone + label sobre fundo translúcido, bordas redondas. */
export function StatusBadge({ status }: Readonly<{ status: ContributionStatus }>) {
    const { resolvedScheme } = useTheme();
    const meta = STATUS_DESIGN[status];
    const textColor = themedText(meta.color, resolvedScheme);
    return (
        <View style={[styles.badge, { backgroundColor: alpha10(meta.color) }]}>
            <Ionicons name={meta.icon} size={12} color={textColor} />
            <Text style={[styles.text, { color: textColor }]}>{meta.label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        gap: 5,
    },
    text: {
        fontSize: 12,
        fontWeight: '500',
    },
});
