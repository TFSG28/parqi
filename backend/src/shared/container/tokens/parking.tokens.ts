export const PARKING_TOKENS = {
    // Services
    ITrustCalculator: Symbol.for('ITrustCalculator'),
    IOverpassImporter: Symbol.for('IOverpassImporter'),
    IGeoapifyImporter: Symbol.for('IGeoapifyImporter'),
    ICsvImporter: Symbol.for('ICsvImporter'),

    // Repositories
    IParkingRepository: Symbol.for('IParkingRepository'),

    // Use Cases
    CreateParkingUseCase: Symbol.for('CreateParkingUseCase'),
    UpdateParkingUseCase: Symbol.for('UpdateParkingUseCase'),
    ListParkingUseCase: Symbol.for('ListParkingUseCase'),
    GetParkingUseCase: Symbol.for('GetParkingUseCase'),
    VoteParkingUseCase: Symbol.for('VoteParkingUseCase'),
    ModerateParkingUseCase: Symbol.for('ModerateParkingUseCase'),
    DeleteParkingUseCase: Symbol.for('DeleteParkingUseCase'),

    // Controllers
    ParkingController: Symbol.for('ParkingController'),
} as const;
