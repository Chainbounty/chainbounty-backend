import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { verifyGitHubSignature } from '../lib/github';
import type { GitHubIssueEvent } from '../types/github';

async function handleGitHubWebhook(req: Request, res: Response): Promise<void> {
  try {
    const secret = process.env.GITHUB_WEBHOOK_SECRET ?? '';
    const signature = req.headers['x-hub-signature-256'] as string | undefined;
    const event = req.headers['x-github-event'] as string | undefined;
    const deliveryId = req.headers['x-github-delivery'] as string | undefined;

    // Verify signature when secret is configured
    if (secret) {
      const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
      if (!rawBody || !verifyGitHubSignature(rawBody, signature, secret)) {
        res.status(401).json({ error: 'Invalid webhook signature' });
        return;
      }
    }

    // Only handle issue events
    if (event !== 'issues') {
      res.status(200).json({ message: `Event ${event ?? 'unknown'} ignored` });
      return;
    }

    const payload = req.body as GitHubIssueEvent;

    // Store raw delivery for audit / replay
    await prisma.webhookDelivery.create({
      data: {
        eventType: `github.${event}.${payload.action}`,
        payload: payload as object,
        source: 'github',
      },
    });

    // Dispatch to action handler
    await handleIssueEvent(payload);

    res.status(200).json({
      message: 'Webhook processed',
      deliveryId: deliveryId ?? null,
      action: payload.action,
    });
  } catch (error) {
    console.error('handleGitHubWebhook error:', error);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
}

async function handleIssueEvent(payload: GitHubIssueEvent): Promise<void> {
  const { action, issue, repository } = payload;
  const issueUrl = issue.html_url;
  const repoOwner = repository.owner.login;
  const repoName = repository.name;
  const labelNames = issue.labels.map((l) => l.name);

  switch (action) {
    case 'opened':
    case 'reopened': {
      // If a bounty for this issue URL already exists, skip
      const existing = await prisma.bounty.findUnique({ where: { githubIssueUrl: issueUrl } });
      if (!existing) break;
      // Re-open a cancelled/rejected bounty if it was synced from this issue
      if (['CANCELLED', 'REJECTED'].includes(existing.status)) {
        await prisma.bounty.update({
          where: { id: existing.id },
          data: { status: 'OPEN', githubLabels: labelNames },
        });
      }
      break;
    }

    case 'closed': {
      const bounty = await prisma.bounty.findUnique({ where: { githubIssueUrl: issueUrl } });
      if (bounty && bounty.status === 'OPEN') {
        await prisma.bounty.update({
          where: { id: bounty.id },
          data: { status: 'CANCELLED', githubLabels: labelNames },
        });
      }
      break;
    }

    case 'edited': {
      const bounty = await prisma.bounty.findUnique({ where: { githubIssueUrl: issueUrl } });
      if (bounty) {
        await prisma.bounty.update({
          where: { id: bounty.id },
          data: {
            title: issue.title,
            description: issue.body ?? bounty.description,
            githubLabels: labelNames,
          },
        });
      }
      break;
    }

    case 'labeled':
    case 'unlabeled': {
      const bounty = await prisma.bounty.findUnique({ where: { githubIssueUrl: issueUrl } });
      if (bounty) {
        await prisma.bounty.update({
          where: { id: bounty.id },
          data: { githubLabels: labelNames },
        });
      }
      break;
    }

    default:
      // Unhandled actions are silently ignored
      console.info(`Unhandled GitHub issue action: ${action} for ${repoOwner}/${repoName}#${issue.number}`);
  }
}

export const webhookController = {
  handleGitHubWebhook,
};
