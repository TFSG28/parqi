import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import type { ThemeColors } from '../theme/colors';

interface SearchBarProps {
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
}

/**
 * Barra de pesquisa minimal — filtra a lista de spots sem navegação extra.
 * Design refinado: fundo subtil, ícone discreto, sem bordas agressivas.
 */
export function SearchBar({ value, onChangeText, placeholder = 'Procurar estacionamento…' }: SearchBarProps) {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    return (
        <View style={styles.wrapper}>
            <View style={styles.bar}>
                <Ionicons name="search" size={16} color={colors.textMuted} />
                <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="search"
                />
                {value.length > 0 && (
                    <Pressable
                        onPress={() => onChangeText('')}
                        accessibilityLabel="Limpar pesquisa"
                        hitSlop={8}
                    >
                        <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                    </Pressable>
                )}
            </View>
        </View>
    );
}

const createStyles = (colors: ThemeColors) =>
    StyleSheet.create({
        wrapper: {
            marginBottom: 8,
        },
        bar: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: colors.card,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
        },
        input: {
            flex: 1,
            fontSize: 14,
            color: colors.text,
            padding: 0,
        },
    });
