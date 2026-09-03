import { Router } from 'express';
import { authController } from '../controllers/auth.controller';

const router = Router();

// POST /auth/challenge — get a nonce to sign
router.post('/challenge', authController.getChallenge);

// POST /auth/verify — verify signed nonce and get JWT
router.post('/verify', authController.verifyChallenge);

export default router;
