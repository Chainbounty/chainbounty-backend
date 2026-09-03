import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Keypair } from '@stellar/stellar-sdk';
import type { AuthTokenPayload } from '../types/auth';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '7d';

/**
 * Generates a random nonce for challenge-response authentication.
 */
export function generateNonce(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Verifies a Stellar signature against a challenge message.
 * Returns true if the signature is valid for the given public key.
 */
export function verifyStellarSignature(
  publicKey: string,
  message: string,
  signature: string,
): boolean {
  try {
    const keypair = Keypair.fromPublicKey(publicKey);
    const messageBuffer = Buffer.from(message, 'utf8');
    const signatureBuffer = Buffer.from(signature, 'base64');

    return keypair.verify(messageBuffer, signatureBuffer);
  } catch (error) {
    console.error('verifyStellarSignature error:', error);
    return false;
  }
}

/**
 * Signs a JWT for an authenticated contributor.
 */
export function signToken(contributorId: string, stellarAddress: string): string {
  const payload: Omit<AuthTokenPayload, 'iat' | 'exp'> = {
    contributorId,
    stellarAddress,
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verifies and decodes a JWT.
 */
export function verifyToken(token: string): AuthTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
  } catch (error) {
    return null;
  }
}
