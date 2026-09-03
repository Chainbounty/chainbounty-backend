import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { generateNonce, verifyStellarSignature, signToken } from '../lib/auth';

/**
 * POST /auth/challenge
 * Returns a nonce that the user must sign with their Stellar keypair.
 */
async function getChallenge(req: Request, res: Response): Promise<void> {
  try {
    const { stellarAddress } = req.body as { stellarAddress?: string };

    if (!stellarAddress || typeof stellarAddress !== 'string') {
      res.status(400).json({
        error: 'Validation failed',
        details: [{ field: 'stellarAddress', message: 'stellarAddress is required' }],
      });
      return;
    }

    const nonce = generateNonce();

    // Upsert contributor and store the nonce
    await prisma.contributor.upsert({
      where: { stellarAddress },
      update: { nonce },
      create: { stellarAddress, nonce },
    });

    res.status(200).json({
      data: {
        nonce,
        message: `Sign this message to authenticate: ${nonce}`,
      },
    });
  } catch (error) {
    console.error('getChallenge error:', error);
    res.status(500).json({ error: 'Failed to generate challenge' });
  }
}

/**
 * POST /auth/verify
 * Verifies the signed nonce and returns a JWT.
 */
async function verifyChallenge(req: Request, res: Response): Promise<void> {
  try {
    const { stellarAddress, signature } = req.body as {
      stellarAddress?: string;
      signature?: string;
    };

    if (!stellarAddress || typeof stellarAddress !== 'string') {
      res.status(400).json({
        error: 'Validation failed',
        details: [{ field: 'stellarAddress', message: 'stellarAddress is required' }],
      });
      return;
    }

    if (!signature || typeof signature !== 'string') {
      res.status(400).json({
        error: 'Validation failed',
        details: [{ field: 'signature', message: 'signature is required' }],
      });
      return;
    }

    const contributor = await prisma.contributor.findUnique({
      where: { stellarAddress },
    });

    if (!contributor || !contributor.nonce) {
      res.status(401).json({ error: 'No challenge found. Request a challenge first.' });
      return;
    }

    // Verify signature
    const isValid = verifyStellarSignature(stellarAddress, contributor.nonce, signature);

    if (!isValid) {
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }

    // Clear the nonce and update last login
    await prisma.contributor.update({
      where: { id: contributor.id },
      data: { nonce: null, lastLoginAt: new Date() },
    });

    // Issue JWT
    const token = signToken(contributor.id, contributor.stellarAddress);

    res.status(200).json({
      data: {
        token,
        contributor: {
          id: contributor.id,
          stellarAddress: contributor.stellarAddress,
          githubUsername: contributor.githubUsername,
          displayName: contributor.displayName,
          avatarUrl: contributor.avatarUrl,
        },
      },
    });
  } catch (error) {
    console.error('verifyChallenge error:', error);
    res.status(500).json({ error: 'Failed to verify challenge' });
  }
}

export const authController = {
  getChallenge,
  verifyChallenge,
};
