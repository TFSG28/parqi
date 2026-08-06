import { container } from 'tsyringe';
import { PARKING_TOKENS } from '../tokens/parking.tokens';

// Repositories
import { ParkingRepository } from '../../../modules/parking/infrastructure/repositories/Parking.repository';
import { SuggestionRepository } from '../../../modules/parking/infrastructure/repositories/Suggestion.repository';

// Services
import { TrustCalculator } from '../../../modules/parking/infrastructure/services/TrustCalculator.service';
import { OverpassImporter } from '../../../modules/parking/infrastructure/services/OverpassImporter.service';
import { GeoapifyImporter } from '../../../modules/parking/infrastructure/services/GeoapifyImporter.service';
import { CsvImporter } from '../../../modules/parking/infrastructure/services/CsvImporter.service';
import { ReputationService } from '../../../modules/parking/infrastructure/services/Reputation.service';
import { RoadValidator } from '../../../modules/parking/infrastructure/services/RoadValidator.service';

// Use Cases
import { CreateParkingUseCase } from '../../../modules/parking/application/usecases/CreateParking.usecase';
import { UpdateParkingUseCase } from '../../../modules/parking/application/usecases/UpdateParking.usecase';
import { ListParkingUseCase } from '../../../modules/parking/application/usecases/ListParking.usecase';
import { GetParkingUseCase } from '../../../modules/parking/application/usecases/GetParking.usecase';
import { VoteParkingUseCase } from '../../../modules/parking/application/usecases/VoteParking.usecase';
import { ModerateParkingUseCase } from '../../../modules/parking/application/usecases/ModerateParking.usecase';
import { DeleteParkingUseCase } from '../../../modules/parking/application/usecases/DeleteParking.usecase';
import { SuggestParkingUseCase } from '../../../modules/parking/application/usecases/SuggestParking.usecase';
import { DecideSuggestionUseCase } from '../../../modules/parking/application/usecases/DecideSuggestion.usecase';
import { ListSuggestionsUseCase } from '../../../modules/parking/application/usecases/ListSuggestions.usecase';
import { ListModerationQueueUseCase } from '../../../modules/parking/application/usecases/ListModerationQueue.usecase';
import { GetUserStatsUseCase } from '../../../modules/parking/application/usecases/GetUserStats.usecase';

// Controllers
import { ParkingController } from '../../../modules/parking/presentation/controllers/parking.controller';

export function setupParkingContainer() {
    // Services & Repositories (Singleton)
    container.registerSingleton(PARKING_TOKENS.ITrustCalculator, TrustCalculator);
    container.registerSingleton(PARKING_TOKENS.IParkingRepository, ParkingRepository);
    container.registerSingleton(PARKING_TOKENS.ISuggestionRepository, SuggestionRepository);
    container.registerSingleton(PARKING_TOKENS.IOverpassImporter, OverpassImporter);
    container.registerSingleton(PARKING_TOKENS.IGeoapifyImporter, GeoapifyImporter);
    container.registerSingleton(PARKING_TOKENS.ICsvImporter, CsvImporter);
    container.registerSingleton(PARKING_TOKENS.IReputationService, ReputationService);
    container.registerSingleton(PARKING_TOKENS.IRoadValidator, RoadValidator);

    // Use Cases (Transient)
    container.register(PARKING_TOKENS.CreateParkingUseCase, CreateParkingUseCase);
    container.register(PARKING_TOKENS.UpdateParkingUseCase, UpdateParkingUseCase);
    container.register(PARKING_TOKENS.ListParkingUseCase, ListParkingUseCase);
    container.register(PARKING_TOKENS.GetParkingUseCase, GetParkingUseCase);
    container.register(PARKING_TOKENS.VoteParkingUseCase, VoteParkingUseCase);
    container.register(PARKING_TOKENS.ModerateParkingUseCase, ModerateParkingUseCase);
    container.register(PARKING_TOKENS.DeleteParkingUseCase, DeleteParkingUseCase);
    container.register(PARKING_TOKENS.SuggestParkingUseCase, SuggestParkingUseCase);
    container.register(PARKING_TOKENS.DecideSuggestionUseCase, DecideSuggestionUseCase);
    container.register(PARKING_TOKENS.ListSuggestionsUseCase, ListSuggestionsUseCase);
    container.register(PARKING_TOKENS.ListModerationQueueUseCase, ListModerationQueueUseCase);
    container.register(PARKING_TOKENS.GetUserStatsUseCase, GetUserStatsUseCase);

    // Controller (Transient)
    container.register(PARKING_TOKENS.ParkingController, ParkingController);
}
