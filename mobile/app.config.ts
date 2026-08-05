import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Config dinâmica: injeta as chaves da Google Maps a partir do ambiente.
 * EXPO_PUBLIC_GOOGLE_MAPS_API_KEY é lida em runtime/build.
 * Em Expo Go o mapa Google funciona com a chave do próprio Expo Go;
 * a chave própria é necessária em dev builds / builds nativas.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
    const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

    return {
        ...config,
        name: 'Parqi',
        slug: 'parqi',
        ios: {
            ...config.ios,
            config: {
                ...config.ios?.config,
                ...(googleMapsApiKey ? { googleMapsApiKey } : {}),
            },
        },
        android: {
            ...config.android,
            config: {
                ...config.android?.config,
                ...(googleMapsApiKey
                    ? { googleMaps: { apiKey: googleMapsApiKey } }
                    : {}),
            },
        },
    };
};
