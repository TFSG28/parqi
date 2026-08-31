import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { StyleSheet, type NativeSyntheticEvent } from 'react-native';
import {
    Camera,
    GeoJSONSource,
    Layer,
    Map as MLMap,
    type CameraRef,
    type MapRef,
    type PressEventWithFeatures,
    type StyleSpecification,
} from '@maplibre/maplibre-react-native';
import type { MapLayer, OsmMapHandle, OsmMapProps, OsmMarker } from './OsmMap';

/**
 * Mapa vetorial via MapLibre (nativo, sem WebView nem API key).
 * Mesma interface do OsmMap; clustering, polígonos e cores da marca
 * são camadas de estilo — muito mais customizável que tiles raster.
 * Requer dev build (não funciona no Expo Go).
 */

/** Estilo raster inline (satélite/topo não têm estilo vetorial livre). */
function rasterStyle(tiles: string[], attribution: string, maxzoom: number): StyleSpecification {
    return {
        version: 8,
        glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
        sources: { base: { type: 'raster', tiles, tileSize: 256, maxzoom, attribution } },
        layers: [{ id: 'base', type: 'raster', source: 'base' }],
    };
}

/** Estilos por camada: vetoriais livres (OpenFreeMap/Carto) + raster para satélite/topo. */
const MAP_STYLES: Record<MapLayer, string | StyleSpecification> = {
    standard: 'https://tiles.openfreemap.org/styles/liberty',
    light: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    satellite: rasterStyle(
        ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
        'Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics',
        19
    ),
    topo: rasterStyle(
        ['https://a.tile.opentopomap.org/{z}/{x}/{y}.png', 'https://b.tile.opentopomap.org/{z}/{x}/{y}.png'],
        '© OpenStreetMap contributors, SRTM | © OpenTopoMap (CC-BY-SA)',
        17
    ),
};

function markersToGeoJson(markers: OsmMarker[]): GeoJSON.FeatureCollection {
    return {
        type: 'FeatureCollection',
        features: markers.map((m) => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [m.longitude, m.latitude] },
            properties: {
                id: m.id,
                color: m.color,
                textColor: m.textColor ?? '#FFFFFF',
                dot: m.kind === 'dot',
            },
        })),
    };
}

function ringToGeoJson(ring: [number, number][]): GeoJSON.Feature {
    // ring vem em pares [lat, lng]; GeoJSON usa [lng, lat] e anel fechado
    const coords = ring.map(([lat, lng]) => [lng, lat]);
    if (coords.length > 2) coords.push(coords[0]);
    return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [coords] }, properties: {} };
}

function lineToGeoJson(points: [number, number][]): GeoJSON.Feature {
    return {
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: points.map(([lat, lng]) => [lng, lat]) },
        properties: {},
    };
}

export const MapLibreMap = forwardRef<OsmMapHandle, OsmMapProps>(function MapLibreMap(
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
    const mapRef = useRef<MapRef>(null);
    const cameraRef = useRef<CameraRef>(null);

    useImperativeHandle(ref, () => ({
        centerOn: (latitude, longitude, z) => {
            cameraRef.current?.easeTo({ center: [longitude, latitude], zoom: z ?? zoom, duration: 350 });
        },
    }));

    useEffect(() => {
        cameraRef.current?.easeTo({ center: [center.longitude, center.latitude], duration: 350 });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [center.latitude, center.longitude]);

    const markerData = useMemo(() => markersToGeoJson(markers), [markers]);
    const polygonData = useMemo(() => (polygon.length > 1 ? ringToGeoJson(polygon) : null), [polygon]);
    const polylineData = useMemo(() => (polyline.length > 1 ? lineToGeoJson(polyline) : null), [polyline]);
    const userData = useMemo<GeoJSON.Feature | null>(
        () =>
            userLocation
                ? {
                    type: 'Feature',
                    geometry: { type: 'Point', coordinates: [userLocation.longitude, userLocation.latitude] },
                    properties: {},
                }
                : null,
        [userLocation]
    );

    const handleMarkerPress = (event: NativeSyntheticEvent<PressEventWithFeatures>) => {
        const feature = event.nativeEvent.features?.[0];
        if (!feature) return;
        const props = feature.properties ?? {};
        if (props.cluster) {
            // expandir cluster: aproxima a câmara ao ponto
            const [lng, lat] = (feature.geometry as GeoJSON.Point).coordinates;
            mapRef.current?.getZoom().then((z) => {
                cameraRef.current?.easeTo({ center: [lng, lat], zoom: Math.min(z + 2.5, 18), duration: 350 });
            });
            return;
        }
        if (props.id) onMarkerPress?.(String(props.id));
    };

    return (
        <MLMap
            ref={mapRef}
            style={[styles.map, style]}
            mapStyle={MAP_STYLES[layer]}
            tintColor={brandColor}
            logo={false}
            compass={false}
            attributionPosition={{ bottom: 8, left: 8 }}
            dragPan={interactive}
            touchZoom={interactive}
            doubleTapZoom={interactive}
            touchRotate={false}
            touchPitch={false}
            onPress={
                interactive && onMapPress
                    ? (e) => {
                        const [lng, lat] = e.nativeEvent.lngLat;
                        onMapPress({ latitude: lat, longitude: lng });
                    }
                    : undefined
            }
            onRegionDidChange={
                interactive && onBoundsChange
                    ? (e) => onBoundsChange(e.nativeEvent.bounds.join(','))
                    : undefined
            }
        >
            <Camera
                ref={cameraRef}
                initialViewState={{ center: [center.longitude, center.latitude], zoom }}
            />

            {polygonData && (
                <GeoJSONSource id="parqi-polygon" data={polygonData}>
                    <Layer
                        id="parqi-polygon-fill"
                        type="fill"
                        style={{ fillColor: brandColor, fillOpacity: 0.2 }}
                    />
                    <Layer
                        id="parqi-polygon-line"
                        type="line"
                        style={{ lineColor: brandColor, lineWidth: 2 }}
                    />
                </GeoJSONSource>
            )}

            {polylineData && (
                <GeoJSONSource id="parqi-polyline" data={polylineData}>
                    <Layer
                        id="parqi-polyline-line"
                        type="line"
                        style={{
                            lineColor: accentColor,
                            lineWidth: 5,
                            lineOpacity: 0.9,
                            lineDasharray: [0.2, 1.6],
                            lineCap: 'round',
                        }}
                    />
                </GeoJSONSource>
            )}

            <GeoJSONSource
                id="parqi-markers"
                data={markerData}
                cluster={cluster}
                clusterRadius={60}
                clusterMaxZoom={16}
                onPress={handleMarkerPress}
            >
                {cluster && (
                    <>
                        <Layer
                            id="parqi-clusters"
                            type="circle"
                            filter={['has', 'point_count']}
                            style={{
                                circleColor: brandColor,
                                circleRadius: ['step', ['get', 'point_count'], 19, 10, 22, 100, 26],
                                circleStrokeWidth: 3,
                                circleStrokeColor: '#FFFFFF',
                            }}
                        />
                        <Layer
                            id="parqi-cluster-count"
                            type="symbol"
                            filter={['has', 'point_count']}
                            style={{
                                textField: ['get', 'point_count_abbreviated'],
                                textFont: ['Noto Sans Regular'],
                                textSize: 13,
                                textColor: '#FFFFFF',
                                textAllowOverlap: true,
                            }}
                        />
                    </>
                )}
                {/* vértices de desenho (pontos pequenos) */}
                <Layer
                    id="parqi-dots"
                    type="circle"
                    filter={['all', ['!', ['has', 'point_count']], ['==', ['get', 'dot'], true]]}
                    style={{
                        circleColor: ['get', 'color'],
                        circleRadius: 7,
                        circleStrokeWidth: 2,
                        circleStrokeColor: '#FFFFFF',
                    }}
                />
                {/* pins "P" */}
                <Layer
                    id="parqi-pins"
                    type="circle"
                    filter={['all', ['!', ['has', 'point_count']], ['!=', ['get', 'dot'], true]]}
                    style={{
                        circleColor: ['get', 'color'],
                        circleRadius: 15,
                        circleStrokeWidth: 2,
                        circleStrokeColor: '#FFFFFF',
                    }}
                />
                <Layer
                    id="parqi-pins-label"
                    type="symbol"
                    filter={['all', ['!', ['has', 'point_count']], ['!=', ['get', 'dot'], true]]}
                    style={{
                        textField: 'P',
                        textFont: ['Noto Sans Bold'],
                        textSize: 16,
                        textColor: ['get', 'textColor'],
                        textAllowOverlap: true,
                        textIgnorePlacement: true,
                    }}
                />
            </GeoJSONSource>

            {userData && (
                <GeoJSONSource id="parqi-user" data={userData}>
                    <Layer
                        id="parqi-user-dot"
                        type="circle"
                        style={{
                            circleColor: brandColor,
                            circleRadius: 7,
                            circleStrokeWidth: 2,
                            circleStrokeColor: '#FFFFFF',
                        }}
                    />
                </GeoJSONSource>
            )}
        </MLMap>
    );
});

const styles = StyleSheet.create({
    map: {
        flex: 1,
        backgroundColor: '#e8e8e8',
    },
});
