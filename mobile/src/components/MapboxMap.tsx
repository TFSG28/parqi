import Constants from 'expo-constants';
import Mapbox from '@rnmapbox/maps';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import type { MapLayer, OsmMapHandle, OsmMapProps, OsmMarker } from './OsmMap';
import { OsmMap } from './OsmMap';

/**
 * Mapa nativo baseado no Mapbox Maps SDK v11 através de @rnmapbox/maps.
 * Requer um development build Android; o Expo Go usa o provider OSM.
 */

const ACCESS_TOKEN =
    process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ??
    (Constants.expoConfig?.extra?.mapboxAccessToken as string | undefined) ??
    '';

if (ACCESS_TOKEN) {
    Mapbox.setAccessToken(ACCESS_TOKEN);
}

const MAP_STYLES: Record<MapLayer, string> = {
    standard: Mapbox.StyleURL.Street,
    light: Mapbox.StyleURL.Light,
    dark: Mapbox.StyleURL.Dark,
    satellite: Mapbox.StyleURL.SatelliteStreet,
    topo: Mapbox.StyleURL.Outdoors,
};

type PointFeature = GeoJSON.Feature<GeoJSON.Point, Record<string, unknown>>;
type ShapePressEvent = { features: GeoJSON.Feature[] };

function markersToGeoJson(markers: OsmMarker[]): GeoJSON.FeatureCollection {
    return {
        type: 'FeatureCollection',
        features: markers.map((marker) => ({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [marker.longitude, marker.latitude],
            },
            properties: {
                id: marker.id,
                color: marker.color,
                textColor: marker.textColor ?? '#FFFFFF',
                dot: marker.kind === 'dot',
            },
        })),
    };
}

function ringToGeoJson(ring: [number, number][]): GeoJSON.Feature {
    const coordinates = ring.map(([latitude, longitude]) => [longitude, latitude]);
    if (coordinates.length > 2) coordinates.push(coordinates[0]);
    return {
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [coordinates] },
        properties: {},
    };
}

function lineToGeoJson(points: [number, number][]): GeoJSON.Feature {
    return {
        type: 'Feature',
        geometry: {
            type: 'LineString',
            coordinates: points.map(([latitude, longitude]) => [longitude, latitude]),
        },
        properties: {},
    };
}

function featureProperties(feature: GeoJSON.Feature): Record<string, unknown> {
    return (feature.properties ?? {}) as Record<string, unknown>;
}

function featureCoordinates(feature: GeoJSON.Feature): [number, number] | null {
    if (feature.geometry?.type !== 'Point') return null;
    const coordinates = feature.geometry.coordinates;
    if (coordinates.length < 2) return null;
    return [Number(coordinates[0]), Number(coordinates[1])];
}

export const MapboxMap = forwardRef<OsmMapHandle, OsmMapProps>(function MapboxMap(
    {
        center,
        zoom = 15,
        markers = [],
        cluster = false,
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
    const cameraRef = useRef<Mapbox.Camera>(null);

    useImperativeHandle(ref, () => ({
        centerOn: (latitude, longitude, nextZoom) => {
            cameraRef.current?.setCamera({
                centerCoordinate: [longitude, latitude],
                zoomLevel: nextZoom ?? zoom,
                animationDuration: 350,
            });
        },
    }));

    useEffect(() => {
        cameraRef.current?.setCamera({
            centerCoordinate: [center.longitude, center.latitude],
            animationDuration: 350,
        });
    }, [center.latitude, center.longitude]);

    const markerData = useMemo(() => markersToGeoJson(markers), [markers]);
    const polygonData = useMemo(
        () => (polygon.length > 1 ? ringToGeoJson(polygon) : null),
        [polygon]
    );
    const polylineData = useMemo(
        () => (polyline.length > 1 ? lineToGeoJson(polyline) : null),
        [polyline]
    );
    const userData = useMemo<PointFeature | null>(
        () =>
            userLocation
                ? {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [userLocation.longitude, userLocation.latitude],
                    },
                    properties: {},
                }
                : null,
        [userLocation]
    );

    const handleMarkerPress = (event: ShapePressEvent) => {
        const feature = event.features[0];
        if (!feature) return;

        const properties = featureProperties(feature);
        const coordinates = featureCoordinates(feature);
        if (!coordinates) return;

        if (properties.cluster === true || properties.point_count !== undefined) {
            cameraRef.current?.setCamera({
                centerCoordinate: coordinates,
                zoomLevel: Math.min(zoom + 2.5, 18),
                animationDuration: 350,
            });
            return;
        }

        if (properties.id !== undefined) onMarkerPress?.(String(properties.id));
    };

    const handleMapPress = (event: PointFeature) => {
        const coordinates = featureCoordinates(event);
        if (coordinates) {
            onMapPress?.({ latitude: coordinates[1], longitude: coordinates[0] });
        }
    };

    const handleMapIdle = (state: Mapbox.MapState) => {
        if (!onBoundsChange) return;
        const bounds = state.properties.bounds;
        onBoundsChange([
            bounds.sw[0],
            bounds.sw[1],
            bounds.ne[0],
            bounds.ne[1],
        ].join(','));
    };

    if (!ACCESS_TOKEN) {
        return <OsmMap {...{
            center,
            zoom,
            markers,
            cluster,
            polygon,
            polyline,
            userLocation,
            interactive,
            layer,
            brandColor,
            accentColor,
            onMarkerPress,
            onMapPress,
            onBoundsChange,
            style,
        }} ref={ref} />;
    }

    return (
        <Mapbox.MapView
            style={[styles.map, style as StyleProp<ViewStyle>]}
            styleURL={MAP_STYLES[layer]}
            scrollEnabled={interactive}
            zoomEnabled={interactive}
            rotateEnabled={false}
            pitchEnabled={false}
            attributionEnabled
            logoEnabled
            compassEnabled={false}
            onPress={interactive ? handleMapPress : undefined}
            onMapIdle={interactive ? handleMapIdle : undefined}
        >
            <Mapbox.Camera
                ref={cameraRef}
                centerCoordinate={[center.longitude, center.latitude]}
                zoomLevel={zoom}
            />

            {polygonData && (
                <Mapbox.ShapeSource id="parqi-polygon" shape={polygonData}>
                    <Mapbox.FillLayer
                        id="parqi-polygon-fill"
                        style={{ fillColor: brandColor, fillOpacity: 0.2 }}
                    />
                    <Mapbox.LineLayer
                        id="parqi-polygon-line"
                        style={{ lineColor: brandColor, lineWidth: 2 }}
                    />
                </Mapbox.ShapeSource>
            )}

            {polylineData && (
                <Mapbox.ShapeSource id="parqi-polyline" shape={polylineData}>
                    <Mapbox.LineLayer
                        id="parqi-polyline-line"
                        style={{
                            lineColor: accentColor,
                            lineWidth: 5,
                            lineOpacity: 0.9,
                            lineDasharray: [0.2, 1.6],
                            lineCap: 'round',
                        }}
                    />
                </Mapbox.ShapeSource>
            )}

            <Mapbox.ShapeSource
                id="parqi-markers"
                shape={markerData}
                cluster={cluster}
                clusterRadius={60}
                clusterMaxZoomLevel={16}
                onPress={handleMarkerPress}
                hitbox={{ width: 48, height: 48 }}
            >
                <Mapbox.CircleLayer
                    id="parqi-clusters"
                    filter={['has', 'point_count']}
                    style={{
                        circleColor: brandColor,
                        circleRadius: ['step', ['get', 'point_count'], 19, 10, 22, 100, 26],
                        circleStrokeWidth: 3,
                        circleStrokeColor: '#FFFFFF',
                    }}
                />
                <Mapbox.SymbolLayer
                    id="parqi-cluster-count"
                    filter={['has', 'point_count']}
                    style={{
                        textField: ['get', 'point_count_abbreviated'],
                        textSize: 13,
                        textColor: '#FFFFFF',
                        textAllowOverlap: true,
                    }}
                />
                <Mapbox.CircleLayer
                    id="parqi-dots"
                    filter={['all', ['!', ['has', 'point_count']], ['==', ['get', 'dot'], true]]}
                    style={{
                        circleColor: ['get', 'color'],
                        circleRadius: 7,
                        circleStrokeWidth: 2,
                        circleStrokeColor: '#FFFFFF',
                    }}
                />
                <Mapbox.CircleLayer
                    id="parqi-pins"
                    filter={['all', ['!', ['has', 'point_count']], ['!=', ['get', 'dot'], true]]}
                    style={{
                        circleColor: ['get', 'color'],
                        circleRadius: 15,
                        circleStrokeWidth: 2,
                        circleStrokeColor: '#FFFFFF',
                    }}
                />
                <Mapbox.SymbolLayer
                    id="parqi-pins-label"
                    filter={['all', ['!', ['has', 'point_count']], ['!=', ['get', 'dot'], true]]}
                    style={{
                        textField: 'P',
                        textSize: 16,
                        textColor: ['get', 'textColor'],
                        textAllowOverlap: true,
                        textIgnorePlacement: true,
                    }}
                />
            </Mapbox.ShapeSource>

            {userData && (
                <Mapbox.ShapeSource id="parqi-user" shape={userData}>
                    <Mapbox.CircleLayer
                        id="parqi-user-dot"
                        style={{
                            circleColor: brandColor,
                            circleRadius: 7,
                            circleStrokeWidth: 2,
                            circleStrokeColor: '#FFFFFF',
                        }}
                    />
                </Mapbox.ShapeSource>
            )}
        </Mapbox.MapView>
    );
});

const styles = StyleSheet.create({
    map: {
        flex: 1,
        backgroundColor: '#e8e8e8',
    },
});
