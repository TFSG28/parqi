import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { STATUS_META } from '../lib/geo';
import type { ContributionStatus } from '../types/parking';

export function StatusBadge({ status }: { status: ContributionStatus }) {
    const { colors } = useTheme();
    const color = colors[STATUS_META[status].colorKey];
    return (
        <View style={[styles.badge, { backgroundColor: color + '1A', borderColor: color + '66' }]}>
            <View style={[styles.dot, { backgroundColor: color }]} />
            <Text style={[styles.text, { color }]}>{STATUS_META[status].label}</Text>
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
        borderWidth: 1,
        gap: 6,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    text: {
        fontSize: 12,
        fontWeight: '600',
    },
});
