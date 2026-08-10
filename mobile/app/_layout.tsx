import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Image, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../src/context/AuthContext';
import { FavoritesProvider } from '../src/context/FavoritesContext';
import { ThemeProvider, useTheme } from '../src/context/ThemeContext';
import { OfflineProvider } from '../src/context/OfflineContext';
import { registerForPushNotifications } from '../src/services/notifications';

function HeaderLogo() {
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Image
                source={require('../assets/icon.png')}
                style={{ width: 28, height: 28, borderRadius: 6 }}
                resizeMode="contain"
            />
        </View>
    );
}

function AppContent() {
    const { colors } = useTheme();

    useEffect(() => {
        registerForPushNotifications();
    }, []);

    return (
        <>
            <StatusBar style="light" />
            <Stack
                screenOptions={{
                    headerStyle: { backgroundColor: colors.bar },
                    headerTintColor: colors.white,
                    headerTitle: () => <HeaderLogo />,
                    headerTitleStyle: { fontWeight: '700' },
                    headerShadowVisible: false,
                    contentStyle: { backgroundColor: colors.background },
                }}
            >
                <Stack.Screen
                    name="(tabs)"
                    options={{ headerShown: false }}
                />
                <Stack.Screen
                    name="parking/[id]"
                    options={{
                        title: 'Estacionamento',
                        headerBackButtonDisplayMode: 'minimal',
                    }}
                />
                <Stack.Screen
                    name="contribute"
                    options={{ title: 'Adicionar estacionamento', presentation: 'modal' }}
                />
                <Stack.Screen name="login" options={{ title: 'Entrar', headerBackButtonDisplayMode: 'minimal' }} />
                <Stack.Screen
                    name="verify"
                    options={{ title: 'Confirmar email', headerBackButtonDisplayMode: 'minimal' }}
                />
                <Stack.Screen
                    name="suggest/[id]"
                    options={{ title: 'Sugerir alteração', presentation: 'modal' }}
                />
                <Stack.Screen
                    name="admin"
                    options={{ title: 'Administração', headerBackButtonDisplayMode: 'minimal' }}
                />
            </Stack>
        </>
    );
}

export default function RootLayout() {
    return (
        <SafeAreaProvider>
            <ThemeProvider>
                <OfflineProvider>
                    <AuthProvider>
                        <FavoritesProvider>
                            <AppContent />
                        </FavoritesProvider>
                    </AuthProvider>
                </OfflineProvider>
            </ThemeProvider>
        </SafeAreaProvider>
    );
}
