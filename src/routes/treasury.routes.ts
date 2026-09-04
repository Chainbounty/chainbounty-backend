import { Router } from 'express';
import { treasuryController } from '../controllers/treasury.controller';

const router = Router();

// GET /treasury/stats — get treasury summary stats
router.get('/stats', treasuryController.getTreasuryStats);

// GET /treasury/fees — get platform fees with filters
router.get('/fees', treasuryController.getPlatformFees);

export default router;
