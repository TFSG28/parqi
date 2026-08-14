import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ParqiHeader } from '../../src/components/ParqiHeader';
import { useTheme } from '../../src/context/ThemeContext';
import type { ThemeColors } from '../../src/theme/colors';

const TAB_META: Record<string, { icon: keyof typeof Ionicons.glyphMap; label: string }> = {
    mapa: { icon: 'navigate', label: 'Mapa' },
    index: { icon: 'search', label: 'Pesquisa' },
    add: { icon: 'add', label: '' },
    conta: { icon: 'person', label: 'Perfil' },
};

/** Props do tabBar extraídas do próprio Tabs (evita dependência direta). */
type TabBarProps = Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];

/** Barra inferior do design: 4 itens, Add como botão quadrado destacado. */
function DesignTabBar({ state, navigation }: Readonly<TabBarProps>) {
    const insets = useSafeAreaInsets();
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);

    return (
        <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
            {state.routes.map((route, index) => {
                const meta = TAB_META[route.name];
                if (!meta) return null;
                const focused = state.index === index;
                const color = focused ? colors.primary : colors.textMuted;

                const onPress = () => {
                    const event = navigation.emit({
                        type: 'tabPress',
                        target: route.key,
                        canPreventDefault: true,
                    });
                    if (!focused && !event.defaultPrevented) {
                        navigation.navigate(route.name);
                    }
                };

                return (
                    <Pressable
                        key={route.key}
                        onPress={onPress}
                        style={({ pressed }) => [styles.item, pressed && styles.pressed]}
                        accessibilityRole="button"
                        accessibilityState={focused ? { selected: true } : {}}
                        accessibilityLabel={route.name === 'add' ? 'Adicionar estacionamento' : meta.label}
                    >
                        {route.name === 'add' ? (
                            <View style={[styles.addButton, focused && styles.addButtonActive]}>
                                <Ionicons name="add" size={24} color={colors.white} />
                            </View>
                        ) : (
                            <>
                                <Ionicons name={meta.icon} size={20} color={color} />
                                <Text style={[styles.label, { color }]}>{meta.label}</Text>
                            </>
                        )}
                    </Pressable>
                );
            })}
        </View>
    );
}

const renderTabBar = (props: TabBarProps) => <DesignTabBar {...props} />;
const renderHeader = () => <ParqiHeader />;

export default function TabsLayout() {
    return (
        <Tabs
            tabBar={renderTabBar}
            screenOptions={{ header: renderHeader }}
        >
            <Tabs.Screen name="mapa" />
            <Tabs.Screen name="index" />
            <Tabs.Screen name="add" />
            <Tabs.Screen name="conta" />
        </Tabs>
    );
}

const createStyles = (colors: ThemeColors) =>
    StyleSheet.create({
        bar: {
            flexDirection: 'row',
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.card,
            paddingHorizontal: 8,
            paddingTop: 4,
        },
        item: {
            flex: 1,
            alignItems: 'center',
            gap: 2,
            paddingVertical: 6,
        },
        label: {
            fontSize: 10,
            fontWeight: '600',
        },
        addButton: {
            width: 48,
            height: 48,
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.primary,
            shadowColor: colors.primary,
            shadowOpacity: 0.35,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
            elevation: 6,
        },
        addButtonActive: {
            transform: [{ scale: 0.95 }],
        },
        pressed: {
            opacity: 0.7,
        },
    });
