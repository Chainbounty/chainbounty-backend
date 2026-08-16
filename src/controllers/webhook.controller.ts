import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { verifyGitHubSignature } from '../lib/github';
import { resolveBountyStatusFromLabels, isBountyStatusLabel } from '../lib/labelSync';
import type { GitHubIssueEvent } from '../types/github';

async function handleGitHubWebhook(req: Request, res: Response): Promise<void> {
  try {
    const secret = process.env.GITHUB_WEBHOOK_SECRET ?? '';
    const signature = req.headers['x-hub-signature-256'] as string | undefined;
    const event = req.headers['x-github-event'] as string | undefined;
    const deliveryId = req.headers['x-github-delivery'] as string | undefined;

    // Verify signature when a secret is configured
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
      const existing = await prisma.bounty.findUnique({ where: { githubIssueUrl: issueUrl } });
      if (!existing) break;

      // If it was closed/cancelled, reopen it
      const targetStatus = ['CANCELLED', 'REJECTED'].includes(existing.status) ? 'OPEN' : undefined;
      const labelStatus = resolveBountyStatusFromLabels(labelNames);

      await prisma.bounty.update({
        where: { id: existing.id },
        data: {
          status: labelStatus ?? targetStatus ?? existing.status,
          githubLabels: labelNames,
        },
      });
      break;
    }

    case 'closed': {
      const bounty = await prisma.bounty.findUnique({ where: { githubIssueUrl: issueUrl } });
      if (!bounty) break;

      // Only cancel if not already in a terminal state
      const terminalStatuses = ['APPROVED', 'CANCELLED'];
      if (!terminalStatuses.includes(bounty.status)) {
        await prisma.bounty.update({
          where: { id: bounty.id },
          data: { status: 'CANCELLED', githubLabels: labelNames },
        });
      }
      break;
    }

    case 'edited': {
      const bounty = await prisma.bounty.findUnique({ where: { githubIssueUrl: issueUrl } });
      if (!bounty) break;

      await prisma.bounty.update({
        where: { id: bounty.id },
        data: {
          title: issue.title,
          description: issue.body ?? bounty.description,
          githubLabels: labelNames,
        },
      });
      break;
    }

    case 'labeled': {
      const bounty = await prisma.bounty.findUnique({ where: { githubIssueUrl: issueUrl } });
      if (!bounty) break;

      // Only act if the newly added label is a bounty-status label
      const addedLabel = payload.label?.name ?? '';
      if (!isBountyStatusLabel(addedLabel)) {
        // Still persist the updated label list
        await prisma.bounty.update({
          where: { id: bounty.id },
          data: { githubLabels: labelNames },
        });
        break;
      }

      const resolvedStatus = resolveBountyStatusFromLabels(labelNames);
      await prisma.bounty.update({
        where: { id: bounty.id },
        data: {
          status: resolvedStatus ?? bounty.status,
          githubLabels: labelNames,
        },
      });
      break;
    }

    case 'unlabeled': {
      const bounty = await prisma.bounty.findUnique({ where: { githubIssueUrl: issueUrl } });
      if (!bounty) break;

      // Re-resolve status from the remaining labels
      const resolvedStatus = resolveBountyStatusFromLabels(labelNames);
      await prisma.bounty.update({
        where: { id: bounty.id },
        data: {
          // Fall back to OPEN if all bounty-status labels have been removed
          status: resolvedStatus ?? 'OPEN',
          githubLabels: labelNames,
        },
      });
      break;
    }

    default:
      console.info(
        `Unhandled GitHub issue action: ${action} for ${repoOwner}/${repoName}#${issue.number}`,
      );
  }
}

export const webhookController = {
  handleGitHubWebhook,
};
