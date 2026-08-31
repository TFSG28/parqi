import Constants from 'expo-constants';
import { forwardRef } from 'react';
import { GoogleMap } from './GoogleMap';
import { OsmMap, type OsmMapHandle, type OsmMapProps } from './OsmMap';

export type { MapLayer, OsmMapHandle as AppMapHandle, OsmMarker } from './OsmMap';

/**
 * Fornecedor do mapa escolhido no .env:
 *   EXPO_PUBLIC_MAP_PROVIDER=osm      -> Leaflet/OpenStreetMap em WebView (Expo Go)
 *   EXPO_PUBLIC_MAP_PROVIDER=maplibre -> MapLibre nativo, vetorial e customizável (requer dev build)
 *   EXPO_PUBLIC_MAP_PROVIDER=google   -> react-native-maps + Google (requer dev build e API key)
 *
 * MapLibre é carregado de forma dinâmica de propósito: o Expo Go não inclui o
 * módulo nativo MLRNCameraModule e uma importação estática faria todas as rotas
 * do Expo Router falharem durante a avaliação do módulo. Em Expo Go, o provider
 * pedido no ambiente é ignorado e usa-se OSM sem sequer avaliar MapLibre.
 */
const requestedProvider = process.env.EXPO_PUBLIC_MAP_PROVIDER ?? 'osm';
const isExpoGo = Constants.appOwnership === 'expo' || Boolean(Constants.expoGoConfig);
const PROVIDER = isExpoGo ? 'osm' : requestedProvider;

type NativeMapComponent = typeof OsmMap;

function getMapLibre(): NativeMapComponent | null {
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const module = require('./MapLibreMap') as { MapLibreMap?: NativeMapComponent };
        return module.MapLibreMap ?? null;
    } catch {
        return null;
    }
}

export const AppMap = forwardRef<OsmMapHandle, OsmMapProps>(function AppMap(props, ref) {
    if (PROVIDER === 'maplibre') {
        const MapLibreMap = getMapLibre();
        if (MapLibreMap) return <MapLibreMap ref={ref} {...props} />;
    }
    if (PROVIDER === 'google') return <GoogleMap ref={ref} {...props} />;
    return <OsmMap ref={ref} {...props} />;
});
