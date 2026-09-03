import type { Response } from 'express';
import { prisma } from '../lib/prisma';
import type { AuthRequest } from '../types/auth';
import { notifyBountyDisputed } from '../lib/notificationService';

async function createDispute(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.contributor) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { bountyId } = req.params;
    const { reason, evidence } = req.body as { reason?: string; evidence?: string };

    // Validate input
    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      res.status(400).json({
        error: 'Validation failed',
        details: [{ field: 'reason', message: 'Dispute reason is required' }],
      });
      return;
    }

    if (reason.trim().length < 20) {
      res.status(400).json({
        error: 'Validation failed',
        details: [{ field: 'reason', message: 'Dispute reason must be at least 20 characters' }],
      });
      return;
    }

    const bounty = await prisma.bounty.findUnique({ where: { id: bountyId } });

    if (!bounty) {
      res.status(404).json({ error: 'Bounty not found' });
      return;
    }

    // Only claimant or creator can raise disputes
    if (bounty.creatorId !== req.contributor.id && bounty.claimantId !== req.contributor.id) {
      res.status(403).json({ error: 'Only bounty creator or claimant can raise a dispute' });
      return;
    }

    // Can only dispute bounties in certain states
    const disputeableStatuses = ['CLAIMED', 'SUBMITTED', 'APPROVED', 'REJECTED'];
    if (!disputeableStatuses.includes(bounty.status)) {
      res.status(409).json({
        error: 'Bounty cannot be disputed',
        detail: `Bounty is currently ${bounty.status}. Only ${disputeableStatuses.join(', ')} bounties can be disputed.`,
      });
      return;
    }

    // Create dispute and update bounty status
    const [dispute, updatedBounty] = await prisma.$transaction([
      prisma.dispute.create({
        data: {
          bountyId,
          raisedById: req.contributor.id,
          reason: reason.trim(),
          evidence: evidence?.trim() ?? null,
        },
        include: {
          raisedBy: {
            select: {
              id: true,
              stellarAddress: true,
              githubUsername: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      }),
      prisma.bounty.update({
        where: { id: bountyId },
        data: { status: 'DISPUTED' },
      }),
    ]);

    // Notify the other party
    const recipientId =
      req.contributor.id === bounty.creatorId ? bounty.claimantId : bounty.creatorId;

    if (recipientId) {
      void notifyBountyDisputed(
        bounty.id,
        bounty.title,
        recipientId,
        dispute.raisedBy.displayName ?? dispute.raisedBy.stellarAddress,
      );
    }

    res.status(201).json({ data: { dispute, bounty: updatedBounty } });
  } catch (error) {
    console.error('createDispute error:', error);
    res.status(500).json({ error: 'Failed to create dispute' });
  }
}

async function getDisputesByBounty(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { bountyId } = req.params;

    const disputes = await prisma.dispute.findMany({
      where: { bountyId },
      orderBy: { createdAt: 'desc' },
      include: {
        raisedBy: {
          select: {
            id: true,
            stellarAddress: true,
            githubUsername: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    res.status(200).json({ data: disputes });
  } catch (error) {
    console.error('getDisputesByBounty error:', error);
    res.status(500).json({ error: 'Failed to fetch disputes' });
  }
}

async function resolveDispute(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.contributor) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { id } = req.params;
    const { resolution } = req.body as { resolution?: string };

    if (!resolution || typeof resolution !== 'string' || resolution.trim().length === 0) {
      res.status(400).json({
        error: 'Validation failed',
        details: [{ field: 'resolution', message: 'Resolution is required' }],
      });
      return;
    }

    const dispute = await prisma.dispute.findUnique({
      where: { id },
      include: { bounty: true },
    });

    if (!dispute) {
      res.status(404).json({ error: 'Dispute not found' });
      return;
    }

    // Only bounty creator can resolve disputes (in production, this might be a DAO vote or arbiter)
    if (dispute.bounty.creatorId !== req.contributor.id) {
      res.status(403).json({
        error: 'Only the bounty creator can resolve disputes',
        detail: 'In production, this would be handled by arbitration or DAO governance',
      });
      return;
    }

    if (dispute.resolved) {
      res.status(409).json({ error: 'Dispute has already been resolved' });
      return;
    }

    const resolved = await prisma.dispute.update({
      where: { id },
      data: {
        resolved: true,
        resolution: resolution.trim(),
        resolvedAt: new Date(),
      },
      include: {
        raisedBy: {
          select: {
            id: true,
            stellarAddress: true,
            githubUsername: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Optionally update bounty status (e.g., revert to CLAIMED or keep DISPUTED)
    // For now, we keep it DISPUTED until manually changed

    res.status(200).json({ data: resolved });
  } catch (error) {
    console.error('resolveDispute error:', error);
    res.status(500).json({ error: 'Failed to resolve dispute' });
  }
}

async function getAllDisputes(req: AuthRequest, res: Response): Promise<void> {
  try {
    const query = req.query as Record<string, string | undefined>;

    const resolved = query.resolved === 'true' ? true : query.resolved === 'false' ? false : undefined;
    const limit = query.limit ? parseInt(query.limit, 10) : 20;
    const page = query.page ? parseInt(query.page, 10) : 1;

    if (limit < 1 || limit > 100) {
      res.status(400).json({
        error: 'Validation failed',
        details: [{ field: 'limit', message: 'limit must be between 1 and 100' }],
      });
      return;
    }

    const skip = (page - 1) * limit;

    const [disputes, total] = await Promise.all([
      prisma.dispute.findMany({
        where: resolved !== undefined ? { resolved } : {},
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          bounty: {
            select: {
              id: true,
              title: true,
              status: true,
              rewardAmount: true,
              rewardAsset: true,
            },
          },
          raisedBy: {
            select: {
              id: true,
              stellarAddress: true,
              githubUsername: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      }),
      prisma.dispute.count({
        where: resolved !== undefined ? { resolved } : {},
      }),
    ]);

    res.status(200).json({
      data: disputes,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('getAllDisputes error:', error);
    res.status(500).json({ error: 'Failed to fetch disputes' });
  }
}

export const disputeController = {
  createDispute,
  getDisputesByBounty,
  resolveDispute,
  getAllDisputes,
};
