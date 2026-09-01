import Constants, { ExecutionEnvironment } from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, forwardRef } from 'react';
import { Platform } from 'react-native';
import { GoogleMap } from './GoogleMap';
import { OsmMap, type OsmMapHandle, type OsmMapProps } from './OsmMap';

export type { MapLayer, OsmMapHandle as AppMapHandle, OsmMapProps, OsmMarker } from './OsmMap';
export type MapProviderOption = 'osm' | 'mapbox' | 'google';

/**
 * Fornecedor do mapa escolhido no .env:
 *   EXPO_PUBLIC_MAP_PROVIDER=osm    -> Leaflet/OpenStreetMap em WebView (Expo Go)
 *   EXPO_PUBLIC_MAP_PROVIDER=mapbox -> Mapbox Maps SDK nativo (development build)
 *   EXPO_PUBLIC_MAP_PROVIDER=google -> react-native-maps + Google (development build)
 *
 * O provider Mapbox é carregado de forma dinâmica porque o Expo Go não contém
 * o código nativo do SDK. Assim, o fallback OSM não avalia o módulo Mapbox.
 */
const requestedProvider =
    process.env.EXPO_PUBLIC_MAP_PROVIDER ??
    (Constants.expoConfig?.extra?.mapProvider as string | undefined) ??
    'mapbox';

const isExpoGo =
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

const DEFAULT_PROVIDER =
    isExpoGo
        ? 'osm'
        : requestedProvider === 'mapbox' && Platform.OS === 'android'
            ? 'mapbox'
            : requestedProvider === 'google'
                ? 'google'
                : 'osm';
const PROVIDER_STORAGE_KEY = 'parqi.map_provider';
export type MapProvider = MapProviderOption;

type NativeMapComponent = typeof OsmMap;

function getMapbox(): NativeMapComponent | null {
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const module = require('./MapboxMap') as { MapboxMap?: NativeMapComponent };
        return module.MapboxMap ?? null;
    } catch {
        return null;
    }
}

export const AppMap = forwardRef<OsmMapHandle, OsmMapProps & { provider?: MapProvider }>(function AppMap(props, ref) {
    const [provider, setProvider] = useState<MapProvider>(DEFAULT_PROVIDER as MapProvider);

    useEffect(() => {
        AsyncStorage.getItem(PROVIDER_STORAGE_KEY).then((value) => {
            if (!value || isExpoGo) return;
            if (value === 'mapbox' || value === 'osm' || value === 'google') setProvider(value);
        }).catch(() => { });
    }, []);

    const selectedProvider = props.provider ?? provider;
    if (selectedProvider === 'mapbox') {
        const MapboxMap = getMapbox();
        if (MapboxMap) return <MapboxMap ref={ref} {...props} />;
    }
    if (selectedProvider === 'google') return <GoogleMap ref={ref} {...props} />;
    return <OsmMap ref={ref} {...props} />;
});
