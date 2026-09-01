import type { ConfigContext, ExpoConfig } from 'expo/config';

declare function require(moduleName: 'fs'): {
    readFileSync: (file: string, encoding: string) => string;
};
declare function require(moduleName: 'path'): {
    resolve: (...paths: string[]) => string;
};

const fs = require('fs');
const path = require('path');

function readLocalPublicMapboxToken(): string | undefined {
    const candidates = [
        path.resolve(process.cwd(), '.env'),
        path.resolve(process.cwd(), '../backend/.env'),
    ] as string[];
    for (const file of candidates) {
        try {
            const line = fs.readFileSync(file, 'utf8')
                .split(/\r?\n/)
                .find((entry) => /^\s*MAPBOX_ACCESS_TOKEN\s*=/.test(entry));
            const value = line?.replace(/^\s*MAPBOX_ACCESS_TOKEN\s*=\s*/, '').trim();
            if (value) return value.replace(/^(["'])(.*)\1$/, '$2');
        } catch {
            // The token is supplied by the build environment in CI/EAS.
        }
    }
    return undefined;
}

/**
 * Config dinâmica: injeta as chaves da Google Maps a partir do ambiente.
 * EXPO_PUBLIC_GOOGLE_MAPS_API_KEY é lida em runtime/build.
 * Em Expo Go o mapa Google funciona com a chave do próprio Expo Go;
 * a chave própria é necessária em dev builds / builds nativas.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
    const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
    const mapboxAccessToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? readLocalPublicMapboxToken();
    // O download token fica apenas no ambiente do build. Não o incluímos no config.
    const mapboxPlugin = '@rnmapbox/maps';

    return {
        ...config,
        name: 'Parqi',
        slug: 'parqi',
        extra: {
            ...config.extra,
            ...(mapboxAccessToken ? { mapboxAccessToken } : {}),
        },
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
        plugins: [
            ...(config.plugins ?? []).filter((plugin) => {
                const name = Array.isArray(plugin) ? plugin[0] : plugin;
                return name !== '@rnmapbox/maps';
            }),
            mapboxPlugin,
        ] as ExpoConfig['plugins'],
    };
};
