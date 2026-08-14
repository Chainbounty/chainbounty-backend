import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import type { CreateBountyInput } from '../types/bounty';
import { BountyDifficulty } from '@prisma/client';

async function createBounty(req: Request, res: Response): Promise<void> {
  try {
    const body = req.body as CreateBountyInput;

    // For now we use a placeholder creator. Auth will be added in step 15.
    // We upsert a dev contributor so the FK is satisfied.
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
        creator: {
          select: {
            id: true,
            stellarAddress: true,
            githubUsername: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        milestones: true,
      },
    });

    res.status(201).json({ data: bounty });
  } catch (error) {
    console.error('createBounty error:', error);
    res.status(500).json({ error: 'Failed to create bounty' });
  }
}

export const bountyController = {
  createBounty,
};
