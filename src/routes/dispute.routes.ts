import { Router } from 'express';
import { disputeController } from '../controllers/dispute.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// GET /disputes — get all disputes (optional: filter by resolved status)
router.get('/', disputeController.getAllDisputes);

// GET /disputes/bounty/:bountyId — get disputes for a specific bounty
router.get('/bounty/:bountyId', disputeController.getDisputesByBounty);

// POST /disputes/bounty/:bountyId — create a new dispute (requires auth)
router.post('/bounty/:bountyId', authenticate, disputeController.createDispute);

// POST /disputes/:id/resolve — resolve a dispute (requires auth)
router.post('/:id/resolve', authenticate, disputeController.resolveDispute);

export default router;
