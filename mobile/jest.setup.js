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

jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
