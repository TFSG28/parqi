import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Image, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../src/context/AuthContext';
import { FavoritesProvider } from '../src/context/FavoritesContext';
import { ThemeProvider, useTheme } from '../src/context/ThemeContext';
import { registerForPushNotifications } from '../src/services/notifications';

function HeaderLogo({ title }: Readonly<{ title?: string }>) {
    const { colors } = useTheme();

    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Image
                source={require('../assets/icon.png')}
                style={{ width: 28, height: 28, borderRadius: 6 }}
                resizeMode="contain"
            />
            {title ? (
                <Text style={{ color: colors.white, fontWeight: '700', fontSize: 16 }}>{title}</Text>
            ) : null}
        </View>
    );
}

function AppContent() {
    const { colors, resolvedScheme } = useTheme();

    useEffect(() => {
        registerForPushNotifications();
    }, []);

    return (
        <>
            <StatusBar style={resolvedScheme === 'dark' ? 'light' : 'dark'} />
            <Stack
                screenOptions={{
                    headerStyle: { backgroundColor: colors.bar },
                    headerTintColor: colors.white,
                    headerTitle: ({ children }) => (
                        <HeaderLogo title={typeof children === 'string' ? children : undefined} />
                    ),
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
                    name="forgot-password"
                    options={{ title: 'Recuperar palavra-passe', headerBackButtonDisplayMode: 'minimal' }}
                />
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
                <AuthProvider>
                    <FavoritesProvider>
                        <AppContent />
                    </FavoritesProvider>
                </AuthProvider>
            </ThemeProvider>
        </SafeAreaProvider>
    );
}
