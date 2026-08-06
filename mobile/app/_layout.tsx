import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../src/context/AuthContext';
import { ThemeProvider, useTheme } from '../src/context/ThemeContext';

function ThemedStack() {
    const { colors } = useTheme();
    return (
        <>
            <StatusBar style="light" />
            <Stack
                screenOptions={{
                    headerStyle: { backgroundColor: colors.bar },
                    headerTintColor: colors.white,
                    headerTitleStyle: { fontWeight: '700' },
                    headerShadowVisible: false,
                    contentStyle: { backgroundColor: colors.background },
                }}
            >
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen
                    name="parking/[id]"
                    options={{ title: 'Estacionamento', headerBackButtonDisplayMode: 'minimal' }}
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
                <Stack.Screen name="account" options={{ title: 'Conta', headerBackButtonDisplayMode: 'minimal' }} />
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
                    <ThemedStack />
                </AuthProvider>
            </ThemeProvider>
        </SafeAreaProvider>
    );
}
