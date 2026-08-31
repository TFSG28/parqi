import { forwardRef } from 'react';
import { GoogleMap } from './GoogleMap';
import { MapLibreMap } from './MapLibreMap';
import { OsmMap, type OsmMapHandle, type OsmMapProps } from './OsmMap';

export type { MapLayer, OsmMapHandle as AppMapHandle, OsmMarker } from './OsmMap';

/**
 * Fornecedor do mapa escolhido no .env:
 *   EXPO_PUBLIC_MAP_PROVIDER=osm      -> Leaflet/OpenStreetMap em WebView (default, Expo Go)
 *   EXPO_PUBLIC_MAP_PROVIDER=maplibre -> MapLibre nativo, vetorial e customízavel (requer dev build)
 *   EXPO_PUBLIC_MAP_PROVIDER=google   -> react-native-maps + Google (requer dev build e API key)
 */
const PROVIDER = process.env.EXPO_PUBLIC_MAP_PROVIDER ?? 'osm';

export const AppMap = forwardRef<OsmMapHandle, OsmMapProps>(function AppMap(props, ref) {
    if (PROVIDER === 'maplibre') return <MapLibreMap ref={ref} {...props} />;
    if (PROVIDER === 'google') return <GoogleMap ref={ref} {...props} />;
    return <OsmMap ref={ref} {...props} />;
});
