import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, type ViewStyle } from 'react-native';
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
 * Respeita a preferência de movimento reduzido (fica estática).
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
        let started = false;
        AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
            if (!reduce) {
                loop.start();
                started = true;
            }
        });
        return () => {
            if (started) loop.stop();
        };
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
