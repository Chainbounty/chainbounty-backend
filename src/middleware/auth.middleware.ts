import type { Response, NextFunction } from 'express';
import { verifyToken } from '../lib/auth';
import { prisma } from '../lib/prisma';
import type { AuthRequest } from '../types/auth';

/**
 * Middleware that validates the JWT and attaches contributor info to req.
 * Returns 401 if token is missing or invalid.
 */
export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);

  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  // Verify the contributor still exists
  const contributor = await prisma.contributor.findUnique({
    where: { id: payload.contributorId },
  });

  if (!contributor) {
    res.status(401).json({ error: 'Contributor not found' });
    return;
  }

  // Attach to request
  req.contributor = {
    id: contributor.id,
    stellarAddress: contributor.stellarAddress,
  };

  next();
}

/**
 * Optional auth: attaches contributor if token is present, but doesn't block if missing.
 */
export async function optionalAuthenticate(
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    if (payload) {
      const contributor = await prisma.contributor.findUnique({
        where: { id: payload.contributorId },
      });

      if (contributor) {
        req.contributor = {
          id: contributor.id,
          stellarAddress: contributor.stellarAddress,
        };
      }
    }
  }

  next();
}
