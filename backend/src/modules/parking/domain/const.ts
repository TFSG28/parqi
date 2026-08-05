// Limites aproximados de Portugal Continental + ilhas (latitude/longitude)
export const PORTUGAL_BOUNDS = {
    minLat: 32.0,
    maxLat: 42.5,
    minLon: -31.5,
    maxLon: -6.0,
} as const;

// Raio (metros) abaixo do qual uma contribuição é considerada duplicada
export const DUPLICATE_RADIUS_METERS = 30;
