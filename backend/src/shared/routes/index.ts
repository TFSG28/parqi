import { Router } from 'express';
import authRoutes from '../../modules/auth/presentation/routes/auth.routes';
import userRoutes from '../../modules/user/presentation/routes/user.routes';
import parkingRoutes from '../../modules/parking/presentation/routes/parking.routes';

const router = Router();

router.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});

router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/parking', parkingRoutes);

router.use((req, res) => {
    res.status(404).json({
        message: 'Route not found',
        error: 'Not found',
        path: req.path,
    });
});

export default router;
