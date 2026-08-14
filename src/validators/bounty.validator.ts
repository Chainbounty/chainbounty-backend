import { BountyDifficulty } from '@prisma/client';
import type { Request, Response, NextFunction } from 'express';

export interface ValidationError {
  field: string;
  message: string;
}

function validateCreateBounty(req: Request, res: Response, next: NextFunction): void {
  const errors: ValidationError[] = [];
  const body = req.body as Record<string, unknown>;

  // title
  if (!body.title || typeof body.title !== 'string' || body.title.trim().length === 0) {
    errors.push({ field: 'title', message: 'Title is required and must be a non-empty string' });
  } else if (body.title.trim().length > 200) {
    errors.push({ field: 'title', message: 'Title must be 200 characters or fewer' });
  }

  // description
  if (
    !body.description ||
    typeof body.description !== 'string' ||
    body.description.trim().length === 0
  ) {
    errors.push({
      field: 'description',
      message: 'Description is required and must be a non-empty string',
    });
  }

  // rewardAmount
  const reward = Number(body.rewardAmount);
  if (body.rewardAmount === undefined || body.rewardAmount === null || body.rewardAmount === '') {
    errors.push({ field: 'rewardAmount', message: 'Reward amount is required' });
  } else if (isNaN(reward) || reward <= 0) {
    errors.push({ field: 'rewardAmount', message: 'Reward amount must be a positive number' });
  }

  // rewardAsset (optional, default XLM)
  if (body.rewardAsset !== undefined && typeof body.rewardAsset !== 'string') {
    errors.push({ field: 'rewardAsset', message: 'Reward asset must be a string' });
  }

  // difficulty (optional)
  if (
    body.difficulty !== undefined &&
    !Object.values(BountyDifficulty).includes(body.difficulty as BountyDifficulty)
  ) {
    errors.push({
      field: 'difficulty',
      message: `Difficulty must be one of: ${Object.values(BountyDifficulty).join(', ')}`,
    });
  }

  // githubIssueUrl (optional)
  if (body.githubIssueUrl !== undefined) {
    if (typeof body.githubIssueUrl !== 'string') {
      errors.push({ field: 'githubIssueUrl', message: 'GitHub issue URL must be a string' });
    } else {
      try {
        const url = new URL(body.githubIssueUrl);
        if (!url.hostname.includes('github.com')) {
          errors.push({
            field: 'githubIssueUrl',
            message: 'GitHub issue URL must be a valid github.com URL',
          });
        }
      } catch {
        errors.push({ field: 'githubIssueUrl', message: 'GitHub issue URL must be a valid URL' });
      }
    }
  }

  // expiresAt (optional)
  if (body.expiresAt !== undefined) {
    const expiry = new Date(body.expiresAt as string);
    if (isNaN(expiry.getTime())) {
      errors.push({ field: 'expiresAt', message: 'expiresAt must be a valid ISO date string' });
    } else if (expiry <= new Date()) {
      errors.push({ field: 'expiresAt', message: 'expiresAt must be a future date' });
    }
  }

  // milestones (optional)
  if (body.milestones !== undefined) {
    if (!Array.isArray(body.milestones)) {
      errors.push({ field: 'milestones', message: 'Milestones must be an array' });
    } else {
      const milestones = body.milestones as Array<Record<string, unknown>>;
      const totalPercent = milestones.reduce((sum, m) => sum + Number(m.rewardPercent ?? 0), 0);

      milestones.forEach((m, i) => {
        if (!m.title || typeof m.title !== 'string') {
          errors.push({ field: `milestones[${i}].title`, message: 'Milestone title is required' });
        }
        const pct = Number(m.rewardPercent);
        if (isNaN(pct) || pct <= 0 || pct > 100) {
          errors.push({
            field: `milestones[${i}].rewardPercent`,
            message: 'Milestone rewardPercent must be between 1 and 100',
          });
        }
      });

      if (milestones.length > 0 && totalPercent !== 100) {
        errors.push({
          field: 'milestones',
          message: `Milestone rewardPercent values must sum to 100 (got ${totalPercent})`,
        });
      }
    }
  }

  if (errors.length > 0) {
    res.status(400).json({ error: 'Validation failed', details: errors });
    return;
  }

  next();
}

export const bountyValidator = {
  validateCreateBounty,
};
