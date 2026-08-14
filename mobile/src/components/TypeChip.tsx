import { StyleSheet, Text, View } from 'react-native';
import { alpha10, TYPE_DESIGN, themedText } from '../theme/design';
import { useTheme } from '../context/ThemeContext';
import type { ParkingType } from '../types/parking';

/** Chip de tipo do design v2: texto semibold sobre fundo translúcido da cor, pill. */
export function TypeChip({ type }: Readonly<{ type: ParkingType }>) {
    const { resolvedScheme } = useTheme();
    const meta = TYPE_DESIGN[type];
    const textColor = themedText(meta.color, resolvedScheme);
    return (
        <View style={[styles.chip, { backgroundColor: alpha10(meta.color) }]}>
            <Text style={[styles.text, { color: textColor }]}>{meta.label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    chip: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        alignSelf: 'flex-start',
    },
    text: {
        fontSize: 11,
        fontWeight: '600',
    },
});
