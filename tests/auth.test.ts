import { generateNonce, signToken, verifyToken } from '../src/lib/auth';

describe('Authentication Utilities', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret-key';
    process.env.JWT_EXPIRES_IN = '7d';
  });

  describe('generateNonce', () => {
    it('should generate a 64-character hex string', () => {
      const nonce = generateNonce();
      expect(nonce).toHaveLength(64);
      expect(nonce).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should generate unique nonces', () => {
      const nonce1 = generateNonce();
      const nonce2 = generateNonce();
      expect(nonce1).not.toBe(nonce2);
    });

    it('should generate multiple unique nonces', () => {
      const nonces = new Set();
      for (let i = 0; i < 100; i++) {
        nonces.add(generateNonce());
      }
      expect(nonces.size).toBe(100);
    });
  });

  describe('JWT Token', () => {
    const testContributorId = 'ctest0000000000000000000';
    const testStellarAddress = 'GTEST000000000000000000000000000000000000000000000000000';

    it('should sign a valid JWT token', () => {
      const token = signToken(testContributorId, testStellarAddress);
      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT format: header.payload.signature
    });

    it('should verify a valid token', () => {
      const token = signToken(testContributorId, testStellarAddress);
      const payload = verifyToken(token);

      expect(payload).toBeTruthy();
      expect(payload?.contributorId).toBe(testContributorId);
      expect(payload?.stellarAddress).toBe(testStellarAddress);
      expect(payload?.iat).toBeTruthy();
      expect(payload?.exp).toBeTruthy();
    });

    it('should reject an invalid token', () => {
      const payload = verifyToken('invalid.token.here');
      expect(payload).toBeNull();
    });

    it('should reject a tampered token', () => {
      const token = signToken(testContributorId, testStellarAddress);
      const parts = token.split('.');
      // Tamper with the payload
      parts[1] = Buffer.from('{"contributorId":"hacked"}').toString('base64');
      const tamperedToken = parts.join('.');

      const payload = verifyToken(tamperedToken);
      expect(payload).toBeNull();
    });

    it('should include expiration timestamp', () => {
      const token = signToken(testContributorId, testStellarAddress);
      const payload = verifyToken(token);

      expect(payload?.exp).toBeTruthy();
      expect(payload!.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });
  });
});
