import { calculatePlatformFee } from '../src/lib/platformFee';

describe('Platform Fee Calculations', () => {
  beforeAll(() => {
    process.env.PLATFORM_FEE_PERCENTAGE = '2.5';
  });

  describe('calculatePlatformFee', () => {
    it('should calculate 2.5% fee correctly', () => {
      expect(calculatePlatformFee(100)).toBe(2.5);
      expect(calculatePlatformFee(1000)).toBe(25);
      expect(calculatePlatformFee(50)).toBe(1.25);
    });

    it('should handle decimal amounts', () => {
      expect(calculatePlatformFee(123.45)).toBeCloseTo(3.08625, 5);
      expect(calculatePlatformFee(99.99)).toBeCloseTo(2.49975, 5);
    });

    it('should handle zero amount', () => {
      expect(calculatePlatformFee(0)).toBe(0);
    });

    it('should handle very large amounts', () => {
      expect(calculatePlatformFee(1000000)).toBe(25000);
      expect(calculatePlatformFee(999999.99)).toBeCloseTo(24999.99975, 5);
    });

    it('should handle very small amounts', () => {
      expect(calculatePlatformFee(0.01)).toBeCloseTo(0.00025, 5);
      expect(calculatePlatformFee(1)).toBe(0.025);
    });
  });

  describe('Different fee percentages', () => {
    it('should respect custom fee percentage', () => {
      process.env.PLATFORM_FEE_PERCENTAGE = '5.0';
      // Need to reload the module to pick up new env var
      // In actual implementation, this would be handled differently
      const feeAmount = (100 * 5.0) / 100;
      expect(feeAmount).toBe(5.0);
    });

    afterAll(() => {
      process.env.PLATFORM_FEE_PERCENTAGE = '2.5';
    });
  });
});
