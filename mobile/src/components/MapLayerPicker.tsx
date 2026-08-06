import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
    Pressable,
    StyleSheet,
    Text,
    View,
    type StyleProp,
    type ViewStyle,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import type { ThemeColors } from '../theme/colors';
import type { MapLayer } from './OsmMap';

const STORAGE_KEY = 'parqi.map_layer';

const LAYER_OPTIONS: { id: MapLayer; label: string; swatch: string }[] = [
    { id: 'standard', label: 'Padrão', swatch: '#AAD3DF' },
    { id: 'satellite', label: 'Satélite', swatch: '#2F5D3A' },
    { id: 'dark', label: 'Escuro', swatch: '#14161C' },
    { id: 'light', label: 'Claro', swatch: '#F4F0E6' },
    { id: 'topo', label: 'Topo', swatch: '#E0C88F' },
];

function isMapLayer(value: string | null): value is MapLayer {
    return (
        value === 'standard' ||
        value === 'satellite' ||
        value === 'dark' ||
        value === 'light' ||
        value === 'topo'
    );
}

interface MapLayerPickerProps {
    onChange: (layer: MapLayer) => void;
    style?: StyleProp<ViewStyle>;
}

/** Botão flutuante de camadas do mapa: abre um menu compacto e guarda a escolha. */
export function MapLayerPicker({ onChange, style }: MapLayerPickerProps) {
    const { colors } = useTheme();
    const [open, setOpen] = useState(false);
    const [layer, setLayer] = useState<MapLayer>('standard');

    useEffect(() => {
        AsyncStorage.getItem(STORAGE_KEY)
            .then((value) => {
                if (isMapLayer(value)) {
                    setLayer(value);
                    onChange(value);
                }
            })
            .catch(() => {});
        // só na montagem; onChange é estável (setState do pai)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const select = (next: MapLayer) => {
        setLayer(next);
        setOpen(false);
        AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
        onChange(next);
    };

    return (
        <View style={[styles.wrap, style]}>
            {open && (
                <View style={[styles.menu, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    {LAYER_OPTIONS.map((opt) => {
                        const active = layer === opt.id;
                        return (
                            <Pressable
                                key={opt.id}
                                style={[styles.option, active && { backgroundColor: colors.background }]}
                                onPress={() => select(opt.id)}
                            >
                                <View style={[styles.swatch, { backgroundColor: opt.swatch }]} />
                                <Text style={[styles.optionText, { color: active ? colors.primary : colors.text }]}>
                                    {opt.label}
                                </Text>
                                {active && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                            </Pressable>
                        );
                    })}
                </View>
            )}
            <Pressable
                style={[styles.fab, { backgroundColor: colors.white }]}
                onPress={() => setOpen((v) => !v)}
                accessibilityLabel="Camadas do mapa"
                hitSlop={6}
            >
                <Ionicons name="layers" size={20} color={colors.primary} />
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        alignItems: 'flex-end',
        gap: 10,
    },
    fab: {
        width: 52,
        height: 52,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 4,
    },
    menu: {
        borderRadius: 14,
        borderWidth: 1,
        paddingVertical: 6,
        minWidth: 148,
        shadowColor: '#000',
        shadowOpacity: 0.18,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 8,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 12,
        paddingVertical: 9,
        borderRadius: 10,
    },
    swatch: {
        width: 16,
        height: 16,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.15)',
    },
    optionText: {
        flex: 1,
        fontSize: 13,
        fontWeight: '600',
    },
});
