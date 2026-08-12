import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

/**
 * Mapa OpenStreetMap via Leaflet num WebView.
 * Substitui o react-native-maps enquanto o Google Maps não funciona no Expo Go
 * (o SDK Google renderiza preto em alguns dispositivos com a chave partilhada).
 *
 * Suporta várias camadas de tiles: Padrão, Satélite, Dark, Light e Topo.
 */

export type MapLayer = 'standard' | 'satellite' | 'dark' | 'light' | 'topo';

export interface OsmMarker {
    id: string;
    latitude: number;
    longitude: number;
    color: string;
    /** Cor do "P" dentro do pin (default branco; escuro sobre laranja). */
    textColor?: string;
    /** 'pin' = sinal P (default); 'dot' = ponto pequeno (vértices de polígono). */
    kind?: 'pin' | 'dot';
}

export interface OsmMapHandle {
    centerOn: (latitude: number, longitude: number, zoom?: number) => void;
}

export interface OsmMapProps {
    center: { latitude: number; longitude: number };
    zoom?: number;
    markers?: OsmMarker[];
    /** Agrupa marcadores próximos em clusters (mapa principal). */
    cluster?: boolean;
    /** Anel do polígono, pares [latitude, longitude]. */
    polygon?: [number, number][];
    /** Linha de estacionamento na via (estacionamento ao longo da estrada). */
    polyline?: [number, number][];
    userLocation?: { latitude: number; longitude: number } | null;
    interactive?: boolean;
    /** Camada de tiles (default: Padrão/OSM). */
    layer?: MapLayer;
    onMarkerPress?: (id: string) => void;
    onMapPress?: (coordinate: { latitude: number; longitude: number }) => void;
    /** bbox "minLon,minLat,maxLon,maxLat" após mover/zoom. */
    onBoundsChange?: (bbox: string) => void;
    style?: StyleProp<ViewStyle>;
}

const TILE_PRESETS = {
    standard: {
        url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    },
    satellite: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        maxZoom: 19,
        attribution:
            'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
    },
    dark: {
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        maxZoom: 20,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    },
    light: {
        url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        maxZoom: 20,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    },
    topo: {
        url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
        maxZoom: 19,
        maxNativeZoom: 17,
        attribution:
            'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, SRTM | &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)',
    },
} as const;

function buildHtml(
    center: OsmMapProps['center'],
    zoom: number,
    interactive: boolean,
    cluster: boolean,
    markers: OsmMarker[],
    polygon: [number, number][],
    polyline: [number, number][],
    userLocation: OsmMapProps['userLocation'],
    layer: MapLayer
): string {
    return `<!doctype html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>
<style>
html,body,#map{margin:0;height:100%;width:100%;background:#e8e8e8}
.parqi-pin,.parqi-cluster{background:transparent;border:none}
</style>
</head><body><div id="map"></div><script>
const interactive = ${interactive};
const map = L.map('map', {
    zoomControl: false,
    dragging: interactive,
    touchZoom: interactive,
    doubleClickZoom: interactive,
    scrollWheelZoom: interactive,
    boxZoom: false,
    keyboard: false,
}).setView([${center.latitude}, ${center.longitude}], ${zoom});

const LAYERS = {
    standard: { url: '${TILE_PRESETS.standard.url}', maxZoom: ${TILE_PRESETS.standard.maxZoom}, attr: '${TILE_PRESETS.standard.attribution}' },
    satellite: { url: '${TILE_PRESETS.satellite.url}', maxZoom: ${TILE_PRESETS.satellite.maxZoom}, attr: '${TILE_PRESETS.satellite.attribution}' },
    dark: { url: '${TILE_PRESETS.dark.url}', maxZoom: ${TILE_PRESETS.dark.maxZoom}, attr: '${TILE_PRESETS.dark.attribution}' },
    light: { url: '${TILE_PRESETS.light.url}', maxZoom: ${TILE_PRESETS.light.maxZoom}, attr: '${TILE_PRESETS.light.attribution}' },
    topo: { url: '${TILE_PRESETS.topo.url}', maxZoom: ${TILE_PRESETS.topo.maxZoom}, maxNativeZoom: ${TILE_PRESETS.topo.maxNativeZoom}, attr: '${TILE_PRESETS.topo.attribution}' },
};

let tile = null;
function switchLayer(name) {
    const cfg = LAYERS[name] || LAYERS.standard;
    if (tile) { map.removeLayer(tile); }
    tile = L.tileLayer(cfg.url, { maxZoom: cfg.maxZoom, maxNativeZoom: cfg.maxNativeZoom || cfg.maxZoom, attribution: cfg.attr, subdomains: 'abc' }).addTo(map);
}
switchLayer('${layer}');

function pinIcon(m) {
    const text = m.textColor || '#FFFFFF';
    if (m.kind === 'dot') {
        return L.divIcon({
            className: 'parqi-pin',
            html: '<div style="width:14px;height:14px;border-radius:7px;background:' + m.color + ';border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.3)"></div>',
            iconSize: [14, 14],
            iconAnchor: [7, 7],
        });
    }
    return L.divIcon({
        className: 'parqi-pin',
        html: '<div style="width:30px;height:30px;border-radius:8px;background:' + m.color + ';border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;color:' + text + ';font-family:system-ui,sans-serif;font-weight:800;font-size:16px;line-height:1">P</div>',
        iconSize: [30, 30],
        iconAnchor: [15, 15],
    });
}

const markerLayer = ${cluster}
    ? L.markerClusterGroup({
          maxClusterRadius: 60,
          showCoverageOnHover: false,
          spiderfyOnMaxZoom: true,
          disableClusteringAtZoom: 17,
          iconCreateFunction: function (c) {
              const n = c.getChildCount();
              const size = n < 10 ? 38 : n < 100 ? 44 : 52;
              return L.divIcon({
                  className: 'parqi-cluster',
                  html: '<div style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;background:#0647AC;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;color:#fff;font-family:system-ui,sans-serif;font-weight:700;font-size:13px">' + n + '</div>',
                  iconSize: [size, size],
              });
          },
      })
    : L.layerGroup();
markerLayer.addTo(map);

let poly = null;
let line = null;
let userDot = null;

function post(payload) {
    window.ReactNativeWebView.postMessage(JSON.stringify(payload));
}

function updateMarkers(list) {
    markerLayer.clearLayers();
    list.forEach(function (m) {
        L.marker([m.latitude, m.longitude], { icon: pinIcon(m) })
            .on('click', function (e) {
                if (e.originalEvent) L.DomEvent.stopPropagation(e.originalEvent);
                post({ type: 'marker', id: m.id });
            })
            .addTo(markerLayer);
    });
}

function setPolygon(ring) {
    if (poly) { poly.remove(); poly = null; }
    if (ring && ring.length > 1) {
        poly = L.polygon(ring, { color: '#0647AC', weight: 2, fillColor: '#0647AC', fillOpacity: 0.2 }).addTo(map);
    }
}

function setPolyline(pts) {
    if (line) { line.remove(); line = null; }
    if (pts && pts.length > 1) {
        line = L.polyline(pts, { color: '#FF6900', weight: 5, opacity: 0.9, dashArray: '1 8', lineCap: 'round' }).addTo(map);
    }
}

function setUser(u) {
    if (userDot) { userDot.remove(); userDot = null; }
    if (u) {
        userDot = L.circleMarker([u.latitude, u.longitude], {
            radius: 7, color: '#FFFFFF', weight: 2, fillColor: '#0647AC', fillOpacity: 1,
        }).addTo(map);
    }
}

function centerOn(lat, lng, z) { map.setView([lat, lng], z || map.getZoom()); }

if (interactive) {
    map.on('click', function (e) { post({ type: 'press', latitude: e.latlng.lat, longitude: e.latlng.lng }); });
    map.on('moveend', function () {
        const b = map.getBounds();
        post({ type: 'bounds', bbox: [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()].join(',') });
    });
}

updateMarkers(${JSON.stringify(markers)});
setPolygon(${JSON.stringify(polygon)});
setPolyline(${JSON.stringify(polyline)});
setUser(${JSON.stringify(userLocation ?? null)});
</script></body></html>`;
}

export const OsmMap = forwardRef<OsmMapHandle, OsmMapProps>(function OsmMap(
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
        onMarkerPress,
        onMapPress,
        onBoundsChange,
        style,
    },
    ref
) {
    const webRef = useRef<WebView>(null);
    const loaded = useRef(false);
    // HTML construído uma vez; atualizações seguem por injectJavaScript (sem recarregar o mapa)
    const html = useRef(
        buildHtml(center, zoom, interactive, cluster, markers, polygon, polyline, userLocation, layer)
    ).current;

    // injectJavaScript antes do WebView carregar perde-se; onLoadEnd resincroniza tudo
    const inject = (js: string) => {
        if (loaded.current) webRef.current?.injectJavaScript(`${js} true;`);
    };

    useImperativeHandle(ref, () => ({
        centerOn: (latitude, longitude, z) => {
            inject(`centerOn(${latitude}, ${longitude}${z ? `, ${z}` : ''});`);
        },
    }));

    useEffect(() => {
        inject(`centerOn(${center.latitude}, ${center.longitude});`);
    }, [center.latitude, center.longitude]);

    useEffect(() => {
        inject(`switchLayer('${layer}');`);
    }, [layer]);

    useEffect(() => {
        inject(`updateMarkers(${JSON.stringify(markers)});`);
    }, [markers]);

    useEffect(() => {
        inject(`setPolygon(${JSON.stringify(polygon)});`);
    }, [polygon]);

    useEffect(() => {
        inject(`setPolyline(${JSON.stringify(polyline)});`);
    }, [polyline]);

    useEffect(() => {
        inject(`setUser(${JSON.stringify(userLocation ?? null)});`);
    }, [userLocation]);

    // Aplica o estado mais recente das props quando o mapa fica pronto
    // (corrige o mapa preso no centro inicial quando a localização chega antes do load)
    const handleLoadEnd = () => {
        loaded.current = true;
        inject(
            `centerOn(${center.latitude}, ${center.longitude});` +
            `switchLayer('${layer}');` +
            `updateMarkers(${JSON.stringify(markers)});` +
            `setPolygon(${JSON.stringify(polygon)});` +
            `setPolyline(${JSON.stringify(polyline)});` +
            `setUser(${JSON.stringify(userLocation ?? null)});`
        );
    };

    const handleMessage = (event: WebViewMessageEvent) => {
        try {
            const message = JSON.parse(event.nativeEvent.data) as
                | { type: 'marker'; id: string }
                | { type: 'press'; latitude: number; longitude: number }
                | { type: 'bounds'; bbox: string };
            if (message.type === 'marker') onMarkerPress?.(message.id);
            if (message.type === 'press') onMapPress?.({ latitude: message.latitude, longitude: message.longitude });
            if (message.type === 'bounds') onBoundsChange?.(message.bbox);
        } catch {
            // mensagem não-JSON: ignora
        }
    };

    return (
        <WebView
            ref={webRef}
            source={{ html }}
            style={[styles.map, style]}
            onLoadEnd={handleLoadEnd}
            onMessage={handleMessage}
            javaScriptEnabled
            domStorageEnabled
            setBuiltInZoomControls={false}
            overScrollMode="never"
        />
    );
});

const styles = StyleSheet.create({
    map: {
        flex: 1,
        backgroundColor: '#e8e8e8',
    },
});
