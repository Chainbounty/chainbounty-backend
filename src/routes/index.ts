import { Router } from 'express';
import authRoutes from './auth.routes';
import bountyRoutes from './bounty.routes';
import contributorRoutes from './contributor.routes';
import notificationRoutes from './notification.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/bounties', bountyRoutes);
router.use('/contributors', contributorRoutes);
router.use('/notifications', notificationRoutes);

export default router;
