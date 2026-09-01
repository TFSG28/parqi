import Constants, { ExecutionEnvironment } from 'expo-constants';
import { forwardRef } from 'react';
import { Platform } from 'react-native';
import { GoogleMap } from './GoogleMap';
import { OsmMap, type OsmMapHandle, type OsmMapProps } from './OsmMap';

export type { MapLayer, OsmMapHandle as AppMapHandle, OsmMarker } from './OsmMap';

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

const PROVIDER =
    isExpoGo
        ? 'osm'
        : requestedProvider === 'mapbox' && Platform.OS === 'android'
            ? 'mapbox'
            : requestedProvider === 'google'
                ? 'google'
                : 'osm';

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

export const AppMap = forwardRef<OsmMapHandle, OsmMapProps>(function AppMap(props, ref) {
    if (PROVIDER === 'mapbox') {
        const MapboxMap = getMapbox();
        if (MapboxMap) return <MapboxMap ref={ref} {...props} />;
    }
    if (PROVIDER === 'google') return <GoogleMap ref={ref} {...props} />;
    return <OsmMap ref={ref} {...props} />;
});
