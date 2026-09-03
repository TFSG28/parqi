export const MAP_CONFIG = {
    clusterRadius: 48,
    clusterDisableZoom: 16,
    clusterMaxZoom: 16,
    maxCameraZoom: 18,
    clusterZoomStep: 2.5,
    viewportPadding: 0.12,
    requestDebounceMs: 550,
    cameraAnimationMs: 350,
    maxMarkers: 100,
} as const;

export function isValidCoordinate(latitude: number | null | undefined, longitude: number | null | undefined): boolean {
    return latitude !== null && latitude !== undefined && longitude !== null && longitude !== undefined
        && Number.isFinite(latitude) && Number.isFinite(longitude)
        && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}

// padding tipado explicitamente: com `as const` o default inferiria o literal 0.12
// e impedia passing de outro padding.
export function expandBbox(bbox: string, padding: number = MAP_CONFIG.viewportPadding): string {
    const values = bbox.split(',').map(Number);
    if (values.length !== 4 || values.some((value) => !Number.isFinite(value))) return bbox;
    const [minLon, minLat, maxLon, maxLat] = values;
    const lonPadding = Math.max((maxLon - minLon) * padding, 0.001);
    const latPadding = Math.max((maxLat - minLat) * padding, 0.001);
    return [minLon - lonPadding, minLat - latPadding, maxLon + lonPadding, maxLat + latPadding].join(',');
}
