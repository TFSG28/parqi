import { container } from 'tsyringe';
import { PARKING_TOKENS } from '../tokens/parking.tokens';

// Repositories
import { ParkingRepository } from '../../../modules/parking/infrastructure/repositories/Parking.repository';

// Services
import { TrustCalculator } from '../../../modules/parking/infrastructure/services/TrustCalculator.service';
import { OverpassImporter } from '../../../modules/parking/infrastructure/services/OverpassImporter.service';
import { GeoapifyImporter } from '../../../modules/parking/infrastructure/services/GeoapifyImporter.service';
import { CsvImporter } from '../../../modules/parking/infrastructure/services/CsvImporter.service';

// Use Cases
import { CreateParkingUseCase } from '../../../modules/parking/application/usecases/CreateParking.usecase';
import { UpdateParkingUseCase } from '../../../modules/parking/application/usecases/UpdateParking.usecase';
import { ListParkingUseCase } from '../../../modules/parking/application/usecases/ListParking.usecase';
import { GetParkingUseCase } from '../../../modules/parking/application/usecases/GetParking.usecase';
import { VoteParkingUseCase } from '../../../modules/parking/application/usecases/VoteParking.usecase';
import { ModerateParkingUseCase } from '../../../modules/parking/application/usecases/ModerateParking.usecase';
import { DeleteParkingUseCase } from '../../../modules/parking/application/usecases/DeleteParking.usecase';

// Controllers
import { ParkingController } from '../../../modules/parking/presentation/controllers/parking.controller';

export function setupParkingContainer() {
    // Services & Repositories (Singleton)
    container.registerSingleton(PARKING_TOKENS.ITrustCalculator, TrustCalculator);
    container.registerSingleton(PARKING_TOKENS.IParkingRepository, ParkingRepository);
    container.registerSingleton(PARKING_TOKENS.IOverpassImporter, OverpassImporter);
    container.registerSingleton(PARKING_TOKENS.IGeoapifyImporter, GeoapifyImporter);
    container.registerSingleton(PARKING_TOKENS.ICsvImporter, CsvImporter);

    // Use Cases (Transient)
    container.register(PARKING_TOKENS.CreateParkingUseCase, CreateParkingUseCase);
    container.register(PARKING_TOKENS.UpdateParkingUseCase, UpdateParkingUseCase);
    container.register(PARKING_TOKENS.ListParkingUseCase, ListParkingUseCase);
    container.register(PARKING_TOKENS.GetParkingUseCase, GetParkingUseCase);
    container.register(PARKING_TOKENS.VoteParkingUseCase, VoteParkingUseCase);
    container.register(PARKING_TOKENS.ModerateParkingUseCase, ModerateParkingUseCase);
    container.register(PARKING_TOKENS.DeleteParkingUseCase, DeleteParkingUseCase);

    // Controller (Transient)
    container.register(PARKING_TOKENS.ParkingController, ParkingController);
}
