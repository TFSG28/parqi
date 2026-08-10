import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useTheme } from '../../src/context/ThemeContext';

/** Navegação principal no rodapé: Parques (lista), Mapa e Conta. */
export default function TabsLayout() {
    const { colors } = useTheme();

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.textMuted,
                tabBarStyle: {
                    backgroundColor: colors.card,
                    borderTopColor: colors.border,
                },
                tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Parques',
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? 'list' : 'list-outline'} size={22} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="mapa"
                options={{
                    title: 'Mapa',
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? 'map' : 'map-outline'} size={22} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="conta"
                options={{
                    title: 'Conta',
                    tabBarIcon: ({ color, focused }) => (
                        <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}
