import { StyleSheet, Text, View } from 'react-native';
import { alpha10, MONO, TYPE_DESIGN } from '../theme/design';
import type { ParkingType } from '../types/parking';

/** Chip de tipo do design: texto mono 10px sobre fundo translúcido da cor. */
export function TypeChip({ type }: Readonly<{ type: ParkingType }>) {
    const meta = TYPE_DESIGN[type];
    return (
        <View style={[styles.chip, { backgroundColor: alpha10(meta.color) }]}>
            <Text style={[styles.text, { color: meta.color }]}>{meta.label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    chip: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
        alignSelf: 'flex-start',
    },
    text: {
        fontSize: 10,
        fontWeight: '600',
        fontFamily: MONO,
    },
});
