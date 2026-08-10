import { forwardRef } from 'react';
import { GoogleMap } from './GoogleMap';
import { OsmMap, type OsmMapHandle, type OsmMapProps } from './OsmMap';

export type { MapLayer, OsmMapHandle as AppMapHandle, OsmMarker } from './OsmMap';

/**
 * Fornecedor do mapa escolhido no .env:
 *   EXPO_PUBLIC_MAP_PROVIDER=osm    -> Leaflet/OpenStreetMap em WebView (default, Expo Go)
 *   EXPO_PUBLIC_MAP_PROVIDER=google -> react-native-maps + Google (requer dev build e API key)
 */
const USE_GOOGLE = process.env.EXPO_PUBLIC_MAP_PROVIDER === 'google';

export const AppMap = forwardRef<OsmMapHandle, OsmMapProps>(function AppMap(props, ref) {
    return USE_GOOGLE ? <GoogleMap ref={ref} {...props} /> : <OsmMap ref={ref} {...props} />;
});
