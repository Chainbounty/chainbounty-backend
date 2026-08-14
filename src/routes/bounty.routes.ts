import { Router } from 'express';
import { bountyController } from '../controllers/bounty.controller';
import { bountyValidator } from '../validators/bounty.validator';

const router = Router();

// GET /bounties — list bounties with filters and pagination
router.get('/', bountyValidator.validateListBounties, bountyController.listBounties);

// POST /bounties — create a new bounty
router.post('/', bountyValidator.validateCreateBounty, bountyController.createBounty);

export default router;
