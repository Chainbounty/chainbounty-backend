import { Router } from 'express';
import { webhookController } from '../controllers/webhook.controller';

const router = Router();

// POST /webhooks/github — receive GitHub issue events
router.post('/github', webhookController.handleGitHubWebhook);

export default router;
