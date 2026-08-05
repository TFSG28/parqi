import { useEffect, useRef } from 'react';
import { Animated, Easing, type ViewStyle } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface SkeletonBoxProps {
    width?: number;
    height: number;
    borderRadius?: number;
    style?: ViewStyle;
}

/**
 * Caixa animada com shimmer subtil.
 * A pulsação é lenta e de baixa amplitude — sugere carregamento
 * sem distrair nem competir com o conteúdo real.
 */
export function SkeletonBox({ width, height, borderRadius = 8, style }: SkeletonBoxProps) {
    const { colors } = useTheme();
    const anim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(anim, {
                    toValue: 1,
                    duration: 1200,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.timing(anim, {
                    toValue: 0,
                    duration: 1200,
                    easing: Easing.inOut(Easing.ease),
                    useNativeDriver: true,
                }),
            ]),
        );
        loop.start();
        return () => loop.stop();
    }, [anim]);

    const opacity = anim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.12, 0.28],
    });

    const bgColor = colors.border;

    return (
        <Animated.View
            style={[{ width, height, borderRadius, opacity, backgroundColor: bgColor }, style]}
        />
    );
}
