import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

async function getTreasuryStats(_req: Request, res: Response): Promise<void> {
  try {
    const [totalFeesCollected, totalFeesPending, feesByAsset, recentFees] = await Promise.all([
      // Total collected fees
      prisma.platformFee.aggregate({
        where: { collected: true },
        _sum: { amount: true },
        _count: true,
      }),

      // Total pending fees
      prisma.platformFee.aggregate({
        where: { collected: false },
        _sum: { amount: true },
        _count: true,
      }),

      // Fees by asset
      prisma.platformFee.groupBy({
        by: ['asset', 'collected'],
        _sum: { amount: true },
        _count: true,
      }),

      // Recent fee records
      prisma.platformFee.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          amount: true,
          asset: true,
          collected: true,
          collectedAt: true,
          txHash: true,
          createdAt: true,
          bountyId: true,
        },
      }),
    ]);

    // Group by asset
    const assetBreakdown: Record<string, { collected: string; pending: string }> = {};

    feesByAsset.forEach((group) => {
      if (!assetBreakdown[group.asset]) {
        assetBreakdown[group.asset] = { collected: '0', pending: '0' };
      }

      if (group.collected) {
        assetBreakdown[group.asset].collected = group._sum.amount?.toString() ?? '0';
      } else {
        assetBreakdown[group.asset].pending = group._sum.amount?.toString() ?? '0';
      }
    });

    const stats = {
      summary: {
        totalCollected: totalFeesCollected._sum.amount?.toString() ?? '0',
        totalPending: totalFeesPending._sum.amount?.toString() ?? '0',
        collectedCount: totalFeesCollected._count,
        pendingCount: totalFeesPending._count,
      },
      byAsset: assetBreakdown,
      recentFees: recentFees.map((fee) => ({
        ...fee,
        amount: fee.amount.toString(),
      })),
    };

    res.status(200).json({ data: stats });
  } catch (error) {
    console.error('getTreasuryStats error:', error);
    res.status(500).json({ error: 'Failed to fetch treasury stats' });
  }
}

async function getPlatformFees(req: Request, res: Response): Promise<void> {
  try {
    const query = req.query as Record<string, string | undefined>;

    const collected =
      query.collected === 'true' ? true : query.collected === 'false' ? false : undefined;
    const asset = query.asset;
    const limit = query.limit ? parseInt(query.limit, 10) : 50;
    const page = query.page ? parseInt(query.page, 10) : 1;

    if (limit < 1 || limit > 100) {
      res.status(400).json({
        error: 'Validation failed',
        details: [{ field: 'limit', message: 'limit must be between 1 and 100' }],
      });
      return;
    }

    const skip = (page - 1) * limit;

    const where = {
      ...(collected !== undefined ? { collected } : {}),
      ...(asset ? { asset } : {}),
    };

    const [fees, total] = await Promise.all([
      prisma.platformFee.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.platformFee.count({ where }),
    ]);

    res.status(200).json({
      data: fees.map((fee) => ({
        ...fee,
        amount: fee.amount.toString(),
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('getPlatformFees error:', error);
    res.status(500).json({ error: 'Failed to fetch platform fees' });
  }
}

export const treasuryController = {
  getTreasuryStats,
  getPlatformFees,
};
