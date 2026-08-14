import { Router } from 'express';
import { bountyController } from '../controllers/bounty.controller';
import { bountyValidator } from '../validators/bounty.validator';

const router = Router();

// POST /bounties — create a new bounty
router.post('/', bountyValidator.validateCreateBounty, bountyController.createBounty);

export default router;
