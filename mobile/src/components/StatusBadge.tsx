import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { alpha10, MONO, STATUS_DESIGN, themedText } from '../theme/design';
import { useTheme } from '../context/ThemeContext';
import type { ContributionStatus } from '../types/parking';

/** Badge de estado do design: ícone + label mono sobre fundo translúcido. */
export function StatusBadge({ status }: Readonly<{ status: ContributionStatus }>) {
    const { resolvedScheme } = useTheme();
    const meta = STATUS_DESIGN[status];
    const textColor = themedText(meta.color, resolvedScheme);
    return (
        <View style={[styles.badge, { backgroundColor: alpha10(meta.color) }]}>
            <Ionicons name={meta.icon} size={11} color={textColor} />
            <Text style={[styles.text, { color: textColor }]}>{meta.label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
        gap: 4,
    },
    text: {
        fontSize: 10,
        fontWeight: '500',
        fontFamily: MONO,
    },
});
