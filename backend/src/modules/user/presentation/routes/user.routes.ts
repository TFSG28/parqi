import { Router } from 'express';
import { userController } from '../../../../shared/container/controllers';
import { validate } from '../../../../shared/middleware/validation.middleware';
import { CreateUserSchema } from '../../application/dtos/CreateUser.dto';

const router = Router();

router.post('/', validate(CreateUserSchema), userController.create);

export default router;
