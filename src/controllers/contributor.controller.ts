import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

async function getContributorProfile(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const contributor = await prisma.contributor.findUnique({
      where: { id },
      include: {
        createdBounties: {
          select: {
            id: true,
            title: true,
            rewardAmount: true,
            rewardAsset: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        claimedBounties: {
          select: {
            id: true,
            title: true,
            rewardAmount: true,
            rewardAsset: true,
            status: true,
            claimedAt: true,
            approvedAt: true,
          },
          orderBy: { claimedAt: 'desc' },
          take: 10,
        },
        _count: {
          select: {
            createdBounties: true,
            claimedBounties: true,
            submissions: true,
            disputes: true,
          },
        },
      },
    });

    if (!contributor) {
      res.status(404).json({ error: 'Contributor not found' });
      return;
    }

    res.status(200).json({ data: contributor });
  } catch (error) {
    console.error('getContributorProfile error:', error);
    res.status(500).json({ error: 'Failed to fetch contributor profile' });
  }
}

async function getContributorByAddress(req: Request, res: Response): Promise<void> {
  try {
    const { address } = req.params;

    const contributor = await prisma.contributor.findUnique({
      where: { stellarAddress: address },
      include: {
        _count: {
          select: {
            createdBounties: true,
            claimedBounties: true,
            submissions: true,
            disputes: true,
          },
        },
      },
    });

    if (!contributor) {
      res.status(404).json({ error: 'Contributor not found' });
      return;
    }

    res.status(200).json({ data: contributor });
  } catch (error) {
    console.error('getContributorByAddress error:', error);
    res.status(500).json({ error: 'Failed to fetch contributor' });
  }
}

async function getContributorStats(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const contributor = await prisma.contributor.findUnique({
      where: { id },
    });

    if (!contributor) {
      res.status(404).json({ error: 'Contributor not found' });
      return;
    }

    // Compute additional stats
    const [activeBounties, completedBounties, pendingSubmissions, totalDisputes] =
      await Promise.all([
        prisma.bounty.count({
          where: {
            claimantId: id,
            status: { in: ['CLAIMED', 'SUBMITTED'] },
          },
        }),
        prisma.bounty.count({
          where: {
            claimantId: id,
            status: 'APPROVED',
          },
        }),
        prisma.submission.count({
          where: {
            contributorId: id,
            bounty: { status: 'SUBMITTED' },
          },
        }),
        prisma.dispute.count({
          where: { raisedById: id },
        }),
      ]);

    const stats = {
      profile: {
        id: contributor.id,
        stellarAddress: contributor.stellarAddress,
        githubUsername: contributor.githubUsername,
        displayName: contributor.displayName,
        avatarUrl: contributor.avatarUrl,
        reputationScore: contributor.reputationScore,
      },
      earnings: {
        totalEarned: contributor.totalEarned.toString(),
        bountiesCompleted: contributor.bountiesCompleted,
      },
      activity: {
        activeBounties,
        completedBounties,
        pendingSubmissions,
        totalDisputes,
      },
    };

    res.status(200).json({ data: stats });
  } catch (error) {
    console.error('getContributorStats error:', error);
    res.status(500).json({ error: 'Failed to fetch contributor stats' });
  }
}

export const contributorController = {
  getContributorProfile,
  getContributorByAddress,
  getContributorStats,
};
