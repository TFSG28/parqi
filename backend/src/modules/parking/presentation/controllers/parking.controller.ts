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
import { SuggestParkingUseCase } from '../../application/usecases/SuggestParking.usecase';
import { DecideSuggestionUseCase } from '../../application/usecases/DecideSuggestion.usecase';
import { ListSuggestionsUseCase } from '../../application/usecases/ListSuggestions.usecase';
import { ListModerationQueueUseCase } from '../../application/usecases/ListModerationQueue.usecase';
import { GetUserStatsUseCase } from '../../application/usecases/GetUserStats.usecase';
import { asyncHandler } from '../../../../shared/utils/async-handler';
import { ApiResponse } from '../../../../shared/utils/api-response';

/** Express 5 pode tipar params como string | string[] - normaliza para string. */
function routeId(req: Request): string {
    const id = req.params.id;
    return Array.isArray(id) ? id[0] : id;
}

/** Paginação saneada: impede limit=999999 de despejar a tabela inteira. */
function pageParams(req: Request): { page: number; limit: number } {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    return { page, limit };
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
        private readonly moderateParkingUseCase: ModerateParkingUseCase,
        @inject(PARKING_TOKENS.SuggestParkingUseCase)
        private readonly suggestParkingUseCase: SuggestParkingUseCase,
        @inject(PARKING_TOKENS.DecideSuggestionUseCase)
        private readonly decideSuggestionUseCase: DecideSuggestionUseCase,
        @inject(PARKING_TOKENS.ListSuggestionsUseCase)
        private readonly listSuggestionsUseCase: ListSuggestionsUseCase,
        @inject(PARKING_TOKENS.ListModerationQueueUseCase)
        private readonly listModerationQueueUseCase: ListModerationQueueUseCase,
        @inject(PARKING_TOKENS.GetUserStatsUseCase)
        private readonly getUserStatsUseCase: GetUserStatsUseCase
    ) {}

    list = asyncHandler(async (req: Request, res: Response) => {
        const { bbox, type, q } = req.query as { bbox?: string; type?: string; q?: string };
        const { page, limit } = pageParams(req);

        const result = await this.listParkingUseCase.execute({ bbox, parkingType: type, q, page, limit });
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
        // Honeypot anti-bot: campo escondido "website" que bots preenchem.
        // Respondemos 201 falso sem guardar nada.
        if (typeof req.body.website === 'string' && req.body.website.trim().length > 0) {
            return ApiResponse.created(res, { status: 'PENDING', honeypot: true });
        }

        const parking = await this.createParkingUseCase.execute({
            ...req.body,
            userId: req.user!.userId,
            userRole: req.user?.role,
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
            userRole: req.user?.role,
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

    /** Complementar informação de um parque (híbrido: aplica já ou entra na fila). */
    suggest = asyncHandler(async (req: Request, res: Response) => {
        const result = await this.suggestParkingUseCase.execute({
            parkingSpotId: routeId(req),
            userId: req.user!.userId,
            userRole: req.user?.role,
            data: req.body,
        });
        return ApiResponse.created(res, result);
    });

    /** Fila de moderação: contribuições de contas novas a decidir pelo admin. */
    moderationQueue = asyncHandler(async (req: Request, res: Response) => {
        const { page, limit } = pageParams(req);
        const result = await this.listModerationQueueUseCase.execute({ page, limit });
        return ApiResponse.paginated(res, result.items, page, limit, result.total);
    });

    listSuggestions = asyncHandler(async (req: Request, res: Response) => {
        const { page, limit } = pageParams(req);
        const status = typeof req.query.status === 'string' ? req.query.status : 'PENDING';
        const result = await this.listSuggestionsUseCase.execute({ status, page, limit });
        return ApiResponse.paginated(res, result.items, page, limit, result.total);
    });

    decideSuggestion = asyncHandler(async (req: Request, res: Response) => {
        const result = await this.decideSuggestionUseCase.execute({
            suggestionId: routeId(req),
            moderatorId: req.user!.userId,
            action: req.body.action,
            reason: req.body.reason,
        });
        return ApiResponse.success(res, result);
    });

    /** Estatísticas de contribuições do utilizador autenticado. */
    myStats = asyncHandler(async (req: Request, res: Response) => {
        const stats = await this.getUserStatsUseCase.execute({ userId: req.user!.userId });
        return ApiResponse.success(res, stats);
    });
}
