import { Router } from 'express';
import bountyRoutes from './bounty.routes';

const router = Router();

router.use('/bounties', bountyRoutes);

export default router;
