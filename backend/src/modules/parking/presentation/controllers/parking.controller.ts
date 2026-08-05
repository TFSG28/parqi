import { Request, Response } from 'express';
import { inject, injectable } from 'tsyringe';
import { PARKING_TOKENS } from '../../../../shared/container/tokens/parking.tokens';
import { CreateParkingUseCase } from '../../application/usecases/CreateParking.usecase';
import { DeleteParkingUseCase } from '../../application/usecases/DeleteParking.usecase';
import { GetParkingUseCase } from '../../application/usecases/GetParking.usecase';
import { ListParkingUseCase } from '../../application/usecases/ListParking.usecase';
import { ModerateParkingUseCase } from '../../application/usecases/ModerateParking.usecase';
import { UpdateParkingUseCase } from '../../application/usecases/UpdateParking.usecase';
import { VoteParkingUseCase } from '../../application/usecases/VoteParking.usecase';
import { asyncHandler } from '../../../../shared/utils/async-handler';
import { ApiResponse } from '../../../../shared/utils/api-response';

/** Express 5 pode tipar params como string | string[] - normaliza para string. */
function routeId(req: Request): string {
    const id = req.params.id;
    return Array.isArray(id) ? id[0] : id;
}

@injectable()
export class ParkingController {
    constructor(
        @inject(PARKING_TOKENS.CreateParkingUseCase)
        private readonly createParkingUseCase: CreateParkingUseCase,
        @inject(PARKING_TOKENS.ListParkingUseCase)
        private readonly listParkingUseCase: ListParkingUseCase,
        @inject(PARKING_TOKENS.GetParkingUseCase)
        private readonly getParkingUseCase: GetParkingUseCase,
        @inject(PARKING_TOKENS.UpdateParkingUseCase)
        private readonly updateParkingUseCase: UpdateParkingUseCase,
        @inject(PARKING_TOKENS.DeleteParkingUseCase)
        private readonly deleteParkingUseCase: DeleteParkingUseCase,
        @inject(PARKING_TOKENS.VoteParkingUseCase)
        private readonly voteParkingUseCase: VoteParkingUseCase,
        @inject(PARKING_TOKENS.ModerateParkingUseCase)
        private readonly moderateParkingUseCase: ModerateParkingUseCase
    ) {}

    list = asyncHandler(async (req: Request, res: Response) => {
        const { bbox, type } = req.query as { bbox?: string; type?: string };
        const page = Number(req.query.page ?? 1);
        const limit = Number(req.query.limit ?? 20);

        const result = await this.listParkingUseCase.execute({ bbox, parkingType: type, page, limit });
        return ApiResponse.paginated(res, result.items, page, limit, result.total);
    });

    getById = asyncHandler(async (req: Request, res: Response) => {
        const parking = await this.getParkingUseCase.execute({
            parkingSpotId: routeId(req),
            userId: req.user?.userId,
            userRole: req.user?.role,
        });
        return ApiResponse.success(res, parking);
    });

    create = asyncHandler(async (req: Request, res: Response) => {
        const parking = await this.createParkingUseCase.execute({
            ...req.body,
            userId: req.user!.userId,
        });
        return ApiResponse.created(res, parking);
    });

    update = asyncHandler(async (req: Request, res: Response) => {
        const parking = await this.updateParkingUseCase.execute({
            parkingSpotId: routeId(req),
            userId: req.user!.userId,
            userRole: req.user?.role,
            data: req.body,
        });
        return ApiResponse.success(res, parking);
    });

    remove = asyncHandler(async (req: Request, res: Response) => {
        await this.deleteParkingUseCase.execute({
            parkingSpotId: routeId(req),
            userId: req.user!.userId,
            userRole: req.user?.role,
        });
        return ApiResponse.noContent(res);
    });

    vote = asyncHandler(async (req: Request, res: Response) => {
        const parking = await this.voteParkingUseCase.execute({
            parkingSpotId: routeId(req),
            userId: req.user!.userId,
            value: req.body.value,
            reason: req.body.reason,
        });
        return ApiResponse.success(res, parking);
    });

    moderate = asyncHandler(async (req: Request, res: Response) => {
        const parking = await this.moderateParkingUseCase.execute({
            parkingSpotId: routeId(req),
            moderatorId: req.user!.userId,
            action: req.body.action,
            reason: req.body.reason,
        });
        return ApiResponse.success(res, parking);
    });
}
