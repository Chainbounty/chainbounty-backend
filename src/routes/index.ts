import { Router } from 'express';
import bountyRoutes from './bounty.routes';
import contributorRoutes from './contributor.routes';

const router = Router();

router.use('/bounties', bountyRoutes);
router.use('/contributors', contributorRoutes);

export default router;
