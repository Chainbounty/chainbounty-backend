import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import type { CreateBountyInput, BountyFilters } from '../types/bounty';
import { BountyDifficulty, Prisma } from '@prisma/client';

// Shared creator select shape
const creatorSelect = {
  id: true,
  stellarAddress: true,
  githubUsername: true,
  displayName: true,
  avatarUrl: true,
};

async function createBounty(req: Request, res: Response): Promise<void> {
  try {
    const body = req.body as CreateBountyInput;

    // Placeholder creator until JWT auth lands in step 15
    const DEV_STELLAR = 'GDEV0000000000000000000000000000000000000000000000000000';
    const creator = await prisma.contributor.upsert({
      where: { stellarAddress: DEV_STELLAR },
      update: {},
      create: { stellarAddress: DEV_STELLAR, displayName: 'Dev Placeholder' },
    });

    const bounty = await prisma.bounty.create({
      data: {
        title: body.title.trim(),
        description: body.description.trim(),
        rewardAmount: body.rewardAmount,
        rewardAsset: body.rewardAsset ?? 'XLM',
        difficulty: body.difficulty ?? BountyDifficulty.MEDIUM,
        githubIssueUrl: body.githubIssueUrl ?? null,
        githubIssueNumber: body.githubIssueNumber ?? null,
        githubRepoOwner: body.githubRepoOwner ?? null,
        githubRepoName: body.githubRepoName ?? null,
        contractAddress: body.contractAddress ?? null,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        creatorId: creator.id,
        milestones:
          body.milestones && body.milestones.length > 0
            ? {
                create: body.milestones.map((m) => ({
                  title: m.title,
                  description: m.description ?? null,
                  rewardPercent: m.rewardPercent,
                })),
              }
            : undefined,
      },
      include: {
        creator: { select: creatorSelect },
        milestones: true,
      },
    });

    res.status(201).json({ data: bounty });
  } catch (error) {
    console.error('createBounty error:', error);
    res.status(500).json({ error: 'Failed to create bounty' });
  }
}

async function listBounties(req: Request, res: Response): Promise<void> {
  try {
    const query = req.query as Record<string, string | undefined>;

    const filters: BountyFilters = {
      status: query.status as BountyFilters['status'],
      difficulty: query.difficulty as BountyFilters['difficulty'],
      creatorId: query.creatorId,
      claimantId: query.claimantId,
      githubRepoOwner: query.githubRepoOwner,
      githubRepoName: query.githubRepoName,
      minReward: query.minReward !== undefined ? Number(query.minReward) : undefined,
      maxReward: query.maxReward !== undefined ? Number(query.maxReward) : undefined,
      page: query.page !== undefined ? parseInt(query.page, 10) : 1,
      limit: query.limit !== undefined ? parseInt(query.limit, 10) : 20,
      sortBy: (query.sortBy as BountyFilters['sortBy']) ?? 'createdAt',
      sortOrder: (query.sortOrder as BountyFilters['sortOrder']) ?? 'desc',
    };

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.BountyWhereInput = {};
    if (filters.status) where.status = filters.status;
    if (filters.difficulty) where.difficulty = filters.difficulty;
    if (filters.creatorId) where.creatorId = filters.creatorId;
    if (filters.claimantId) where.claimantId = filters.claimantId;
    if (filters.githubRepoOwner) where.githubRepoOwner = filters.githubRepoOwner;
    if (filters.githubRepoName) where.githubRepoName = filters.githubRepoName;
    if (filters.minReward !== undefined || filters.maxReward !== undefined) {
      where.rewardAmount = {};
      if (filters.minReward !== undefined) where.rewardAmount.gte = filters.minReward;
      if (filters.maxReward !== undefined) where.rewardAmount.lte = filters.maxReward;
    }

    // Build orderBy
    const orderBy: Prisma.BountyOrderByWithRelationInput =
      filters.sortBy === 'rewardAmount'
        ? { rewardAmount: filters.sortOrder ?? 'desc' }
        : { createdAt: filters.sortOrder ?? 'desc' };

    const [bounties, total] = await Promise.all([
      prisma.bounty.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          creator: { select: creatorSelect },
          claimant: { select: creatorSelect },
          _count: { select: { submissions: true, disputes: true } },
        },
      }),
      prisma.bounty.count({ where }),
    ]);

    res.status(200).json({
      data: bounties,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error('listBounties error:', error);
    res.status(500).json({ error: 'Failed to fetch bounties' });
  }
}

async function getBountyById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const bounty = await prisma.bounty.findUnique({
      where: { id },
      include: {
        creator: { select: creatorSelect },
        claimant: { select: creatorSelect },
        milestones: { orderBy: { createdAt: 'asc' } },
        submissions: {
          orderBy: { createdAt: 'desc' },
          include: {
            contributor: { select: creatorSelect },
          },
        },
        disputes: {
          orderBy: { createdAt: 'desc' },
          include: {
            raisedBy: { select: creatorSelect },
          },
        },
        _count: { select: { submissions: true, disputes: true } },
      },
    });

    if (!bounty) {
      res.status(404).json({ error: 'Bounty not found' });
      return;
    }

    res.status(200).json({ data: bounty });
  } catch (error) {
    console.error('getBountyById error:', error);
    res.status(500).json({ error: 'Failed to fetch bounty' });
  }
}

async function claimBounty(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Placeholder claimant until JWT auth lands in step 15
    const DEV_CLAIMANT_STELLAR = 'GCLM0000000000000000000000000000000000000000000000000000';
    const claimant = await prisma.contributor.upsert({
      where: { stellarAddress: DEV_CLAIMANT_STELLAR },
      update: {},
      create: { stellarAddress: DEV_CLAIMANT_STELLAR, displayName: 'Claimant Placeholder' },
    });

    // Fetch bounty with a transaction to prevent race conditions
    const bounty = await prisma.bounty.findUnique({ where: { id } });

    if (!bounty) {
      res.status(404).json({ error: 'Bounty not found' });
      return;
    }

    if (bounty.status !== 'OPEN') {
      res.status(409).json({
        error: 'Bounty cannot be claimed',
        detail: `Bounty is currently ${bounty.status}. Only OPEN bounties can be claimed.`,
      });
      return;
    }

    if (bounty.creatorId === claimant.id) {
      res.status(409).json({ error: 'Bounty creator cannot claim their own bounty' });
      return;
    }

    if (bounty.expiresAt && bounty.expiresAt < new Date()) {
      res.status(409).json({ error: 'Bounty has expired and can no longer be claimed' });
      return;
    }

    const updated = await prisma.bounty.update({
      where: { id },
      data: {
        status: 'CLAIMED',
        claimantId: claimant.id,
        claimedAt: new Date(),
      },
      include: {
        creator: { select: creatorSelect },
        claimant: { select: creatorSelect },
        milestones: true,
      },
    });

    res.status(200).json({ data: updated });
  } catch (error) {
    console.error('claimBounty error:', error);
    res.status(500).json({ error: 'Failed to claim bounty' });
  }
}

export const bountyController = {
  createBounty,
  listBounties,
  getBountyById,
  claimBounty,
};
