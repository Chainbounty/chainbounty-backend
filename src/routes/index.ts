import { Router } from 'express';
import authRoutes from './auth.routes';
import bountyRoutes from './bounty.routes';
import contributorRoutes from './contributor.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/bounties', bountyRoutes);
router.use('/contributors', contributorRoutes);

export default router;
