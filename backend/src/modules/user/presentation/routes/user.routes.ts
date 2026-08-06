import { Router } from 'express';
import { userController, parkingController } from '../../../../shared/container/controllers';
import { validate } from '../../../../shared/middleware/validation.middleware';
import { authMiddleware } from '../../../../shared/middleware/auth.middleware';
import { CreateUserSchema } from '../../application/dtos/CreateUser.dto';

const router = Router();

router.post('/', validate(CreateUserSchema), userController.create);

// Estatísticas de contribuições do utilizador autenticado
router.get('/me/stats', authMiddleware, parkingController.myStats);

export default router;
