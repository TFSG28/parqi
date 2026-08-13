import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polygon, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import type { MapLayer, OsmMapHandle, OsmMapProps } from './OsmMap';

/**
 * Mapa Google via react-native-maps, com a mesma interface do OsmMap.
 * Requer dev build e EXPO_PUBLIC_GOOGLE_MAPS_API_KEY (não funciona no Expo Go).
 */

/** Aproximação leaflet-zoom -> delta de região (360° / 2^zoom). */
function zoomToDelta(zoom: number): number {
    return 360 / Math.pow(2, zoom);
}

// Google não tem tiles dark/light/topo próprios: aproxima ao mapType mais perto.
const MAP_TYPE: Record<MapLayer, 'standard' | 'satellite' | 'terrain'> = {
    standard: 'standard',
    satellite: 'satellite',
    dark: 'standard',
    light: 'standard',
    topo: 'terrain',
};

export const GoogleMap = forwardRef<OsmMapHandle, OsmMapProps>(function GoogleMap(
    {
        center,
        zoom = 15,
        markers = [],
        polygon = [],
        polyline = [],
        userLocation = null,
        interactive = true,
        layer = 'standard',
        brandColor = '#0647AC',
        accentColor = '#FF6900',
        onMarkerPress,
        onMapPress,
        onBoundsChange,
        style,
    },
    ref
) {
    //   sem clustering no modo google; volta ao OSM se a densidade de pins pesar
    const mapRef = useRef<MapView>(null);

    const animateTo = (latitude: number, longitude: number, z: number) => {
        const delta = zoomToDelta(z);
        mapRef.current?.animateToRegion(
            { latitude, longitude, latitudeDelta: delta, longitudeDelta: delta },
            350
        );
    };

    useImperativeHandle(ref, () => ({
        centerOn: (latitude, longitude, z) => animateTo(latitude, longitude, z ?? zoom),
    }));

    useEffect(() => {
        animateTo(center.latitude, center.longitude, zoom);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [center.latitude, center.longitude]);

    return (
        <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={[styles.map, style]}
            initialRegion={{
                latitude: center.latitude,
                longitude: center.longitude,
                latitudeDelta: zoomToDelta(zoom),
                longitudeDelta: zoomToDelta(zoom),
            }}
            mapType={MAP_TYPE[layer]}
            showsUserLocation={userLocation !== null}
            showsMyLocationButton={false}
            toolbarEnabled={false}
            scrollEnabled={interactive}
            zoomEnabled={interactive}
            rotateEnabled={interactive}
            pitchEnabled={false}
            onPress={
                interactive && onMapPress
                    ? (e) => onMapPress(e.nativeEvent.coordinate)
                    : undefined
            }
            onRegionChangeComplete={
                interactive && onBoundsChange
                    ? (r) =>
                        onBoundsChange(
                            [
                                r.longitude - r.longitudeDelta / 2,
                                r.latitude - r.latitudeDelta / 2,
                                r.longitude + r.longitudeDelta / 2,
                                r.latitude + r.latitudeDelta / 2,
                            ].join(',')
                        )
                    : undefined
            }
        >
            {markers.map((m) =>
                m.kind === 'dot' ? (
                    <Marker
                        key={m.id}
                        coordinate={{ latitude: m.latitude, longitude: m.longitude }}
                        anchor={{ x: 0.5, y: 0.5 }}
                        tracksViewChanges={false}
                    >
                        <View style={[styles.dot, { backgroundColor: m.color }]} />
                    </Marker>
                ) : (
                    <Marker
                        key={m.id}
                        coordinate={{ latitude: m.latitude, longitude: m.longitude }}
                        anchor={{ x: 0.5, y: 0.5 }}
                        tracksViewChanges={false}
                        onPress={() => onMarkerPress?.(m.id)}
                    >
                        <View style={[styles.pin, { backgroundColor: m.color }]}>
                            <Text style={[styles.pinText, { color: m.textColor ?? '#FFFFFF' }]}>P</Text>
                        </View>
                    </Marker>
                )
            )}
            {polygon.length > 1 && (
                <Polygon
                    coordinates={polygon.map(([lat, lng]) => ({ latitude: lat, longitude: lng }))}
                    strokeColor={brandColor}
                    strokeWidth={2}
                    fillColor={brandColor + '33'}
                />
            )}
            {polyline.length > 1 && (
                <Polyline
                    coordinates={polyline.map(([lat, lng]) => ({ latitude: lat, longitude: lng }))}
                    strokeColor={accentColor}
                    strokeWidth={5}
                    lineDashPattern={[1, 8]}
                />
            )}
        </MapView>
    );
});

const styles = StyleSheet.create({
    map: {
        flex: 1,
        backgroundColor: '#e8e8e8',
    },
    dot: {
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    pin: {
        width: 30,
        height: 30,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.35,
        shadowRadius: 3,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3,
    },
    pinText: {
        fontWeight: '800',
        fontSize: 16,
        lineHeight: 18,
    },
});
