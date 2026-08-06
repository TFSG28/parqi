/**
 * Notificações push via Expo Notifications.
 * Em Expo Go (SDK 53+) o módulo lança erro — este ficheiro degrada-se
 * silenciosamente para um no-op. Em development builds funciona normalmente.
 */

let Notifications: typeof import('expo-notifications') | null = null;
let Device: typeof import('expo-device') | null = null;

import { Platform } from 'react-native';

try {
    Notifications = require('expo-notifications');
    Device = require('expo-device');

    Notifications!.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
        }),
    });
} catch {
    // Expo Go — notificações push não disponíveis
}

/** Pede permissão e regista o device token no backend. */
export async function registerForPushNotifications(): Promise<string | null> {
    if (!Notifications || !Device) {
        return null;
    }

    if (!Device.isDevice) {
        return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
    });
    const token = tokenData.data;

    if (Platform.OS === 'android') {
        Notifications.setNotificationChannelAsync('default', {
            name: 'Parqi',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
        });
    }

    try {
        const { api } = await import('../lib/api');
        await api.post('/user/push-token', { token, platform: Platform.OS });
    } catch {
        // token persiste localmente; o backend regista quando possível
    }

    return token;
}

export type NotificationType =
    | 'contribution_approved'
    | 'contribution_rejected'
    | 'suggestion_decided'
    | 'spot_flagged';

export interface PushData {
    type: NotificationType;
    spotId?: string;
    message: string;
}
