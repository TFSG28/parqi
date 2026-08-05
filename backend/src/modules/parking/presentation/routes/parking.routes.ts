import { Router } from 'express';
import { parkingController } from '../../../../shared/container/controllers';
import { validate } from '../../../../shared/middleware/validation.middleware';
import { authMiddleware } from '../../../../shared/middleware/auth.middleware';
import { requireRole } from '../../../../shared/middleware/role.middleware';
import { csrfMiddleware } from '../../../../shared/middleware/csrf.middleware';
import { CreateParkingSchema } from '../../application/dtos/CreateParking.dto';
import { ModerateParkingSchema } from '../../application/dtos/ModerateParking.dto';
import { ParkingIdParamsSchema } from '../../application/dtos/ParkingIdParams.dto';
import { QueryParkingSchema } from '../../application/dtos/QueryParking.dto';
import { UpdateParkingSchema } from '../../application/dtos/UpdateParking.dto';
import { VoteParkingSchema } from '../../application/dtos/VoteParking.dto';

const router = Router();

// Público
router.get('/', validate(QueryParkingSchema), parkingController.list);
router.get('/:id', validate(ParkingIdParamsSchema), parkingController.getById);

// Autenticado (comunidade)
router.post('/', authMiddleware, csrfMiddleware, validate(CreateParkingSchema), parkingController.create);
router.patch('/:id', authMiddleware, csrfMiddleware, validate(UpdateParkingSchema), parkingController.update);
router.delete('/:id', authMiddleware, csrfMiddleware, validate(ParkingIdParamsSchema), parkingController.remove);
router.post('/:id/vote', authMiddleware, csrfMiddleware, validate(VoteParkingSchema), parkingController.vote);

// Admin (moderação manual do modelo híbrido)
router.post(
    '/:id/moderate',
    authMiddleware,
    requireRole('ADMIN'),
    csrfMiddleware,
    validate(ModerateParkingSchema),
    parkingController.moderate
);

export default router;
