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

async function getLeaderboard(req: Request, res: Response): Promise<void> {
  try {
    const query = req.query as Record<string, string | undefined>;

    const sortBy = (query.sortBy as 'reputation' | 'earnings' | 'completed') ?? 'reputation';
    const limit = query.limit ? parseInt(query.limit, 10) : 50;
    const page = query.page ? parseInt(query.page, 10) : 1;

    // Validate limits
    if (limit < 1 || limit > 100) {
      res.status(400).json({
        error: 'Validation failed',
        details: [{ field: 'limit', message: 'limit must be between 1 and 100' }],
      });
      return;
    }

    if (page < 1) {
      res.status(400).json({
        error: 'Validation failed',
        details: [{ field: 'page', message: 'page must be a positive integer' }],
      });
      return;
    }

    const skip = (page - 1) * limit;

    // Determine sort field
    let orderBy: Record<string, 'desc' | 'asc'> = { reputationScore: 'desc' };

    if (sortBy === 'earnings') {
      orderBy = { totalEarned: 'desc' };
    } else if (sortBy === 'completed') {
      orderBy = { bountiesCompleted: 'desc' };
    }

    const [contributors, total] = await Promise.all([
      prisma.contributor.findMany({
        where: {
          // Only include contributors who have completed at least one bounty
          bountiesCompleted: { gt: 0 },
        },
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          stellarAddress: true,
          githubUsername: true,
          displayName: true,
          avatarUrl: true,
          reputationScore: true,
          bountiesCompleted: true,
          totalEarned: true,
          _count: {
            select: {
              claimedBounties: true,
              submissions: true,
            },
          },
        },
      }),
      prisma.contributor.count({
        where: { bountiesCompleted: { gt: 0 } },
      }),
    ]);

    // Add rank to each contributor
    const leaderboard = contributors.map((contributor, index) => ({
      rank: skip + index + 1,
      ...contributor,
      totalEarned: contributor.totalEarned.toString(),
    }));

    res.status(200).json({
      data: leaderboard,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('getLeaderboard error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
}

export const contributorController = {
  getContributorProfile,
  getContributorByAddress,
  getContributorStats,
  getLeaderboard,
};
