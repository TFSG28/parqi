import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
    Pressable,
    StyleSheet,
    TextInput,
    View,
    type TextInputProps,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import type { ThemeColors } from '../theme/colors';

/**
 * Campo de palavra-passe com toggle de visibilidade (olho), com o mesmo
 * aspeto dos restantes inputs da app. Usado no login e na recuperação.
 */
export function PasswordInput(props: Readonly<TextInputProps>) {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const [visible, setVisible] = useState(false);

    return (
        <View style={styles.wrap}>
            <TextInput
                {...props}
                secureTextEntry={!visible}
                placeholderTextColor={colors.textMuted}
                style={[styles.input, props.style]}
            />
            <Pressable
                style={({ pressed }) => [styles.eye, pressed && styles.pressed]}
                onPress={() => setVisible((v) => !v)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={visible ? 'Ocultar palavra-passe' : 'Mostrar palavra-passe'}
            >
                <Ionicons
                    name={visible ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={colors.textMuted}
                />
            </Pressable>
        </View>
    );
}

const createStyles = (colors: ThemeColors) =>
    StyleSheet.create({
        wrap: {
            marginTop: 4,
        },
        input: {
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 12,
            padding: 12,
            paddingRight: 44,
            backgroundColor: colors.card,
            color: colors.text,
        },
        eye: {
            position: 'absolute',
            right: 6,
            top: 0,
            bottom: 0,
            justifyContent: 'center',
            paddingHorizontal: 6,
        },
        pressed: {
            opacity: 0.6,
        },
    });
