import { Router } from 'express';
import { bountyController } from '../controllers/bounty.controller';
import { bountyValidator } from '../validators/bounty.validator';

const router = Router();

// GET /bounties — list bounties with filters and pagination
router.get('/', bountyValidator.validateListBounties, bountyController.listBounties);

// POST /bounties — create a new bounty
router.post('/', bountyValidator.validateCreateBounty, bountyController.createBounty);

// GET /bounties/:id — get a single bounty by ID
router.get('/:id', bountyController.getBountyById);

// POST /bounties/:id/claim — claim a bounty
router.post('/:id/claim', bountyController.claimBounty);

// POST /bounties/:id/submit — submit work for a claimed bounty
router.post('/:id/submit', bountyController.submitBounty);

export default router;
