import { Router } from 'express';
import { contributorController } from '../controllers/contributor.controller';

const router = Router();

// GET /contributors/:id — get full profile by ID
router.get('/:id', contributorController.getContributorProfile);

// GET /contributors/:id/stats — get contributor stats
router.get('/:id/stats', contributorController.getContributorStats);

// GET /contributors/address/:address — get contributor by Stellar address
router.get('/address/:address', contributorController.getContributorByAddress);

export default router;
