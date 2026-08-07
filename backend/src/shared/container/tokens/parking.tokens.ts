export const PARKING_TOKENS = {
    // Services
    ITrustCalculator: Symbol.for('ITrustCalculator'),
    IOverpassImporter: Symbol.for('IOverpassImporter'),
    IOsmImporter: Symbol.for('IOsmImporter'),
    IGeoapifyImporter: Symbol.for('IGeoapifyImporter'),
    ICsvImporter: Symbol.for('ICsvImporter'),
    ICaopImporter: Symbol.for('ICaopImporter'),

    // Repositories
    IMunicipalityRepository: Symbol.for('IMunicipalityRepository'),
    IReputationService: Symbol.for('IReputationService'),
    IRoadValidator: Symbol.for('IRoadValidator'),

    IParkingRepository: Symbol.for('IParkingRepository'),
    ISuggestionRepository: Symbol.for('ISuggestionRepository'),

    // Use Cases
    CreateParkingUseCase: Symbol.for('CreateParkingUseCase'),
    UpdateParkingUseCase: Symbol.for('UpdateParkingUseCase'),
    ListParkingUseCase: Symbol.for('ListParkingUseCase'),
    GetParkingUseCase: Symbol.for('GetParkingUseCase'),
    VoteParkingUseCase: Symbol.for('VoteParkingUseCase'),
    ModerateParkingUseCase: Symbol.for('ModerateParkingUseCase'),
    DeleteParkingUseCase: Symbol.for('DeleteParkingUseCase'),
    SuggestParkingUseCase: Symbol.for('SuggestParkingUseCase'),
    DecideSuggestionUseCase: Symbol.for('DecideSuggestionUseCase'),
    ListSuggestionsUseCase: Symbol.for('ListSuggestionsUseCase'),
    ListModerationQueueUseCase: Symbol.for('ListModerationQueueUseCase'),
    GetUserStatsUseCase: Symbol.for('GetUserStatsUseCase'),

    // Controllers
    ParkingController: Symbol.for('ParkingController'),
} as const;
