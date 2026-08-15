import crypto from 'crypto';

/**
 * Verifies a GitHub webhook signature (HMAC-SHA256).
 * GitHub sends the signature in the X-Hub-Signature-256 header.
 */
export function verifyGitHubSignature(
  rawBody: Buffer,
  signature: string | undefined,
  secret: string,
): boolean {
  if (!signature) return false;

  const expected = `sha256=${crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex')}`;

  // Constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}
