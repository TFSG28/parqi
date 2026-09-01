/* Mocks globais para testes: módulos nativos indisponíveis no jest. */

jest.mock('react-native-maps', () => ({
    __esModule: true,
    default: () => null,
    PROVIDER_GOOGLE: 'google',
    PROVIDER_DEFAULT: 'default',
    Marker: () => null,
    Polygon: () => null,
    Polyline: () => null,
}));

jest.mock('@rnmapbox/maps', () => ({
    __esModule: true,
    default: {
        MapView: () => null,
        Camera: () => null,
        ShapeSource: () => null,
        FillLayer: () => null,
        LineLayer: () => null,
        CircleLayer: () => null,
        SymbolLayer: () => null,
        StyleURL: {
            Street: 'mapbox://styles/mapbox/streets-v11',
            Light: 'mapbox://styles/mapbox/light-v10',
            Dark: 'mapbox://styles/mapbox/dark-v10',
            SatelliteStreet: 'mapbox://styles/mapbox/satellite-streets-v11',
            Outdoors: 'mapbox://styles/mapbox/outdoors-v11',
        },
        setAccessToken: jest.fn(),
    },
}));


jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
